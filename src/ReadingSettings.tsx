import {useRef,useState} from 'react';
import {ControlWell} from './design-system/ControlWell.tsx';
import {RangeSlider} from './design-system/RangeSlider.tsx';
import {alphabet,vowels,consonants,readingOptions,contentKinds,effectivePatterns,syllablePatterns,maxWordLength,type ContentKind,type Pattern} from './reading.ts';
import type {Learning} from './learning.ts';
import type {Word} from './model.ts';

export function ReadingSettings({l,setL,words,textDisplayProvided=false}:{l:Learning;setL:(l:Learning)=>void;words:Word[];textDisplayProvided?:boolean}){
 const r=readingOptions(l),kinds=contentKinds(l),patterns=effectivePatterns(l),maximum=maxWordLength(words);
 const update=(part:Partial<typeof r>)=>setL({...l,reading:{...r,...part}});
 const toggle=(values:string[],v:string,on:boolean)=>on?[...new Set([...values,v])]:values.filter(x=>x!==v);
 const letterDialog=useRef<HTMLDialogElement>(null),letterTrigger=useRef<HTMLButtonElement>(null);
 const [draftAvailable,setDraftAvailable]=useState<string[]>(r.available);
 const [draftRequired,setDraftRequired]=useState<string[]>(r.required);
 const openLetters=()=>{setDraftAvailable([...r.available]);setDraftRequired([...r.required]);letterDialog.current?.showModal()};
 const closeLetters=()=>{letterDialog.current?.close();letterTrigger.current?.focus()};
 const saveLetters=()=>{update({available:draftAvailable,required:draftRequired.filter(c=>draftAvailable.includes(c))});closeLetters()};
 return <div className="reading-settings">
 <div className="field-label">{l.mode==='reading'?'Что читаем':'Материал для задания'}</div>
 <div className="reading-kinds">{([...(l.mode==='reading'?[['letters','Буквы']]:[]),['syllables','Слоги'],['words','Слова']] as [ContentKind,string][]).map(([kind,label])=><label className="check" key={kind}><input type="checkbox" checked={kinds.includes(kind)} onChange={e=>setL({...l,contentKinds:toggle(kinds,kind,e.target.checked) as ContentKind[]})}/>{label}</label>)}</div>
 {l.mode==='reading'&&<>{!textDisplayProvided&&<label className="check"><input type="checkbox" role="switch" checked={!!r.splitSyllables} onChange={e=>update({splitSyllables:e.target.checked})}/>Разделить на слоги</label>}
 <button type="button" className="category-picker-trigger letter-picker-trigger" ref={letterTrigger} onClick={openLetters}>
  <span className="setup-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4zM7 16l3-8 3 8m-5-2h4M16 8v8m-2-4h4"/></svg></span>
  <span className="setup-action-copy"><strong>Выберите буквы</strong><small>Доступные: {r.available.length} из 33 · Обязательные: {r.required.length||'нет'}</small></span><ControlWell symbol="plus"/>
 </button>
 <dialog ref={letterDialog} className="sound-picker-dialog letter-picker-dialog" aria-label="Выбор букв" onCancel={()=>letterTrigger.current?.focus()}>
  <div className="panel-scroll">
   <h2>Выберите буквы</h2>
   <section className="letter-picker-section"><h3>Доступные буквы · {draftAvailable.length} из 33</h3>
    <label className="check"><input type="checkbox" checked={draftAvailable.length===33} onChange={e=>{setDraftAvailable(e.target.checked?[...alphabet]:[]);if(!e.target.checked)setDraftRequired([])}}/>Все буквы</label>
    {Object.entries({'Гласные':vowels,'Согласные':consonants,'Знаки':['ь','ъ']}).map(([group,letters])=><details className="letter-group" key={group} open><summary>{group}</summary>
     <label className="check"><input type="checkbox" checked={letters.every(c=>draftAvailable.includes(c))} onChange={e=>{setDraftAvailable(current=>e.target.checked?[...new Set([...current,...letters])]:current.filter(c=>!letters.includes(c)));if(!e.target.checked)setDraftRequired(current=>current.filter(c=>!letters.includes(c)))}}/>Выбрать всё</label>
     <div className="letter-grid">{letters.map(c=><label key={c} className="letter-choice"><input type="checkbox" checked={draftAvailable.includes(c)} onChange={e=>{setDraftAvailable(current=>toggle(current,c,e.target.checked));if(!e.target.checked)setDraftRequired(current=>current.filter(x=>x!==c))}}/>{c.toUpperCase()}</label>)}</div>
    </details>)}
   </section>
   <section className="letter-picker-section"><h3>Обязательные буквы · {draftRequired.length||'не выбраны'}</h3>
    <p className="hint">В слове или сочетании должны присутствовать все отмеченные буквы.</p>
    <div className="letter-grid">{alphabet.filter(c=>draftAvailable.includes(c)).map(c=><label className="letter-choice" key={c}><input type="checkbox" checked={draftRequired.includes(c)} onChange={e=>setDraftRequired(current=>toggle(current,c,e.target.checked))}/>{c.toUpperCase()}</label>)}</div>
   </section>
  </div>
  <div className="sound-picker-actions"><button type="button" className="primary" onClick={saveLetters}>Готово</button><button type="button" className="secondary" onClick={closeLetters}>Отмена</button></div>
 </dialog>
 {kinds.includes('words')&&<RangeSlider label="Длина слова, букв" min={3} max={Math.max(3,maximum)} from={Math.max(3,Math.min(r.min,maximum))} to={Math.max(3,Math.min(r.max,maximum))} onChange={(min,max)=>update({min,max})}/>}
 <label className="check"><input type="checkbox" role="switch" checked={r.excludeClusters} onChange={e=>setL({...l,reading:{...r,excludeClusters:e.target.checked},syllablePatterns:e.target.checked?patterns.filter(p=>p!=='CCV'&&p!=='VCC'):patterns})}/>Исключить стечения согласных</label>
 </>}
 {kinds.includes('syllables')&&<details className="filter-details" open><summary>Виды слогов и сочетаний</summary>{Object.entries(syllablePatterns).map(([p,label])=><div key={p}><label className="check" key={p}><input type="checkbox" checked={patterns.includes(p as Pattern)} disabled={r.excludeClusters&&['CCV','VCC'].includes(p)} onChange={e=>setL({...l,syllablePatterns:toggle(patterns,p,e.target.checked) as Pattern[]})}/>{label}</label>{l.mode!=='reading'&&patterns.includes(p as Pattern)&&<div className="target-slots">{[...p].map((slot,i)=>{const applicable=l.sounds.some(s=>slot===(vowels.includes(s)?'V':'C'));return applicable&&<label className="check" key={i}><input type="checkbox" checked={(l.targetSlots?.[p as Pattern]??[...p].flatMap((c,j)=>l.sounds.some(s=>c===(vowels.includes(s)?'V':'C'))?[j]:[])).includes(i)} onChange={e=>{const current=l.targetSlots?.[p as Pattern]??[...p].flatMap((c,j)=>l.sounds.some(s=>c===(vowels.includes(s)?'V':'C'))?[j]:[]);setL({...l,targetSlots:{...l.targetSlots,[p]:e.target.checked?[...current,i]:current.filter(j=>j!==i)}})}}/>{[...p].map((c,j)=>(c==='C'?'согласный':'гласный')+(j===i?' (целевой)':' (любой)')).join(' + ')}</label>})}</div>}</div>)}<p className="hint">Слоги и сочетания используются в режиме «Слово — слово».</p></details>}
 </div>;
}
