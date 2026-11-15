import {Children,isValidElement,type ReactNode} from 'react';
import {Icon} from './GameUI.tsx';

/** Games supply actions and status; one shared shell owns grouping and placement. */
export function GameToolbar({children}:{children:ReactNode}){
 const controls:ReactNode[]=[],status:ReactNode[]=[],view:ReactNode[]=[];
 function collect(nodes:ReactNode){Children.toArray(nodes).forEach(node=>{
  if(!isValidElement<{className?:string;'aria-label'?:string;children?:ReactNode}>(node)){status.push(node);return;}
  const props=node.props;
  if(props.className?.split(' ').some(name=>name==='game-actions'||name==='counters')){collect(props.children);return;}
  if(/экран/i.test(props['aria-label']||'')){view.push(node);return;}
  if(node.type==='button'||node.type==='a'||node.type==='label'){controls.push(node);return;}
  status.push(node);
 });}
 collect(children);
 return <div className="play-toolbar shared-toolbar"><div className="toolbar-left">{controls}</div><div className="toolbar-centre"><div className="counters">{status}</div></div><div className="toolbar-right">{view.length?view:<button className="icon-button" aria-label="Полный экран" onClick={e=>{if(document.fullscreenElement)void document.exitFullscreen();else void e.currentTarget.closest('.app')?.requestFullscreen()}}><Icon name="Sight"/></button>}</div></div>;
}
