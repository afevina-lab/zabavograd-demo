import {readingLabel} from './reading.ts';
import {useGameLimits} from './design-system/GameLimits.tsx';
import {usePreparedMaterial} from './design-system/usePreparedMaterial.tsx';
import {MaterialSettings} from './MaterialSettings.tsx';
import {WordPicker} from './WordPicker.tsx';
import {initialLearning,learningPool} from './learning.ts';
import {defaultFilters} from './model.ts';
import {useCardDrag} from './design-system/useCardDrag.tsx';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useLibrary,useFamilies} from './useLibrary.ts';
import {familyGroups,visualGroups,validateGroups,checkMatching,shuffled,inTopic,type MatchGroup,type MatchElement} from './matching.ts';
import {CardArtwork} from './CardArtwork.tsx';
import {DerivedArtwork,prepareMaterial} from './design-system/DerivedArtwork.tsx';
import {GameToolbar} from './GameToolbar.tsx';
import {QuantitySlider} from './QuantitySlider.tsx';
import {Icon,Scenery,ThemePicker} from './GameUI.tsx';
import {useTheme} from './design-system/useTheme.ts';
import {themeAttributes,themeVars} from './design-system/themes.ts';
export function Matching(){
 const {words,error}=useLibrary(),{families,error:familyError}=useFamilies();
 const [learning,setLearning]=useState({...initialLearning,mode:'lexical' as typeof initialLearning.mode}),[filters,setFilters]=useState(defaultFilters);
 const [theme,setTheme]=useTheme(),[topic,setTopic]=useState(''),[mode,setMode]=useState('family'),[size,setSize]=useState(2),[count,setCount]=useState(4);
 const [manual,setManual]=useState<string[][]>([Array(2).fill('')]),[session,setSession]=useState<MatchGroup[]>([]),[bank,setBank]=useState<MatchElement[]>([]);
 const [placements,setPlacements]=useState<Record<string,string[]>>({}),[selected,setSelected]=useState<string|null>(null),[message,setMessage]=useState(''),[paused,setPaused]=useState(false);
 const [checkMode,setCheckMode]=useState('instant'),[verdict,setVerdict]=useState<Record<string,boolean>>({}),[finished,setFinished]=useState(false),[busy,setBusy]=useState(false),[captions,setCaptions]=useState(false);
 const limits=useGameLimits(session.length>0&&!finished,paused);
 const drag=useCardDrag(paused||finished||!!limits.lost);
 const [displayMode,setDisplayMode]=useState('image-image');
 const available=useMemo(()=>learningPool(words,filters,learning),[words,filters,learning]);
 const kind=mode==='shadow'?'silhouette':mode==='outline'?'outline':null;
 const visualWords=useMemo(()=>available.filter(w=>w.variants?.length),[available]);
 const prepared=usePreparedMaterial(visualWords,kind,count);
 const [shuffleKey,setShuffleKey]=useState(0),[chosenGroups,setChosenGroups]=useState<{source:MatchGroup[];ids:string[]}|null>(null);
 const familyCandidates=useMemo(()=>learning.mode==='lexical'&&learning.categoryPaths?.length?familyGroups(words,families,'Животный мир',size).filter(g=>g.elements.slice(0,-1).some(e=>available.some(w=>w.id===e.word.id))):[],[words,families,learning,available,size]);
 const familyAvailable=familyCandidates.length>0;
 const candidates=useMemo<MatchGroup[]>(()=>mode==='family'?familyCandidates:mode==='manual'?manual.map((row,i)=>({id:'manual-'+i,elements:row.flatMap((id,j)=>{const w=available.find(w=>w.id===id);return w?[{id:'manual-'+i+':'+j,word:w,appearance:'original' as const}]:[]})})):mode==='reading'?visualWords.map(w=>({id:w.id,elements:[{id:w.id+':0',word:w,appearance:'word'},{id:w.id+':1',word:w,appearance:'original'}]})):visualGroups(visualWords,'',kind||'outline'),[mode,familyCandidates,manual,available,visualWords,kind]);
 const displayCandidates=useMemo(()=>candidates.filter(g=>g.elements.every((e,i)=>(displayMode==='word-word'||(displayMode==='word-image'&&i===0)||(displayMode==='image-word'&&i>0))||!!e.word.variants?.length)).map(g=>({...g,elements:g.elements.map((e,i)=>({...e,appearance:displayMode==='word-word'||(displayMode==='word-image'&&i===0)||(displayMode==='image-word'&&i>0)?'word' as const:e.appearance}))})),[candidates,displayMode]);
 const selectedGroups=useMemo(()=>chosenGroups?.source===candidates?displayCandidates.filter(g=>chosenGroups.ids.includes(g.id)):shuffled(displayCandidates).slice(0,count),[displayCandidates,candidates,chosenGroups,count,shuffleKey]);
 const groups=kind?visualGroups(prepared.words,'',kind):selectedGroups;
 const maxCount=Math.min(8,kind&&!prepared.busy&&prepared.words.length<count?prepared.words.length:displayCandidates.length);
 const setupError=validateGroups(groups,size)||(groups.length!==count&&mode!=='manual'?'Недостаточно полных групп: уменьшите количество или измените материал.':'')||(mode==='manual'&&manual.some(row=>new Set(row).size!==row.length)?'Внутри одной группы выберите разные слова.':'');
 const placed=new Set(Object.values(placements).flat()),remaining=bank.filter(e=>!placed.has(e.id)),complete=remaining.length===0;
 function start(){if(setupError||prepared.busy)return;const next=groups;limits.reset();setSession(next);setBank(shuffled(next.flatMap(g=>g.elements.slice(1))));setPlacements({});setVerdict({});setSelected(null);setFinished(false);setPaused(false);setMessage('');}
 function place(id:string,groupId:string){
 if(paused||finished||limits.lost)return;
 const existing=placements[groupId]||[],g=session.find(g=>g.id===groupId);
 if(!g||existing.length>=g.elements.length-1||placed.has(id))return;
 const next={...placements,[groupId]:[...existing,id]},v=checkMatching(session,next);
 if(checkMode==='instant'&&!v[id]){limits.mistake();setMessage('Попробуй другую группу.');setVerdict({[id]:false});setSelected(null);return;}
 setPlacements(next);setVerdict({});setMessage('');setSelected(null);
 if(checkMode==='instant'&&Object.values(next).flat().length===bank.length){setFinished(true);setMessage('Все элементы на своих местах!');}
 }
 function check(){
 if(!complete||paused||finished||limits.lost||Object.keys(verdict).length)return;const v=checkMatching(session,placements);setVerdict(v);
 const correct=Object.values(v).filter(Boolean).length;limits.mistake(bank.length-correct);setMessage('Верно: '+correct+' из '+bank.length+'.');
 if(checkMode==='finish'||correct===bank.length)setFinished(true);
 }
 function retry(){setPlacements(p=>Object.fromEntries(Object.entries(p).map(([id,ids])=>[id,ids.filter(id=>verdict[id])])));setVerdict({});setMessage('Исправьте оставшиеся соответствия.');}
 function remove(id:string){if(paused||finished||limits.lost)return;setPlacements(p=>Object.fromEntries(Object.entries(p).map(([g,ids])=>[g,ids.filter(x=>x!==id)])));setVerdict({});setSelected(null);}
 function artwork(e:MatchElement){const image=e.appearance==='word'?undefined:e.word.variants?.[0];return <>{image?(e.appearance==='silhouette'||e.appearance==='outline'?<DerivedArtwork image={image} outline={e.appearance==='outline'}/>:<CardArtwork image={image} label={e.word.label}/>):<span>{readingLabel(e.word.label,learning)}</span>}{captions&&image&&e.appearance==='original'&&<small>{e.word.label}</small>}</>;}
 function card(e:MatchElement,isPlaced=false){return <button type="button" key={e.id} data-match-card={e.id} disabled={paused||finished||!!limits.lost} className={'matching-card '+(selected===e.id?'chosen ':'')+(verdict[e.id]===false?'verdict-bad':verdict[e.id]===true?'verdict-good':'')} aria-label={e.appearance==='original'?e.word.label:e.appearance==='outline'?'Контур':'Тень'} onClick={()=>{if(drag.suppressClick())return;if(isPlaced)remove(e.id);else setSelected(e.id)}} onPointerDown={event=>{if(!isPlaced)drag.begin(event,'[data-match-group]',target=>place(e.id,target.dataset.matchGroup!));}}>{artwork(e)}</button>;}
 function resize(n:number){setSize(n);setManual(rows=>rows.map(row=>Array.from({length:n},(_,i)=>row[i]||'')));if(n>3)setMode('manual');}
 return <div className={'app '+(session.length?'game-active':'')} {...themeAttributes(theme)} style={themeVars(theme,import.meta.env.BASE_URL)}>
 {!session.length?<main className="matching-setup settings"><a href={import.meta.env.BASE_URL+'home.html'}>← Домой</a><h1>Соотнесение</h1><p>Выбери карточку из общего банка и помести её под подходящим элементом. Можно перетаскивать или нажимать.</p>
 <section className="settings-block"><h2>Учебный материал</h2><MaterialSettings words={words} l={learning} setL={setLearning} f={filters} setF={part=>setFilters(f=>({...f,...part}))}/></section>
 <section className="settings-block"><h2>Задание</h2>{!kind&&<label>Режим карточек<select aria-label="Режим карточек" value={displayMode} onChange={e=>setDisplayMode(e.target.value)}><option value="image-image">Картинка — картинка</option><option value="word-word">Слово — слово</option><option value="word-image">Слово — картинка</option><option value="image-word">Картинка — слово</option></select></label>}<label>Соотнести<select aria-label="Задание" value={mode} onChange={e=>{setMode(e.target.value);setMessage('');if(['shadow','outline','reading'].includes(e.target.value))resize(2)}}>{familyAvailable&&<option value="family">Животное — детёныш / семья</option>}{mode==='family'&&!familyAvailable&&<option value="family" disabled>Выберите лексическую тему животных или другое задание</option>}<option value="shadow">Картинку — к силуэту</option><option value="outline">Картинку — к контуру</option><option value="reading">Картинку — к слову</option><option value="manual">Свои группы</option></select></label>
 {(mode==='family'||mode==='manual')&&<label>Элементов в группе<select aria-label="Элементов в группе" value={size} disabled={busy} onChange={e=>resize(+e.target.value)}>{[2,3,4,5].map(n=><option key={n} value={n}>{n} (опора + {n-1})</option>)}</select></label>}
 {mode==='manual'?<section><p>Первый элемент — опора. Остальные подходят к нему в любом порядке. Группы задаются только для этого занятия.</p>{manual.map((row,i)=><fieldset className="settings-block" key={i}><legend>Группа {i+1}</legend><div className="matching-manual">{row.map((id,j)=><label key={j}>{j===0?'Опора':'Ответ '+j}<select value={id} disabled={busy} onChange={e=>setManual(rows=>rows.map((r,k)=>k===i?r.map((v,l)=>l===j?e.target.value:v):r))}><option value="">Выберите слово</option>{available.map(w=><option key={w.id} value={w.id}>{w.label}</option>)}</select></label>)}</div><button type="button" className="secondary" disabled={busy||manual.length===1} onClick={()=>setManual(rows=>rows.filter((_,j)=>j!==i))}>Удалить группу</button></fieldset>)}<button type="button" className="secondary" disabled={busy||manual.length>=8} onClick={()=>setManual(rows=>[...rows,Array(size).fill('')])}>Добавить группу</button></section>:<QuantitySlider label="Количество групп" value={count} min={1} max={Math.max(1,maxCount)} onChange={setCount}/>}
 </section><section className="settings-block"><h2>Правила игры</h2><label>Проверка<select aria-label="Проверка" value={checkMode} onChange={e=>setCheckMode(e.target.value)}><option value="instant">Сразу</option><option value="correct">В конце с исправлением</option><option value="finish">В конце с результатом</option></select></label>
 <label className="check"><input type="checkbox" checked={captions} onChange={e=>setCaptions(e.target.checked)}/>Подписи к исходным картинкам</label><p className="hint">В режиме картинок используются только слова с изображениями. Подписи к теням и контурам скрыты.</p>{limits.settings}
 </section><section className="settings-block"><h2>Оформление</h2><ThemePicker theme={theme} setTheme={setTheme}/></section><section className="settings-block material"><h2>В этой игре</h2><p>{groups.map(g=>g.elements.map(e=>e.word.label).join(' — ')).join(' · ')||'Нет подходящего материала'}</p><button type="button" className="secondary" onClick={()=>{if(kind)prepared.shuffle();else{setChosenGroups(null);setShuffleKey(k=>k+1)}}}>Заменить состав</button><WordPicker max={8} words={kind?visualWords:displayCandidates.map(g=>({...g.elements[0]?.word,id:g.id,label:g.elements.map(e=>e.word.label).join(' — ')}))} selected={kind?groups.map(g=>g.id):selectedGroups.map(g=>g.id)} onConfirm={ids=>{setCount(ids.length);if(kind)prepared.select(ids);else setChosenGroups({source:candidates,ids})}}/></section><p role="status">{error||familyError||message||(prepared.busy?'Подбираем '+count+' групп, проверено '+prepared.done:setupError)||('Доступно групп: '+maxCount)}</p>{prepared.busy&&<button className="secondary" onClick={prepared.cancel}>Отменить подготовку</button>}{prepared.cancelled&&<button className="secondary" onClick={prepared.retry}>Подготовить снова</button>}<button className="primary" disabled={prepared.busy||!!setupError||!!error} onClick={start}>Начать игру</button>
 </main>:<section className="play-area"><GameToolbar><a className="icon-button" aria-label="Домой" href={import.meta.env.BASE_URL+'home.html'}><Icon name="Home1"/></a><button className="icon-button" aria-label="Настройки" onClick={()=>{setSession([]);setMessage('')}}><Icon name="Settings"/></button><button className="icon-button" aria-label={paused?'Продолжить':'Пауза'} onClick={()=>setPaused(v=>!v)}><Icon name={paused?'RightArrow1':'Pause'}/></button><span>{placed.size} / {bank.length}</span>{limits.status}</GameToolbar>
 <div className="stage matching-stage"><Scenery theme={theme}/><div className="matching-content"><h1>Найди подходящие элементы</h1><div className="matching-groups">{session.map(g=><section className="matching-group" key={g.id} data-match-group={g.id}><div className="matching-card matching-anchor">{artwork(g.elements[0])}</div><div className="matching-slots">{(placements[g.id]||[]).map(id=>card(bank.find(e=>e.id===id)!,true))}{Array.from({length:g.elements.length-1-(placements[g.id]?.length||0)},(_,i)=><button type="button" className="matching-slot" key={'slot-'+i} aria-label={'Поместить под '+g.elements[0].word.label} disabled={!selected||paused||finished||!!limits.lost} onClick={()=>selected&&place(selected,g.id)}>+</button>)}</div></section>)}</div>
 {!finished&&<section className="matching-bank" aria-label="Общий банк"><h2>Общий банк</h2><div>{remaining.map(e=>card(e))}</div></section>}
 <p role="status">{limits.lost||(paused?'Пауза':message)}</p>{checkMode!=='instant'&&!finished&&<button className="primary" disabled={!complete||paused||!!limits.lost||Object.keys(verdict).length>0} onClick={check}>Проверить</button>}{checkMode==='correct'&&Object.values(verdict).some(v=>!v)&&<button className="primary" disabled={paused} onClick={retry}>Вернуть ошибки в банк</button>}
 {(finished||limits.lost)&&<button className="primary" onClick={()=>{setSession([]);setMessage('')}}>К настройкам</button>}</div></div></section>}
 </div>;
}

