import type {AnchorHTMLAttributes,ButtonHTMLAttributes,Ref} from 'react';
import {Icon} from './Icon.tsx';
export type ButtonSize='standard'|'stepper'|'launch';
export type IconButtonSize='standard'|'toolbar'|'heading'|'answer';
export function Button({tone='primary',size='standard',children,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{tone?:'primary'|'secondary'|'quiet';size?:ButtonSize}){
 return <button type="button" {...props} data-size={size} className={`v-control-button v-button v-button--${tone} ${className}`}>{children}</button>;
}
export function IconButton({label,icon,size='standard',...props}:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'aria-label'>&{label:string;icon:string;size?:IconButtonSize;ref?:Ref<HTMLButtonElement>}){
 return <button type="button" {...props} data-size={size} className={`v-control-button v-icon-button ${props.className||''}`} aria-label={label} title={label}><Icon name={icon}/></button>;
}
export function IconLink({label,icon,size='standard',className='',...props}:Omit<AnchorHTMLAttributes<HTMLAnchorElement>,'children'|'aria-label'|'href'>&{label:string;icon:string;href:string;size?:IconButtonSize}){
 return <a {...props} data-size={size} className={`v-control-button v-icon-button ${className}`} aria-label={label} title={label}><Icon name={icon}/></a>;
}

