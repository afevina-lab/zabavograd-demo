import {RangeControl} from './Range.tsx';
export {ThemeChoice} from './ThemeChoice.tsx';
export function Range({value,onChange,...props}:{label:string;value:readonly [number,number];min:number;max:number;onChange:(next:[number,number])=>void;disabled?:boolean}){
 return <RangeControl {...props} from={value[0]} to={value[1]} onChange={(from,to)=>onChange([from,to])}/>;
}

