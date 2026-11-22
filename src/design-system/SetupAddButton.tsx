import {ControlWell} from './ControlWell.tsx';
import type {ButtonHTMLAttributes,ReactNode} from 'react';

/** One standard add-rule / add-exclusion action across all game setup screens. */
export function SetupAddButton({children,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{children:ReactNode}){
 return <button {...props} type="button" className={['setup-add-rule',props.className].filter(Boolean).join(' ')}>
  <span>{children}</span><ControlWell symbol="plus"/>
 </button>;
}
