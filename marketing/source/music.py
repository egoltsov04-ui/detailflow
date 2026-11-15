import numpy as np, wave
sr=44100; D=17.0; t=np.arange(int(sr*D))/sr; bpm=120; beat=60/bpm
out=np.zeros_like(t)
# pad: Am F C G, 2 bars each 2s
chords=[[220,261.63,329.63],[174.61,220,261.63],[196,261.63,329.63],[196,246.94,293.66]]
for i in range(int(D/2)+1):
    a,b=i*2,i*2+2; m=(t>=a)&(t<b); tt=t[m]-a
    env=np.minimum(1,tt/0.3)*np.minimum(1,(2-tt)/0.3)
    for f in chords[i%4]:
        out[m]+=0.07*env*(np.sin(2*np.pi*f*tt)+0.5*np.sin(2*np.pi*f*1.003*tt)+0.2*np.sin(2*np.pi*2*f*tt))
# kick on beats from 3s
for k in np.arange(3,16.5,beat):
    m=(t>=k)&(t<k+0.4); tt=t[m]-k
    out[m]+=0.5*np.sin(2*np.pi*(45*tt+120*(1-np.exp(-30*tt))/30))*np.exp(-tt*9)
# hat on offbeats
rng=np.random.default_rng(1)
for k in np.arange(3+beat/2,16.5,beat):
    m=(t>=k)&(t<k+0.06); tt=t[m]-k
    n=rng.standard_normal(m.sum()); n=np.diff(n,prepend=0)
    out[m]+=0.06*n*np.exp(-tt*60)
# arp pluck on 0-3s (light tension)
for j,k in enumerate(np.arange(0,3,beat/2)):
    m=(t>=k)&(t<k+0.25); tt=t[m]-k
    f=[440,523.25,659.25,523.25][j%4]
    out[m]+=0.08*np.sin(2*np.pi*f*tt)*np.exp(-tt*14)
out*=np.minimum(1,(D-t)/1.2)
out/=np.abs(out).max()*1.15
s=(out*32767).astype(np.int16)
w=wave.open('music.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(s.tobytes()); w.close()
