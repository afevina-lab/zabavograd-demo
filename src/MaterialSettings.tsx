import {MaterialRule} from './visual/compositions/MaterialRule.tsx';
import {useState} from 'react';
import {usePresetSource} from './design-system/MaterialPresetContext.tsx';
import {SyllableStructurePicker} from './SyllableStructurePicker.tsx';
import {SettingsDisclosure} from './design-system/SettingsDisclosure.tsx';
import {SetupAddButton} from './design-system/SetupAddButton.tsx';
import {GameSelect} from './GameSelect.tsx';
import {MathSettingsPanel} from './MathSettingsPanel.tsx';
import {SoundPicker} from './SoundPicker.tsx';
import {ReadingSettings} from './ReadingSettings.tsx';
import {CategoryPicker} from './CategoryPicker.tsx';
import {SavedMaterialSets} from './SavedMaterialSets.tsx';
import {groups,initialLearning,type Learning} from './learning.ts';import {defaultFilters,type Filters,type Word} from './model.ts';
export function MaterialSettings({words,f,setF,l,setL,nested=false,hideTask=false,textDisplayProvided=false}:{words:Word[];f:Filters;setF:(v:Partial<Filters>)=>void;l:Learning;setL:(v:Learning)=>void;nested?:boolean;hideTask?:boolean;textDisplayProvided?:boolean}){const [usingSaved,setUsingSaved]=useState(false);
 usePresetSource({label:l.mode==='lexical'?'Лексика':l.mode==='automation'?'Звуки':l.mode==='reading'?'Чтение':l.mode==='structure'?'Слоговая структура':'Учебный материал',learning:l,filters:f,wordIds:words.map(w=>w.id)},!nested);
 const changeMode=(mode:Learning['mode']|'saved')=>{
  if(mode==='saved'){setUsingSaved(true);return;}
  setUsingSaved(false);setF({topic:'',subcategory:'',noOpposition:false});
  setL({...initialLearning,mode,reading:{splitSyllables:l.reading?.splitSyllables}});
 };
 return <div className="v-material-fields setup-material-fields">{!hideTask&&<GameSelect hideLabel label="Учебная задача" value={usingSaved?'saved':l.mode==='differentiation'?'automation':l.mode} onChange={mode=>changeMode(mode as Learning['mode']|'saved')}>{[['any','Без темы'],['lexical','Лексика'],['automation','Звуки'],['reading','Чтение'],['structure','Слоговая структура'],['math','Математика'],['saved','Мои наборы']].map(([mode,label])=><option key={mode} value={mode}>{label}</option>)}</GameSelect>}{usingSaved&&!nested?<SavedMaterialSets words={words} learning={l} filters={f} setLearning={setL} setFilters={setF}/>:<>{l.mode==='math'&&<MathSettingsPanel l={l} setL={setL}/>}
{l.mode==='lexical'?<CategoryPicker words={words} selected={l.categoryPaths||[]} onChange={categoryPaths=>setL({...l,categoryPaths})}/>:['automation','differentiation'].includes(l.mode)&&<SoundPicker words={words} l={l} setL={setL}/>}
{(l.mode==='reading'||(['automation','differentiation'].includes(l.mode)&&l.sounds.length>0))&&<ReadingSettings textDisplayProvided={textDisplayProvided} words={words} l={l} setL={setL}/>}
{l.mode==='search'&&<details className="v-filter-details filter-details"><summary>Исключаемые звуки: {(l.excludedSounds||[]).map(s=>s.toUpperCase()).join(', ')||'нет'}</summary>{Object.entries(groups).map(([name,sounds])=><details className="v-sound-group sound-group" key={name}><summary>{name}</summary><label className="v-choice check"><input type="checkbox" checked={sounds.filter(s=>!l.sounds.includes(s)).every(s=>l.excludedSounds?.includes(s))} onChange={e=>setL({...l,excludedSounds:e.target.checked?[...new Set([...(l.excludedSounds||[]),...sounds.filter(s=>!l.sounds.includes(s))])]:(l.excludedSounds||[]).filter(s=>!sounds.includes(s))})}/>Выбрать всё</label>{sounds.map(s=><label className="v-choice check" key={s}><input type="checkbox" checked={!!l.excludedSounds?.includes(s)} disabled={l.sounds.includes(s)&&['automation','differentiation'].includes(l.mode)} onChange={e=>setL({...l,excludedSounds:e.target.checked?[...(l.excludedSounds||[]),s]:(l.excludedSounds||[]).filter(x=>x!==s)})}/>{s.toUpperCase()}</label>)}</details>)}</details>}
{['automation','differentiation','structure'].includes(l.mode)&&<SyllableStructurePicker filters={f} words={words} onChange={setF}/>}{!nested&&l.mode!=='math'&&<SettingsDisclosure className="advanced-material" title="Дополнительные условия" description={(l.additional?.length||0)+(l.exclusions?.length||0)?`Активных правил: ${(l.additional?.length||0)+(l.exclusions?.length||0)}`:'Уточните подбор карточек'} icon="Settings">{(['additional','exclusions'] as const).map(kind=><section key={kind} className="v-material-rule-group material-rule-group">{(l[kind]||[]).map((r,i)=><MaterialRule key={i} title={kind==='additional'?'Дополнительное правило':'Исключение'} removeLabel={kind==='additional'?'Удалить правило':'Удалить исключение'} onRemove={()=>setL({...l,[kind]:l[kind]!.filter((_,index)=>index!==i)})} classNames={{root:'material-rule',heading:'material-rule-heading',remove:'icon-button rule-delete'}}><MaterialSettings nested words={words} f={r.filters} l={r.learning} setF={part=>setL({...l,[kind]:l[kind]!.map((v,n)=>n===i?{...v,filters:{...v.filters,...part}}:v)})} setL={value=>setL({...l,[kind]:l[kind]!.map((v,n)=>n===i?{...v,learning:value}:v)})}/></MaterialRule>)}<SetupAddButton onClick={()=>setL({...l,[kind]:[...(l[kind]||[]),{learning:{...initialLearning,mode:'lexical',sounds:[],topics:[],excludedSounds:[]},filters:{...defaultFilters}}]})}>{kind==='additional'?'Новое правило':'Добавить исключение'}</SetupAddButton></section>)}</SettingsDisclosure>}</>}</div>}


