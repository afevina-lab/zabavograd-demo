import type {ReactNode} from 'react';
/** A single owner separates the artwork area from its optional caption. */
export function CardContent({artwork,caption,text}:{artwork?:ReactNode;caption?:ReactNode;text?:ReactNode}){
 return <div className="v-card-content">{artwork?<div className="v-card-artwork">{artwork}</div>:<span className="v-card-text">{text}</span>}{caption!=null&&<small className="v-card-caption">{caption}</small>}</div>;
}
