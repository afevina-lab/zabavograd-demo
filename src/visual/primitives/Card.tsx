import type {CSSProperties,ReactNode} from 'react';
export function Artwork({src,alt='',fit='contain'}:{src:string;alt?:string;fit?:'contain'|'cover'}){return <img className="v-artwork" src={src} alt={alt} style={{'--v-art-fit':fit} as CSSProperties}/>}
/** The browser paints a sliced frame as one border-image on the animated card itself. */
export function Card({children,label,selected=false,onClick,frame='image'}:{children:ReactNode;label:string;selected?:boolean;onClick?:()=>void;frame?:'image'|'sliced'}){
 return <button type="button" className="v-card" data-frame={frame} aria-label={label} aria-pressed={selected} onClick={onClick}>{children}</button>;
}
