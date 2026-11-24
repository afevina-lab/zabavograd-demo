import type {ButtonHTMLAttributes,CSSProperties,HTMLAttributes,ReactNode,Ref} from 'react';
export function Artwork({src,alt='',fit='contain'}:{src:string;alt?:string;fit?:'contain'|'cover'}){return <img className="v-artwork" src={src} alt={alt} style={{'--v-art-fit':fit} as CSSProperties}/>}
/** The browser paints a sliced frame as one border-image on the animated card itself. */
export type CardFrame='image'|'sliced';
export function CardButton({frame='image',className='v-card',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{frame?:CardFrame;ref?:Ref<HTMLButtonElement>}){
 return <button type="button" {...props} className={className} data-frame={frame}/>;
}
export function CardSurface({frame='image',className='v-card-surface',...props}:HTMLAttributes<HTMLDivElement>&{frame?:CardFrame;ref?:Ref<HTMLDivElement>}){
 return <div {...props} className={className} data-frame={frame}/>;
}
export function Card({children,label,selected=false,onClick,frame='image'}:{children:ReactNode;label:string;selected?:boolean;onClick?:()=>void;frame?:CardFrame}){
 return <CardButton frame={frame} aria-label={label} aria-pressed={selected} onClick={onClick}>{children}</CardButton>;
}
