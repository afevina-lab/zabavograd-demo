import {Button} from './Buttons.tsx';
import {visualClasses} from './classNames.ts';
import {Icon} from './Icon.tsx';
export type SoundChoiceClasses={root:string;attached:string;symbol:string;edit:string};
const classes:SoundChoiceClasses={root:'v-sound-choice',attached:'is-selected',symbol:'v-control-button v-button v-button--secondary v-sound-symbol',edit:'v-sound-edit'};
/** Selecting a sound and opening its editor are independent native buttons. */
export function SoundChoice({sound,selected,disabled=false,onSelect,onEdit,classNames=classes}:{sound:string;selected:boolean;disabled?:boolean;onSelect:()=>void;onEdit:()=>void;classNames?:SoundChoiceClasses}){
 classNames=visualClasses(classes,classNames);
 return <div className={classNames.root+(selected?' '+classNames.attached:'')}>
  <button type="button" className={classNames.symbol} aria-pressed={selected} disabled={disabled} onClick={onSelect}>{sound.toUpperCase()}</button>
  {selected&&<Button tone="secondary" size="attached" className={classNames.edit} aria-label={'Редактировать '+sound} onClick={onEdit}><Icon name="Settings"/></Button>}
 </div>;
}
