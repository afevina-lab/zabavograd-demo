import type {ReactNode} from 'react';
export function PopoverTip({children,className=''}:{children:ReactNode;className?:string}){
 return <span popover="manual" role="tooltip" className={['v-popover-tip v-surface--panel',className].filter(Boolean).join(' ')}>{children}</span>;
}
