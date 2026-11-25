import {TransformationView,type TransformationClasses} from '../visual/games/TransformationView.tsx';
import type {Word} from '../model.ts';
import {CardArtwork} from '../CardArtwork.tsx';
import {TRANSFORMATION_SCENES} from './themes.ts';
import {assetUrl,type ThemeId} from './themes.ts';
import {transformationResult,type TransformationMode,type TransformationPhase} from '../transformations.ts';
export function TransformationScene({theme,word,mode,phase}:{theme:ThemeId;word:Word;mode:TransformationMode;phase:TransformationPhase}){
 const scene=TRANSFORMATION_SCENES[theme],result=transformationResult(mode,phase==='answer');
 const url=(p:string)=>assetUrl(p,import.meta.env.BASE_URL);
 const classes:TransformationClasses={root:'transformation-scene',background:'transformation-background',chamber:'transformation-chamber',back:'transformation-back',flipBack:'transformation-flip-back',flipFront:'transformation-flip-front',content:'transformation-content',rays:'transformation-rays',glass:'transformation-glass',frame:'transformation-frame'};
 const resolved={...scene,background:scene.background?url(scene.background):undefined,back:scene.back?url(scene.back):undefined,glass:scene.glass?url(scene.glass):undefined,frame:scene.frame?url(scene.frame):undefined};
 return <TransformationView scene={resolved} phase={phase} count={result.count} small={result.scale===.5} classNames={classes}>
    {(result.kind==='word'||word.materialKind)?<span className="v-transformation-word transformation-word" style={{whiteSpace: 'nowrap', overflowWrap: 'normal', fontSize: `min(64px, ${90/Math.max(1,word.label.length*.7)}cqw)`}}>{word.label.toLocaleUpperCase('ru')}</span>:<div className="v-transformation-object transformation-object"><CardArtwork image={word.variants![0]} label={word.label} number={result.count===7?'plural':'singular'}/></div>}
 </TransformationView>;
}


