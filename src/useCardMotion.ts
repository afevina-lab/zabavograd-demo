import {useLayoutEffect,useRef,type RefObject} from 'react';
import {MOTION} from './design-system/motion.ts';
/** Animate persistent card identities between containers without changing layout. */
export function useCardMotion(root:RefObject<HTMLElement|null>,selector:string,skip:()=>boolean=()=>false){
 const previous=useRef(new Map<string,DOMRect>());
 const animations=useRef(new WeakMap<HTMLElement,Animation>());
 useLayoutEffect(()=>{
  // Child grids finish their measured layout before movement origins are recorded.
  let frame=0;const first=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
  const next=new Map<string,DOMRect>();
  root.current?.querySelectorAll<HTMLElement>(selector).forEach(el=>{
   const key=el.dataset.motionId;if(!key)return;
   const box=el.getBoundingClientRect(),active=animations.current.get(el);
   const matrix=active?.playState==='running'?new DOMMatrix(getComputedStyle(el).transform):new DOMMatrix();
   const rect=new DOMRect(box.x-matrix.e,box.y-matrix.f,box.width,box.height),old=previous.current.get(key);next.set(key,rect);
   if(old&&!skip()&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&(Math.abs(old.x-rect.x)>2||Math.abs(old.y-rect.y)>2)){
    active?.cancel();
    animations.current.set(el,el.animate([{transform:`translate(${old.x-rect.x}px,${old.y-rect.y}px)`},{transform:'none'}],{duration:MOTION.layoutMs,easing:MOTION.layoutEasing}));
   }
  });previous.current=next;
  })});
  return()=>{cancelAnimationFrame(first);cancelAnimationFrame(frame)};
 });
}
