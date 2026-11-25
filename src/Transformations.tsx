import {visualThemeVars} from './visual/foundation/visualThemeVars.ts';
import {GameActions,ActionGroup} from './visual/compositions/GameActions.tsx';
import {AnswerButton} from './visual/primitives/AnswerButton.tsx';
import {IconButton} from './visual/primitives/Buttons.tsx';
import {useRoundPlan} from './design-system/useRoundPlan.tsx';
import {playGameSound,useGameSoundOutcome,resetSoundCombo} from './design-system/game-audio.ts';
import {GameDialog} from './design-system/GameDialog.tsx';
import {SettingsWindow} from './design-system/SettingsWindow.tsx';
import {SetupPreview} from './design-system/SetupPreview.tsx';
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
import {Icon} from './visual/primitives/Icon.tsx';
import {ThemePicker} from './design-system/ThemePicker.tsx';
import {Scenery} from './design-system/Scenery.tsx';
import {useTheme} from './design-system/useTheme.ts';
import {themeAttributes,themeVars} from './design-system/themes.ts';
import {TransformationScene} from './design-system/TransformationScene.tsx';
import {MOTION} from './design-system/motion.ts';
import type {Word} from './model.ts';
import {transformationEligibility,transformationAnswer,type TransformationMode,type TransformationPhase} from './transformations.ts';
export function Transformations(){
 const roundPlan=useRoundPlan<Word>('transformations');
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
 useGameSoundOutcome(limits.lost?'lose':completed&&roundPlan.isLast?'win':null);
 function reset(){if(timer.current)clearTimeout(timer.current);setPhase('question');setStarted(false);setCompleted(false);setPaused(false)}
 function loadRound(next:Word[]){if(timer.current)clearTimeout(timer.current);enterGameViewport();resetSoundCombo();limits.reset();setPaused(false);setSession(next);setIndex(0);setPhase('question');setCompleted(false);setStarted(true)}
 function start(){const next=[...pool];if(random)for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]]}roundPlan.request(next,loadRound,{text:learning.mode==='reading'});}
 useEffect(()=>{if(!completed||limits.lost)return;const next=roundPlan.advance(3);if(next)loadRound(next)},[completed]);
 function reveal(){if(phase!=='question'||paused||limits.lost)return;playGameSound('match');setPhase('transforming');const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;timer.current=setTimeout(()=>setPhase('answer'),reduced?0:MOTION.matchMs)}
 useGameViewport(started);
 return <div className={`app v-root v-game-screen ${started?'game-active':''}`} {...themeAttributes(theme)} style={visualThemeVars(theme,import.meta.env.BASE_URL)}>
 {roundPlan.confirmation}{!started?<SettingsWindow game="Превращения" layout={{
 contentAs:'main',contentClassName:'transformation-setup settings',
 primary:<><section className="v-settings-section settings-block" data-setup-section="material"><h2>Учебный материал</h2><MaterialSettings textDisplayProvided words={library} f={filters} setF={part=>setFilters(f=>({...f,...part}))} l={learning} setL={next=>{setLearning(next);if(next.mode==='reading')setMode('reading')}}/></section><section className="v-settings-section settings-block" data-setup-section="rules"><h2>Правила игры</h2><label className="v-choice check"><input type="checkbox" role="switch" checked={random} onChange={e=>setRandom(e.target.checked)}/>Перемешивать карточки</label>{roundPlan.settings(Math.max(1,count))}{limits.settings}</section></>,
 secondary:<section className="v-settings-section settings-block" data-setup-section="task"><h2>Задание</h2>{learning.mode!=='math'&&<GameSelect label="Задание" hideLabel value={mode} onChange={value=>setMode(value as TransformationMode)}><option value="small">Назови ласково</option><option value="many">Один — много</option><option value="reading">Чтение: слово — картинка</option></GameSelect>}{learning.mode!=='math'&&<TextDisplaySettings l={learning} setL={setLearning}/>}<QuantitySlider label="Количество заданий" value={count} min={1} max={Math.max(1,Math.min(20,candidates.length))} onChange={setCount}/></section>,
 appearance:<section className="v-settings-section settings-block" data-setup-section="appearance"><h2>Оформление</h2><ThemePicker theme={theme} setTheme={setTheme}/></section>,
 footer:<><SetupPreview actions={<><WordPicker words={candidates} selected={pool.map(w=>w.id)} onConfirm={ids=>{setManual({source:candidates,ids});setCount(ids.length)}}/><button type="button" className="v-control-button v-icon-button icon-button" onClick={()=>{setManual(null);setShuffleKey(k=>k+1)}} aria-label="Перемешать состав" title="Перемешать состав"><Icon name="Return1"/></button></>}
 message={error||(!words.length?'Загружаем библиотеку…':!pool.length?'Нет подходящего материала. Измените учебную задачу или условия.':undefined)}>
 <p>{pool.map(w=>w.label).join(', ')}</p>
 </SetupPreview><button className="v-control-button v-button v-button--primary primary" disabled={!pool.length||pool.length!==count} onClick={start}>Начать игру</button></>
 }}/>:<section className="v-play-area play-area" aria-label="Превращения"><GameToolbar task={(learning.mode==='math'?'Реши задание':mode==='small'?'Назови ласково':mode==='many'?'Один — много':'Прочитай')+(phase==='answer'&&word&&learning.mode!=='math'&&mode!=='reading'?' · '+transformationAnswer(word,mode):'')}
 pause={<IconButton size="toolbar" label={paused?'Продолжить':'Пауза'} icon={paused?'Play':'Pause'} className="icon-button toolbar-pause"  onClick={()=>setPaused(v=>!v)}/>}
 status={<><span>{index+1} / {activeWords.length}</span>{limits.status}</>}
 /><div className="v-live-stage stage transformation-stage"><Scenery theme={theme}/>{word&&learning.mode==='math'?<div className="v-transformation-math transformation-math-card"><h2>{word.label}</h2>{phase==='answer'&&<p>{word.answer}</p>}</div>:word&&<TransformationScene theme={theme} word={mode==='reading'?{...word,label:readingLabel(word.label,{...learning,mode:'reading'})}:word} mode={mode} phase={phase}/>}<div className="v-transformation-prompt transformation-prompt"><GameActions className="transformation-actions"><AnswerButton answer="negative" className="icon-button answer-no" label="Отметить ошибку" disabled={paused||!!limits.lost} onClick={()=>{playGameSound('wrong');limits.mistake()}}/><ActionGroup aria-label="Управление карточкой" disabled={paused||!!limits.lost}>{phase==='question'?<AnswerButton answer="positive" className="icon-button answer-yes" label={learning.mode==='math'?'Показать ответ':'Показать превращение'} onClick={reveal}/>:phase==='answer'?<><AnswerButton answer="positive" className="icon-button answer-yes" label={index+1>=activeWords.length?'Завершить':'Следующая карточка'} onClick={()=>{if(timer.current)clearTimeout(timer.current);if(index+1>=activeWords.length){setCompleted(true);setPaused(true)}else{setIndex(i=>i+1);setPhase('question')}}}/></>:<AnswerButton answer="positive" className="icon-button answer-yes" label="Пропустить анимацию" onClick={()=>{if(timer.current)clearTimeout(timer.current);setPhase('answer')}}/>}</ActionGroup></GameActions></div>{(paused&&!completed||completed&&roundPlan.isLast||limits.lost)&&<GameDialog stars={limits.lost?0:completed?roundPlan.award:undefined} onRepeat={()=>roundPlan.repeat(loadRound)} title={limits.lost||(completed?'Игра завершена':'Пауза')} onContinue={!completed&&!limits.lost?()=>setPaused(false):undefined} onSettings={reset}/>}</div></section>}
 </div>;
}




