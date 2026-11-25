import {visualClasses} from '../primitives/classNames.ts';
import {SCENE_MOTION_DEFAULTS} from '../../design-system/motion.ts';
import {useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import type {SceneLayout,SceneSprite} from '../../design-system/themes.ts';
const classes={root:'v-scene-layers',sprite:'v-scene-sprite'};
export function SceneSprites({sprites,layout,classNames=classes}:{sprites:readonly SceneSprite[];layout?:SceneLayout;classNames?:typeof classes}){
 classNames=visualClasses(classes,classNames);
 const root=useRef<HTMLDivElement>(null),[frame,setFrame]=useState<{width:number;scale:number}|null>(null);
 useLayoutEffect(()=>{
  if(!layout){setFrame(null);return;}
  const parent=root.current?.parentElement;if(!parent)return;
  const update=()=>{
   const {width,height}=parent.getBoundingClientRect();if(width<=0||height<=0)return;
   const sceneWidth=Math.ceil(Math.max(width,height*layout.minimumAspect));
   const scale=Math.min(1,Math.max(layout.minimumScale,width/(height*layout.scaleHeightRatio)));
   setFrame(previous=>previous?.width===sceneWidth&&Math.abs(previous.scale-scale)<.001?previous:{width:sceneWidth,scale});
  };
  update();const observer=new ResizeObserver(update);observer.observe(parent);return()=>observer.disconnect();
 },[layout]);
 if(!sprites.length)return null;
 const style:CSSProperties=layout?{width:frame?frame.width+'px':'100%',left:'50%',right:'auto',top:'auto',bottom:0,height:'100%',transform:`translateX(-50%) scale(${frame?.scale??1})`,transformOrigin:'center bottom'}:{};
 return <div ref={root} className={classNames.root} style={style} aria-hidden="true">{sprites.map(sprite=><span key={sprite.id} className={classNames.sprite} data-zg-motion={sprite.motion} style={{width:sprite.width,left:sprite.left,right:sprite.right,top:sprite.top,bottom:sprite.bottom,zIndex:sprite.layer??1,opacity:sprite.opacity??1,transformOrigin:sprite.origin||undefined,'--zg-spin-duration':sprite.spinMs?sprite.spinMs+'ms':undefined,'--zg-sprite-duration':(sprite.durationMs??SCENE_MOTION_DEFAULTS[sprite.motion])+'ms','--zg-sprite-delay':sprite.delayMs?sprite.delayMs+'ms':undefined} as CSSProperties}><img alt="" data-zg-spin={Boolean(sprite.spinMs)} src={sprite.src}/></span>)}</div>;
}


