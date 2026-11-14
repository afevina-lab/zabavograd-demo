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
 const[theme,setTheme]=useTheme(),[mode,setMode]=useState<TransformationMode>('small'),[phase,setPhase]=useState<TransformationPhase>('question');
 const {words:library,error}=useLibrary();
 const words=useMemo(()=>transformationWords(library),[library]);
 const[index,setIndex]=useState(0),[started,setStarted]=useState(false),[topic,setTopic]=useState('');
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);

 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const pool=useMemo(()=>words.filter(w=>!topic||w.topic===topic),[words,topic]);
 const word=pool[index%Math.max(1,pool.length)];
 function reset(){if(timer.current)clearTimeout(timer.current);setPhase('question');setStarted(false)}
 function reveal(){if(phase!=='question')return;setPhase('transforming');const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;timer.current=setTimeout(()=>setPhase('answer'),reduced?0:MOTION.matchMs)}
 return <div className={`app ${started?'game-active':''}`} {...themeAttributes(theme)} style={themeVars(theme,import.meta.env.BASE_URL)}>
 {!started?<main className="transformation-setup"><a href={import.meta.env.BASE_URL+'home.html'}>← Домой</a><h1>Превращения</h1><p>Назовите ответ — затем посмотрите, что изменилось.</p><section className="settings"><h2>Настроим игру</h2><label>Задание<select value={mode} onChange={e=>setMode(e.target.value as TransformationMode)}><option value="small">Большой — маленький</option><option value="many">Один — много</option><option value="reading">Чтение: слово — картинка</option></select></label><label>Тема слов<select value={topic} onChange={e=>{setTopic(e.target.value);setIndex(0)}}><option value="">Все слова с картинками</option>{[...new Set(words.map(w=>w.topic).filter(Boolean))].sort().map(t=><option key={t!} value={t!}>{t}</option>)}</select></label><ThemePicker theme={theme} setTheme={setTheme}/><p role="status">{error||(!words.length?'Загружаем библиотеку…':`Доступно карточек: ${pool.length}`)}</p><button className="primary" disabled={!pool.length} onClick={()=>{setPhase('question');setStarted(true)}}>Начать игру</button><p className="hint">Ребёнок отвечает вслух. Взрослый запускает превращение; распознавания речи нет.</p></section></main>:<section className="play-area" aria-label="Превращения"><div className="play-toolbar"><div className="game-actions"><button className="icon-button" aria-label="Домой" onClick={()=>location.assign(import.meta.env.BASE_URL+'home.html')}><Icon name="Home1"/></button><button className="icon-button" aria-label="Настройки" onClick={reset}><Icon name="Settings"/></button></div><span>{index+1} / {pool.length}</span></div><div className="stage transformation-stage"><Scenery theme={theme}/>{word&&<TransformationScene theme={theme} word={word} mode={mode} phase={phase}/>}<div className="transformation-prompt"><h2>{mode==='small'?'Назови ласково':mode==='many'?'Один — а если много?':'Прочитай слово'}</h2><p>{phase==='answer'?'Посмотрите на результат':phase==='transforming'?'Превращение…':'Сначала ответьте вслух'}</p><div className="transformation-actions">{phase==='question'?<button className="primary" onClick={reveal}>Показать превращение</button>:phase==='answer'?<><button className="secondary" onClick={()=>setPhase('question')}>Повторить</button><button className="primary" onClick={()=>{setIndex(i=>i+1);setPhase('question')}}>Следующая карточка</button></>:<button className="secondary" onClick={()=>{if(timer.current)clearTimeout(timer.current);setPhase('answer')}}>Пропустить анимацию</button>}</div></div></div></section>}
 </div>;
}

