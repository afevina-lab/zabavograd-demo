import type {ButtonHTMLAttributes,ReactNode} from 'react';
export function Chip({children,selected,className='v-chip',...props}:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'aria-pressed'>&{children:ReactNode;selected:boolean}){return <button type="button" {...props} className={className} aria-pressed={selected}>{children}</button>}
