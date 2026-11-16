# Lo-fi groove for "client no-show": 96 bpm, D minor, e-piano + bass + clap + shaker. Deterministic.
import numpy as np, wave, sys
sr=44100; D=float(sys.argv[2]) if len(sys.argv)>2 else 20.0; out_path=sys.argv[1] if len(sys.argv)>1 else 'music_noshow.wav'
t=np.arange(int(sr*D))/sr; bpm=96; beat=60/bpm; bar=4*beat
mix=np.zeros((2,t.size)); rng=np.random.default_rng(7)
def add(sig,start,pan=0.0,gain=1.0):
    i=int(start*sr); n=min(sig.size,t.size-i)
    if n<=0: return
    mix[0,i:i+n]+=sig[:n]*gain*(1-pan)/1; mix[1,i:i+n]+=sig[:n]*gain*(1+pan)/1
def hz(m): return 440*2**((m-69)/12)
chords=[[62,65,69,72],[58,62,65,69],[55,58,62,65],[57,61,64,67]]  # Dm7, Bbmaj7, Gm7, A7
roots=[38,34,31,33]
def epiano(f,dur):
    tt=np.arange(int(sr*dur))/sr
    env=np.exp(-tt*2.2)*(1-np.exp(-tt*80))
    trem=1+0.15*np.sin(2*np.pi*4.5*tt)
    s=np.sin(2*np.pi*f*tt)+0.35*np.sin(2*np.pi*2*f*tt)*np.exp(-tt*6)+0.12*np.sin(2*np.pi*3*f*tt)*np.exp(-tt*10)
    return s*env*trem
def bass(f,dur):
    tt=np.arange(int(sr*dur))/sr
    env=np.minimum(1,tt/0.01)*np.exp(-tt*1.8)
    return (np.sin(2*np.pi*f*tt)+0.2*np.sin(2*np.pi*2*f*tt))*env
def kick():
    tt=np.arange(int(sr*0.35))/sr
    return np.sin(2*np.pi*(48*tt+90*(1-np.exp(-28*tt))/28))*np.exp(-tt*10)
def clap():
    tt=np.arange(int(sr*0.18))/sr; n=rng.standard_normal(tt.size)
    n=np.convolve(n,np.ones(6)/6,'same')-np.convolve(n,np.ones(40)/40,'same')  # crude bandpass
    env=np.exp(-tt*28)+0.5*np.exp(-np.maximum(tt-0.012,0)*30)*(tt>0.012)
    return n*env
def shaker():
    tt=np.arange(int(sr*0.05))/sr; n=np.diff(rng.standard_normal(tt.size+1))
    return n*np.exp(-tt*90)
nb=int(np.ceil(D/bar))+1
for b in range(nb):
    s0=b*bar; c=chords[b%4]
    # e-piano: chord on beat 1, syncopated stab on the "and" of 2, softer on 4
    for off,g in [(0,0.16),(1.5*beat,0.10),(3*beat,0.08)]:
        for k,m in enumerate(c): add(epiano(hz(m),2.0),s0+off+k*0.012,pan=(k-1.5)*0.25,gain=g)
    # bass: root on 1, fifth-ish pickup
    if s0>=1.0:
        add(bass(hz(roots[b%4]),beat*2),s0,gain=0.32); add(bass(hz(roots[b%4]+7),beat),s0+2.5*beat,gain=0.22)
    if s0>=bar*0.5:
        add(kick(),s0,gain=0.45); add(kick(),s0+2.5*beat,gain=0.3)
        add(clap(),s0+beat,pan=0.1,gain=0.22); add(clap(),s0+3*beat,pan=0.1,gain=0.22)
    for k in range(16):
        add(shaker(),s0+k*beat/4,pan=0.35,gain=0.05 if k%2 else 0.08)
fade=np.minimum(1,t/0.4)*np.minimum(1,(D-t)/1.6)
mix*=fade; mix/=np.abs(mix).max()*1.12
s=(mix.T*32767).astype(np.int16)
w=wave.open(out_path,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(s.tobytes()); w.close()
