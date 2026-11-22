import {useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {THEMES,assetUrl,type ThemeId} from './themes.ts';

/** Universal scene renderer. Forest has a height-based minimum composition width:
 * wide viewports spread side trees apart; narrow ones crop their outer edges.
 * The card grid never changes the geometry of the scenery. */
export function SceneLayers({theme}:{theme:ThemeId}){
 const sceneryRef=useRef<HTMLDivElement>(null);
 const [forestWidth,setForestWidth]=useState<number|null>(null);
 useLayoutEffect(()=>{
  if(theme!=='forest'){setForestWidth(null);return;}
  const parent=sceneryRef.current?.parentElement;
  if(!parent)return;
  const update=()=>{
   const {width,height}=parent.getBoundingClientRect();
   if(width>0&&height>0){
    const next=Math.ceil(Math.max(width,height*1.78));
    setForestWidth(previous=>previous===next?previous:next);
   }
  };
  update();
  const observer=new ResizeObserver(update);
  observer.observe(parent);
  return ()=>observer.disconnect();
 },[theme]);
 const sprites=THEMES[theme].scene.sprites;
 if(!sprites.length)return null;
 const frame:CSSProperties=theme==='forest'?{
  width:forestWidth?`${forestWidth}px`:'100%',
  left:'50%',right:'auto',transform:'translateX(-50%)'
 }:{};
 return <div ref={sceneryRef} className="zg-scene-layers" style={frame} aria-hidden="true">{sprites.map(sprite=>
  <span key={sprite.id} className="zg-scene-sprite" data-zg-motion={sprite.motion}
    style={{
      width:sprite.width,left:sprite.left,right:sprite.right,top:sprite.top,bottom:sprite.bottom,
      zIndex:sprite.layer??1,opacity:sprite.opacity??1,transformOrigin:sprite.origin||undefined,
      '--zg-spin-duration':sprite.spinMs?String(sprite.spinMs)+'ms':undefined,
      '--zg-sprite-duration':sprite.durationMs?String(sprite.durationMs)+'ms':undefined,
      '--zg-sprite-delay':sprite.delayMs?String(sprite.delayMs)+'ms':undefined
    } as CSSProperties}><img alt="" data-zg-spin={Boolean(sprite.spinMs)} src={assetUrl(sprite.src,import.meta.env.BASE_URL)}/></span>)}</div>;
}
