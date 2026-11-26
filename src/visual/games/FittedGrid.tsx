import {fittedGrid} from './geometry.ts';
import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
/** Measures the available field and fits every item; gameplay never scrolls or paginates. */
export function FittedGrid<T>({items,label,preferred=320,groups=false,align="center",render}:{items:readonly T[];label:string;preferred?:number;groups?:boolean;align?:"start"|"center";render:(item:T,index:number,total:number,width:number,size:number)=>ReactNode}){
 const ref=useRef<HTMLDivElement>(null),[bounds,setBounds]=useState({width:1,height:1});
 useLayoutEffect(()=>{const node=ref.current;if(!node)return;const observer=new ResizeObserver(([entry])=>setBounds({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(node);return()=>observer.disconnect()},[]);
 const w=Math.max(1,bounds.width),{columns,rows,size}=fittedGrid(items.length,w,bounds.height,preferred,groups);
 return <div ref={ref} className="v-fitted-grid" aria-label={label} data-groups={groups} style={{justifyContent:'center',alignContent:groups?'stretch':align,gridTemplateColumns:'repeat('+columns+','+(groups?'minmax(0,1fr)':size+'px')+')',gridTemplateRows:'repeat('+rows+','+(groups?'minmax(0,1fr)':size+'px')+')'}}>{items.map((item,index)=><div className="v-fitted-grid-cell" key={index}>{render(item,index,items.length,(w-8*(columns-1))/columns,size)}</div>)}</div>;
}
