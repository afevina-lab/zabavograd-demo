import type {ButtonHTMLAttributes,CSSProperties,HTMLAttributes,ReactNode,Ref} from 'react';
export function Artwork({src,alt='',fit='contain'}:{src:string;alt?:string;fit?:'contain'|'cover'}){return <img className="v-artwork" src={src} alt={alt} style={{'--v-art-fit':fit} as CSSProperties}/>}
/** The complete watercolor artwork moves with its card, without texture joins. */
export type CardFeedback='idle'|'wrong'|'correct'|'matched';
type CardState={feedback?:CardFeedback;entering?:boolean};
export function CardButton({feedback='idle',entering=false,className='v-card',...props}:ButtonHTMLAttributes<HTMLButtonElement>&CardState&{ref?:Ref<HTMLButtonElement>}){
 return <button type="button" {...props} className={['v-card',className].filter(Boolean).filter((value,index,array)=>array.indexOf(value)===index).join(' ')} data-feedback={feedback} data-entering={entering||undefined}/>;
}
export function CardSurface({feedback='idle',entering=false,className='v-card-surface',...props}:HTMLAttributes<HTMLDivElement>&CardState&{ref?:Ref<HTMLDivElement>}){
 return <div {...props} className={['v-card-surface',className].filter(Boolean).filter((value,index,array)=>array.indexOf(value)===index).join(' ')} data-feedback={feedback} data-entering={entering||undefined}/>;
}
export function Card({children,label,selected=false,onClick}:{children:ReactNode;label:string;selected?:boolean;onClick?:()=>void}){
 return <CardButton aria-label={label} aria-pressed={selected} onClick={onClick}>{children}</CardButton>;
}


