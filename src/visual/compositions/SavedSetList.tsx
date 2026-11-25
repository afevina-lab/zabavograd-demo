import {visualClasses} from '../primitives/classNames.ts';
import {Choice} from '../primitives/Choice.tsx';
import {IconButton} from '../primitives/Buttons.tsx';
export type SavedSetItem={id:string;name:string;description:string};
const classes={root:'v-saved-set-list',row:'v-saved-set-row',choice:'v-choice',remove:'v-saved-set-remove'};
export function SavedSetList({items,selected,onChange,onRemove,classNames=classes}:{items:readonly SavedSetItem[];selected:readonly string[];onChange:(id:string,checked:boolean)=>void;onRemove:(id:string)=>void;classNames?:typeof classes}){
 classNames=visualClasses(classes,classNames);
 return <div className={classNames.root}>{items.map(item=><div className={classNames.row} key={item.id}>
  <Choice className={classNames.choice} checked={selected.includes(item.id)} onChange={checked=>onChange(item.id,checked)} label={<><strong>{item.name}</strong><small>{item.description}</small></>}/>
  <IconButton className={classNames.remove} icon="Trash" label={'Удалить набор '+item.name} onClick={()=>onRemove(item.id)}/>
 </div>)}</div>;
}
