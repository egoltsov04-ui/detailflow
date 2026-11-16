const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+__dirname+'/subs.html');await p.evaluate(()=>document.fonts.ready);
for(let i=0;i<5;i++){await p.evaluate(i=>render(i),i);await p.screenshot({path:`${__dirname}/sub${i+1}.png`,omitBackground:true});}
const q=await b.newPage({viewport:{width:1080,height:1920}});await q.goto('file://'+__dirname+'/end.html');await q.evaluate(()=>document.fonts.ready);
await q.evaluate(()=>render(2.9));await q.screenshot({path:__dirname+'/detailflow-reels-end.png'});await b.close()})();
