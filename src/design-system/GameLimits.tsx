import {useEffect,useRef,useState} from 'react';
import {Challenges,Icon} from '../GameUI.tsx';
import {automaticLives,manualLives,spendLives,type LifeMode} from '../life-policy.ts';
export function LifeControls({lives,mode,disabled,onSpend,onUndo}:{lives:number;mode:LifeMode;disabled:boolean;onSpend:()=>void;onUndo:()=>void}){
 return <span className="life-controls"><button type="button" className="link hearts" aria-label={'Жизни: '+lives+'; снять половину жизни'} disabled={disabled||!manualLives(mode)} onClick={onSpend}>{Array.from({length:5},(_,i)=><span key={i} className="life-heart life-heart-svg" style={{opacity:lives-i>=1?1:lives-i===.5?.5:.23}}><Icon name="Heart"/></span>)}</button><button type="button" className="icon-button" aria-label="Снять половину жизни" disabled={disabled||!manualLives(mode)} onClick={onSpend}>−</button><button type="button" className="icon-button" aria-label="Вернуть жизнь" onClick={onUndo}>↶</button></span>;
}
export function useGameLimits(active:boolean,paused:boolean){
 const [timed,setTimed]=useState(false),[seconds,setSeconds]=useState(120),[withLives,setWithLives]=useState(false),[mode,setMode]=useState<LifeMode>('manual');
 const [remaining,setRemaining]=useState(120),[lives,setLives]=useState(5);const undo=useRef<number|null>(null);
 const lost=timed&&remaining===0?'Время закончилось':withLives&&lives===0?'Жизни закончились':'';
 const spend=(errors=1)=>setLives(v=>{undo.current=v;return spendLives(v,errors)});
 const restore=()=>{if(undo.current!==null){setLives(undo.current);undo.current=null}};
 useEffect(()=>{if(!active||paused||lost||!timed)return;const t=setInterval(()=>setRemaining(n=>Math.max(0,n-1)),1000);return()=>clearInterval(t)},[active,paused,lost,timed]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(!active||paused||!withLives||e.repeat||(e.target as HTMLElement).closest('input,select,textarea'))return;if(e.key==='F8'&&!lost&&manualLives(mode)){e.preventDefault();spend()}if(e.key==='F9'){e.preventDefault();restore()}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[active,paused,withLives,mode,lost]);
 return {lost,reset:()=>{setRemaining(seconds);setLives(5);undo.current=null},mistake:(n=1)=>{if(withLives&&automaticLives(mode)&&active&&!paused&&!lost)spend(n)},settings:<Challenges timed={timed} setTimed={setTimed} seconds={seconds} setSeconds={setSeconds} lives={withLives} setLives={setWithLives} lifeMode={mode} setLifeMode={setMode}/>,status:<><span>{timed?remaining+' сек.':''}</span>{withLives&&<LifeControls lives={lives} mode={mode} disabled={!active||paused||!!lost} onSpend={()=>spend()} onUndo={restore}/>}</>};
}
