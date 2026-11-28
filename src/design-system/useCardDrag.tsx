import {useEffect,useRef,type PointerEvent as ReactPointerEvent} from 'react';
/** The same opaque, pointer-attached card movement in every bank-based game. */
export function useCardDrag(disabled:boolean){
 const active=useRef<(()=>void)|null>(null),suppressUntil=useRef(0);
 useEffect(()=>{if(disabled)active.current?.();return()=>active.current?.()},[disabled]);
 function begin(event:ReactPointerEvent<HTMLElement>,selector:string,onDrop:(target:HTMLElement)=>void){
  if(disabled||event.button!==0||!event.isPrimary)return;
  active.current?.();
  const el=event.currentTarget,rect=el.getBoundingClientRect(),x=event.clientX,y=event.clientY,previous=el.style.cssText;
  let moved=false,ended=false,frame=0;let placeholder:HTMLElement|null=null,highlight:HTMLElement|null=null;let pointerX=x,pointerY=y;
  const scrollArea=el.closest<HTMLElement>('.stage');
  const indicate=()=>{const target=document.elementFromPoint(pointerX,pointerY)?.closest<HTMLElement>(selector)||null;if(target!==highlight){highlight?.removeAttribute('data-card-drop-hover');highlight=target;highlight?.setAttribute('data-card-drop-hover','true')}};
  const scroll=()=>{if(ended||!moved)return;if(scrollArea){const r=scrollArea.getBoundingClientRect();if(pointerX>=r.left&&pointerX<=r.right&&pointerY>=r.top&&pointerY<=r.bottom){const dy=pointerY<r.top+48?-6:pointerY>r.bottom-48?6:0;if(dy)scrollArea.scrollTop+=dy;}}indicate();frame=requestAnimationFrame(scroll)};
  el.setPointerCapture(event.pointerId);
  const move=(ev:PointerEvent)=>{
   if(ev.pointerId!==event.pointerId||(!moved&&Math.hypot(ev.clientX-x,ev.clientY-y)<6))return;
   if(!moved){placeholder=document.createElement('div');placeholder.className=el.className;placeholder.style.cssText=previous;Object.assign(placeholder.style,{width:rect.width+'px',height:rect.height+'px',visibility:'hidden',pointerEvents:'none',boxSizing:'border-box'});placeholder.setAttribute('aria-hidden','true');placeholder.dataset.cardPlaceholder='true';el.before(placeholder);moved=true;frame=requestAnimationFrame(scroll);}
   pointerX=ev.clientX;pointerY=ev.clientY;el.dataset.cardDragging='true';
   el.getAnimations().forEach(animation=>animation.cancel());
   Object.assign(el.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',zIndex:'1000',pointerEvents:'none',margin:'0',gridArea:'auto',transform:`translate3d(${ev.clientX-x}px,${ev.clientY-y}px,0)`,opacity:'1',animation:'none',transition:'none'});
  };
  const cleanup=()=>{
   if(ended)return;ended=true;
   el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',cancel);el.removeEventListener('lostpointercapture',cancel);
   cancelAnimationFrame(frame);placeholder?.remove();highlight?.removeAttribute('data-card-drop-hover');document.removeEventListener('keydown',escape);
   el.style.cssText=previous;delete el.dataset.cardDragging;
   if(el.hasPointerCapture(event.pointerId))el.releasePointerCapture(event.pointerId);
   if(moved)suppressUntil.current=performance.now()+250;
   active.current=null;
  };
  const end=(ev:PointerEvent)=>{if(ev.pointerId!==event.pointerId)return;const target=moved?document.elementFromPoint(ev.clientX,ev.clientY)?.closest<HTMLElement>(selector):null;cleanup();if(target)onDrop(target)};
  const cancel=()=>cleanup();
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();cleanup()}};
  document.addEventListener('keydown',escape);
  active.current=cleanup;
  el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',cancel);el.addEventListener('lostpointercapture',cancel);
 }
 return {begin,suppressClick:()=>active.current!==null||performance.now()<suppressUntil.current};
}
