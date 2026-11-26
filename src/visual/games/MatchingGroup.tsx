import type {HTMLAttributes} from 'react';
/** Group geometry is independent from the meaning of its anchor and responses. */
export function MatchingGroup({className='',captionPosition,...props}:HTMLAttributes<HTMLElement>&{captionPosition?:'above'|'below'}){
 return <section {...props} className={['v-matching-group',className].filter(Boolean).join(' ')} data-caption-position={captionPosition}/>;
}
