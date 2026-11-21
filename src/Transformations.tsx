import {GameDialog} from './design-system/GameDialog.tsx';
import {SettingsWindow} from './design-system/SettingsWindow.tsx';
import {useGameViewport,enterGameViewport} from './design-system/useGameViewport.ts';
import {GameSelect} from './GameSelect.tsx';
import {TextDisplaySettings} from './TextDisplaySettings.tsx';
import {readingLabel} from './reading.ts';

import {useGameLimits} from './design-system/GameLimits.tsx';
import {QuantitySlider} from './QuantitySlider.tsx';
import {GameToolbar} from './GameToolbar.tsx';
import {WordPicker} from './WordPicker.tsx';
import {availableMaterial,canSelectAutomatically} from './material-policy.ts';
import {MaterialSettings} from './MaterialSettings.tsx';
import {initialLearning,learningPool,balancedPick} from './learning.ts';
import {defaultFilters} from './model.ts';
import {useLibrary} from './useLibrary.ts';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Icon,ThemePicker,Scenery} from './GameUI.tsx';
import {useTheme} from './design-system/useTheme.ts';
import {themeAttributes,themeVars} from './design-system/themes.ts';
import {TransformationScene} from './design-system/TransformationScene.tsx';
import {MOTION} from './design-system/motion.ts';
import type {Word} from './model.ts';
import {transformationEligibility,transformationAnswer,type TransformationMode,type TransformationPhase} from './transformations.ts';
export function Transformations(){
 const[theme,setTheme]=useTheme(),[mode,setMode]=useState<TransformationMode>('reading'),[phase,setPhase]=useState<TransformationPhase>('question');
 const {words:library,error}=useLibrary();
 const words=useMemo(()=>availableMaterial(library,true,false),[library]);
 const [paused,setPaused]=useState(false),[completed,setCompleted]=useState(false);

 const[index,setIndex]=useState(0),[started,setStarted]=useState(false);
 const limits=useGameLimits(started,paused);
 const [learning,setLearning]=useState(initialLearning),[filters,setFilters]=useState(defaultFilters),[count,setCount]=useState(10);
 const [manual,setManual]=useState<{source:Word[];ids:string[]}|null>(null),[random,setRandom]=useState(true),[session,setSession]=useState<Word[]>([]);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);

 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const candidates=useMemo(()=>learningPool(words,filters,learning,false).filter(w=>learning.mode==='math'||transformationEligibility(w,mode,learning.mode)==='eligible'),[words,filters,learning,mode]);
 const [shuffleKey,setShuffleKey]=useState(0);
 const pool=useMemo(()=>manual?.source===candidates?candidates.filter(w=>manual.ids.includes(w.id)):balancedPick(candidates.filter(canSelectAutomatically),Math.min(count,candidates.filter(canSelectAutomatically).length),learning),[manual,candidates,count,shuffleKey]);
 const activeWords=started?session:pool;
 const word=activeWords[index];
 function reset(){if(timer.current)clearTimeout(timer.current);setPhase('question');setStarted(false);setCompleted(false);setPaused(false)}
 function reveal(){if(phase!=='question'||paused||limits.lost)return;setPhase('transforming');const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;timer.current=setTimeout(()=>setPhase('answer'),reduced?0:MOTION.matchMs)}
 useGameViewport(started);
 return <div className={`app ${started?'game-active':''}`} {...themeAttributes(theme)} style={themeVars(theme,import.meta.env.BASE_URL)}>
 {!started?<SettingsWindow game="Превращения"><main className="transformation-setup"><p>Назовите ответ — затем посмотрите, что изменилось.</p><section className="settings"><section className="settings-block"><h3>1. Карточки и задания</h3>{learning.mode!=='math'&&<GameSelect label="Задание" value={mode} onChange={value=>setMode(value as TransformationMode)}><option value="small">Назови ласково</option><option value="many">Один — много</option><option value="reading">Чтение: слово — картинка</option></GameSelect>}{learning.mode!=='math'&&<TextDisplaySettings l={learning} setL={setLearning}/>}<QuantitySlider label="Количество заданий" value={count} min={1} max={Math.max(1,Math.min(20,candidates.length))} onChange={setCount}/></section><section className="settings-block"><h3>2. Учебная задача</h3><MaterialSettings textDisplayProvided words={library} f={filters} setF={part=>setFilters(f=>({...f,...part}))} l={learning} setL={next=>{setLearning(next);if(next.mode==='reading')setMode('reading')}}/></section><section className="settings-block"><h3>3. Как играть</h3><label className="check"><input type="checkbox" role="switch" checked={random} onChange={e=>setRandom(e.target.checked)}/>Перемешивать карточки</label>{limits.settings}</section><section className="settings-block"><div className="material-head"><h2>В этой игре</h2><div><WordPicker words={candidates} selected={pool.map(w=>w.id)} onConfirm={ids=>{setManual({source:candidates,ids});setCount(ids.length)}}/><button type="button" className="icon-button" onClick={()=>{setManual(null);setShuffleKey(k=>k+1)}} aria-label="Перемешать состав" title="Перемешать состав"><Icon name="Return1"/></button></div></div><p>{pool.map(w=>w.label).join(' · ')||'Нет подходящих слов'}</p></section><ThemePicker theme={theme} setTheme={setTheme}/><p role="status">{error||(!words.length?'Загружаем библиотеку…':pool.length?`Доступно карточек: ${pool.length}`:'Нет подходящего материала. Для словообразования нужны формы из библиотеки; звуковой отбор формы пока недоступен.')}</p><button className="primary" disabled={!pool.length||pool.length!==count} onClick={()=>{const next=[...pool];if(random)for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]]}enterGameViewport();limits.reset();setPaused(false);setSession(next);setIndex(0);setPhase('question');setCompleted(false);setStarted(true)}}>Начать игру</button><p className="hint">Ребёнок отвечает вслух. Взрослый запускает превращение; распознавания речи нет.</p></section></main></SettingsWindow>:<section className="play-area" aria-label="Превращения"><GameToolbar><div className="game-actions"><button className="icon-button" aria-label="Домой" onClick={()=>location.assign(import.meta.env.BASE_URL+'home.html')}><Icon name="Home1"/></button><button className="icon-button" aria-label="Настройки" onClick={reset}><Icon name="Settings"/></button></div><button className="icon-button" aria-label={paused?'Продолжить':'Пауза'} onClick={()=>setPaused(v=>!v)}><Icon name={paused?'RightArrow1':'Pause'}/></button><span>{index+1} / {activeWords.length}</span>{limits.status}</GameToolbar><div className="stage transformation-stage"><Scenery theme={theme}/>{word&&learning.mode==='math'?<div className="transformation-math-card"><h2>{word.label}</h2>{phase==='answer'&&<p>{word.answer}</p>}</div>:word&&<TransformationScene theme={theme} word={mode==='reading'?{...word,label:readingLabel(word.label,{...learning,mode:'reading'})}:word} mode={mode} phase={phase}/>}<div className="transformation-prompt"><h2>{learning.mode==='math'?'Реши задание':mode==='small'?'Назови ласково':mode==='many'?'Один — а если много?':'Прочитай слово'}</h2><p>{phase==='answer'?(learning.mode==='math'?'Проверь свой ответ':mode==='small'?word?transformationAnswer(word,'small'):null:mode==='many'?word?transformationAnswer(word,'many'):null:'Посмотрите на результат'):phase==='transforming'?'Превращение…':'Сначала ответьте вслух'}</p><div className="transformation-actions"><button className="secondary" disabled={paused||!!limits.lost} onClick={()=>limits.mistake()}>Отметить ошибку</button><fieldset disabled={paused||!!limits.lost}>{index>0&&<button className="secondary" onClick={()=>{if(timer.current)clearTimeout(timer.current);setIndex(i=>i-1);setPhase('question')}}>Предыдущая карточка</button>}{phase==='question'?<button className="primary" onClick={reveal}>{learning.mode==='math'?'Показать ответ':'Показать превращение'}</button>:phase==='answer'?<><button className="secondary" onClick={()=>setPhase('question')}>Повторить</button><button className="primary" onClick={()=>{if(timer.current)clearTimeout(timer.current);if(index+1>=activeWords.length){setCompleted(true);setPaused(true)}else{setIndex(i=>i+1);setPhase('question')}}}>{index+1>=activeWords.length?'Завершить':'Следующая карточка'}</button></>:<button className="secondary" onClick={()=>{if(timer.current)clearTimeout(timer.current);setPhase('answer')}}>Пропустить анимацию</button>}</fieldset></div></div>{(paused||completed||limits.lost)&&<GameDialog title={limits.lost||(completed?'Игра завершена':'Пауза')} onContinue={!completed&&!limits.lost?()=>setPaused(false):undefined} onSettings={reset}/>}</div></section>}
 </div>;
}

