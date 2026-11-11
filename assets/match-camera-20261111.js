/* Camera follows the midpoint of each newly matched pair. */
(()=>{"use strict";
const seen=new WeakSet(),running=new WeakMap();
function inspect(){
 const stage=document.querySelector(".app .stage");
 if(!stage)return;
 const fresh=[...stage.querySelectorAll(".cards .card.found")].filter(card=>!seen.has(card));
 if(!fresh.length)return;
 fresh.forEach(card=>seen.add(card));
 if(fresh.length!==2||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 running.get(stage)?.cancel();
 const bounds=stage.getBoundingClientRect(),rects=fresh.map(card=>card.getBoundingClientRect());
 const x=rects.reduce((sum,r)=>sum+r.left+r.width/2,0)/2-bounds.left;
 const y=rects.reduce((sum,r)=>sum+r.top+r.height/2,0)/2-bounds.top;
 const prior=stage.style.transformOrigin;
 stage.style.transformOrigin=x+"px "+y+"px";
 const anim=stage.animate([{transform:"scale(1)"},{transform:"scale(1.065)",offset:.4},{transform:"scale(1.065)",offset:.65},{transform:"scale(1)"}],{duration:1800,easing:"ease-in-out"});
 running.set(stage,anim);
 anim.finished.catch(()=>{}).finally(()=>{if(running.get(stage)===anim){stage.style.transformOrigin=prior;running.delete(stage)}});
}
function start(){new MutationObserver(inspect).observe(document.getElementById("root")||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});inspect()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
