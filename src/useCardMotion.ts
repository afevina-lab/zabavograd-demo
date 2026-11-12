import {useLayoutEffect,useRef,type RefObject} from 'react';
import {MOTION} from './design-system/motion.ts';
/** Animate persistent card identities between containers without changing layout. */
export function useCardMotion(root:RefObject<HTMLElement|null>,selector:string){
 const previous=useRef(new Map<string,DOMRect>());
 useLayoutEffect(()=>{
  const next=new Map<string,DOMRect>();
  root.current?.querySelectorAll<HTMLElement>(selector).forEach(el=>{
   const key=el.dataset.motionId;if(!key)return;
   const rect=el.getBoundingClientRect(),old=previous.current.get(key);next.set(key,rect);
   if(old&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&(Math.abs(old.x-rect.x)>2||Math.abs(old.y-rect.y)>2)){
    el.animate([{transform:`translate(${old.x-rect.x}px,${old.y-rect.y}px) scale(1.04)`},{transform:'none'}],{duration:MOTION.layoutMs,easing:MOTION.layoutEasing});
   }
  });previous.current=next;
 });
}
