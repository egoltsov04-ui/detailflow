const D='/home/user/detailflow/public/demo/';
const $=id=>document.getElementById(id), cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const ease=x=>{x=cl(x);return 1-Math.pow(1-x,3)}, prog=(t,a,b)=>ease((t-a)/(b-a));
function frac(ring,shot,x0,y0,x1,y1,pad,off=0){const w=shot.clientWidth,h=shot.querySelector('img').clientHeight;
 Object.assign(ring.style,{left:(x0*w-pad)+'px',top:(y0*h-pad-off)+'px',width:((x1-x0)*w+2*pad)+'px',height:((y1-y0)*h+2*pad)+'px'})}
function enter(el,t,a,dx=0){const p=prog(t,a,a+0.7);el.style.transform=`translateX(-50%) translateY(${(1-p)*100}px) scale(${0.96+0.04*p})`}
function rise(el,t,a,d=0.5,y=30){const p=prog(t,a,a+d);el.style.opacity=p;el.style.transform=`translateY(${(1-p)*y}px)`}
function endHTML(sub){return `<div class="scene" id="end"><div class="cta"><div class="logo" id="lg">df</div><div class="brand" id="br">Detailflow</div><div class="sub" id="sb">${sub}</div><div class="pill" id="pl">Безкоштовний тест: напишіть «ТЕСТ» у Direct</div><div class="site" id="st">detailflow.com.ua</div></div></div>`}
function endRender(t,a){const lp=prog(t,a+0.1,a+0.7);$('lg').style.transform=`scale(${0.6+0.4*lp})`;$('lg').style.opacity=lp;
 [['br',.4],['sb',.6],['pl',.9],['st',1.2]].forEach(([e,d])=>rise($(e),t,a+d))}
function fades(t,S){for(const [id,[a,b]] of Object.entries(S)){const o=Math.min(cl((t-a)/0.35),id==='end'?1:cl((b-t)/0.35));$(id).style.opacity=(t>=a-0.001&&t<=b+0.001)?o:0}}
// reusable scene snippets
const PAY=(id)=>`<div class="scene" id="${id}"><div class="head"><div class="label">ЗАРПЛАТА</div><div class="title">Відсоток майстру нараховується <em>сам</em></div></div>
 <div class="shot" id="${id}s" style="width:920px;height:430px"><img style="margin-top:-314px" src="${D}review.webp"><div class="ring" id="${id}r"></div></div>
 <div class="card calc" id="${id}c"><span>1 500 ₴ × 30%</span><b>450 ₴</b></div></div>`;
function payRender(id,t,a){enter($(id+'s'),t,a);frac($(id+'r'),$(id+'s'),.051,.512,.949,.590,10,314);$(id+'r').style.opacity=prog(t,a+1,a+1.5);rise($(id+'c'),t,a+1.2,0.6,40)}
