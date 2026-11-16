const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
(async()=>{const [mode,file]=process.argv.slice(2);const name=path.basename(file,'.html')+(process.env.SUF||'');const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:+(process.env.H||1350)}});
 await p.goto('file://'+path.resolve(file)+(process.env.Q||''));await p.evaluate(()=>document.fonts.ready);
 await p.waitForFunction(()=>[...document.images].every(i=>i.complete));const DUR=await p.evaluate(()=>DURATION);
 const out=path.dirname(path.resolve(file));
 if(mode==='preview'){const ts=JSON.parse(process.argv[4]||'[]');for(const [i,t] of ts.entries()){await p.evaluate(t=>render(t),t);await p.screenshot({path:`${out}/pv_${name}_${i}.png`});}}
 else{const dir=`${out}/fr_${name}`;fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir);const N=Math.round(DUR*30);
  for(let i=0;i<N;i++){await p.evaluate(t=>render(t),i/30);await p.screenshot({path:`${dir}/f${String(i).padStart(4,'0')}.png`});}}
 await b.close();})();
