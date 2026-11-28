import {useEffect,useRef} from 'react';
import {mountLocation} from '../scene-engine/locations.mjs';
/** The same data and compiler used by Studio; independent of game rules. */
export function LocationScene({location}:{location:string}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!ref.current)return;const scene=mountLocation(ref.current,location,{base:import.meta.env.BASE_URL});return()=>scene.destroy();},[location]);
 return <div className="v-scene-layers" ref={ref} aria-hidden="true"/>;
}
