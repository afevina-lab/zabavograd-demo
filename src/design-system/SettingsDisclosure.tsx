import type {ReactNode} from 'react';

export function SettingsDisclosure({title,description,icon,children,className=''}:{title:string;description:string;icon:string;children:ReactNode;className?:string}){
 return <details className={'settings-disclosure '+className}><summary><span className="setup-action-icon" aria-hidden="true">{icon==='Heart'?<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21 3 12C-3 5 6-2 12 5c6-7 15 0 9 7Z"/></svg>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6m8 0v6M9 15v6"/></svg>}</span><span className="setup-action-copy"><strong>{title}</strong><small>{description}</small></span><span className="setup-disclosure-arrow" aria-hidden="true">⌄</span></summary><div className="settings-disclosure-body">{children}</div></details>;
}
