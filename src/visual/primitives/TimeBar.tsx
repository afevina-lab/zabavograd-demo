import {visualClasses} from './classNames.ts';
import type {CSSProperties} from 'react';
const classes={root:'v-time-bar',fill:'v-time-fill'};
export function TimeBar({value,maximum,label='Оставшееся время',classNames=classes}:{value:number;maximum:number;label?:string;classNames?:typeof classes}){
 classNames=visualClasses(classes,classNames);
 const ratio=maximum>0?Math.max(0,Math.min(1,value/maximum)):0;
 const style={width:ratio*100+'%',background:`hsl(${ratio*110},48%,48%)`} as CSSProperties;
 return <div className={classNames.root} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={Math.max(0,maximum)} aria-valuenow={Math.max(0,Math.min(maximum,value))}><div className={classNames.fill||undefined} style={style}/></div>;
}

