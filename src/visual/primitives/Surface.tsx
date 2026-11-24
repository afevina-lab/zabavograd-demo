import type {ReactNode} from 'react';
export function Surface({kind='panel',children,className=''}:{kind?:'panel'|'field';children:ReactNode;className?:string}){return <div className={`v-surface v-surface--${kind} ${className}`}>{children}</div>}
