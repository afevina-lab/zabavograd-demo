import {ToggleGroup} from './visual/primitives/ToggleGroup.tsx';
import {Choice} from './visual/primitives/Choice.tsx';
import {RangeSlider} from './design-system/RangeSlider.tsx';
import type {Learning} from './learning.ts';
import {defaultMath,MATH_STOPS} from './math-material.ts';
import {QuantitySlider} from './QuantitySlider.tsx';
export function MathSettingsPanel({l,setL}:{l:Learning;setL:(l:Learning)=>void}){
 const m={...defaultMath,...l.math};
 const update=(patch:Partial<typeof m>)=>setL({...l,math:{...m,...patch}});
 return <section className="v-math-settings math-settings">
  <ToggleGroup<'examples'|'composition'> label="Вид математического задания" value={m.kind} options={[{value:"examples",label:"Примеры"},{value:"composition",label:"Состав числа"}]} onChange={kind=>update({kind})}/>
  {m.kind==='examples'&&!m.answerOnly?<RangeSlider values={[0,...MATH_STOPS]} label="Ответы в диапазоне" min={m.includeZero!==false?0:1} max={1000} from={m.from??0} to={m.target} onChange={(from,target)=>update({from,target})}/>:<QuantitySlider label={m.kind==='composition'?'Состав числа':m.answerOnly?'Ответ в этой группе':'Числа в пределах'} value={m.target} min={1} max={1000} values={MATH_STOPS} onChange={target=>update({target})}/>}
  {m.kind==='examples'&&<div className="v-reading-kinds reading-kinds">
   <Choice className="v-choice check" label="Сложение" checked={m.add} onChange={add=>update({add})}/>
   <Choice className="v-choice check" label="Вычитание" checked={m.subtract} onChange={subtract=>update({subtract})}/>
   <Choice className="v-choice check" label="Умножение" checked={m.multiply===true} onChange={multiply=>update({multiply})}/>
   <Choice className="v-choice check" label="Деление" checked={m.divide===true} onChange={divide=>update({divide})}/>
  </div>}
  <Choice className="v-choice check" kind="switch" label="Включить 0" checked={m.includeZero!==false} onChange={includeZero=>update({includeZero})}/>
 </section>;
}


