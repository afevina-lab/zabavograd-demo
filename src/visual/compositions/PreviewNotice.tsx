import {Button} from '../primitives/Buttons.tsx';
export function PreviewNotice({seconds,onStart,className=''}:{seconds:number;onStart:()=>void;className?:string}){
 return <div className={['v-preview-banner',className].filter(Boolean).join(' ')}><span>Запоминаем</span><span role="timer" aria-live="off">{seconds} сек.</span><Button tone="secondary" className="secondary" onClick={onStart}>Начать сейчас</Button></div>;
}
