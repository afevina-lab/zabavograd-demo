import {useEffect,useRef,type PointerEvent as ReactPointerEvent} from 'react';
/** The same opaque, pointer-attached card movement in every bank-based game. */
export function useCardDrag(disabled:boolean){
 const active=useRef<(()=>void)|null>(null),suppressUntil=useRef(0);
 useEffect(()=>{if(disabled)active.current?.();return()=>active.current?.()},[disabled]);
 function begin(event:ReactPointerEvent<HTMLElement>,selector:string,onDrop:(target:HTMLElement)=>void){
  if(disabled||event.button!==0||!event.isPrimary)return;
  active.current?.();
  const el=event.currentTarget,rect=el.getBoundingClientRect(),x=event.clientX,y=event.clientY,previous=el.style.cssText;
  let moved=false,ended=false;
  el.setPointerCapture(event.pointerId);
  const move=(ev:PointerEvent)=>{
   if(ev.pointerId!==event.pointerId||(!moved&&Math.hypot(ev.clientX-x,ev.clientY-y)<6))return;
   moved=true;el.dataset.cardDragging='true';
   Object.assign(el.style,{position:'fixed',left:rect.left+ev.clientX-x+'px',top:rect.top+ev.clientY-y+'px',width:rect.width+'px',height:rect.height+'px',zIndex:'1000',pointerEvents:'none',margin:'0',gridArea:'auto',transform:'none',opacity:'1'});
  };
  const cleanup=()=>{
   if(ended)return;ended=true;
   el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',cancel);el.removeEventListener('lostpointercapture',cancel);
   el.style.cssText=previous;delete el.dataset.cardDragging;
   if(el.hasPointerCapture(event.pointerId))el.releasePointerCapture(event.pointerId);
   if(moved)suppressUntil.current=performance.now()+250;
   active.current=null;
  };
  const end=(ev:PointerEvent)=>{if(ev.pointerId!==event.pointerId)return;const target=moved?document.elementFromPoint(ev.clientX,ev.clientY)?.closest<HTMLElement>(selector):null;cleanup();if(target)onDrop(target)};
  const cancel=()=>cleanup();
  active.current=cleanup;
  el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',cancel);el.addEventListener('lostpointercapture',cancel);
 }
 return {begin,suppressClick:()=>performance.now()<suppressUntil.current};
}
