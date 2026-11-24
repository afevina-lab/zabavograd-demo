import type {HTMLAttributes,ReactNode,Ref} from 'react';
/** Only board composition varies by mechanic; cards retain their primitive contract. */
export function MemoryBoard({className="v-memory-board",...props}:HTMLAttributes<HTMLDivElement>&{ref?:Ref<HTMLDivElement>}){return <div {...props} className={className}/>;}
export function SortingBoard({bank,groups}:{bank:ReactNode;groups:readonly {id:string;title:string;content:ReactNode}[]}){return <div className="v-sorting-board"><section className="v-sorting-bank" aria-label="Банк карточек">{bank}</section><div className="v-sorting-groups">{groups.map(g=><section key={g.id} className="v-sorting-group" aria-label={g.title}><h2>{g.title}</h2><div>{g.content}</div></section>)}</div></div>}
export function MatchingBoard({children}:{children:ReactNode}){return <div className="v-matching-board">{children}</div>}
export function ConveyorBoard({children}:{children:ReactNode}){return <div className="v-conveyor-board">{children}</div>}
export function TransformationBoard({children}:{children:ReactNode}){return <div className="v-transformation-board">{children}</div>}

