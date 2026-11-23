import type React from 'react';
import {useEffect,useRef,useState} from 'react';
import {MOTION} from './motion.ts';
import {Challenges} from '../GameUI.tsx';
import {automaticLives,manualLives,spendLives,type LifeMode} from '../life-policy.ts';
export function useElapsedTime(active:boolean,paused:boolean){
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{if(!active||paused)return;const timer=setInterval(()=>setElapsed(value=>value+1),1000);return()=>clearInterval(timer)},[active,paused]);
 return {reset:()=>setElapsed(0),status:<span className="toolbar-session-progress" aria-label="Прошло времени">Время <b>{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</b></span>};
}
export function LifeControls({lives,mode,disabled,onSpend,onUndo,maximum=5}:{maximum?:number;lives:number;mode:LifeMode;disabled:boolean;onSpend:()=>void;onUndo:()=>void}){
 const previous=useRef(lives),[fading,setFading]=useState<{index:number;amount:number;key:number}[]>([]);
 useEffect(()=>{const before=previous.current;previous.current=lives;if(lives>=before){setFading([]);return;}setFading(Array.from({length:maximum},(_,index)=>({index,amount:Math.max(0,Math.min(1,before-index)),key:Date.now()})).filter(v=>v.amount>Math.max(0,Math.min(1,lives-v.index))));const timer=setTimeout(()=>setFading([]),MOTION.lifeLossMs);return()=>clearTimeout(timer)},[lives,maximum]);
 return <span className="life-controls"><button type="button" className="link hearts" aria-label={'Жизни: '+lives+'; снять половину жизни'} disabled={disabled||!manualLives(mode)} title="Нажатие или F8 — снять половину жизни. F9 или контекстное меню — отменить." onContextMenu={e=>{e.preventDefault();onUndo()}} onClick={onSpend}>{Array.from({length:maximum},(_,i)=>{const amount=Math.max(0,Math.min(1,lives-i));return <span key={i} className="life-heart life-heart-art">{amount>0&&<img alt="" className={amount===.5?'heart-half':'heart-full'} src={import.meta.env.BASE_URL+'assets/rewards/'+(amount===.5?'heart-half':'heart')+'.webp'}/>} {fading.filter(f=>f.index===i).map(f=><img key={f.key} alt="" className={'heart-leaving '+(f.amount===.5?'heart-half':'heart-full')} style={{'--zg-life-loss-duration':MOTION.lifeLossMs+'ms'} as React.CSSProperties} src={import.meta.env.BASE_URL+'assets/rewards/'+(f.amount===.5?'heart-half':'heart')+'.webp'}/>)}</span>})}</button></span>;
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
