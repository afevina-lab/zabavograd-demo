import {useLayoutEffect,useRef,type ReactNode} from 'react';

/** Fit the actual word list into two lines. Default to 16px, shrink only when needed. */
function PreviewCopy({children}:{children:ReactNode}){
 const well=useRef<HTMLDivElement>(null),text=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const outer=well.current,inner=text.current;
  if(!outer||!inner)return;
  let active=true,frame=0;
  const measure=()=>{
   if(!active)return;
   inner.style.display='block';
   inner.style.webkitLineClamp='unset';
   inner.style.overflow='visible';
   const availableHeight=outer.clientHeight-parseFloat(getComputedStyle(outer).paddingTop)-parseFloat(getComputedStyle(outer).paddingBottom);
   const availableWidth=outer.clientWidth-parseFloat(getComputedStyle(outer).paddingLeft)-parseFloat(getComputedStyle(outer).paddingRight);
   for(let size=16;size>=12;size--){
    inner.style.fontSize=size+'px';
    if(inner.scrollHeight<=availableHeight+1&&inner.scrollWidth<=availableWidth+1)break;
   }
   inner.style.display='-webkit-box';
   inner.style.webkitLineClamp='2';
   inner.style.overflow='hidden';
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)};
  const observer=new ResizeObserver(schedule);
  observer.observe(outer);
  schedule();
  document.fonts?.ready.then(()=>{if(active)schedule()});
  return ()=>{active=false;cancelAnimationFrame(frame);observer.disconnect()};
 },[children]);
 return <div className="setup-preview-content" ref={well}><div className="setup-preview-fit" ref={text}>{children}</div></div>;
}

/** Shared fixed-footer preview across all games; messages replace words in the same well. */
export function SetupPreview({actions,children,message}:{
 actions?:ReactNode;
 children?:ReactNode;
 message?:ReactNode;
}){
 return <section className="settings-block setup-preview setup-material-preview" data-setup-section="preview">
  <div className="setup-preview-meta">
   <h2>В этой игре</h2>
   {actions&&<div className="setup-preview-actions">{actions}</div>}
  </div>
  <PreviewCopy>{message?<p className="setup-preview-message" role="status">{message}</p>:children}</PreviewCopy>
 </section>;
}
