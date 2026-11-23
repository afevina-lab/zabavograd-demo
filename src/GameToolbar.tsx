import {Children,Fragment,cloneElement,isValidElement,useState,type ReactNode} from 'react';
import {Icon} from './GameUI.tsx';
import {setGameSound} from './design-system/game-audio.ts';
/** Navigation is identical at every width; games supply their own status and toggles. */
export function GameToolbar({children,task='Назови верно'}:{children:ReactNode;task?:string}){
 const actions:ReactNode[]=[],status:ReactNode[]=[],view:ReactNode[]=[];
 const [sound,setSound]=useState(true),[hint,setHint]=useState(false);
 function collect(nodes:ReactNode){Children.toArray(nodes).forEach(node=>{
  if(!isValidElement<{className?:string;'aria-label'?:string;children?:ReactNode}>(node)){status.push(node);return;}
  const props=node.props,label=props['aria-label']||'';
  if(props.className?.split(' ').includes('lesson-tag'))return;
  if(props.className?.split(' ').some(name=>name==='game-actions'||name==='counters')){collect(props.children);return;}
  if(/экран/i.test(label)){view.push(node);return;}
  if(node.type==='button'||node.type==='a'||node.type==='label'){
   if(/^(Пауза|Продолжить)$/.test(label))actions[0]=cloneElement(node,{className:'icon-button toolbar-pause',children:<Icon name={label==='Продолжить'?'Play':'Pause'}/>});
   else if(/звук/i.test(label))actions[1]=node;
   else if(/подпис|подсказ/i.test(label))actions[2]=node;
   return;
  }
  status.push(node);
 });}
 collect(children);
 actions[0]??=<button type="button" className="icon-button toolbar-pause" aria-label="Пауза" disabled><Icon name="Pause"/></button>;
 actions[1]??=<button type="button" className="icon-button" aria-label={sound?'Выключить звук':'Включить звук'} onClick={()=>{setSound(v=>!v);setGameSound(!sound)}}><Icon name={sound?'Sound':'SoundOff'}/></button>;
 actions[2]??=<button type="button" className="icon-button" aria-label="Подсказка" aria-pressed={hint} onClick={()=>setHint(v=>!v)}><Icon name="Question"/></button>;
 return <div className="play-toolbar shared-toolbar"><div className="toolbar-left">{actions.map((action,i)=><Fragment key={i}>{action}</Fragment>)}</div><div className="toolbar-centre"><strong className="toolbar-task">{task}</strong><div className="counters">{status}</div></div><div className="toolbar-right">{view.length?view:<button type="button" className="icon-button" aria-label="Полный экран" onClick={e=>{if(document.fullscreenElement)void document.exitFullscreen();else void e.currentTarget.closest('.app')?.requestFullscreen()}}><Icon name="Sight"/></button>}</div>{hint&&<p className="toolbar-hint" role="status">{task}</p>}</div>;
}
