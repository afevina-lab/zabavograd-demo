import {useId,type ReactNode} from 'react';
import {Surface} from '../primitives/Controls.tsx';
import {DialogContent} from './DialogContent.tsx';
export {DialogActions} from './DialogActions.tsx';
export {SettingsLayout,type SettingsSlots} from './SettingsLayout.tsx';
export {Toolbar} from './Toolbar.tsx';
export function GameLayout({toolbar,scene,board,overlay}:{toolbar:ReactNode;scene?:ReactNode;board:ReactNode;overlay?:ReactNode}){return <div className="v-game">{toolbar}<main className="v-game-stage"><div className="v-game-scene" aria-hidden="true">{scene}</div><div className="v-game-board">{board}</div></main>{overlay}</div>}
/** Native dialog provides focus containment, inert background and Escape semantics. */
export function GameDialog({title,description,award,actions,onClose}:{title:string;description?:ReactNode;award?:ReactNode;actions:ReactNode;onClose:()=>void}){const id=useId();return <dialog className="v-game-dialog" aria-labelledby={id} ref={node=>{if(node&&!node.open)node.showModal()}} onCancel={e=>{e.preventDefault();onClose()}}><Surface><DialogContent title={title} titleId={id} description={description} award={award} actions={actions}/></Surface></dialog>}


