import type {HTMLAttributes,Ref} from 'react';
export function ConveyorTrack({className='v-conveyor-track',...props}:HTMLAttributes<HTMLDivElement>&{ref?:Ref<HTMLDivElement>}){
 return <div {...props} className={['v-conveyor-track',className].filter(Boolean).join(' ')}/>;
}

