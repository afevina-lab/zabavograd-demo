import type {ReactNode} from 'react';
import {MaterialSettingsShell} from './MaterialSettingsShell.tsx';
import {SettingsTitle} from '../visual/compositions/SettingsTitle.tsx';
export type ExplicitSettingsSlots={taskSearch?:ReactNode;primary:ReactNode;secondary:ReactNode;appearance:ReactNode;footer:ReactNode;intro?:ReactNode;supplementary?:ReactNode;contentClassName?:string;contentAs?:'main'|'div'|'aside'|'section'};
export function SettingsGroup({disabled,children}:{disabled:boolean;children:ReactNode}){return disabled?<fieldset className="v-settings-fieldset setup-section-fieldset" disabled>{children}</fieldset>:<>{children}</>}
/** All games use the same shell; this adapter only preserves classes during CSS migration. */
export function SettingsWindow({game,layout}:{game:string;layout:ExplicitSettingsSlots}){
 return <MaterialSettingsShell taskSearch={layout.taskSearch} title={game} contentAs={layout.contentAs} contentClassName={layout.contentClassName} leading={layout.intro} primary={layout.primary} secondary={layout.secondary} appearance={layout.appearance} footer={layout.footer} supplementary={layout.supplementary}
  heading={<SettingsTitle title={game}/>}
 />;
}


