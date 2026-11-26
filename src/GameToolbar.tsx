import {useState,type ReactNode} from 'react';
import {Toolbar,type ToolbarClasses} from './visual/compositions/Toolbar.tsx';
import {IconButton} from './visual/primitives/Buttons.tsx';
import {setGameSound} from './design-system/game-audio.ts';
export type GameToolbarSlots={pause?:ReactNode;sound?:ReactNode;hint?:ReactNode;status:ReactNode;fullscreen?:ReactNode;task?:string};
/** The caller names each action; labels are accessibility text, never routing keys. */
export function GameToolbar({pause,sound:providedSound,hint:providedHint=null,status,fullscreen,task='Назови верно'}:GameToolbarSlots){
 const [sound,setSound]=useState(true);
 const pauseAction=pause??<IconButton size="toolbar" className="icon-button toolbar-pause" label="Пауза" icon="Pause" disabled/>;
 const soundAction=providedSound??<IconButton size="toolbar" className="icon-button" label={sound?'Выключить звук':'Включить звук'} icon={sound?'Sound':'SoundOff'} onClick={()=>{setSound(v=>!v);setGameSound(!sound)}}/>;
 const hintAction=providedHint;
 return <Toolbar pause={pauseAction} sound={soundAction} hint={hintAction} task={task} counters={status} fullscreen={fullscreen??<IconButton size="toolbar" className="icon-button" label="Полный экран" icon="Sight" onClick={e=>{if(document.fullscreenElement)void document.exitFullscreen();else void e.currentTarget.closest('.app')?.requestFullscreen()}}/>}/>;
}
