import {Icon} from '../primitives/Icon.tsx';
export function SettingsTitle({title,className=''}:{title:string;className?:string}){
 return <div className={['v-settings-title',className].filter(Boolean).join(' ')}><span className="v-settings-emblem settings-adventure-emblem" aria-hidden="true"><Icon name="Star"/></span><h2>{title}</h2></div>;
}
