import {useId,type ReactNode} from 'react';
export function Tooltip({label,children}:{label:string;children:ReactNode}){const id=useId();return <span className="v-tooltip" tabIndex={0} aria-describedby={id}>{children}<span id={id} role="tooltip">{label}</span></span>}
