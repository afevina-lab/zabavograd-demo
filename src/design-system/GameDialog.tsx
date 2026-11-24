import {DialogActions as Actions} from '../visual/compositions/DialogActions.tsx';
import {DialogContent} from '../visual/compositions/DialogContent.tsx';
import {ScoreStars} from '../visual/primitives/ScoreStars.tsx';
const actionClasses={root:'dialog-actions',button:'icon-button',primary:'primary'};
const contentClasses={root:'',award:'award',scroll:'panel-scroll'};
export function DialogActions({onSettings,onContinue,onRepeat}:{onSettings:()=>void;onContinue?:()=>void;onRepeat?:()=>void}){
 return <Actions classNames={actionClasses} onSettings={onSettings} action={{kind:onContinue?'continue':'repeat',onClick:onContinue||onRepeat||onSettings}}/>;
}
export function GameDialog({title,onContinue,onSettings,onRepeat,description,stars}:{title:string;onContinue?:()=>void;onSettings:()=>void;onRepeat?:()=>void;description?:string;stars?:number}){
 return <div className={'overlay '+(stars===undefined?'game-dialog':'result')} role="dialog" aria-modal="true" aria-label={title}>
  <DialogContent classNames={contentClasses} title={title} description={description} award={stars!==undefined?<ScoreStars value={stars}/>:undefined} actions={<DialogActions onContinue={onContinue} onSettings={onSettings} onRepeat={onRepeat}/>}/>
 </div>;
}
