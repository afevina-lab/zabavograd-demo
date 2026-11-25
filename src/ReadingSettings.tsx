import {PickerTrigger} from './design-system/PickerTrigger.tsx';
import {PickerDialog} from './design-system/PickerDialog.tsx';
import {Choice} from './visual/primitives/Choice.tsx';
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
 return <div className="v-reading-settings reading-settings">
 <div className="v-field-label field-label">{l.mode==='reading'?'Что читаем':'Материал для задания'}</div>
 <div className="v-reading-kinds reading-kinds">{([...(l.mode==='reading'?[['letters','Буквы']]:[]),['syllables','Слоги'],['words','Слова']] as [ContentKind,string][]).map(([kind,label])=><Choice className="v-choice check" key={kind} label={label} checked={kinds.includes(kind)} onChange={checked=>setL({...l,contentKinds:toggle(kinds,kind,checked) as ContentKind[]})}/>)}</div>
 {l.mode==='reading'&&<>{!textDisplayProvided&&<Choice className="v-choice check" kind="switch" label="Разделить на слоги" checked={!!r.splitSyllables} onChange={splitSyllables=>update({splitSyllables})}/>}
 <PickerTrigger className="letter-picker-trigger" ref={letterTrigger} onClick={openLetters} title="Выберите буквы" description={`Доступные: ${r.available.length} из 33 · Обязательные: ${r.required.length||'нет'}`} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4zM7 16l3-8 3 8m-5-2h4M16 8v8m-2-4h4"/></svg>}/>
 <PickerDialog ref={letterDialog} className="letter-picker-dialog" label="Выбор букв" onDismiss={()=>letterTrigger.current?.focus()} onConfirm={saveLetters} onCancel={closeLetters}>
   <h2>Выберите буквы</h2>
   <section className="v-letter-section letter-picker-section"><h3>Доступные буквы · {draftAvailable.length} из 33</h3>
    <label className="v-choice check letter-select-all"><input type="checkbox" checked={draftAvailable.length===alphabet.length} onChange={e=>{setDraftAvailable(e.target.checked?[...alphabet]:[]);if(!e.target.checked)setDraftRequired([])}}/>Выбрать всё</label>
    {Object.entries({'Гласные':vowels,'Согласные':consonants,'Знаки':['ь','ъ']}).map(([group,letters])=><details className="settings-disclosure letter-group" key={group} open>
     <summary><span>{group}</span><label className="v-choice check letter-select-all" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={letters.every(c=>draftAvailable.includes(c))} onChange={e=>{setDraftAvailable(current=>e.target.checked?[...new Set([...current,...letters])]:current.filter(c=>!letters.includes(c)));if(!e.target.checked)setDraftRequired(current=>current.filter(c=>!letters.includes(c)))}} aria-label={'Выбрать всё: '+group}/></label><ControlWell/></summary>
     <div className="v-letter-group-content letter-group-content">

      <div className="v-letter-grid letter-grid">{letters.map(c=><button type="button" key={c} className="v-letter-choice letter-choice" aria-pressed={draftAvailable.includes(c)} onClick={()=>{const selected=!draftAvailable.includes(c);setDraftAvailable(current=>toggle(current,c,selected));if(!selected)setDraftRequired(current=>current.filter(x=>x!==c))}}>{c.toUpperCase()}</button>)}</div>
     </div>
    </details>)}
   </section>
   <section className="v-letter-section letter-picker-section"><h3>Обязательные буквы · {draftRequired.length||'не выбраны'}</h3>
    <p className="v-help-copy hint">В каждом слове должны быть все отмеченные буквы.</p>
    <details className="settings-disclosure letter-group" open>
     <summary><span>Выберите обязательные буквы</span><ControlWell/></summary>
     <div className="v-letter-group-content letter-group-content">
      <label className="v-choice check letter-select-all"><input type="checkbox" checked={draftAvailable.length>0&&draftAvailable.every(c=>draftRequired.includes(c))} onChange={e=>setDraftRequired(e.target.checked?[...draftAvailable]:[])}/>Выбрать всё</label>
      <div className="v-letter-grid letter-grid">{alphabet.filter(c=>draftAvailable.includes(c)).map(c=><button type="button" className="v-letter-choice letter-choice" aria-pressed={draftRequired.includes(c)} key={c} onClick={()=>setDraftRequired(current=>toggle(current,c,!current.includes(c)))}>{c.toUpperCase()}</button>)}</div>
     </div>
    </details>
   </section>
 </PickerDialog>
 {kinds.includes('words')&&<RangeSlider label="Длина слова, букв" min={3} max={Math.max(3,maximum)} from={Math.max(3,Math.min(r.min,maximum))} to={Math.max(3,Math.min(r.max,maximum))} onChange={(min,max)=>update({min,max})}/>}
 <label className="v-choice check"><input type="checkbox" role="switch" checked={r.excludeClusters} onChange={e=>setL({...l,reading:{...r,excludeClusters:e.target.checked},syllablePatterns:e.target.checked?patterns.filter(p=>p!=='CCV'&&p!=='VCC'):patterns})}/>Исключить стечения согласных</label>
 </>}
 {kinds.includes('syllables')&&<details className="v-filter-details filter-details" open><summary>Виды слогов и сочетаний</summary>{Object.entries(syllablePatterns).map(([p,label])=><div key={p}><label className="v-choice check" key={p}><input type="checkbox" checked={patterns.includes(p as Pattern)} disabled={r.excludeClusters&&['CCV','VCC'].includes(p)} onChange={e=>setL({...l,syllablePatterns:toggle(patterns,p,e.target.checked) as Pattern[]})}/>{label}</label>{l.mode!=='reading'&&patterns.includes(p as Pattern)&&<div className="v-target-slots target-slots">{[...p].map((slot,i)=>{const applicable=l.sounds.some(s=>slot===(vowels.includes(s)?'V':'C'));return applicable&&<label className="v-choice check" key={i}><input type="checkbox" checked={(l.targetSlots?.[p as Pattern]??[...p].flatMap((c,j)=>l.sounds.some(s=>c===(vowels.includes(s)?'V':'C'))?[j]:[])).includes(i)} onChange={e=>{const current=l.targetSlots?.[p as Pattern]??[...p].flatMap((c,j)=>l.sounds.some(s=>c===(vowels.includes(s)?'V':'C'))?[j]:[]);setL({...l,targetSlots:{...l.targetSlots,[p]:e.target.checked?[...current,i]:current.filter(j=>j!==i)}})}}/>{[...p].map((c,j)=>(c==='C'?'согласный':'гласный')+(j===i?' (целевой)':' (любой)')).join(' + ')}</label>})}</div>}</div>)}<p className="v-help-copy hint">Слоги и сочетания используются в режиме «Слово — слово».</p></details>}
 </div>;
}
