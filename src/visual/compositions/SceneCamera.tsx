import type {HTMLAttributes,Ref} from 'react';
/** One transform owner for the scene and cards; callers may set the measured origin. */
export function SceneCamera({className='v-scene-camera',...props}:HTMLAttributes<HTMLDivElement>&{ref?:Ref<HTMLDivElement>}){
 return <div {...props} className={className}/>;
}
