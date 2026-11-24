import type {HTMLAttributes,Ref} from 'react';
export function ConveyorTrack({className='v-conveyor-track',...props}:HTMLAttributes<HTMLDivElement>&{ref?:Ref<HTMLDivElement>}){
 return <div {...props} className={className}/>;
}
