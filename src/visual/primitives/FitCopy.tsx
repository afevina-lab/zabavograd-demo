import {useLayoutEffect,useRef,type ReactNode} from 'react';

/** Fit the actual word list into two lines. Default to 18px, shrink only when needed. */
export function FitCopy({children,classNames={root:'v-fit-copy',text:'v-fit-copy-text'}}:{children:ReactNode;classNames?:{root:string;text:string}}){
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
   for(let size=18;size>=12;size--){
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
 return <div className={classNames.root} ref={well}><div className={classNames.text} ref={text}>{children}</div></div>;
}


