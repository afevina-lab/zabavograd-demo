/* Visual-only camera zoom on synchronized matched pairs. No game-state changes. */
(()=>{"use strict";
const seen=new WeakMap(), running=new WeakSet();
const reduced=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function inspect(){
 const stage=document.querySelector(".app .stage");
 if(!stage||!stage.querySelector(".cards"))return;
 const count=stage.querySelectorAll(".cards .card.found").length;
 const old=seen.get(stage)||0;
 seen.set(stage,count);
 if(reduced()||count<2||count<=old||count-old<2||running.has(stage))return;
 running.add(stage);
 /* Transform the entire stage: cards and background share one camera. */
 const anim=stage.animate([
  {transform:"scale(1)",offset:0},
  {transform:"scale(1.065)",offset:.34},
  {transform:"scale(1.065)",offset:.58},
  {transform:"scale(1)",offset:1}
 ],{duration:1050,easing:"ease-in-out"});
 anim.finished.catch(()=>{}).finally(()=>running.delete(stage));
}
const observer=new MutationObserver(()=>{queueMicrotask(inspect)});
function start(){observer.observe(document.getElementById("root")||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});inspect()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
