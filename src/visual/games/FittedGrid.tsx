import {balancedRows,fittedGrid} from './geometry.ts';
import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
/** Every item remains visible; compact, balanced rows share measured geometry. */
export function FittedGrid<T>({items,label,preferred=360,groups=false,align="center",render}:{items:readonly T[];label:string;preferred?:number;groups?:boolean;align?:"start"|"center";render:(item:T,index:number,total:number,width:number,size:number,height:number)=>ReactNode}){
 const ref=useRef<HTMLDivElement>(null),[bounds,setBounds]=useState({width:1,height:1});
 useLayoutEffect(()=>{const node=ref.current;if(!node)return;const observer=new ResizeObserver(([entry])=>setBounds({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(node);return()=>observer.disconnect()},[]);
 const {columns,rows,size,gap}=fittedGrid(items.length,bounds.width,bounds.height,preferred,groups),lengths=balancedRows(items.length,rows),width=groups?(bounds.width-gap*(columns-1))/columns:size,height=groups?(bounds.height-gap*(rows-1))/rows:size;
 let offset=0;
 return <div ref={ref} className="v-fitted-grid" aria-label={label} data-groups={groups} style={{alignContent:groups?'stretch':align,gap,gridTemplateRows:'repeat('+Math.max(1,lengths.length)+','+(groups?'minmax(0,1fr)':size+'px')+')'}}>{lengths.map((length,row)=>{const start=offset;offset+=length;return <div className="v-fitted-grid-row" key={row} style={{gap}}>{items.slice(start,offset).map((item,col)=><div className="v-fitted-grid-cell" key={start+col} style={{width:Math.max(1,width),height:'100%'}}>{render(item,start+col,items.length,width,size,height)}</div>)}</div>})}</div>;
}
