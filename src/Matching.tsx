import {SelectControl,selectIcon} from './design-system/SelectControl.tsx';
import {MaterialSummary} from './design-system/MaterialSummary.tsx';
import {SettingsWindow} from './design-system/SettingsWindow.tsx';
import {GameDialog} from './design-system/GameDialog.tsx';
import {useGameViewport} from './design-system/useGameViewport.ts';
import {GameSelect} from './GameSelect.tsx';
import {TextDisplaySettings} from './TextDisplaySettings.tsx';
import {readingLabel} from './reading.ts';
import {useGameLimits} from './design-system/GameLimits.tsx';
import {usePreparedMaterial} from './design-system/usePreparedMaterial.tsx';
import {MaterialSettings} from './MaterialSettings.tsx';
import {WordPicker} from './WordPicker.tsx';
import {initialLearning,learningPool,balancedPick} from './learning.ts';
import {defaultFilters} from './model.ts';
import {useCardDrag} from './design-system/useCardDrag.tsx';
import {useLayoutEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {useLibrary,useFamilies} from './useLibrary.ts';
import {familyGroups,visualGroups,validateGroups,checkMatching,shuffled,type MatchGroup,type MatchElement} from './matching.ts';
import {CardArtwork} from './CardArtwork.tsx';
import {DerivedArtwork} from './design-system/DerivedArtwork.tsx';
import {GameToolbar} from './GameToolbar.tsx';
import {QuantitySlider} from './QuantitySlider.tsx';
import {Icon,Scenery,ThemePicker} from './GameUI.tsx';
import {useTheme} from './design-system/useTheme.ts';
import {themeAttributes,themeVars} from './design-system/themes.ts';
export function Matching(){
 const {words,error}=useLibrary(),{families,error:familyError}=useFamilies();
 const [learning,setLearning]=useState({...initialLearning,mode:'lexical' as typeof initialLearning.mode}),[filters,setFilters]=useState(defaultFilters);
 const [theme,setTheme]=useTheme(),[mode,setMode]=useState('family'),[size,setSize]=useState(2),[count,setCount]=useState(4);
 const [manual,setManual]=useState<string[][]>([Array(2).fill('')]),[session,setSession]=useState<MatchGroup[]>([]),[bank,setBank]=useState<MatchElement[]>([]);
 const [placements,setPlacements]=useState<Record<string,string[]>>({}),[selected,setSelected]=useState<string|null>(null),[message,setMessage]=useState(''),[paused,setPaused]=useState(false);
 const [checkMode,setCheckMode]=useState('instant'),[verdict,setVerdict]=useState<Record<string,boolean>>({}),[finished,setFinished]=useState(false),[captions,setCaptions]=useState(false);
 const limits=useGameLimits(session.length>0&&!finished,paused);
 const drag=useCardDrag(paused||finished||!!limits.lost);
 const [displayMode,setDisplayMode]=useState('image-image');
 const stageRef=useRef<HTMLDivElement|null>(null);
 const [bankPage,setBankPage]=useState(0);
 const [boardLayout,setBoardLayout]=useState({columns:4,cardWidth:104,bankPageSize:12});
 const available=useMemo(()=>learningPool(words,filters,learning),[words,filters,learning]);
 const kind=learning.mode==='math'?null:mode==='shadow'?'silhouette':mode==='outline'?'outline':null;
 const visualWords=useMemo(()=>available.filter(w=>w.variants?.length),[available]);
 const prepared=usePreparedMaterial(visualWords,kind,count);const busy=prepared.busy;
 const [shuffleKey,setShuffleKey]=useState(0),[chosenGroups,setChosenGroups]=useState<{source:MatchGroup[];ids:string[]}|null>(null);
 const familyCandidates=useMemo(()=>learning.mode==='lexical'&&learning.categoryPaths?.length?familyGroups(words,families,'Животный мир',size).filter(g=>g.elements.slice(0,-1).some(e=>available.some(w=>w.id===e.word.id))):[],[words,families,learning,available,size]);
 const familyAvailable=familyCandidates.length>0;
 const candidates=useMemo<MatchGroup[]>(()=>learning.mode==='math'?available.map(w=>({id:w.id,elements:[{id:w.id+':0',word:w,appearance:'word' as const},{id:w.id+':1',word:{...w,label:w.answer!},appearance:'word' as const}]})):mode==='family'?familyCandidates:mode==='manual'?manual.map((row,i)=>({id:'manual-'+i,elements:row.flatMap((id,j)=>{const w=available.find(w=>w.id===id);return w?[{id:'manual-'+i+':'+j,word:w,appearance:'original' as const}]:[]})})):mode==='reading'?available.map(w=>({id:w.id,elements:[{id:w.id+':0',word:w,appearance:'word'},{id:w.id+':1',word:w,appearance:'original'}]})):visualGroups(visualWords,'',kind||'outline'),[mode,familyCandidates,manual,available,visualWords,kind,learning.mode]);
 const displayCandidates=useMemo(()=>candidates.filter(g=>g.elements.every((e,i)=>(learning.mode==='math'||displayMode==='word-word'||(displayMode==='word-image'&&i===0)||(displayMode==='image-word'&&i>0))||!!e.word.variants?.length)).map(g=>({...g,elements:g.elements.map((e,i)=>({...e,appearance:displayMode==='word-word'||(displayMode==='word-image'&&i===0)||(displayMode==='image-word'&&i>0)?'word' as const:kind?e.appearance:'original' as const}))})),[candidates,displayMode,learning.mode]);
 const selectedGroups=useMemo(()=>chosenGroups?.source===candidates?displayCandidates.filter(g=>chosenGroups.ids.includes(g.id)):learning.mode==='reading'?balancedPick(displayCandidates.map(g=>({...g.elements[0].word,id:g.id})),Math.min(count,displayCandidates.length),learning).map(w=>displayCandidates.find(g=>g.id===w.id)!):shuffled(displayCandidates).slice(0,count),[displayCandidates,candidates,chosenGroups,count,shuffleKey]);
 const groups=kind?visualGroups(prepared.words,'',kind):selectedGroups;
 const maxCount=Math.min(8,kind&&!prepared.busy&&prepared.words.length<count?prepared.words.length:displayCandidates.length);
 const setupError=validateGroups(groups,learning.mode==='math'?2:size)||(groups.length!==count&&(learning.mode==='math'||mode!=='manual')?'Недостаточно полных групп: уменьшите количество или измените материал.':'')||(learning.mode!=='math'&&mode==='manual'&&manual.some(row=>new Set(row).size!==row.length)?'Внутри одной группы выберите разные слова.':'');
 const placed=new Set(Object.values(placements).flat()),remaining=bank.filter(e=>!placed.has(e.id)),complete=remaining.length===0;
 // The complete game stays inside the viewport: resize cards, not text or the page.
 // For large groups the answer bank is paged, never scrolled or clipped.
 useLayoutEffect(()=>{
  const stage=stageRef.current;
  if(!stage||!session.length)return;
  const fit=()=>{
   const width=Math.max(180,stage.clientWidth-32),height=Math.max(160,stage.clientHeight-26);
   const maxElements=Math.max(2,...session.map(g=>g.elements.length));
   let best={columns:1,cardWidth:36,bankPageSize:4},bestScore=-1;
   for(let columns=1;columns<=Math.min(6,session.length);columns++){
    const groupRows=Math.ceil(session.length/columns);
    for(let cardWidth=132;cardWidth>=36;cardWidth-=2){
     const gap=6,groupWidth=maxElements*cardWidth+(maxElements-1)*gap+16;
     if(columns*groupWidth+(columns-1)*10>width)continue;
     const cardHeight=cardWidth*1.04;
     const groupHeight=groupRows*(cardHeight+20)+(groupRows-1)*10;
     const bankColumns=Math.max(1,Math.floor((width+8)/(cardWidth+8)));
     const pageSize=Math.min(bank.length,Math.min(12,bankColumns*2));
     const bankRows=Math.ceil(pageSize/bankColumns);
     const bankHeight=bank.length?30+bankRows*(cardHeight+8)+14:0;
     if(groupHeight+bankHeight+100>height)continue;
     const score=cardWidth+Math.min(columns,4)*0.08;
     if(score>bestScore){bestScore=score;best={columns,cardWidth,bankPageSize:Math.max(1,pageSize)}}
     break;
    }
   }
   setBoardLayout(prev=>prev.columns===best.columns&&prev.cardWidth===best.cardWidth&&prev.bankPageSize===best.bankPageSize?prev:best);
  };
  const observer=new ResizeObserver(fit);
  observer.observe(stage);
  fit();
  return()=>observer.disconnect();
 },[session,bank.length]);
 const pageCount=Math.max(1,Math.ceil(remaining.length/boardLayout.bankPageSize));
 const currentPage=Math.min(bankPage,pageCount-1);
 const visibleBank=remaining.slice(currentPage*boardLayout.bankPageSize,(currentPage+1)*boardLayout.bankPageSize);
 const boardVars={'--matching-columns':String(boardLayout.columns),'--matching-card-size':boardLayout.cardWidth+'px'} as CSSProperties;
 function start(){if(setupError||prepared.busy)return;const next=groups;limits.reset();setSession(next);setBank(shuffled(next.flatMap(g=>g.elements.slice(1))));setPlacements({});setVerdict({});setSelected(null);setBankPage(0);setFinished(false);setPaused(false);setMessage('');}
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
 function artwork(e:MatchElement){const image=e.appearance==='word'?undefined:e.word.variants?.[0];return <>{image?(e.appearance==='silhouette'||e.appearance==='outline'?<DerivedArtwork image={image} outline={e.appearance==='outline'}/>:<CardArtwork image={image} label={e.word.label}/>):<span className="unbroken-card-text" style={{fontSize:`min(22px, ${110/Math.max(5,e.word.label.length*.65)}px)`}}>{readingLabel(e.word.label,learning)}</span>}{captions&&displayMode==='image-image'&&!kind&&image&&e.appearance==='original'&&<small>{readingLabel(e.word.label,learning)}</small>}</>;}
 function card(e:MatchElement,isPlaced=false){return <button type="button" key={e.id} data-match-card={e.id} disabled={paused||finished||!!limits.lost} className={'matching-card '+(selected===e.id?'chosen ':'')+(verdict[e.id]===false?'verdict-bad':verdict[e.id]===true?'verdict-good':'')} aria-label={e.appearance==='original'?e.word.label:e.appearance==='outline'?'Контур':'Тень'} onClick={()=>{if(drag.suppressClick())return;if(isPlaced)remove(e.id);else setSelected(e.id)}} onPointerDown={event=>{if(!isPlaced)drag.begin(event,'[data-match-group]',target=>place(e.id,target.dataset.matchGroup!));}}>{artwork(e)}</button>;}
 function resize(n:number){setSize(n);setManual(rows=>rows.map(row=>Array.from({length:n},(_,i)=>row[i]||'')));if(n>3)setMode('manual');}
 useGameViewport(session.length>0);
 return <div className={'app '+(session.length?'game-active':'')} {...themeAttributes(theme)} style={themeVars(theme,import.meta.env.BASE_URL)}>
 {!session.length?<SettingsWindow game="Соотнесение"><main className="matching-setup settings"><p>Выбери карточку из общего банка и помести её под подходящим элементом. Можно перетаскивать или нажимать.</p>
 <section className="settings-block"><h2>Учебный материал</h2><MaterialSettings textDisplayProvided={!kind&&(displayMode!=='image-image'||captions)} words={words} l={learning} setL={l=>{setLearning(l);if(l.mode==='math'){setSize(2);setDisplayMode('word-word')}else if(l.mode!=='lexical'&&mode==='family'){setMode('reading');setSize(2)}if(l.mode==='reading'&&(learning.mode!=='reading'||l.contentKinds?.some(k=>k!=='words'))){setMode('reading');setSize(2);setDisplayMode(l.contentKinds?.includes('syllables')?'word-word':'word-image')}}} f={filters} setF={part=>setFilters(f=>({...f,...part}))}/></section>
 <section className="settings-block"><h2>Задание</h2>{learning.mode!=='math'&&!kind&&<GameSelect label="Режим карточек" ariaLabel="Режим карточек" value={displayMode} onChange={value=>setDisplayMode(value)}><option value="image-image">Картинка — картинка</option><option value="word-word">Слово — слово</option><option value="word-image">Слово — картинка</option><option value="image-word">Картинка — слово</option></GameSelect>}{learning.mode!=='math'&&!kind&&displayMode==='image-image'&&<label className="check"><input type="checkbox" role="switch" checked={captions} onChange={e=>setCaptions(e.target.checked)}/>Подписи к исходным картинкам</label>}{learning.mode!=='math'&&!kind&&(displayMode!=='image-image'||captions)&&<TextDisplaySettings l={learning} setL={setLearning}/>}{learning.mode!=='math'&&<label>Соотнести<SelectControl icon={selectIcon("Задание")} aria-label="Задание" value={mode} onChange={e=>{setMode(e.target.value);setMessage('');if(['shadow','outline','reading'].includes(e.target.value))resize(2)}}>{familyAvailable&&<option value="family">Животное — детёныш / семья</option>}{mode==='family'&&!familyAvailable&&<option value="family" disabled>Выберите условия</option>}<option value="shadow">Картинку — к силуэту</option><option value="outline">Картинку — к контуру</option><option value="reading">Одинаковые элементы</option><option value="manual">Свои группы</option></SelectControl></label>}
 {learning.mode!=='math'&&(mode==='family'||mode==='manual')&&<QuantitySlider label="Элементов в группе (включая опору)" value={size} min={2} max={5} disabled={busy} onChange={resize}/>} 
 {learning.mode!=='math'&&mode==='manual'?<section><p>Первый элемент — опора. Остальные подходят к нему в любом порядке. Группы задаются только для этого занятия.</p>{manual.map((row,i)=><fieldset className="settings-block" key={i}><legend>Группа {i+1}</legend><div className="matching-manual">{row.map((id,j)=><label key={j}>{j===0?'Опора':'Ответ '+j}<SelectControl value={id} disabled={busy} onChange={e=>setManual(rows=>rows.map((r,k)=>k===i?r.map((v,l)=>l===j?e.target.value:v):r))}><option value="">Выберите слово</option>{available.map(w=><option key={w.id} value={w.id}>{w.label}</option>)}</SelectControl></label>)}</div><button type="button" className="secondary" disabled={busy||manual.length===1} onClick={()=>setManual(rows=>rows.filter((_,j)=>j!==i))}>Удалить группу</button></fieldset>)}<button type="button" className="secondary" disabled={busy||manual.length>=8} onClick={()=>setManual(rows=>[...rows,Array(size).fill('')])}>Добавить группу</button></section>:<QuantitySlider label="Количество групп" value={count} min={1} max={Math.max(1,learning.mode==='math'?Math.min(8,available.length):maxCount)} onChange={setCount}/>}
 </section><section className="settings-block"><h2>Правила игры</h2><label>Проверка<SelectControl icon={selectIcon("Проверка")} aria-label="Проверка" value={checkMode} onChange={e=>setCheckMode(e.target.value)}><option value="instant">Сразу</option><option value="correct">В конце с исправлением</option><option value="finish">В конце с результатом</option></SelectControl></label>
 <p className="hint">В режиме картинок используются только слова с изображениями. Подписи к теням и контурам скрыты.</p>{limits.settings}
 </section><section className="settings-block"><h2>Оформление</h2><ThemePicker theme={theme} setTheme={setTheme}/></section><section className="settings-block material"><div className="material-head"><h2>В этой игре</h2><div><button type="button" className="icon-button" onClick={()=>{if(kind)prepared.shuffle();else{setChosenGroups(null);setShuffleKey(k=>k+1)}}} aria-label="Перемешать состав" title="Перемешать состав"><Icon name="Return1"/></button><WordPicker max={8} words={kind?visualWords:displayCandidates.map(g=>({...g.elements[0]?.word,id:g.id,label:g.elements.map(e=>e.word.label).join(' — ')}))} selected={kind?groups.map(g=>g.id):selectedGroups.map(g=>g.id)} onConfirm={ids=>{setCount(ids.length);if(kind)prepared.select(ids);else setChosenGroups({source:candidates,ids})}}/></div></div><MaterialSummary items={groups.flatMap(g=>g.elements.map(e=>({label:e.word.label})))}/></section><p role="status">{error||familyError||message||(prepared.busy?'Подбираем '+count+' групп, проверено '+prepared.done:setupError)||('Доступно групп: '+maxCount)}</p>{prepared.busy&&<button className="secondary" onClick={prepared.cancel}>Отменить подготовку</button>}{prepared.cancelled&&<button className="secondary" onClick={prepared.retry}>Подготовить снова</button>}<button className="primary" disabled={prepared.busy||!!setupError||!!error} onClick={start}>Начать игру</button>
 </main></SettingsWindow>:<section className="play-area"><GameToolbar><a className="icon-button" aria-label="Домой" href={import.meta.env.BASE_URL+'home.html'}><Icon name="Home1"/></a><button className="icon-button" aria-label="Настройки" onClick={()=>{setSession([]);setMessage('')}}><Icon name="Settings"/></button><button className="icon-button" aria-label={paused?'Продолжить':'Пауза'} onClick={()=>setPaused(v=>!v)}><Icon name={paused?'RightArrow1':'Pause'}/></button><span>{placed.size} / {bank.length}</span>{limits.status}</GameToolbar>
 <div className="stage matching-stage" ref={stageRef} style={boardVars}><Scenery theme={theme}/>{(paused||finished||limits.lost)&&<GameDialog title={limits.lost||(finished?message:'Пауза')} onContinue={paused&&!finished&&!limits.lost?()=>setPaused(false):undefined} onSettings={()=>{setSession([]);setMessage('')}}/>}<div className="matching-content"><div className="matching-groups">{session.map(g=><section className="matching-group" key={g.id} data-match-group={g.id}><div className="matching-card matching-anchor">{artwork(g.elements[0])}</div><div className="matching-slots">{(placements[g.id]||[]).map(id=>card(bank.find(e=>e.id===id)!,true))}{Array.from({length:g.elements.length-1-(placements[g.id]?.length||0)},(_,i)=><button type="button" className="matching-slot" key={'slot-'+i} aria-label={'Поместить под '+g.elements[0].word.label} disabled={!selected||paused||finished||!!limits.lost} onClick={()=>selected&&place(selected,g.id)}>+</button>)}</div></section>)}</div>
 {!finished&&<section className="matching-bank" aria-label="Общий банк"><div className="matching-bank-heading"><h2>Общий банк</h2>{pageCount>1&&<div className="matching-bank-pages"><button type="button" disabled={currentPage===0} onClick={()=>setBankPage(currentPage-1)} aria-label="Предыдущие карточки">‹</button><span>{currentPage+1} / {pageCount}</span><button type="button" disabled={currentPage>=pageCount-1} onClick={()=>setBankPage(currentPage+1)} aria-label="Следующие карточки">›</button></div>}</div><div className="matching-bank-cards">{visibleBank.map(e=>card(e))}</div></section>}
 <p role="status">{limits.lost||(paused?'Пауза':message)}</p>{checkMode!=='instant'&&!finished&&<button className="primary" disabled={!complete||paused||!!limits.lost||Object.keys(verdict).length>0} onClick={check}>Проверить</button>}{checkMode==='correct'&&Object.values(verdict).some(v=>!v)&&<button className="primary" disabled={paused} onClick={retry}>Вернуть ошибки в банк</button>}
 {(finished||limits.lost)&&<button className="primary" onClick={()=>{setSession([]);setMessage('')}}>К настройкам</button>}</div></div></section>}
 </div>;
}

