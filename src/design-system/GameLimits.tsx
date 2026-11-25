import {SessionTime} from '../visual/primitives/SessionTime.tsx';
import {LifeMeter} from '../visual/primitives/LifeMeter.tsx';
import {useEffect,useRef,useState} from 'react';
import {ChallengeSettings as Challenges} from './ChallengeSettings.tsx';
import {automaticLives,manualLives,spendLives,type LifeMode} from '../life-policy.ts';
export function useElapsedTime(active:boolean,paused:boolean){
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{if(!active||paused)return;const timer=setInterval(()=>setElapsed(value=>value+1),1000);return()=>clearInterval(timer)},[active,paused]);
 return {reset:()=>setElapsed(0),status:<SessionTime seconds={elapsed} className="toolbar-session-progress"/>};
}
export function LifeControls({lives,mode,disabled,onSpend,onUndo,maximum=5}:{maximum?:number;lives:number;mode:LifeMode;disabled:boolean;onSpend:()=>void;onUndo:()=>void}){
 return <LifeMeter lives={lives} maximum={maximum} disabled={disabled} manual={manualLives(mode)} onSpend={onSpend} onUndo={onUndo}/>;
}
export function useGameLimits(active:boolean,paused:boolean){
 const [lifeCount,setLifeCount]=useState(5);

 const [timed,setTimed]=useState(false),[seconds,setSeconds]=useState(120),[withLives,setWithLives]=useState(false),[mode,setMode]=useState<LifeMode>('manual');
 const [remaining,setRemaining]=useState(120),[lives,setLives]=useState(5);const undo=useRef<number|null>(null);
 const lost=timed&&remaining===0?'Время закончилось':withLives&&lives===0?'Жизни закончились':'';
 const clock=useElapsedTime(active&&!lost,paused);
 const spend=(errors=1)=>setLives(v=>{undo.current=v;return spendLives(v,errors)});
 const restore=()=>{if(undo.current!==null){setLives(undo.current);undo.current=null}};
 useEffect(()=>{if(!active||paused||lost||!timed)return;const t=setInterval(()=>setRemaining(n=>Math.max(0,n-1)),1000);return()=>clearInterval(t)},[active,paused,lost,timed]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(!active||paused||!withLives||e.repeat||(e.target as HTMLElement).closest('input,select,textarea'))return;if(e.key==='F8'&&!lost&&manualLives(mode)){e.preventDefault();spend()}if(e.key==='F9'){e.preventDefault();restore()}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[active,paused,withLives,mode,lost]);
 return {lost,reset:()=>{clock.reset();setRemaining(seconds);setLives(lifeCount);undo.current=null},mistake:(n=1)=>{if(withLives&&automaticLives(mode)&&active&&!paused&&!lost)spend(n)},settings:<Challenges lifeCount={lifeCount} setLifeCount={setLifeCount} timed={timed} setTimed={setTimed} seconds={seconds} setSeconds={setSeconds} lives={withLives} setLives={setWithLives} lifeMode={mode} setLifeMode={setMode}/>,status:<>{clock.status}{timed&&<span className="toolbar-timer">{remaining} сек.</span>}{withLives&&<LifeControls maximum={lifeCount} lives={lives} mode={mode} disabled={!active||paused||!!lost} onSpend={()=>spend()} onUndo={restore}/>}</>};
}



