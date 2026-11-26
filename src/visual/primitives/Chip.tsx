import {Button} from './Buttons.tsx';
import type {ButtonHTMLAttributes,ReactNode} from 'react';
export function Chip({children,selected,className='v-chip',...props}:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'aria-pressed'>&{children:ReactNode;selected:boolean}){return <Button {...props} tone="secondary" size="chip" className={className} aria-pressed={selected}>{children}</Button>}
