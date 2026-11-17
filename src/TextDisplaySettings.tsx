import type {Learning} from './learning.ts';
export function TextDisplaySettings({l,setL}:{l:Learning;setL:(l:Learning)=>void}){return <label className="check text-display-setting"><input type="checkbox" checked={!!l.reading?.splitSyllables} onChange={e=>setL({...l,reading:{...l.reading,splitSyllables:e.target.checked}})}/>Разделить на слоги</label>}
