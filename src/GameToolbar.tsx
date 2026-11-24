import {useState,type ReactNode} from 'react';
import {Icon} from './GameUI.tsx';
import {setGameSound} from './design-system/game-audio.ts';
export type GameToolbarSlots={pause?:ReactNode;sound?:ReactNode;hint?:ReactNode;status:ReactNode;fullscreen?:ReactNode;task?:string};
/** The caller names each action; labels are accessibility text, never routing keys. */
export function GameToolbar({pause,sound:providedSound,hint:providedHint,status,fullscreen,task='Назови верно'}:GameToolbarSlots){
 const [sound,setSound]=useState(true),[hint,setHint]=useState(false);
 const pauseAction=pause??<button type="button" className="icon-button toolbar-pause" aria-label="Пауза" disabled><Icon name="Pause"/></button>;
 const soundAction=providedSound??<button type="button" className="icon-button" aria-label={sound?'Выключить звук':'Включить звук'} onClick={()=>{setSound(v=>!v);setGameSound(!sound)}}><Icon name={sound?'Sound':'SoundOff'}/></button>;
 const hintAction=providedHint??<button type="button" className="icon-button" aria-label="Подсказка" aria-pressed={hint} onClick={()=>setHint(v=>!v)}><Icon name="Question"/></button>;
 return <div className="play-toolbar shared-toolbar"><div className="toolbar-left">{pauseAction}{soundAction}{hintAction}</div><div className="toolbar-centre"><strong className="toolbar-task">{task}</strong><div className="counters">{status}</div></div><div className="toolbar-right">{fullscreen??<button type="button" className="icon-button" aria-label="Полный экран" onClick={e=>{if(document.fullscreenElement)void document.exitFullscreen();else void e.currentTarget.closest('.app')?.requestFullscreen()}}><Icon name="Sight"/></button>}</div>{hint&&<p className="toolbar-hint" role="status">{task}</p>}</div>;
}
