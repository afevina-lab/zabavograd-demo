import {useState,type ReactNode} from 'react';
import {IconButton} from './visual/primitives/Buttons.tsx';
import {setGameSound} from './design-system/game-audio.ts';
export type GameToolbarSlots={pause?:ReactNode;sound?:ReactNode;hint?:ReactNode;status:ReactNode;fullscreen?:ReactNode;task?:string};
/** The caller names each action; labels are accessibility text, never routing keys. */
export function GameToolbar({pause,sound:providedSound,hint:providedHint,status,fullscreen,task='Назови верно'}:GameToolbarSlots){
 const [sound,setSound]=useState(true),[hint,setHint]=useState(false);
 const pauseAction=pause??<IconButton size="toolbar" className="icon-button toolbar-pause" label="Пауза" icon="Pause" disabled/>;
 const soundAction=providedSound??<IconButton size="toolbar" className="icon-button" label={sound?'Выключить звук':'Включить звук'} icon={sound?'Sound':'SoundOff'} onClick={()=>{setSound(v=>!v);setGameSound(!sound)}}/>;
 const hintAction=providedHint??<IconButton size="toolbar" className="icon-button" label="Подсказка" icon="Question" aria-pressed={hint} onClick={()=>setHint(v=>!v)}/>;
 return <div className="play-toolbar shared-toolbar"><div className="toolbar-left">{pauseAction}{soundAction}{hintAction}</div><div className="toolbar-centre"><strong className="toolbar-task">{task}</strong><div className="counters">{status}</div></div><div className="toolbar-right">{fullscreen??<IconButton size="toolbar" className="icon-button" label="Полный экран" icon="Sight" onClick={e=>{if(document.fullscreenElement)void document.exitFullscreen();else void e.currentTarget.closest('.app')?.requestFullscreen()}}/>}</div>{hint&&<p className="toolbar-hint" role="status">{task}</p>}</div>;
}
