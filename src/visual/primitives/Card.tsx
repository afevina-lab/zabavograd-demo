import type {ButtonHTMLAttributes,CSSProperties,HTMLAttributes,ReactNode,Ref} from 'react';
export function Artwork({src,alt='',fit='contain'}:{src:string;alt?:string;fit?:'contain'|'cover'}){return <img className="v-artwork" src={src} alt={alt} style={{'--v-art-fit':fit} as CSSProperties}/>}
/** The browser paints a sliced frame as one border-image on the animated card itself. */
export type CardFrame='image'|'sliced';
export type CardFeedback='idle'|'wrong'|'correct'|'matched';
type CardState={frame?:CardFrame;feedback?:CardFeedback;entering?:boolean};
export function CardButton({frame='image',feedback='idle',entering=false,className='v-card',...props}:ButtonHTMLAttributes<HTMLButtonElement>&CardState&{ref?:Ref<HTMLButtonElement>}){
 return <button type="button" {...props} className={['v-card',className].filter(Boolean).filter((value,index,array)=>array.indexOf(value)===index).join(' ')} data-frame={frame} data-feedback={feedback} data-entering={entering||undefined}/>;
}
export function CardSurface({frame='image',feedback='idle',entering=false,className='v-card-surface',...props}:HTMLAttributes<HTMLDivElement>&CardState&{ref?:Ref<HTMLDivElement>}){
 return <div {...props} className={['v-card-surface',className].filter(Boolean).filter((value,index,array)=>array.indexOf(value)===index).join(' ')} data-frame={frame} data-feedback={feedback} data-entering={entering||undefined}/>;
}
export function Card({children,label,selected=false,onClick,frame='image'}:{children:ReactNode;label:string;selected?:boolean;onClick?:()=>void;frame?:CardFrame}){
 return <CardButton frame={frame} aria-label={label} aria-pressed={selected} onClick={onClick}>{children}</CardButton>;
}


