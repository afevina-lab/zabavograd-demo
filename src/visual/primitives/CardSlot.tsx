import type {ButtonHTMLAttributes} from 'react';
export function CardSlot({className='v-card-slot',children='+',...props}:ButtonHTMLAttributes<HTMLButtonElement>){return <button type="button" {...props} className={className}>{children}</button>}
