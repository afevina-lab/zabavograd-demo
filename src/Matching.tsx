import {visualThemeVars} from './visual/foundation/visualThemeVars.ts';
import {CardSlot} from './visual/primitives/CardSlot.tsx';
import {MatchingBank} from './visual/games/MatchingBank.tsx';
import {IconButton} from './visual/primitives/Buttons.tsx';
import {MatchingLayout} from './visual/games/MatchingLayout.tsx';
import {CardButton,CardSurface} from './visual/primitives/Card.tsx';
import {useRoundPlan} from './design-system/useRoundPlan.tsx';
import {starsForScore} from './result-score.ts';
import {playGameSound,useGameSoundOutcome,resetSoundCombo} from './design-system/game-audio.ts';
import {SetupAddButton} from './design-system/SetupAddButton.tsx';
import {SelectControl,selectIcon} from './design-system/SelectControl.tsx';
import {MaterialSummary} from './design-system/MaterialSummary.tsx';
import {SettingsWindow} from './design-system/SettingsWindow.tsx';
import {SetupPreview} from './design-system/SetupPreview.tsx';
import {GameDialog} from './design-system/GameDialog.tsx';
import {useGameViewport,enterGameViewport} from './design-system/useGameViewport.ts';
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
import {useEffect,useLayoutEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {useLibrary,useFamilies} from './useLibrary.ts';
import {familyGroups,visualGroups,validateGroups,checkMatching,shuffled,type MatchGroup,type MatchElement} from './matching.ts';
import {CardArtwork} from './CardArtwork.tsx';
import {DerivedArtwork} from './design-system/DerivedArtwork.tsx';
import {GameToolbar} from './GameToolbar.tsx';
import {QuantitySlider} from './QuantitySlider.tsx';
import {Icon} from './visual/primitives/Icon.tsx';
import {Scenery} from './design-system/Scenery.tsx';
import {ThemePicker} from './design-system/ThemePicker.tsx';
import {useTheme} from './design-system/useTheme.ts';
import {themeAttributes,themeVars} from './design-system/themes.ts';
export function Matching(){
 const roundPlan=useRoundPlan<MatchGroup>('matching');
 const {words,error}=useLibrary(),{families,error:familyError}=useFamilies();
 const [learning,setLearning]=useState({...initialLearning,mode:'lexical' as typeof initialLearning.mode}),[filters,setFilters]=useState(defaultFilters);
 const [theme,setTheme]=useTheme(),[mode,setMode]=useState('family'),[size,setSize]=useState(2),[count,setCount]=useState(4);
 const [manual,setManual]=useState<string[][]>([Array(2).fill('')]),[session,setSession]=useState<MatchGroup[]>([]),[bank,setBank]=useState<MatchElement[]>([]);
 const [placements,setPlacements]=useState<Record<string,string[]>>({}),[selected,setSelected]=useState<string|null>(null),[message,setMessage]=useState(''),[paused,setPaused]=useState(false);
 const [checkMode,setCheckMode]=useState('instant'),[verdict,setVerdict]=useState<Record<string,boolean>>({}),[finished,setFinished]=useState(false),[captions,setCaptions]=useState(false);
 const limits=useGameLimits(session.length>0&&!finished,paused);
 const drag=useCardDrag(paused||finished||!!limits.lost);
 const [displayMode,setDisplayMode]=useState('image-image');
 const groupDialog=useRef<HTMLDialogElement>(null);
 const stageRef=useRef<HTMLDivElement|null>(null);
 const [bankPage,setBankPage]=useState(0);
 const [boardLayout,setBoardLayout]=useState({columns:4,cardWidth:104,bankPageSize:12});
 const available=useMemo(()=>learningPool(words,filters,learning),[words,filters,learning]);
 const kind=learning.mode==='math'?null:mode==='shadow'?'silhouette':mode==='outline'?'outline':null;
 const captionMode=!kind&&(displayMode==='word-image'||displayMode==='image-word');
 const visualWords=useMemo(()=>available.filter(w=>w.variants?.length),[available]);
 const prepared=usePreparedMaterial(visualWords,kind,count);const busy=prepared.busy;
 const [shuffleKey,setShuffleKey]=useState(0),[chosenGroups,setChosenGroups]=useState<{source:MatchGroup[];ids:string[]}|null>(null);
 const familyCandidates=useMemo(()=>learning.mode==='lexical'&&learning.categoryPaths?.length?familyGroups(words,families,'Животный мир',size).filter(g=>g.elements.slice(0,-1).some(e=>available.some(w=>w.id===e.word.id))):[],[words,families,learning,available,size]);
 const familyAvailable=familyCandidates.length>0;
 const candidates=useMemo<MatchGroup[]>(()=>learning.mode==='math'?available.map(w=>({id:w.id,elements:[{id:w.id+':0',word:w,appearance:'word' as const},{id:w.id+':1',word:{...w,label:w.answer!},appearance:'word' as const}]})):mode==='family'?familyCandidates:mode==='manual'?manual.map((row,i)=>({id:'manual-'+i,elements:row.flatMap((id,j)=>{const w=available.find(w=>w.id===id);return w?[{id:'manual-'+i+':'+j,word:w,appearance:'original' as const}]:[]})})):mode==='reading'?available.map(w=>({id:w.id,elements:[{id:w.id+':0',word:w,appearance:'word'},{id:w.id+':1',word:w,appearance:'original'}]})):visualGroups(visualWords,'',kind||'outline',size),[mode,familyCandidates,manual,available,visualWords,kind,learning.mode,size]);
 const displayCandidates=useMemo(()=>candidates.filter(g=>g.elements.every((e,i)=>(learning.mode==='math'||displayMode==='word-word'||(displayMode==='word-image'&&i===0)||(displayMode==='image-word'&&i>0))||!!e.word.variants?.length)).map(g=>({...g,elements:g.elements.map((e,i)=>({...e,appearance:displayMode==='word-word'||(displayMode==='word-image'&&i===0)||(displayMode==='image-word'&&i>0)?'word' as const:kind?e.appearance:'original' as const}))})),[candidates,displayMode,learning.mode]);
 const selectedGroups=useMemo(()=>chosenGroups?.source===candidates?displayCandidates.filter(g=>chosenGroups.ids.includes(g.id)):learning.mode==='reading'?balancedPick(displayCandidates.map(g=>({...g.elements[0].word,id:g.id})),Math.min(count,displayCandidates.length),learning).map(w=>displayCandidates.find(g=>g.id===w.id)!):shuffled(displayCandidates).slice(0,count),[displayCandidates,candidates,chosenGroups,count,shuffleKey]);
 const groups=kind?visualGroups(prepared.words,'',kind,size):selectedGroups;
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
     const gap=6,groupWidth=captionMode?Math.max(162,cardWidth*1.55)+12:maxElements*cardWidth+(maxElements-1)*gap+16;
     if(columns*groupWidth+(columns-1)*10>width)continue;
     const cardHeight=cardWidth*1.04;
     const groupHeight=groupRows*(cardHeight+(captionMode?62:20))+(groupRows-1)*10;
     const bankCardWidth=displayMode==='image-word'?Math.max(142,cardWidth*1.55):cardWidth;
     const bankCardHeight=displayMode==='image-word'?44:cardHeight;
     const bankColumns=Math.max(1,Math.floor((width+8)/(bankCardWidth+8)));
     const pageSize=Math.min(bank.length,Math.min(12,bankColumns*2));
     const bankRows=Math.ceil(pageSize/bankColumns);
     const bankHeight=bank.length?bankRows*(bankCardHeight+8)+14:0;
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
 },[session,bank.length,captionMode,displayMode]);
 const pageCount=Math.max(1,Math.ceil(remaining.length/boardLayout.bankPageSize));
 const currentPage=Math.min(bankPage,pageCount-1);
 const visibleBank=remaining.slice(currentPage*boardLayout.bankPageSize,(currentPage+1)*boardLayout.bankPageSize);
 const boardVars={'--matching-columns':String(boardLayout.columns),'--matching-card-size':boardLayout.cardWidth+'px','--matching-caption-width':Math.max(162,boardLayout.cardWidth*1.55)+'px'} as CSSProperties;
 useGameSoundOutcome(limits.lost?'lose':finished&&roundPlan.isLast?(Object.values(checkMatching(session,placements)).filter(Boolean).length>=bank.length*.3?'win':'lose'):null);
 function loadRound(next:MatchGroup[]){resetSoundCombo();enterGameViewport();limits.reset();setSession(next);setBank(shuffled(next.flatMap(g=>g.elements.slice(1))));setPlacements({});setVerdict({});setSelected(null);setBankPage(0);setFinished(false);setPaused(false);setMessage('');}
 function start(){if(setupError||prepared.busy)return;roundPlan.request(groups,loadRound,{text:displayMode==='word-word',groupSize:size,maxRounds:groups.length});}
 useEffect(()=>{if(!finished||limits.lost)return;const next=roundPlan.advance(starsForScore(Object.values(checkMatching(session,placements)).filter(Boolean).length,bank.length));if(next)loadRound(next)},[finished]);

 function place(id:string,groupId:string){
 if(paused||finished||limits.lost)return;
 const existing=placements[groupId]||[],g=session.find(g=>g.id===groupId);
 if(!g||existing.length>=g.elements.length-1||placed.has(id))return;
 const next={...placements,[groupId]:[...existing,id]},v=checkMatching(session,next);
 if(checkMode==='instant'&&!v[id]){playGameSound('wrong');limits.mistake();setMessage('Попробуй другую группу.');setVerdict({[id]:false});setSelected(null);return;}
 if(checkMode==='instant')playGameSound('match');setPlacements(next);setVerdict({});setMessage('');setSelected(null);
 if(checkMode==='instant'&&Object.values(next).flat().length===bank.length){setFinished(true);setMessage('Все элементы на своих местах!');}
 }
 function check(){
 if(!complete||paused||finished||limits.lost||Object.keys(verdict).length)return;const v=checkMatching(session,placements);setVerdict(v);
 const correct=Object.values(v).filter(Boolean).length;playGameSound(correct===bank.length?'match':'wrong');limits.mistake(bank.length-correct);setMessage('Верно: '+correct+' из '+bank.length+'.');
 if(checkMode==='finish'||correct===bank.length)setFinished(true);
 }
 function retry(){setPlacements(p=>Object.fromEntries(Object.entries(p).map(([id,ids])=>[id,ids.filter(id=>verdict[id])])));setVerdict({});setMessage('Исправьте оставшиеся соответствия.');}
 function remove(id:string){if(paused||finished||limits.lost)return;setPlacements(p=>Object.fromEntries(Object.entries(p).map(([g,ids])=>[g,ids.filter(x=>x!==id)])));setVerdict({});setSelected(null);}
 function artwork(e:MatchElement){const image=e.appearance==='word'?undefined:e.word.variants?.[0];return <>{image?(e.appearance==='silhouette'||e.appearance==='outline'?<DerivedArtwork image={image} outline={e.appearance==='outline'}/>:<CardArtwork image={image} label={e.word.label}/>):<span className="v-card-word matching-word-text" style={{fontSize:Math.max(12,Math.min(20,280/Math.max(9,readingLabel(e.word.label,learning).length)))+'px'}}>{readingLabel(e.word.label,learning)}</span>}{captions&&displayMode==='image-image'&&!kind&&image&&e.appearance==='original'&&<small>{readingLabel(e.word.label,learning)}</small>}</>;}
 function card(e:MatchElement,isPlaced=false){return <CardButton feedback={verdict[e.id]===false?"wrong":verdict[e.id]===true?"correct":"idle"} frame="sliced" type="button" key={e.id} data-match-card={e.id} disabled={paused||finished||!!limits.lost} className={'matching-card '+(e.appearance==='word'?'matching-word-card ':'')+(selected===e.id?'chosen ':'')+(verdict[e.id]===false?'verdict-bad':verdict[e.id]===true?'verdict-good':'')} aria-label={e.appearance==='original'?e.word.label:e.appearance==='outline'?'Контур':'Тень'} onClick={()=>{if(drag.suppressClick())return;if(isPlaced)remove(e.id);else setSelected(e.id)}} onPointerDown={event=>{if(!isPlaced)drag.begin(event,'[data-match-group]',target=>place(e.id,target.dataset.matchGroup!));}}>{artwork(e)}</CardButton>;}
 function resize(n:number){setSize(n);setManual(rows=>rows.map(row=>Array.from({length:n},(_,i)=>row[i]||'')));if(n>3)setMode('manual');}
 useGameViewport(session.length>0);
 return <div className={'app v-root v-game-screen '+(session.length?'game-active':'')} {...themeAttributes(theme)} style={visualThemeVars(theme,import.meta.env.BASE_URL)}>
 {roundPlan.confirmation}{!session.length?<SettingsWindow game="Соотнесение" layout={{
 contentAs:"main",contentClassName:"matching-setup settings",
 primary:<><section className="v-settings-section settings-block" data-setup-section="material"><h2>Учебный материал</h2><MaterialSettings textDisplayProvided={!kind&&(displayMode!=='image-image'||captions)} words={words} l={learning} setL={l=>{setLearning(l);if(l.mode==='math'){setSize(2);setDisplayMode('word-word')}else if(l.mode!=='lexical'&&mode==='family'){setMode('reading');setSize(2)}if(l.mode==='reading'&&(learning.mode!=='reading'||l.contentKinds?.some(k=>k!=='words'))){setMode('reading');setSize(2);setDisplayMode(l.contentKinds?.includes('syllables')?'word-word':'word-image')}}} f={filters} setF={part=>setFilters(f=>({...f,...part}))}/></section><section className="v-settings-section settings-block" data-setup-section="rules"><h2>Правила игры</h2><label>Проверка<SelectControl icon={selectIcon("Проверка")} aria-label="Проверка" value={checkMode} onChange={e=>setCheckMode(e.target.value)}><option value="instant">Сразу</option><option value="correct">В конце с исправлением</option><option value="finish">В конце с результатом</option></SelectControl></label>
 {roundPlan.settings(Math.max(1,count))}{limits.settings}
 </section></>,
 secondary:<><section className="v-settings-section settings-block" data-setup-section="task"><h2>Задание</h2>{learning.mode!=='math'&&!kind&&<GameSelect label="Режим карточек" ariaLabel="Режим карточек" value={displayMode} onChange={value=>setDisplayMode(value)}><option value="image-image">Картинка — картинка</option><option value="word-word">Слово — слово</option><option value="word-image">Слово — картинка</option><option value="image-word">Картинка — слово</option></GameSelect>}{learning.mode!=='math'&&!kind&&displayMode==='image-image'&&<label className="v-choice check"><input type="checkbox" role="switch" checked={captions} onChange={e=>setCaptions(e.target.checked)}/>Подписи к исходным картинкам</label>}{learning.mode!=='math'&&!kind&&(displayMode!=='image-image'||captions)&&<TextDisplaySettings l={learning} setL={setLearning}/>}{learning.mode!=='math'&&<label>Соотнести<SelectControl icon={selectIcon("Задание")} aria-label="Задание" value={mode} onChange={e=>{setMode(e.target.value);setMessage('');if(e.target.value==='reading')resize(2);else if(e.target.value!=='manual'&&size>3)resize(3)}}>{familyAvailable&&<option value="family">{size===3?'Самец — самка — детёныш':'Животное — детёныш'}</option>}{mode==='family'&&!familyAvailable&&<option value="family" disabled>Выберите условия</option>}<option value="shadow">{size===3?'Картинка — контур — силуэт':'Картинка — силуэт'}</option><option value="outline">{size===3?'Картинка — контур — силуэт':'Картинка — контур'}</option><option value="reading">Одинаковые элементы</option><option value="manual">Свои группы</option></SelectControl></label>}
 {learning.mode!=='math'&&(mode==='family'||mode==='manual'||!!kind)&&<QuantitySlider label="Элементов в группе (включая опору)" value={size} min={2} max={mode==='manual'?5:3} disabled={busy} onChange={resize}/>}
 {learning.mode!=='math'&&mode==='manual'?<section><SetupAddButton data-field-state={setupError?'required':'ready'} className={setupError?'is-required':''} aria-invalid={!!setupError} onClick={()=>groupDialog.current?.showModal()}>Настроить группы</SetupAddButton><dialog ref={groupDialog} className="sound-picker-dialog"><div className="panel-scroll"><h2>Настроить группы</h2>{manual.map((row,i)=><fieldset className="v-settings-section settings-block" key={i}><legend>Группа {i+1}</legend><div className="matching-manual">{row.map((id,j)=><label key={j}>{j===0?'Опора':'Ответ '+j}<SelectControl value={id} disabled={busy} onChange={e=>setManual(rows=>rows.map((r,k)=>k===i?r.map((v,l)=>l===j?e.target.value:v):r))}><option value="">Выберите слово</option>{available.map(w=><option key={w.id} value={w.id}>{w.label}</option>)}</SelectControl></label>)}</div><button type="button" className="secondary" disabled={busy||manual.length===1} onClick={()=>setManual(rows=>rows.filter((_,j)=>j!==i))}>Удалить группу</button></fieldset>)}<button type="button" className="secondary" disabled={busy||manual.length>=8} onClick={()=>setManual(rows=>[...rows,Array(size).fill('')])}>Добавить группу</button></div><div className="sound-picker-actions"><button type="button" className="primary" onClick={()=>groupDialog.current?.close()}>Готово</button></div></dialog></section>:<QuantitySlider label="Количество групп" value={count} min={1} max={Math.max(1,learning.mode==='math'?Math.min(8,available.length):maxCount)} onChange={setCount}/>}
 </section></>,
 appearance:<section className="v-settings-section settings-block" data-setup-section="appearance"><h2>Оформление</h2><ThemePicker theme={theme} setTheme={setTheme}/></section>,
 footer:<><SetupPreview
 actions={<><button type="button" className="icon-button" onClick={()=>{if(kind)prepared.shuffle();else{setChosenGroups(null);setShuffleKey(k=>k+1)}}} aria-label="Перемешать состав" title="Перемешать состав"><Icon name="Return1"/></button><WordPicker max={8} words={kind?visualWords:displayCandidates.map(g=>({...g.elements[0]?.word,id:g.id,label:g.elements.map(e=>e.word.label).join(' — ')}))} selected={kind?groups.map(g=>g.id):selectedGroups.map(g=>g.id)} onConfirm={ids=>{setCount(ids.length);if(kind)prepared.select(ids);else setChosenGroups({source:candidates,ids})}}/></>}
 message={error||familyError||setupError||(prepared.busy?'Подбираем '+count+' групп, проверено '+prepared.done:!groups.length?(message||'Нет полных групп. Измените тему или составьте группы вручную.'):undefined)}>
 <MaterialSummary items={groups.flatMap(g=>g.elements.map(e=>({label:e.word.label})))} empty="Нет полных групп. Измените тему или составьте группы вручную."/>
 </SetupPreview><button className="primary" disabled={prepared.busy||!!setupError||!!error} onClick={start}>Начать игру</button></>,
 supplementary:(prepared.busy||prepared.cancelled)?<>{prepared.busy&&<button className="secondary" onClick={prepared.cancel}>Отменить подготовку</button>}{prepared.cancelled&&<button className="secondary" onClick={prepared.retry}>Подготовить снова</button>}</>:undefined
 }}/>:<section className="v-play-area play-area"><GameToolbar task={learning.mode==='math'?'Реши и соотнеси':learning.mode==='reading'?'Прочитай и соотнеси':'Найди пару'}
 pause={<IconButton size="toolbar" label={paused?'Продолжить':'Пауза'} icon={paused?'Play':'Pause'} className="icon-button toolbar-pause"  onClick={()=>setPaused(v=>!v)}/>}
 status={<><span>{placed.size} / {bank.length}</span>{limits.status}</>}
 />
 <div className={'v-live-stage stage matching-stage '+(captionMode?'matching-stage-caption ':'')+(displayMode==='image-word'?'matching-bank-words':'')} ref={stageRef} style={boardVars}><Scenery theme={theme}/>{(paused||finished&&roundPlan.isLast||limits.lost)&&<GameDialog stars={limits.lost?0:finished?roundPlan.award:undefined} onRepeat={()=>roundPlan.repeat(loadRound)} title={limits.lost||(finished?(roundPlan.count>1?'Игра завершена':message):'Пауза')} onContinue={paused&&!finished&&!limits.lost?()=>setPaused(false):undefined} onSettings={()=>{setSession([]);setMessage('')}}/>}<MatchingLayout classNames={{root:"matching-content",groups:"matching-groups"}} groups={<> {session.map(g=><section className={'matching-group '+(captionMode?'matching-group-caption '+(displayMode==='word-image'?'caption-above':'caption-below'):'')} key={g.id} data-match-group={g.id}><CardSurface frame="sliced" className={captionMode&&g.elements[0].appearance==='word'?'matching-anchor matching-caption':'matching-card matching-anchor'}>{artwork(g.elements[0])}</CardSurface><div className="v-matching-slots matching-slots">{(placements[g.id]||[]).map(id=>card(bank.find(e=>e.id===id)!,true))}{Array.from({length:g.elements.length-1-(placements[g.id]?.length||0)},(_,i)=><CardSlot className={'matching-slot '+(displayMode==='image-word'?'matching-caption-slot':'')} key={'slot-'+i} aria-label={'Поместить под '+g.elements[0].word.label} disabled={!selected||paused||finished||!!limits.lost} onClick={()=>selected&&place(selected,g.id)}>+</CardSlot>)}</div></section>)}</>} bank={<> {!finished&&<MatchingBank classNames={{root:"matching-bank",heading:"matching-bank-heading",cards:"matching-bank-cards"}} heading={<> {pageCount>1&&<div className="v-bank-pages matching-bank-pages"><button type="button" disabled={currentPage===0} onClick={()=>setBankPage(currentPage-1)} aria-label="Предыдущие карточки">‹</button><span>{currentPage+1} / {pageCount}</span><button type="button" disabled={currentPage>=pageCount-1} onClick={()=>setBankPage(currentPage+1)} aria-label="Следующие карточки">›</button></div>}</>}> {visibleBank.map(e=>card(e))}</MatchingBank>}
 </>} actions={<> <p role="status">{limits.lost||(paused?'Пауза':message)}</p>{checkMode!=='instant'&&!finished&&<button className="primary" disabled={!complete||paused||!!limits.lost||Object.keys(verdict).length>0} onClick={check}>Проверить</button>}{checkMode==='correct'&&Object.values(verdict).some(v=>!v)&&<button className="primary" disabled={paused} onClick={retry}>Вернуть ошибки в банк</button>}
</>}/></div></section>}
 </div>;
}






