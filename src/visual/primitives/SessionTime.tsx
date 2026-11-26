export function SessionTime({seconds,label='Время',className=''}:{seconds:number;label?:string;className?:string}){
 const value=Math.max(0,Math.floor(seconds));
 return <span className={['v-session-time',className].filter(Boolean).join(' ')} aria-label={label==='Время'?'Прошло времени':label}>{label} <b>{Math.floor(value/60)}:{String(value%60).padStart(2,'0')}</b></span>;
}
