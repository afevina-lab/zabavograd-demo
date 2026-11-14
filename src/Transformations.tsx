import {WordPicker} from './WordPicker.tsx';
import {availableMaterial,canSelectAutomatically} from './material-policy.ts';
import {MaterialSettings} from './MaterialSettings.tsx';
import {initialLearning,learningPool} from './learning.ts';
import {defaultFilters} from './model.ts';
import {useLibrary} from './useLibrary.ts';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Icon,ThemePicker,Scenery} from './GameUI.tsx';
import {useTheme} from './design-system/useTheme.ts';
import {themeAttributes,themeVars} from './design-system/themes.ts';
import {TransformationScene} from './design-system/TransformationScene.tsx';
import {MOTION} from './design-system/motion.ts';
import type {Word} from './model.ts';
import {transformationWords,type TransformationMode,type TransformationPhase} from './transformations.ts';
export function Transformations(){
 const[theme,setTheme]=useTheme(),[mode,setMode]=useState<TransformationMode>('reading'),[phase,setPhase]=useState<TransformationPhase>('question');
 const {words:library,error}=useLibrary();
 const words=useMemo(()=>availableMaterial(library,true,false),[library]);
 const[index,setIndex]=useState(0),[started,setStarted]=useState(false),[topic,setTopic]=useState('');
 const [learning,setLearning]=useState(initialLearning),[filters,setFilters]=useState(defaultFilters),[count,setCount]=useState(10);
 const [manual,setManual]=useState<{source:Word[];ids:string[]}|null>(null),[random,setRandom]=useState(true),[session,setSession]=useState<Word[]>([]);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);

 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const candidates=useMemo(()=>learningPool(words,filters,learning,false).filter(w=>(!topic||w.topic===topic)&&(mode==='reading'||(learning.mode==='any'||learning.mode==='lexical')&&Boolean(mode==='small'?w.verifiedForms?.diminutive:w.verifiedForms?.plural))),[words,topic,filters,learning,mode]);
 const pool=manual?.source===candidates?candidates.filter(w=>manual.ids.includes(w.id)):candidates.filter(canSelectAutomatically).slice(0,count);
 const activeWords=started?session:pool;
 const word=activeWords[index];
 function reset(){if(timer.current)clearTimeout(timer.current);setPhase('question');setStarted(false)}
 function reveal(){if(phase!=='question')return;setPhase('transforming');const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;timer.current=setTimeout(()=>setPhase('answer'),reduced?0:MOTION.matchMs)}
 return <div className={`app ${started?'game-active':''}`} {...themeAttributes(theme)} style={themeVars(theme,import.meta.env.BASE_URL)}>
 {!started?<main className="transformation-setup"><a href={import.meta.env.BASE_URL+'home.html'}>← Домой</a><h1>Превращения</h1><p>Назовите ответ — затем посмотрите, что изменилось.</p><section className="settings"><h2>Настроим игру</h2><label>Задание<select value={mode} onChange={e=>setMode(e.target.value as TransformationMode)}><option value="small">Назови ласково</option><option value="many">Один — много</option><option value="reading">Чтение: слово — картинка</option></select></label><label>Тема слов<select value={topic} onChange={e=>{setTopic(e.target.value);setIndex(0)}}><option value="">Все слова с картинками</option>{[...new Set(words.map(w=>w.topic).filter(Boolean))].sort().map(t=><option key={t!} value={t!}>{t}</option>)}</select></label><label>Количество заданий<select value={count} onChange={e=>setCount(+e.target.value)}>{[5,10,15,20].map(n=><option key={n}>{n}</option>)}</select></label><MaterialSettings words={library} f={filters} setF={part=>setFilters(f=>({...f,...part}))} l={learning} setL={setLearning}/><WordPicker words={candidates} selected={pool.map(w=>w.id)} onConfirm={ids=>setManual({source:candidates,ids})}/><button type="button" onClick={()=>setManual(null)}>Автоматический выбор</button><label className="check"><input type="checkbox" checked={random} onChange={e=>setRandom(e.target.checked)}/>Перемешивать карточки</label><ThemePicker theme={theme} setTheme={setTheme}/><p role="status">{error||(!words.length?'Загружаем библиотеку…':pool.length?`Доступно карточек: ${pool.length}`:'Нет подходящего материала. Для словообразования нужны проверенные формы; звуковой отбор формы пока недоступен.')}</p><button className="primary" disabled={!pool.length} onClick={()=>{const next=[...pool];if(random)for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]]}setSession(next);setIndex(0);setPhase('question');setStarted(true)}}>Начать игру</button><p className="hint">Ребёнок отвечает вслух. Взрослый запускает превращение; распознавания речи нет.</p></section></main>:<section className="play-area" aria-label="Превращения"><div className="play-toolbar"><div className="game-actions"><button className="icon-button" aria-label="Домой" onClick={()=>location.assign(import.meta.env.BASE_URL+'home.html')}><Icon name="Home1"/></button><button className="icon-button" aria-label="Настройки" onClick={reset}><Icon name="Settings"/></button></div><span>{index+1} / {activeWords.length}</span></div><div className="stage transformation-stage"><Scenery theme={theme}/>{word&&<TransformationScene theme={theme} word={word} mode={mode} phase={phase}/>}<div className="transformation-prompt"><h2>{mode==='small'?'Назови ласково':mode==='many'?'Один — а если много?':'Прочитай слово'}</h2><p>{phase==='answer'?(mode==='small'?word?.verifiedForms?.diminutive:mode==='many'?word?.verifiedForms?.plural:'Посмотрите на результат'):phase==='transforming'?'Превращение…':'Сначала ответьте вслух'}</p><div className="transformation-actions">{index>0&&<button className="secondary" onClick={()=>{if(timer.current)clearTimeout(timer.current);setIndex(i=>i-1);setPhase('question')}}>Предыдущая карточка</button>}{phase==='question'?<button className="primary" onClick={reveal}>Показать превращение</button>:phase==='answer'?<><button className="secondary" onClick={()=>setPhase('question')}>Повторить</button><button className="primary" onClick={()=>{if(timer.current)clearTimeout(timer.current);if(index+1>=activeWords.length){reset();setIndex(0)}else{setIndex(i=>i+1);setPhase('question')}}}>{index+1>=activeWords.length?'Завершить':'Следующая карточка'}</button></>:<button className="secondary" onClick={()=>{if(timer.current)clearTimeout(timer.current);setPhase('answer')}}>Пропустить анимацию</button>}</div></div></div></section>}
 </div>;
}

