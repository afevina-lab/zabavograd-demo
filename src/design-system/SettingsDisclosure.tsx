import {Disclosure} from '../visual/primitives/Disclosure.tsx';
import type {ReactNode} from 'react';
const classes={root:'settings-disclosure',icon:'setup-action-icon',copy:'setup-action-copy',well:'control-well disclosure-well',body:'settings-disclosure-body'};
export function SettingsDisclosure({title,description,icon,children,className=''}:{title:string;description:string;icon:string;children:ReactNode;className?:string}){
 return <Disclosure title={title} description={description} icon={icon==='Heart'?<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21 3 12C-3 5 6-2 12 5c6-7 15 0 9 7Z"/></svg>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6m8 0v6M9 15v6"/></svg>} className={className} classNames={classes}>{children}</Disclosure>;
}

