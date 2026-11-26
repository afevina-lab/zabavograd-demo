import {SortingLayout} from './SortingLayout.tsx';
import type {CSSProperties,HTMLAttributes,ReactNode,Ref} from 'react';
/** Only board composition varies by mechanic; cards retain their primitive contract. */
export function MemoryBoard({className='',columns,cardWidth,style,...props}:HTMLAttributes<HTMLDivElement>&{ref?:Ref<HTMLDivElement>;columns?:number;cardWidth?:number}){
 const geometry={'--v-memory-columns':columns,'--v-memory-card-width':cardWidth===undefined?undefined:cardWidth+'px',...style} as CSSProperties;
 return <div {...props} className={['v-memory-board',className].filter(Boolean).join(' ')} style={geometry} data-measured={columns!==undefined||undefined}/>;
}
export function SortingBoard({bank,groups}:{bank:ReactNode;groups:readonly {id:string;title:string;content:ReactNode}[]}){
 return <SortingLayout bank={bank} groups={groups.map(group=><section key={group.id} className="v-sorting-group" aria-label={group.title}><h2>{group.title}</h2><div>{group.content}</div></section>)}/>;
}
export function MatchingBoard({children}:{children:ReactNode}){return <div className="v-matching-board">{children}</div>}
export function ConveyorBoard({children}:{children:ReactNode}){return <div className="v-conveyor-board">{children}</div>}
export function TransformationBoard({children}:{children:ReactNode}){return <div className="v-transformation-board">{children}</div>}



