import type {ReactNode} from 'react';
import {MaterialSettingsShell} from './MaterialSettingsShell.tsx';
import {Icon} from '../visual/primitives/Icon.tsx';
import type {SettingsClasses} from '../visual/compositions/SettingsLayout.tsx';
export type ExplicitSettingsSlots={primary:ReactNode;secondary:ReactNode;appearance:ReactNode;footer:ReactNode;intro?:ReactNode;supplementary?:ReactNode;contentClassName?:string;contentAs?:'main'|'div'|'aside'|'section'};
const classes:SettingsClasses={backdrop:'settings-shade',frame:'settings-frame shared-settings-window',heading:'settings-window-heading',actions:'settings-header-actions',workspace:'setup-workspace',content:'settings unified-settings-content',columns:'setup-columns',column:'setup-column',notes:'setup-extra-notes',appearance:'setup-theme-rail',toggle:'setup-theme-toggle',appearanceScroll:'setup-theme-scroll',expanded:'is-expanded',footer:'setup-footer'};
const saveAppearance={dialog:{root:'sound-picker-dialog',scroll:'panel-scroll',actions:'sound-picker-actions',confirm:'secondary',cancel:'secondary'}};
export function SettingsGroup({disabled,children}:{disabled:boolean;children:ReactNode}){return disabled?<fieldset className="v-settings-fieldset setup-section-fieldset" disabled>{children}</fieldset>:<>{children}</>}
/** All games use the same shell; this adapter only preserves classes during CSS migration. */
export function SettingsWindow({game,layout}:{game:string;layout:ExplicitSettingsSlots}){
 return <MaterialSettingsShell title={game} classNames={classes} actionClassName="icon-button" saveAppearance={saveAppearance} contentAs={layout.contentAs} contentClassName={layout.contentClassName} leading={layout.intro} primary={layout.primary} secondary={layout.secondary} appearance={layout.appearance} footer={layout.footer} supplementary={layout.supplementary}
  heading={<div className="settings-adventure-title"><span className="settings-adventure-emblem" aria-hidden="true"><Icon name="Star"/></span><div><p className="settings-eyebrow">Забавоград · пора играть</p><h2>{game}</h2><span>Подготовка к игре</span></div></div>}
 />;
}
