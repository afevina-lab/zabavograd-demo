import {useEffect} from 'react';
/** Fit the complete matching board to its stage, including the answer bank. */
export function useMatchingFit(playing:boolean){useEffect(()=>{
 if(!playing)return;const stage=document.querySelector<HTMLElement>('.matching-stage'),content=stage?.querySelector<HTMLElement>('.matching-content');if(!stage||!content)return;
 const fit=()=>{const scale=Math.min(1,stage.clientHeight/Math.max(1,content.scrollHeight),stage.clientWidth/Math.max(1,content.scrollWidth));content.style.transform=`scale(${scale})`;};
 const observer=new ResizeObserver(fit);observer.observe(stage);observer.observe(content);fit();return()=>{observer.disconnect();content.style.removeProperty('transform');};
},[playing]);}
