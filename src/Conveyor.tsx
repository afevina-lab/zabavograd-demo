import {starsForScore} from './result-score.ts';
import {pickWords} from './material-selection.ts';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useLibrary} from './useLibrary.ts';
import {useTheme} from './design-system/useTheme.ts';
import {themeAttributes,themeVars,soundFile} from './design-system/themes.ts';
import {Scenery,ThemePicker,Icon,ScoreStars} from './GameUI.tsx';
import {MaterialSettings} from './MaterialSettings.tsx';
import {CardArtwork} from './CardArtwork.tsx';
import {defaultFilters} from './model.ts';
import {initialLearning,learningPool} from './learning.ts';
import {alphabet} from './reading.ts';
import {containsExcludedSound} from './learning.ts';
import {arithmeticDeck,corruptWord,conveyorErrorCount,startConveyor,stepConveyor,answerConveyor,conveyorTarget,type ConveyorCard,type ConveyorState,type ConveyorLevel} from './conveyor.ts';

export function Conveyor(){
 const {words,error}=useLibrary(),[theme,setTheme]=useTheme();
 const [learning,setLearning]=useState(initialLearning),[filters,setFilters]=useState(defaultFilters);
 const [task,setTask]=useState('naming');
 const [sound,setSound]=useState(true);
 const [material,setMaterial]=useState('pictures'),[condition,setCondition]=useState('none'),[level,setLevel]=useState<ConveyorLevel>('easy');
 const [count,setCount]=useState(12),[max,setMax]=useState(10),[target,setTarget]=useState('а');
 const [deck,setDeck]=useState<ConveyorCard[]>([]),[state,setState]=useState<ConveyorState|null>(null),[paused,setPaused]=useState(false),[message,setMessage]=useState('');
 const latest=useRef(state);latest.current=state;
 const universe=useMemo(()=>learningPool(words,filters,{...initialLearning,excludedSounds:learning.excludedSounds}).filter(w=>w.weight>0&&(material!=='pictures'||w.variants?.length)&&(!(learning.excludedSounds?.length)||Boolean(w.phonemes)&&!learning.excludedSounds.some(s=>containsExcludedSound(w,s)))),[words,filters,learning.excludedSounds,material,condition,learning.mode]);
 const suitable=useMemo(()=>learningPool(universe,filters,learning),[universe,filters,learning]);
 const suitableIds=useMemo(()=>new Set(suitable.map(w=>w.id)),[suitable]);
 const classifiedUniverse=condition==='material'&&['automation','differentiation','search'].includes(learning.mode)?universe.filter(w=>learning.searchTarget==='letter'||Boolean(w.phonemes)):condition==='material'&&learning.mode==='structure'?universe.filter(w=>w.type!==null):condition==='material'&&learning.mode==='lexical'?universe.filter(w=>w.categories?.length):universe;
 const positives=condition==='material'?classifiedUniverse.filter(w=>suitableIds.has(w.id)):condition==='correct'?suitable.filter(w=>/^[а-яё]{2,}$/i.test(w.label)):suitable;
 const negatives=condition==='material'?classifiedUniverse.filter(w=>!suitableIds.has(w.id)):[];
 const legal=material==='letters'?condition==='none'||condition==='letter':material==='math'?condition==='none'||condition==='math':condition==='none'||condition==='material'||material==='words'&&condition==='correct';
 function start(){
  let next:ConveyorCard[]=[];setMessage('');
  if(!legal)return;
  if(material==='math')next=arithmeticDeck(count,max,condition==='math');
  else if(material==='letters')next=Array.from({length:count},(_,i)=>{const text=condition==='letter'&&i%2===0?target:alphabet[Math.floor(Math.random()*alphabet.length)];return {id:'letter-'+i,text,expected:text===target}});
  else{
   if(!positives.length||condition==='material'&&!negatives.length){setMessage('Нужны подходящие и неподходящие карточки. Уточните условие.');return;}
   const known=new Set(words.map(w=>w.label.toLocaleLowerCase('ru')));
   next=Array.from({length:count},(_,i)=>{const expected=condition==='none'||i%2===0;const pool=condition==='material'&&!expected?negatives:positives;const word=pickWords(pool,1)[0];const bad=condition==='correct'&&!expected?corruptWord(word.label,conveyorErrorCount(word.label),'mixed',known):null;return {id:'word-'+i,text:bad||word.label,word,original:word.label,expected:condition==='correct'?!bad:condition==='material'?expected:true};});
  }
  setDeck(next);setState(startConveyor(next));setPaused(false);
 }
 useEffect(()=>{
  if(!state||state.finished||paused)return;
  let frame=0,last=0;const move=(now:number)=>{const elapsed=last?(now-last)/1000:0;if(last)setState(s=>s?stepConveyor(s,deck,level,elapsed,condition!=='none'):s);last=now;frame=requestAnimationFrame(move)};frame=requestAnimationFrame(move);return()=>cancelAnimationFrame(frame);
 },[Boolean(state),state?.finished,paused,deck,level,condition]);
 useEffect(()=>{const handler=()=>{if(document.hidden)setPaused(true)};document.addEventListener('visibilitychange',handler);return()=>document.removeEventListener('visibilitychange',handler)},[]);
 function answer(yes:boolean){const current=latest.current;if(!current||paused||current.finished)return;const active=conveyorTarget(current);if(!active)return;const correct=condition==='none'?yes:yes===active.card.expected;const next=answerConveyor(current,yes,condition!=='none');latest.current=next;setState(next);if(sound){const audio=new Audio(import.meta.env.BASE_URL+'assets/audio/'+soundFile(theme,correct?'match':'wrong'));audio.volume=.35;void audio.play().catch(()=>{})};}
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,select,textarea,button')||e.repeat)return;if(e.key==='ArrowRight'){e.preventDefault();answer(true)}if(e.key==='ArrowLeft'){e.preventDefault();answer(false)}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)});
 const active=state?conveyorTarget(state):undefined;
 return <div className={'app '+(state?'game-active':'')} {...themeAttributes(theme)} style={themeVars(theme,import.meta.env.BASE_URL)}><main>
 {!state?<section className="settings conveyor-settings"><a href={import.meta.env.BASE_URL+'home.html'}>← Домой</a><h1>Конвейер</h1><p>Называйте, читайте или решайте слева направо. Ответ вслух, кнопки нажимает педагог.</p>
 <label>Учебная задача<select value={task} onChange={e=>{const next=e.target.value;setTask(next);setMaterial(next==='math'?'math':next==='letters'?'letters':next==='reading'?'words':'pictures');setLearning({...initialLearning,mode:next==='lexical'?'lexical':next==='sounds'?'automation':next==='structure'?'structure':next==='reading'?'reading':'any'});setCondition('none')}}><option value="naming">Называние</option><option value="lexical">Лексическая тема</option><option value="sounds">Работа со звуками</option><option value="structure">Слоговая структура</option><option value="reading">Чтение слов</option><option value="letters">Чтение букв</option><option value="math">Счёт</option></select></label>
 <label>Проверка<select value={condition} onChange={e=>setCondition(e.target.value)}><option value="none">Без условия — оценивает педагог</option>{['words','pictures'].includes(material)&&<option value="material">Подходит выбранным настройкам материала</option>}{material==='words'&&<option value="correct">Слово написано без ошибок</option>}{material==='letters'&&<option value="letter">Целевая буква</option>}{material==='math'&&<option value="math">Равенство верно</option>}</select></label>
 {['words','pictures'].includes(material)&&<MaterialSettings hideTask words={words} f={filters} setF={part=>setFilters(f=>({...f,...part}))} l={learning} setL={setLearning}/>}
 {condition==='letter'&&<label>Буква<select value={target} onChange={e=>setTarget(e.target.value)}>{alphabet.map(c=><option key={c}>{c}</option>)}</select></label>}
 {material==='math'&&<label>Числа в пределах<select value={max} onChange={e=>setMax(+e.target.value)}>{[10,20,100].map(n=><option key={n}>{n}</option>)}</select></label>}
 <label>Сложность<select value={level} onChange={e=>setLevel(e.target.value as ConveyorLevel)}><option value="easy">Простой — остановка в центре</option><option value="medium">Средний — очень медленно</option><option value="hard">Сложный — быстрее</option></select></label><label>Карточек<select value={count} onChange={e=>setCount(+e.target.value)}>{[6,12,18,24].map(n=><option key={n}>{n}</option>)}</select></label><label className="check"><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/>Звук</label><ThemePicker theme={theme} setTheme={setTheme}/><p role="status">{error||message||(['words','pictures'].includes(material)?`Подходящих: ${positives.length}${condition==='material'?' · Неподходящих: '+negatives.length:''}`:'Материал готов')}</p><button className="primary" disabled={!legal||(['words','pictures'].includes(material)&&(!positives.length||condition==='material'&&!negatives.length))} onClick={start}>Начать</button>
 </section>:<section className="play-area"><div className="play-toolbar"><a className="icon-button zg-home" aria-label="Домой" href={import.meta.env.BASE_URL+'home.html'}><Icon name="Home1"/></a><button className="icon-button" aria-label="Настройки" onClick={()=>{setState(null);latest.current=null}}><Icon name="Settings"/></button><button className="icon-button" aria-label={paused?'Продолжить':'Пауза'} onClick={()=>setPaused(v=>!v)}><Icon name={paused?'RightArrow1':'Pause'}/></button><button className="icon-button" aria-label={sound?'Выключить звук':'Включить звук'} onClick={()=>setSound(v=>!v)}><Icon name={sound?'Sound':'SoundOff'}/></button><button className="icon-button" aria-label="Полный экран" onClick={e=>{if(document.fullscreenElement)void document.exitFullscreen();else void e.currentTarget.closest('.app')?.requestFullscreen()}}><Icon name="Sight"/></button><span>{state.correct} / {deck.length}</span><span>{condition==='none'?'Оценивает педагог':condition==='correct'?'Слово без ошибок?':condition==='math'?'Равенство верно?':condition==='letter'?'Буква '+target.toUpperCase(): 'Подходит условию?'}</span></div><div className="stage conveyor-stage"><Scenery theme={theme}/><div className="conveyor-belt" aria-label="Движение слева направо">{state.cards.map(item=><div className={'conveyor-card '+(item===active?'is-current':'')+(item.answered?(item.correct?' conveyor-correct':' conveyor-wrong'):'')} key={item.card.id} style={{left:item.position*100+'%'}}>{material==='pictures'&&item.card.word?.variants?.[0]?<CardArtwork image={item.card.word.variants[0]} label={item.card.text}/>:<span>{item.card.text}</span>}</div>)}</div><div className="conveyor-answer">{state.finished&&<><ScoreStars value={starsForScore(state.correct,deck.length)}/><h2>{state.correct} / {deck.length}</h2></>}{paused&&<p>Пауза</p>}{state.finished?<button className="primary" onClick={()=>setState(null)}>К настройкам</button>:<><button className="primary" aria-label="Да, подходит или верно" disabled={!active||paused} onClick={()=>answer(true)}>✓</button><button className="secondary" aria-label="Нет, не подходит или неверно" disabled={!active||paused} onClick={()=>answer(false)}>✕</button><p>→ галочка · ← крестик{state.missed>0?` · Без отметки: ${state.missed}`:''}</p></>}</div></div></section>}
 </main></div>;
}
