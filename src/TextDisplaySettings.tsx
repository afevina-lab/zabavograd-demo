import {Choice} from './visual/primitives/Choice.tsx';
import type {Learning} from './learning.ts';
export function TextDisplaySettings({l,setL}:{l:Learning;setL:(l:Learning)=>void}){return <Choice className="v-choice v-text-display-setting check text-display-setting" kind="switch" label="Разделить на слоги" checked={!!l.reading?.splitSyllables} onChange={splitSyllables=>setL({...l,reading:{...l.reading,splitSyllables}})}/>}
