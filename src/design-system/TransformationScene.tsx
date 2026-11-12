import type {Word} from '../model.ts';
import {CardArtwork} from '../CardArtwork.tsx';
import {TRANSFORMATION_SCENES} from './themes.ts';
import {assetUrl,type ThemeId} from './themes.ts';
import {transformationResult,type TransformationMode,type TransformationPhase} from '../transformations.ts';
export function TransformationScene({theme,word,mode,phase}:{theme:ThemeId;word:Word;mode:TransformationMode;phase:TransformationPhase}){
 const scene=TRANSFORMATION_SCENES[theme],result=transformationResult(mode,phase==='answer');
 const url=(p:string)=>assetUrl(p,import.meta.env.BASE_URL);
 return <div className="transformation-scene" data-scene={scene.kind} data-phase={phase}>
  {scene.background&&<img className="transformation-background" src={url(scene.background)} alt=""/>}
  <div className="transformation-chamber">
   {scene.kind==='flip'?<img className="transformation-back" src={url((phase==='answer'?scene.frame:scene.back)!)} alt=""/>:scene.back&&<img className="transformation-back" src={url(scene.back)} alt=""/>}
   <div className="transformation-content" data-count={result.count} data-small={result.scale===.5} aria-live="polite">
    {result.kind==='word'?<span className="transformation-word">{word.label}</span>:Array.from({length:result.count},(_,i)=><div className="transformation-object" key={word.id+':'+i}><CardArtwork image={word.variants![0]} label={word.label}/></div>)}
   </div>
   {scene.kind==='rays'&&<div className="transformation-rays" aria-hidden="true"/>}
   {scene.glass&&<img className="transformation-glass" src={url(scene.glass)} alt=""/>}
   {scene.frame&&scene.kind!=='flip'&&<img className={scene.kind==='depth'?'transformation-back':'transformation-frame'} src={url(scene.frame)} alt=""/>}
  </div>
 </div>;
}

