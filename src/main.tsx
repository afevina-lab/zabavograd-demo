import {IconButton} from './visual/primitives/Buttons.tsx';
import {CardButton} from './visual/primitives/Card.tsx';
import {FlipFaces} from './visual/primitives/FlipFaces.tsx';
import {MemoryBoard} from './visual/games/Boards.tsx';
import {useRoundPlan} from './design-system/useRoundPlan.tsx';
import {WordSelectionBody} from './WordPicker.tsx';
import {playGameSound,useGameSoundOutcome,setGameSound,installGameAudio} from './design-system/game-audio.ts';
import {GameDialog,DialogActions} from './design-system/GameDialog.tsx';
import {SelectControl} from './design-system/SelectControl.tsx';
import {SettingsWindow,SettingsGroup} from './design-system/SettingsWindow.tsx';
import {SetupPreview} from './design-system/SetupPreview.tsx';
import {useGameViewport,enterGameViewport} from './design-system/useGameViewport.ts';
import {GameSelect} from './GameSelect.tsx';
import {TextDisplaySettings} from './TextDisplaySettings.tsx';
import {readingLabel} from './reading.ts';
import {LifeControls} from './design-system/GameLimits.tsx';
import {automaticLives,manualLives,type LifeMode} from './life-policy.ts';
import {DerivedArtwork} from './design-system/DerivedArtwork.tsx';
import {usePreparedMaterial} from './design-system/usePreparedMaterial.tsx';
import {Matching} from './Matching.tsx';
import {QuantitySlider} from './QuantitySlider.tsx';
import {GameToolbar} from './GameToolbar.tsx';
import {Conveyor} from './Conveyor.tsx';
import {memoryLayout} from './board-layout.ts';
import {useLibrary} from './useLibrary.ts';
import {hasMaterial,distinctCaptions} from './material-policy.ts';
import {Transformations} from './Transformations.tsx';
import {Sorting} from './Sorting.tsx';
import {Icon,ThemePicker,Scenery,Challenges} from './GameUI.tsx';
import {compatibleMemoryMode,includesReading,includesSyllables} from './reading.ts';
import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {CardArtwork} from './CardArtwork.tsx';
import {createRoot} from 'react-dom/client';
import {defaultFilters,newRound,flip,tick,removeLife,type Word,type Round,type Filters,type MemoryMode} from './model.ts';
import {themeAttributes,themeVars} from './design-system/themes.ts';
import {useTheme,readPreferences} from './design-system/useTheme.ts';
import {MOTION} from './design-system/motion.ts';
import {MaterialSettings} from './MaterialSettings.tsx';
import {initialLearning,learningPool,balancedPick,layoutRows} from './learning.ts';
import './style.css';
const readPrefs=readPreferences;
const prefs=readPrefs();
const formatTime=(n:number)=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
function App(){
 const [lifeCount,setLifeCount]=useState(5);

 const [lifeMode,setLifeMode]=useState<LifeMode>('manual');

 const stageRef=useRef<HTMLDivElement>(null);const cameraRef=useRef<HTMLDivElement>(null);
 const previousMatched=useRef<string[]>([]);const [board,setBoard]=useState({width:800,height:560});
 useEffect(()=>{const el=stageRef.current;if(!el)return;const observer=new ResizeObserver(([entry])=>setBoard({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(el);return()=>observer.disconnect()},[]);

 const [requestedMode,setMode]=useState<MemoryMode>('image-image'),[captions,setCaptions]=useState(false);
 const [learning,setLearning]=useState(initialLearning),[settingsOpen,setSettingsOpen]=useState(true);
 const mode=compatibleMemoryMode(requestedMode,learning);
 const derivedKind=mode==='image-outline'?'outline':mode==='image-silhouette'?'silhouette':null;
 const gameRoot=useRef<HTMLDivElement>(null);
 const [deal,setDeal]=useState(0);
 const [soundOn,setSoundOn]=useState(true);
 const roundPlan=useRoundPlan<Word>('memory');const {rounds,setRounds}=roundPlan;
 const sessionStats=useRef({matched:0,turns:0,elapsed:0});
 function playSound(name:string){playGameSound(name,theme,soundOn)}

 function nextRound(){const next=roundPlan.advance(3);if(!next)return;if(round){sessionStats.current.matched+=round.matched.length;sessionStats.current.turns+=round.turns;sessionStats.current.elapsed+=round.elapsed;}playSound('deal');setPaused(false);undo.current=null;setMessage('');setRound(newRound(next,preview,timed?seconds:null,withLives?lifeCount:null,mode));setPreviewLeft(20);setDeal(n=>n+1);}


 const {words,error:loadError}=useLibrary();
 const [filters,setFilters]=useState<Filters>(defaultFilters),[pairs,setPairs]=useState<number>(typeof prefs.pairs==='number'&&Number.isInteger(prefs.pairs)&&prefs.pairs>=3&&prefs.pairs<=10?prefs.pairs:6);
 const [theme,setTheme]=useTheme();
 const [preview,setPreview]=useState(prefs.preview===true),[timed,setTimed]=useState(false),[seconds,setSeconds]=useState(120),[withLives,setWithLives]=useState(false);
 useEffect(()=>setGameSound(soundOn),[soundOn]);
 const [selectionOverride,setSelectionOverride]=useState<{pool:Word[];pairs:number;rounds:number;words:Word[];manual:boolean}|null>(null),[round,setRound]=useState<Round|null>(null),[paused,setPaused]=useState(false),[previewLeft,setPreviewLeft]=useState(20);
 const [showPicker,setShowPicker]=useState(false),[chosen,setChosen]=useState<string[]>([]),[search,setSearch]=useState(''),[showHelp,setShowHelp]=useState(false),[message,setMessage]=useState('');
 useGameSoundOutcome(round?.phase==='lost'?'lose':round?.phase==='won'&&roundPlan.isLast?'win':null);
 useEffect(()=>{if(round?.phase!=='won'||roundPlan.isLast)return;const timer=setTimeout(nextRound,MOTION.matchMs);return()=>clearTimeout(timer)},[round?.phase,roundPlan.index]);
 const matchedKey=round?.matched.join('|')??'';
 // Zoom the entire illustrated stage toward the two newly found cards.
 // The cards themselves only glow and dissolve; their own transforms never zoom.
 useLayoutEffect(()=>{
  const camera=cameraRef.current;
  if(!camera)return;
  if(!round||round.matched.length===0){
   previousMatched.current=[];
   camera.classList.remove('zg-camera-zoom');
   return;
  }
  const newlyMatched=round.matched.filter(id=>!previousMatched.current.includes(id));
  previousMatched.current=[...round.matched];
  if(newlyMatched.length!==1||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const keys=new Set(round.deck.filter(card=>card.word.id===newlyMatched[0]).map(card=>card.key));
  const cards=[...camera.querySelectorAll<HTMLElement>('.card[data-card-key]')]
   .filter(card=>keys.has(card.dataset.cardKey||''));
  const stage=stageRef.current;
  if(cards.length!==2||!stage)return;
  const bounds=stage.getBoundingClientRect();
  const pairX=cards.reduce((sum,card)=>{const r=card.getBoundingClientRect();return sum+r.left+r.width/2},0)/2;
  const pairY=cards.reduce((sum,card)=>{const r=card.getBoundingClientRect();return sum+r.top+r.height/2},0)/2;
  // The pair's midpoint is the camera focal point. Scale around it without
  // translation: the artwork continues to cover every edge of the viewport.
  camera.style.setProperty('--zg-camera-origin-x',(pairX-bounds.left).toFixed(1)+'px');
  camera.style.setProperty('--zg-camera-origin-y',(pairY-bounds.top).toFixed(1)+'px');
  // Re-arm the same animation on every pair, not just the first.
  camera.classList.remove('zg-camera-zoom');
  void camera.offsetWidth;
  camera.classList.add('zg-camera-zoom');
 },[matchedKey,round?.deck]);

 const undo=useRef<number|null>(null);const pausedRef=useRef(paused);pausedRef.current=paused;
 const rawPool=useMemo(()=>(mode==='image-image'?learningPool(words,filters,learning):distinctCaptions(learningPool(words,filters,learning))).filter(w=>hasMaterial(w,mode!=='word-word')),[words,filters,learning,mode]);const rawManualPool=useMemo(()=>(mode==='image-image'?learningPool(words,filters,learning,false):distinctCaptions(learningPool(words,filters,learning,false))).filter(w=>hasMaterial(w,mode!=='word-word')),[words,filters,learning,mode]);
 const prepared=usePreparedMaterial(rawManualPool,derivedKind,pairs*rounds);
 const manualPool=derivedKind?rawManualPool:prepared.words;
 const pool=useMemo(()=>derivedKind?prepared.words.filter(w=>rawPool.some(x=>x.id===w.id)):rawPool,[prepared.words,rawPool,derivedKind]);
 // Derive the visible selection synchronously from the current eligible pool.
 // Overrides from a previous settings state must never appear or start a game.
 const automaticSelection=useMemo(()=>pool.length>=pairs*rounds?balancedPick(pool,pairs*rounds,learning):[],[pool,pairs,rounds,learning]);
 const overrideCurrent=selectionOverride?.pool===pool&&selectionOverride.pairs===pairs&&selectionOverride.rounds===rounds;
 const selection=overrideCurrent?selectionOverride!.words:automaticSelection;
 const manual=Boolean(overrideCurrent&&selectionOverride!.manual);
 const cardCount=round?.deck.length||pairs*2;
 const best=memoryLayout(cardCount,board.width,board.height);
 const active=round?.phase==='playing'||round?.phase==='preview';

 useEffect(()=>{try{localStorage.setItem('zabavograd.preferences',JSON.stringify({...readPrefs(),pairs,theme,preview}))}catch{}},[pairs,theme,preview]);
 useEffect(()=>{if(!round||paused)return;if(round.phase==='preview'){const timer=setInterval(()=>setPreviewLeft(n=>Math.max(0,n-1)),1000);return()=>clearInterval(timer);}if(round.phase==='playing'){const timer=setInterval(()=>setRound(s=>s?tick(s):s),1000);return()=>clearInterval(timer);}},[round?.phase,paused]);
 useEffect(()=>{if(round?.phase==='preview'&&previewLeft===0)setRound(s=>s?{...s,phase:'playing'}:s)},[previewLeft,round?.phase]);
 useEffect(()=>{if(round?.open.length!==2||paused||round.phase!=='playing')return;const timer=setTimeout(()=>setRound(s=>s?{...s,open:[]}:s),MOTION.flipBackMs);return()=>clearTimeout(timer)},[round?.open,round?.phase,paused]);
 useEffect(()=>{function key(e:KeyboardEvent){const target=e.target as HTMLElement;if(target.matches('input,textarea,select')||target.isContentEditable||showPicker||showHelp||settingsOpen||pausedRef.current||e.repeat)return;if(e.key==='F8'&&manualLives(lifeMode)){e.preventDefault();setRound(s=>{if(!s||s.phase!=='playing'||s.lives===null)return s;undo.current=s.lives;return removeLife(s)});}if(e.key==='F9'){e.preventDefault();setRound(s=>{if(!s||undo.current===null||s.lives===null||s.phase==='won'||(s.phase==='lost'&&s.remaining===0))return s;const lives=undo.current;undo.current=null;return {...s,lives,phase:'playing'}});}}window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[showPicker,showHelp,settingsOpen,lifeMode]);
 const setFilter=(part:Partial<Filters>)=>setFilters(f=>({...f,...part}));
 function launchMemory(first:Word[]){enterGameViewport();sessionStats.current={matched:0,turns:0,elapsed:0};playSound('deal');setSettingsOpen(false);setDeal(n=>n+1);setRound(newRound(first,preview,timed?seconds:null,withLives?lifeCount:null,mode));setPreviewLeft(20);setPaused(false);undo.current=null;setMessage('');}
 function start(chosenWords:Word[]=selection){const permittedIds=new Set((manual?manualPool:pool).map(w=>w.id));if(chosenWords.length!==pairs*rounds||chosenWords.some(w=>!permittedIds.has(w.id))){setMessage('Недостаточно подходящего материала.');return;}roundPlan.request(chosenWords,first=>{setSelectionOverride({pool,pairs,rounds,words:chosenWords,manual});launchMemory(first)},{text:mode==='word-word',maxRounds:Math.max(1,Math.floor(chosenWords.length/3))});}

 function shuffle(){if(derivedKind){prepared.shuffle();return;}if(pool.length<pairs*rounds)return;setSelectionOverride({pool,pairs,rounds,words:balancedPick(pool,pairs*rounds,learning),manual:false});}

 function openPicker(){setChosen(selection.map(w=>w.id));setSearch('');setShowPicker(true);}
 useGameViewport(!!round&&!settingsOpen);
 return <div ref={gameRoot} className={`app ${theme} ${round&&!settingsOpen?'game-active':''}`} style={themeVars(theme,import.meta.env.BASE_URL)} {...themeAttributes(theme)}><header className="topbar"><a className="brand" href={import.meta.env.BASE_URL+"home.html"} aria-label="Забавоград, начало"><span className="brand-mark"><Icon name="Home1"/></span>забавоград<span className="brand-note">место для открытий</span></a><div className="toplinks"><span>Первая игровая мастерская</span><button className="link" onClick={()=>{setPaused(true);setShowHelp(true)}}>Как играть <Icon name="Question"/></button></div></header>
 {roundPlan.confirmation}<main><nav className="game-switch"><strong>Мемори</strong><a href="?game=sorting">Сортировка</a></nav><div className="breadcrumb">Свободные игры <span>/</span> Память и внимание</div><div className="heading"><div><p className="eyebrow">НАХОДИМ ПАРЫ · 01</p><h1>Мемори<span className="title-dot">.</span></h1><p className="intro">Открываем, называем, запоминаем.</p></div></div>
 <div className="workspace">{settingsOpen&&<SettingsWindow game="Мемори" layout={{
 contentAs:"aside",contentClassName:"settings",
 primary:<><SettingsGroup disabled={!!active}><section className="settings-block" data-setup-section="material"><h2>Учебный материал</h2><MaterialSettings textDisplayProvided={mode==='word-word'||mode==='word-image'||captions} words={words} f={filters} setF={setFilter} l={learning} setL={setLearning}/>

 </section></SettingsGroup><SettingsGroup disabled={!!active}><section className="settings-block" data-setup-section="rules"><h2>Правила игры</h2><label className="check preview-check"><input type="checkbox" role="switch" checked={preview} onChange={e=>setPreview(e.target.checked)}/><span>Предпоказ на 20 секунд</span></label>
 <Challenges lifeCount={lifeCount} setLifeCount={setLifeCount} timed={timed} setTimed={setTimed} seconds={seconds} setSeconds={setSeconds} lives={withLives} setLives={setWithLives} lifeMode={lifeMode} setLifeMode={setLifeMode}/></section></SettingsGroup></>,
 secondary:<><SettingsGroup disabled={!!active}><section className="settings-block" data-setup-section="task"><h2>Задание</h2><QuantitySlider label="Количество пар" value={pairs} min={3} max={Math.max(3,Math.min(10,Math.floor(rawPool.length/rounds)))} onChange={setPairs}/>
 <GameSelect label="Отображение" ariaLabel="Режим карточек" value={mode} onChange={value=>setMode(value as MemoryMode)}><option value="word-word">{learning.mode==='math'?'Задание — ответ':'Слово — слово'}</option><option value="word-image" disabled={learning.mode==='math'||includesSyllables(learning)}>Слово — картинка</option><option value="image-image" disabled={learning.mode==='math'||includesReading(learning)||includesSyllables(learning)}>Картинка — картинка</option><option value="image-outline" disabled={learning.mode==='math'||includesReading(learning)||includesSyllables(learning)}>Картинка — контур</option><option value="image-silhouette" disabled={learning.mode==='math'||includesReading(learning)||includesSyllables(learning)}>Картинка — силуэт</option></GameSelect>{mode.startsWith('image-')&&<label className="check"><input type="checkbox" role="switch" checked={captions} onChange={e=>setCaptions(e.target.checked)}/>С подписями</label>} {learning.mode!=='math'&&(mode==='word-word'||mode==='word-image'||captions)&&<TextDisplaySettings l={learning} setL={setLearning}/>} <QuantitySlider label="Количество раундов" value={rounds} min={1} max={Math.max(1,Math.min(10,Math.floor(rawPool.length/Math.max(3,pairs))))} onChange={setRounds}/></section></SettingsGroup></>,
 appearance:<section className="settings-block" data-setup-section="appearance"><h2>Оформление</h2><ThemePicker theme={theme} setTheme={v=>{setTheme(v);setDeal(n=>n+1)}}/></section>,
 footer:<><SetupPreview actions={<><button type="button" className="icon-button" title="Перемешать состав" aria-label="Перемешать состав" onClick={shuffle} disabled={rawPool.length<pairs}><Icon name="Return1"/></button><button type="button" className="icon-button" title="Выбрать слова вручную" aria-label="Выбрать слова вручную" onClick={openPicker}><Icon name="Settings"/></button></>}
 message={loadError||(derivedKind&&prepared.busy?`Готовим изображения: проверено ${prepared.done}, нужно ${pairs*rounds}`:derivedKind&&prepared.cancelled?'Подготовка отменена.':!selection.length?'Недостаточно слов. Измените фильтры или количество пар.':undefined)}>
 <p className="setup-material-summary">{selection.map(w=>w.label).join(', ')}</p>
 </SetupPreview>{!active?<button className="primary start" onClick={()=>start()} disabled={selection.length!==pairs*rounds||!!loadError}>{round?'Начать заново':'Начать игру'}</button>:<button className="secondary start" onClick={()=>{setPaused(true);setMessage('Чтобы изменить учебные параметры, завершите текущий раунд.');}}>Настройки текущего раунда</button>}</>,
 supplementary:derivedKind&&<div className="material-preparation">{prepared.busy&&<button className="secondary" onClick={prepared.cancel}>Отменить подготовку</button>}{prepared.cancelled&&<button className="secondary" onClick={prepared.retry}>Подготовить снова</button>}{!prepared.busy&&selection.length>0&&<details className="filter-details"><summary>Посмотреть пары перед игрой</summary><div className="derived-preview">{selection.slice(0,pairs).map(w=><div key={w.id}><CardArtwork image={w.variants![0]} label={w.label}/><DerivedArtwork image={w.variants![0]} outline={derivedKind==='outline'}/><small>{w.label}</small></div>)}</div></details>}</div>
 }}/>}
 <section className={`play-area ${round?.phase==='preview'?'previewing':''}`} aria-label="Игровое поле"><GameToolbar task={learning.mode==='reading'?'Прочитай и найди пару':learning.mode==='math'?'Реши и найди пару':'Назови и найди пару'}
 pause={active?<button aria-label={paused?'Продолжить':'Пауза'} className="icon-button toolbar-pause" onClick={()=>setPaused(!paused)}><Icon name={paused?'Play':'Pause'}/></button>:undefined}
 sound={<IconButton size="toolbar" label={soundOn?'Выключить звуковые эффекты':'Включить звуковые эффекты'} icon={soundOn?'Sound':'SoundOff'} className="icon-button"  aria-pressed={soundOn} onClick={()=>setSoundOn(!soundOn)}/>}
 hint={<IconButton size="toolbar" label={captions?"Скрыть подписи к картинкам":"Показать подписи к картинкам"} icon="Question" className="icon-button zg-caption-toggle"  title="Подписи к картинкам" aria-pressed={captions} disabled={mode==="word-word"} onClick={()=>setCaptions(value=>!value)}/>}
 fullscreen={<IconButton size="toolbar" label="Полный экран" icon="Sight" className="icon-button"  onClick={async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await gameRoot.current?.requestFullscreen()}catch{setMessage('Полный экран недоступен в этом окне браузера.')}}}/>}
 status={<><span>Пары <b>{round?.matched.length||0}/{round?round.deck.length/2:pairs}</b></span>{round&&<span className={round.remaining===null?'toolbar-session-progress':'toolbar-timer'}>{round.remaining===null?'Время':'Осталось'} <b>{formatTime(round.remaining??round.elapsed)}</b></span>}{round?.lives!==null&&round?.lives!==undefined&&<LifeControls maximum={lifeCount} lives={round.lives} mode={lifeMode} disabled={paused||round.phase!=='playing'} onSpend={()=>{undo.current=round.lives;setRound(removeLife(round))}} onUndo={()=>{if(undo.current!==null&&round.phase!=='won'&&round.remaining!==0){setRound({...round,lives:undo.current,phase:'playing'});undo.current=null}}}/>} </>}
 />
 {round?.phase==='preview'&&<div className="preview-banner">Запоминаем · {previewLeft} сек. <button onClick={()=>{setPreviewLeft(0);setRound(s=>s?{...s,phase:'playing'}:s)}}>Начать раньше →</button></div>}{round?.remaining!==null&&round?.remaining!==undefined&&<div className="time-track" role="progressbar" aria-label="Оставшееся время" aria-valuemin={0} aria-valuemax={seconds} aria-valuenow={round.remaining}><div style={{width:`${round.remaining/seconds*100}%`,background:`hsl(${round.remaining/seconds*110},48%,48%)`}}/></div>}<div className="stage zg-memory-stage" ref={stageRef}><div className="zg-scene-camera" ref={cameraRef}><Scenery theme={theme} celebrate={round?.phase==='won'&&roundPlan.isLast}/>{!round?<div className="welcome"><div className="sample-cards" aria-hidden="true"><div>роза</div><div className="back"><Icon name="Star"/></div><div>роза</div></div><p className="eyebrow">МАЛЕНЬКИЕ ОТКРЫТИЯ, ПАРА ЗА ПАРОЙ</p><h2>Что прячется<br/>на обороте?</h2><p>Найдите две одинаковые карточки.<br/>Каждое открытое слово произнесите вслух.</p><button className="primary" onClick={()=>start()} disabled={selection.length!==pairs*rounds||!!loadError}>Давайте играть <Icon name="RightArrow1"/></button></div>:<><MemoryBoard key={deal} className={`cards dealt count-${round.deck.length}`} style={{'--columns':best.cols,'--card-width':best.width+'px'} as React.CSSProperties}>{round.deck.map((c,i)=>{const found=round.matched.includes(c.word.id),visible=round.phase==='preview'||found||round.open.includes(c.key);const cols=best.cols,rows=layoutRows(round.deck.length,cols);let offset=0,rowIndex=0;while(i>=offset+rows[rowIndex])offset+=rows[rowIndex++];const col=i-offset;return <CardButton entering={!found} feedback={found?"matched":round.open.length===2&&round.open.includes(c.key)?"wrong":"idle"} style={{gridColumn:(cols-rows[rowIndex])+col*2+1+' / span 2',gridRow:rowIndex+1,'--zg-deal-delay':found?'0ms':i*MOTION.dealStaggerMs/Math.max(1,round.deck.length-1)+'ms'} as React.CSSProperties} key={c.key} data-card-key={c.key} data-face={c.face} className={`card ${round.open.length===2&&round.open.includes(c.key)?'mismatch':''} ${visible?'flipped':''} ${found?'found':''}`} disabled={paused||showHelp||round.phase!=='playing'||found||round.open.includes(c.key)||round.open.length===2} aria-label={visible?`${c.face==='outline'?'Контур':c.face==='silhouette'?'Силуэт':c.word.label}${found?', пара найдена':''}`:`Открыть карточку ${i+1}`} onClick={()=>{let next=flip(round,c.key);if(next.open.length===2&&next.turns>round.turns&&automaticLives(lifeMode)){undo.current=next.lives;next=removeLife(next);}playSound(next.matched.length>round.matched.length?'match':next.open.length===2?'wrong':'flip');setRound(next)}}><FlipFaces revealed={visible} classNames={{inner:"card-inner",back:"card-back",front:"card-front"}} back={<span>{i+1}</span>} frontStyle={{fontSize:c.face==='word'?Math.min(44,best.width/(Math.max(5,...round.deck.map(card=>card.word.label.length))*.95))+'px':undefined}} front={<>{c.face!=='word'?<span className={`picture-face ${c.face==='image'&&captions?'with-caption':''}`}>{c.face==='outline'||c.face==='silhouette'?<DerivedArtwork image={c.image!} outline={c.face==='outline'}/>:<CardArtwork image={c.image!} label={c.word.label}/>}{c.face==='image'&&captions&&<small>{readingLabel(c.word.label,learning)}</small>}</span>:readingLabel(c.word.answer&&c.key.endsWith(':1')?c.word.answer:c.word.label,learning)}</>}/></CardButton>})}</MemoryBoard></>}</div>{round&&<>{paused&&active&&!showHelp&&<GameDialog title="Небольшая пауза" description={message||'Карточки и время подождут.'} onContinue={()=>{setPaused(false);setMessage('')}} onSettings={()=>{setRound(null);setSettingsOpen(true);setPaused(false);setMessage('')}}/>}{((round.phase==='won'&&roundPlan.isLast)||round.phase==='lost')&&<GameDialog stars={round.phase==='won'?3:0} title={round.phase==='won'?'Все пары нашлись!':round.remaining===0?'Время закончилось':'Жизни закончились'} description={`${sessionStats.current.matched+round.matched.length} из ${selection.length} пар · ${sessionStats.current.turns+round.turns} ходов · ${formatTime(sessionStats.current.elapsed+round.elapsed)}`} onRepeat={()=>roundPlan.repeat(launchMemory)} onSettings={()=>{setRound(null);setSettingsOpen(true)}}/>}</>}
 </div><div className="stage-footer"><span><Icon name="Star"/> <span>{round?.phase==='preview'?'Посмотрите, где спряталась каждая пара.':'Назовите слово — и откройте следующую карточку.'}</span></span><span>{round?`${round.turns} ходов`:`${pairs*2} карточек`}</span></div></section></div>
 {loadError&&<p role="alert">{loadError}</p>}<footer>Сделано для живого занятия <span>Без оценок. В вашем темпе.</span></footer></main>
 {showPicker&&<div className="modal-backdrop"><section className="modal word-selection-dialog" role="dialog" aria-modal="true" aria-label="Карточки"><WordSelectionBody words={manualPool} selected={chosen} onChange={setChosen} search={search} setSearch={setSearch} max={pairs*rounds} eligibleIds={pool.map(w=>w.id)} disabled={chosen.length!==pairs*rounds} onCancel={()=>setShowPicker(false)} onConfirm={()=>{if(derivedKind){prepared.select(chosen);setShowPicker(false);return;}setSelectionOverride({pool,pairs,rounds,words:chosen.map(id=>manualPool.find(w=>w.id===id)!),manual:true});window.dispatchEvent(new CustomEvent('zg:manual-word-selection',{detail:{ids:chosen}}));setShowPicker(false)}}/></section></div>}
{showHelp&&<div className="modal-backdrop"><section className="modal help" role="dialog" aria-modal="true" aria-label="Как играть"><div className="panel-scroll"><div className="modal-title"><h2>Как играть в мемори</h2><button type="button" className="icon-button" aria-label="Закрыть инструкцию" onClick={()=>setShowHelp(false)}><Icon name="X"/></button></div><ol><li>Откройте карточку и назовите слово.</li><li>Откройте вторую. Если слова совпали, пара остаётся открытой.</li><li>Если нет — запомните расположение и попробуйте ещё.</li></ol><p>Соберите все пары. Произношение оценивает педагог; игра не распознаёт речь.</p><button className="primary" onClick={()=>{setShowHelp(false);setPaused(false)}}>Понятно, играем</button></div></section></div>}</div>;
}
(installGameAudio(),createRoot(document.getElementById('root')!)).render(new URLSearchParams(location.search).get('game')==='matching'?<Matching/>:new URLSearchParams(location.search).get('game')==='conveyor'?<Conveyor/>:new URLSearchParams(location.search).get('game')==='transformations'?<Transformations/>:new URLSearchParams(location.search).get('game')==='sorting'?<Sorting/>:<App/>);






