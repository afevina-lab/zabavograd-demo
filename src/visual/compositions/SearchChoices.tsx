import {visualClasses} from '../primitives/classNames.ts';
import {Choice} from '../primitives/Choice.tsx';
export type SearchChoice={id:string;label:string};
export type SearchChoiceClasses={root:string;search:string;list:string;choice:string};
const classes:SearchChoiceClasses={root:'v-search-choices',search:'v-search-input',list:'v-word-list',choice:'v-choice'};
export type SearchChoicesProps={items:readonly SearchChoice[];selected:readonly string[];onChange:(ids:string[])=>void;search:string;setSearch:(value:string)=>void;max?:number;disabled?:boolean;classNames?:SearchChoiceClasses};
/** Item order is supplied by the caller; the visual component does not rank teaching material. */
export function SearchChoices({items,selected,onChange,search,setSearch,max=Infinity,disabled=false,classNames=classes}:SearchChoicesProps){
 classNames=visualClasses(classes,classNames);
 const query=search.trim().toLocaleLowerCase('ru'),chosen=new Set(selected);
 const visible=items.filter(item=>item.label.toLocaleLowerCase('ru').includes(query));
 return <div className={classNames.root}>
  <input type="search" className={classNames.search} aria-label="Поиск" placeholder="Поиск" value={search} onChange={event=>setSearch(event.target.value)}/>
  <div className={classNames.list}>{visible.map(item=><Choice key={item.id} className={classNames.choice} label={item.label} checked={chosen.has(item.id)} disabled={disabled||(!chosen.has(item.id)&&chosen.size>=max)} onChange={checked=>onChange(checked?[...selected,item.id]:selected.filter(id=>id!==item.id))}/>)}</div>
  {visible.length===0&&<p className="v-search-empty" role="status">{query?"Ничего не найдено. Измените запрос.":"Нет доступных карточек. Измените условия подбора."}</p>}
 </div>;
}

