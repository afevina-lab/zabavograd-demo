import {SelectControl,selectIcon} from './design-system/SelectControl.tsx';
import {MaterialSummary} from './design-system/MaterialSummary.tsx';
import {SettingsWindow} from './design-system/SettingsWindow.tsx';
import {GameDialog} from './design-system/GameDialog.tsx';
import {useGameViewport} from './design-system/useGameViewport.ts';
import {MathSettingsPanel} from './MathSettingsPanel.tsx';
import {GameSelect} from './GameSelect.tsx';
import {TextDisplaySettings} from './TextDisplaySettings.tsx';
import {readingLabel} from './reading.ts';
import {useGameLimits} from './design-system/GameLimits.tsx';
import {WordPicker} from './WordPicker.tsx';
import {MOTION} from './design-system/motion.ts';
import {QuantitySlider} from './QuantitySlider.tsx';
import {GameToolbar} from './GameToolbar.tsx';
import {starsForScore} from './result-score.ts';
import {contentKinds,generateCombinations,materialCandidates} from './reading.ts';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useLibrary} from './useLibrary.ts';
import {useTheme} from './design-system/useTheme.ts';
import {themeAttributes,themeVars,soundFile} from './design-system/themes.ts';
import {Scenery,ThemePicker,Icon,ScoreStars} from './GameUI.tsx';
import {MaterialSettings} from './MaterialSettings.tsx';
import {CardArtwork} from './CardArtwork.tsx';
import {defaultFilters} from './model.ts';
import {groups,initialLearning,learningPool,balancedPick} from './learning.ts';

import {arithmeticDeck,compositionDeck,corruptWord,conveyorConditions,materialConveyorDeck,conveyorErrorCount,startConveyor,stepConveyor,answerConveyor,conveyorTarget,type ConveyorCard,type ConveyorState,type ConveyorLevel} from './conveyor.ts';

export function Conveyor(){
 const {words,error}=useLibrary(),[theme,setTheme]=useTheme();
 const [learning,setLearning]=useState(initialLearning),[filters,setFilters]=useState(defaultFilters);
 const [task,setTask]=useState('naming');const [mathKind,setMathKind]=useState<'examples'|'composition'>('examples'),[add,setAdd]=useState(true),[subtract,setSubtract]=useState(true),[includeZero,setIncludeZero]=useState(true);
 const [sound,setSound]=useState(true),[captions,setCaptions]=useState(false);
 const [material,setMaterial]=useState('pictures'),[condition,setCondition]=useState('none'),[level,setLevel]=useState<ConveyorLevel>('easy');
 const [count,setCount]=useState(12),[max,setMax]=useState(10);
 const [deck,setDeck]=useState<ConveyorCard[]>([]),[state,setState]=useState<ConveyorState|null>(null),[paused,setPaused]=useState(false),[message,setMessage]=useState('');
 const limits=useGameLimits(!!state&&!state.finished,paused);
 const [shuffleKey,setShuffleKey]=useState(0),[manualIds,setManualIds]=useState<string[]|null>(null);
 const latest=useRef(state);latest.current=state;
 const syllableMode=['automation','differentiation','reading'].includes(learning.mode)&&contentKinds(learning).some(k=>k!=='words');
 const universe=useMemo(()=>{
  // The entire condition universe is classified: excluded sounds can be
  // intentionally shown as NO answers only in the condition-checking mode.
  const lexical=learningPool(words,filters,initialLearning);
  const combinations=learning.mode==='reading'?materialCandidates([],learning):syllableMode?generateCombinations({...learning,mode:'differentiation',sounds:Object.values(groups).flat(),targetSlots:undefined}):[];
  return [...lexical,...combinations].filter(w=>w.weight>0&&(material!=='pictures'||w.variants?.length));
 },[words,filters,learning,syllableMode,material]);
 const suitable=useMemo(()=>learningPool(words,filters,learning).filter(w=>material!=='pictures'||w.variants?.length),[words,filters,learning,material]);
 const suitableIds=useMemo(()=>new Set(suitable.map(w=>w.id)),[suitable]);
 const classifiedUniverse=useMemo(()=>condition==='material'&&['automation','differentiation','search'].includes(learning.mode)?universe.filter(w=>learning.searchTarget==='letter'||Boolean(w.phonemes)):condition==='material'&&learning.mode==='structure'?universe.filter(w=>w.type!==null):condition==='material'&&learning.mode==='lexical'?universe.filter(w=>w.categories?.length):universe,[condition,learning,universe]);
 const positives=useMemo(()=>condition==='material'?classifiedUniverse.filter(w=>suitableIds.has(w.id)):condition==='correct'?suitable.filter(w=>/^[а-яё]{2,}$/i.test(w.label)):suitable,[condition,classifiedUniverse,suitableIds,suitable]);
 const negatives=useMemo(()=>condition==='material'?classifiedUniverse.filter(w=>!suitableIds.has(w.id)):[],[condition,classifiedUniverse,suitableIds]);
 const legal=material==='math'?condition==='none'||condition==='math':condition==='none'||condition==='material'||material==='words'&&condition==='correct';
 const preparation=useMemo(()=>{try{if(!legal)throw Error('Выберите совместимое задание.');const selectedPositive=manualIds?positives.filter(w=>manualIds.includes(w.id)):positives;const selectedNegative=manualIds?negatives.filter(w=>manualIds.includes(w.id)):negatives;
   let next:ConveyorCard[]=[];
   if(material==='math'){if(mathKind==='examples'&&!add&&!subtract)throw Error('Выберите сложение или вычитание.');next=mathKind==='composition'?compositionDeck(count,max,includeZero):arithmeticDeck(count,max,condition==='math',Math.random,{add,subtract,includeZero});}
   else if(condition==='material'){
    next=materialConveyorDeck(selectedPositive,selectedNegative,count,learning);
   }else{
    if(selectedPositive.length<count)throw Error('Недостаточно подходящих карточек. Уменьшите количество или измените условие.');
    const items=balancedPick(selectedPositive,count,learning);
    const flags=conveyorConditions(count,condition==='correct');
    const known=new Set(words.map(w=>w.label.toLocaleLowerCase('ru')));
    next=items.map((word,i)=>{
     const bad=condition==='correct'&&!flags[i]?corruptWord(word.label,conveyorErrorCount(word.label),'mixed',known):null;
     return {id:'word-'+i,text:bad||word.label,word,original:word.label,expected:!bad};
    });
   }
   return {deck:next,error:''};
  }catch(e){return {deck:[],error:e instanceof Error?e.message:'Не удалось подобрать карточки.'}}
 },[legal,material,condition,count,max,learning,positives,negatives,words,shuffleKey,manualIds,mathKind,add,subtract,includeZero]);
 function start(){if(preparation.error)return;limits.reset();setDeck(preparation.deck);setState(startConveyor(preparation.deck));setPaused(false);setMessage('');}
 useEffect(()=>{
  if(!state||state.finished||paused||limits.lost)return;
  let frame=0,last=0;const move=(now:number)=>{const elapsed=last?(now-last)/1000:0;if(last)setState(s=>s?stepConveyor(s,deck,level,elapsed,condition!=='none'):s);last=now;frame=requestAnimationFrame(move)};frame=requestAnimationFrame(move);return()=>cancelAnimationFrame(frame);
 },[Boolean(state),state?.finished,paused,deck,level,condition,limits.lost]);
 useEffect(()=>{const handler=()=>{if(document.hidden)setPaused(true)};document.addEventListener('visibilitychange',handler);return()=>document.removeEventListener('visibilitychange',handler)},[]);
 function answer(yes:boolean){const current=latest.current;if(!current||paused||current.finished||limits.lost)return;const active=conveyorTarget(current);if(!active)return;const correct=condition==='none'?yes:yes===active.card.expected;if(!correct)limits.mistake();const next=answerConveyor(current,yes,condition!=='none',MOTION.conveyorFeedbackMs/1000);latest.current=next;setState(next);if(sound){const audio=new Audio(import.meta.env.BASE_URL+'assets/audio/'+soundFile(theme,correct?'match':'wrong'));audio.volume=.35;void audio.play().catch(()=>{})};}
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,select,textarea,button')||e.repeat)return;if(e.key==='ArrowRight'){e.preventDefault();answer(true)}if(e.key==='ArrowLeft'){e.preventDefault();answer(false)}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)});
 const active=state?conveyorTarget(state):undefined;
 useGameViewport(!!state);
 return <div className={'app '+(state?'game-active':'')} {...themeAttributes(theme)} style={themeVars(theme,import.meta.env.BASE_URL)}><main>
 {!state?<SettingsWindow game="Конвейер"><section className="settings conveyor-settings"><p>Называйте, читайте или решайте слева направо. Ответ вслух, кнопки нажимает педагог.</p>
 <section className="settings-block"><h2>Учебный материал</h2><GameSelect label="Учебная задача" value={task} onChange={value=>{const next=value;setTask(next);setMaterial(next==='math'?'math':next==='reading'?'words':'pictures');setLearning({...initialLearning,mode:next==='lexical'?'lexical':next==='sounds'?'automation':next==='structure'?'structure':next==='reading'?'reading':'any'});setCondition('none')}}><option value="naming">Называние</option><option value="lexical">Лексическая тема</option><option value="sounds">Работа со звуками</option><option value="structure">Слоговая структура</option><option value="reading">Чтение</option><option value="math">Математика</option></GameSelect>
 <label>Проверка<SelectControl value={condition} onChange={e=>setCondition(e.target.value)}><option value="none">Без условия — оценивает педагог</option>{['words','pictures'].includes(material)&&<option value="material">Подходит к заданию?</option>}{material==='words'&&<option value="correct">Слово написано без ошибок</option>}{material==='math'&&<option value="math">Равенство верно</option>}</SelectControl></label>
 {['words','pictures'].includes(material)&&<><label>Карточки<SelectControl icon={selectIcon("Вид карточек")} aria-label="Вид карточек" value={material} onChange={e=>setMaterial(e.target.value)}><option value="pictures" disabled={syllableMode}>Картинки</option><option value="words">Текст (слова и слоги)</option></SelectControl></label>{(material==='words'||captions)&&<TextDisplaySettings l={learning} setL={setLearning}/>}<MaterialSettings textDisplayProvided={material==='words'||captions} hideTask words={words} f={filters} setF={part=>setFilters(f=>({...f,...part}))} l={learning} setL={next=>{setLearning(next);if(contentKinds(next).some(k=>k!=='words'))setMaterial('words')}}/></>}
 
 {material==='math'&&<MathSettingsPanel l={{...initialLearning,mode:'math',math:{kind:mathKind,target:max,add,subtract,includeZero}}} setL={next=>{const m=next.math!;if(m.kind!==mathKind)setCondition('none');setMathKind(m.kind||'examples');setMax(m.target||10);setAdd(m.add??true);setSubtract(m.subtract??true);setIncludeZero(m.includeZero??true)}}/>}
 </section><section className="settings-block"><h2>Карточки и правила</h2><label>Сложность<SelectControl icon="speed" value={level} onChange={e=>setLevel(e.target.value as ConveyorLevel)}><option value="easy">Простой — остановка в центре</option><option value="medium">Средний — очень медленно</option><option value="hard">Сложный — быстрее</option></SelectControl></label><QuantitySlider label="Карточек" value={count} min={6} max={24} onChange={setCount}/>{material==='pictures'&&<label className="check"><input type="checkbox" role="switch" checked={captions} onChange={e=>setCaptions(e.target.checked)}/>Показывать подписи</label>}</section><section className="settings-block"><div className="material-head"><h2>В этой игре</h2><div><button className="icon-button" onClick={()=>{setManualIds(null);setShuffleKey(k=>k+1)}} aria-label="Перемешать состав" title="Перемешать состав"><Icon name="Return1"/></button>{['words','pictures'].includes(material)&&<WordPicker max={24} words={[...positives,...negatives]} selected={preparation.deck.flatMap(c=>c.word?[c.word.id]:[])} onConfirm={ids=>{setManualIds(ids);setCount(ids.length)}}/>}</div></div><MaterialSummary items={preparation.deck.map(c=>({label:c.text}))} empty={preparation.error||undefined}/></section>{limits.settings}<ThemePicker theme={theme} setTheme={setTheme}/><p role="status">{error||message||(['words','pictures'].includes(material)?`Подходящих: ${positives.length}${condition==='material'?' · Неподходящих: '+negatives.length+' · В игре до 40%':' '}`:'Материал готов')}</p>{condition==='material'&&<p className="hint">Отметьте, подходит ли карточка к заданию: ✓ да · ✕ нет. Похожие по звуку или теме карточки могут быть ответом «нет», в том числе с исключёнными звуками.</p>}<button className="primary" disabled={!!preparation.error||!legal||(['words','pictures'].includes(material)&&(!positives.length||condition==='material'&&!negatives.length))} onClick={start}>Начать</button>
 </section></SettingsWindow>:<section className="play-area"><GameToolbar><a className="icon-button zg-home" aria-label="Домой" href={import.meta.env.BASE_URL+'home.html'}><Icon name="Home1"/></a><button className="icon-button" aria-label="Настройки" onClick={()=>{setState(null);latest.current=null}}><Icon name="Settings"/></button><button className="icon-button" aria-label={paused?'Продолжить':'Пауза'} onClick={()=>setPaused(v=>!v)}><Icon name={paused?'RightArrow1':'Pause'}/></button><button className="icon-button" aria-label={sound?'Выключить звук':'Включить звук'} onClick={()=>setSound(v=>!v)}><Icon name={sound?'Sound':'SoundOff'}/></button><button className="icon-button" aria-label="Полный экран" onClick={e=>{if(document.fullscreenElement)void document.exitFullscreen();else void e.currentTarget.closest('.app')?.requestFullscreen()}}><Icon name="Sight"/></button>{material==='pictures'&&<button className="icon-button zg-caption-toggle" aria-label={captions?'Скрыть подписи':'Показать подписи'} aria-pressed={captions} onClick={()=>setCaptions(v=>!v)}><Icon name="Question"/></button>}<span>{state.correct} / {deck.length}</span>{limits.status}<span>{condition==='none'?'Оценивает педагог':condition==='correct'?'Слово без ошибок?':condition==='math'?'Равенство верно?':'Подходит к заданию?'}</span></GameToolbar><div className="stage conveyor-stage"><Scenery theme={theme}/>{(paused||state.finished||limits.lost)&&<GameDialog title={limits.lost||(state.finished?`Завершено: ${state.correct} из ${deck.length}`:'Пауза')} onContinue={paused&&!state.finished&&!limits.lost?()=>setPaused(false):undefined} onSettings={()=>{setState(null);latest.current=null}}/>}<div className="conveyor-belt" aria-label="Движение слева направо">{state.cards.map(item=><div className={'conveyor-card '+(material!=='pictures'?'text-card ':'')+(item===active?'is-current':'')+(item.answered?(item.correct?' conveyor-correct':' conveyor-wrong'):'')} key={item.card.id} style={{left:item.position*100+'%',...(material!=='pictures'?{fontSize:`clamp(14px, ${82/Math.max(6,item.card.text.length*.65)}vw, 46px)`}:{})}}>{material==='pictures'&&item.card.word?.variants?.[0]?<><CardArtwork image={item.card.word.variants[0]} label={item.card.text}/>{captions&&<small>{readingLabel(item.card.text,learning)}</small>}</>:<span>{readingLabel(item.card.text,learning)}</span>}</div>)}</div><div className="conveyor-answer">{state.finished&&<><ScoreStars value={starsForScore(state.correct,deck.length)}/><h2>{state.correct} / {deck.length}</h2></>}{(paused||limits.lost)&&<p>{limits.lost||'Пауза'}</p>}{(state.finished||limits.lost)?<button className="primary" onClick={()=>setState(null)}>К настройкам</button>:<><button className="primary" aria-label="Да, подходит или верно" disabled={!active||paused||!!limits.lost} onClick={()=>answer(true)}>✓</button><button className="secondary" aria-label="Нет, не подходит или неверно" disabled={!active||paused} onClick={()=>answer(false)}>✕</button><p>→ галочка · ← крестик{state.missed>0?` · Без отметки: ${state.missed}`:''}</p></>}</div></div></section>}
 </main></div>;
}
