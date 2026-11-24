import type {ReactNode} from 'react';
export type TransformationArtwork={kind:'flip'|'depth'|'rays';background?:string;back?:string;glass?:string;frame?:string};
export type TransformationClasses={root:string;background:string;chamber:string;back:string;flipBack:string;flipFront:string;content:string;rays:string;glass:string;frame:string};
const classes:TransformationClasses={root:'v-transformation-scene',background:'v-transformation-background',chamber:'v-transformation-chamber',back:'v-transformation-back',flipBack:'v-transformation-flip-back',flipFront:'v-transformation-flip-front',content:'v-transformation-content',rays:'v-transformation-rays',glass:'v-transformation-glass',frame:'v-transformation-frame'};
/** Artwork URLs and transformation state are supplied by the adapter, never inferred here. */
export function TransformationView({scene,phase,count,small,children,classNames=classes}:{scene:TransformationArtwork;phase:string;count:number;small:boolean;children:ReactNode;classNames?:TransformationClasses}){
 return <div className={classNames.root} data-scene={scene.kind} data-phase={phase}>
  {scene.background&&<img className={classNames.background} src={scene.background} alt=""/>}
  <div className={classNames.chamber}>
   {scene.kind==='flip'?<><img className={classNames.back+' '+classNames.flipBack} src={scene.back} alt=""/><img className={classNames.back+' '+classNames.flipFront} src={scene.frame} alt=""/></>:scene.back&&<img className={classNames.back} src={scene.back} alt=""/>}
   <div className={classNames.content} data-count={count} data-small={small} aria-live="polite">{children}</div>
   {scene.kind==='rays'&&<div className={classNames.rays} aria-hidden="true"/>}
   {scene.glass&&<img className={classNames.glass} src={scene.glass} alt=""/>}
   {scene.frame&&scene.kind!=='flip'&&<img className={scene.kind==='depth'?classNames.back:classNames.frame} src={scene.frame} alt=""/>}
  </div>
 </div>;
}
