/** Shared decorative well inside a clickable select, summary or picker button. */
export function ControlWell({symbol='chevron',className=''}:{symbol?:'chevron'|'plus';className?:string}){return <span className={'v-control-well '+className} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={symbol==='plus'?'M12 5v14M5 12h14':'m6 9 6 6 6-6'}/></svg></span>}

