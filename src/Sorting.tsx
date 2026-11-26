import {ToggleGroup} from './visual/primitives/ToggleGroup.tsx';
import {ModalWindow} from './visual/compositions/ModalWindow.tsx';
import {visualThemeVars} from './visual/foundation/visualThemeVars.ts';
import {TimeBar} from './visual/primitives/TimeBar.tsx';
import {SortingGroup} from './visual/games/SortingGroup.tsx';
import {balancedGridStyle,balancedCardStyle} from './visual/games/geometry.ts';
import {IconButton} from './visual/primitives/Buttons.tsx';
import {SortingLayout} from './visual/games/SortingLayout.tsx';
import {CardButton} from './visual/primitives/Card.tsx';
import {useRoundPlan} from './design-system/useRoundPlan.tsx';
import {WordSelectionBody} from './WordPicker.tsx';
import {playGameSound,useGameSoundOutcome,setGameSound} from './design-system/game-audio.ts';
import {GameDialog} from './design-system/GameDialog.tsx';
import {SelectControl} from './design-system/SelectControl.tsx';
import {SettingsWindow} from './design-system/SettingsWindow.tsx';
import {SetupPreview} from './design-system/SetupPreview.tsx';
import {SetupAddButton} from './design-system/SetupAddButton.tsx';
import {useGameViewport,enterGameViewport} from './design-system/useGameViewport.ts';
import {GameSelect} from './GameSelect.tsx';
import {TextDisplaySettings} from './TextDisplaySettings.tsx';
import {readingLabel} from './reading.ts';
import {LifeControls,useElapsedTime} from './design-system/GameLimits.tsx';
import {automaticLives,manualLives,spendLives,type LifeMode} from './life-policy.ts';
import {useCardDrag} from './design-system/useCardDrag.tsx';
import {QuantitySlider} from './QuantitySlider.tsx';
import {GameToolbar} from './GameToolbar.tsx';
import {sortingLayout} from './board-layout.ts';
import {useLibrary} from './useLibrary.ts';
import {useCardMotion} from './useCardMotion.ts';
import {themeAttributes,themeVars} from './design-system/themes.ts';
import {useTheme} from './design-system/useTheme.ts';
import {CardArtwork} from './CardArtwork.tsx';
import {MOTION} from './design-system/motion.ts';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {MaterialSettings} from './MaterialSettings.tsx';
import {defaultFilters} from './model.ts';
import {initialLearning,type Learning} from './learning.ts';
import {starsForScore,changeCount,groupTitle,newGroup,updateGroup,sortingPools,makeSorting,type SortItem} from './sorting.ts';
import {Icon} from './visual/primitives/Icon.tsx';
import {ThemePicker} from './design-system/ThemePicker.tsx';
import {Scenery} from './design-system/Scenery.tsx';
import {ChallengeSettings as Challenges} from './design-system/ChallengeSettings.tsx';
type Exclusion={learning:Learning;filters:typeof defaultFilters};
export function Sorting(){
 const roundPlan=useRoundPlan<SortItem>('sorting');
 const {words,error:loadError}=useLibrary();
 const [actionError,setError]=useState('');
 const error=loadError||actionError;
 const [groups,setGroups]=useState([newGroup(0),newGroup(1)]),[exclusions,setExclusions]=useState<Exclusion[]>([]);
 const [theme,setTheme]=useTheme();
 const [pictures,setPictures]=useState(true),[checkingMode,setCheckingMode]=useState('instant'),[display,setDisplay]=useState('row');
 const [lifeCount,setLifeCount]=useState(5);
 const [timed,setTimed]=useState(false),[seconds,setSeconds]=useState(120),[withLives,setWithLives]=useState(false),[remaining,setRemaining]=useState(120),[lives,setLives]=useState(5);
 const [items,setItems]=useState<SortItem[]>([]),[placements,setPlacements]=useState<Record<string,number>>({}),[selected,setSelected]=useState<string|null>(null),[wrong,setWrong]=useState<string[]>([]);
 const [running,setRunning]=useState(false),[paused,setPaused]=useState(false),[result,setResult]=useState(''),[sound,setSound]=useState(true);
 const [lifeMode,setLifeMode]=useState<LifeMode>('manual');
 const instant=checkingMode==='instant';
 const field=useRef<HTMLDivElement>(null);
 const [fieldSize,setFieldSize]=useState({width:1200,height:650});
 useEffect(()=>{const el=field.current;if(!el)return;const observer=new ResizeObserver(([e])=>setFieldSize({width:e.contentRect.width,height:e.contentRect.height}));observer.observe(el);return()=>observer.disconnect()},[running]);
 const [captions,setCaptions]=useState(false),[hoverGroup,setHoverGroup]=useState<number|null>(null);
 const [previewOverride,setPreviewOverride]=useState<{source:{items:SortItem[];error:string};items:SortItem[]}|null>(null),[picker,setPicker]=useState(false),[chosen,setChosen]=useState<string[]>([]),[search,setSearch]=useState(''),[editName,setEditName]=useState<number|null>(null);
 const [checking,setChecking]=useState(false),[verdict,setVerdict]=useState<Record<string,boolean>>({}),[stars,setStars]=useState(0),[score,setScore]=useState('');
 const drag=useCardDrag(paused||!!result||checking);
 const checkTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(checkTimer.current)clearTimeout(checkTimer.current)},[]);
 const root=useRef<HTMLDivElement>(null),tray=useRef<HTMLDivElement>(null),undo=useRef<number|null>(null);
 useCardMotion(root,'[data-motion-id]',drag.suppressClick);

 useEffect(()=>setGameSound(sound),[sound]);
 useGameSoundOutcome(result&&(roundPlan.isLast||withLives&&lives===0||timed&&remaining===0)?(stars>0?'win':'lose'):null);
 const clock=useElapsedTime(running&&!result,paused||checking);
 useEffect(()=>{if(!running||paused||result||checking||!timed)return;const t=setInterval(()=>setRemaining(v=>Math.max(0,v-1)),1000);return()=>clearInterval(t)},[running,paused,result,timed,checking]);
 useEffect(()=>{if(running&&!result&&((timed&&remaining===0)||(withLives&&lives===0)))setResult(timed&&remaining===0?'Время закончилось':'Жизни закончились')},[remaining,lives,running,result,timed,withLives]);

 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(!running||checking||paused||!withLives||e.repeat||(e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]'))return;if(e.key==='F8'&&manualLives(lifeMode)&&!result){e.preventDefault();undo.current=lives;setLives(Math.max(0,lives-.5));}if(e.key==='F9'&&undo.current!==null&&result!=='Все карточки на своих местах!'&&!(timed&&remaining===0)){e.preventDefault();setLives(undo.current);undo.current=null;setResult('');}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[running,checking,paused,withLives,lives,result,timed,remaining,lifeMode]);
 const pools=useMemo(()=>sortingPools(words,groups,exclusions,pictures),[words,groups,exclusions,pictures]);
 const preparation=useMemo(()=>{try{return {items:makeSorting(pools,groups.map(g=>g.count)),error:''}}catch(e){return {items:[],error:(e as Error).message}}},[pools,groups]);
 // A settings change invalidates the old hand-picked/shuffled preview immediately.
 const previewItems=previewOverride?.source===preparation?previewOverride.items:preparation.items;
 const candidates=useMemo(()=>[...new Map(pools.flat().map(w=>[w.id,w])).values()],[pools]);
 function applyManual(){
  try{const picked=makeSorting(pools.map(p=>p.filter(w=>chosen.includes(w.id))),groups.map(g=>g.count));setPreviewOverride({source:preparation,items:picked});window.dispatchEvent(new CustomEvent('zg:manual-word-selection',{detail:{ids:chosen}}));setPicker(false);setError('');}catch(e){setError((e as Error).message)}
 }
 function audio(name:string){playGameSound(name,theme,sound)}
 function loadRound(next:SortItem[]){clock.reset();enterGameViewport();setItems(next);setStars(0);setScore('');setVerdict({});setChecking(false);setPlacements({});setSelected(null);setWrong([]);setResult('');setPaused(false);setRemaining(seconds);setLives(lifeCount);undo.current=null;setRunning(true);audio('deal')}
 function start(){if(preparation.error)return;roundPlan.request(previewItems,loadRound,{text:!pictures,maxRounds:Math.max(1,Math.min(...groups.map(g=>g.count))),key:item=>String(item.accepted[0])});}
 useEffect(()=>{if(!result||timed&&remaining===0||withLives&&lives===0)return;const next=roundPlan.advance(stars);if(next)loadRound(next);},[result]);

 function place(id:string,g:number){if(paused||result||checking)return;const item=items.find(i=>i.word.id===id);if(!item)return;if(instant&&!item.accepted.includes(g)){if(withLives&&automaticLives(lifeMode)){undo.current=lives;setLives(spendLives(lives));}setWrong([id]);setSelected(null);audio('wrong');setTimeout(()=>setWrong([]),MOTION.sortRetryMs);return;}const next={...placements,[id]:g};setPlacements(next);setSelected(null);audio(instant?'match':'click');if(instant&&items.every(i=>next[i.word.id]!==undefined)){setStars(3);setResult('Все карточки на своих местах!');}}
 function check(){
 if(checking||paused||result||items.some(i=>placements[i.word.id]===undefined))return;
  setChecking(true);setVerdict({});setSelected(null);
  const bad=items.filter(i=>!i.accepted.includes(placements[i.word.id]));if(withLives&&automaticLives(lifeMode)&&bad.length){undo.current=lives;setLives(spendLives(lives,bad.length));}
  const ordered=groups.flatMap((_,g)=>items.filter(item=>placements[item.word.id]===g));
  let index=0;
  const reveal=()=>{
   if(index<ordered.length){const item=ordered[index++],ok=!bad.includes(item);setVerdict(v=>({...v,[item.word.id]:ok}));root.current?.querySelector(`[data-motion-id="${CSS.escape(item.word.id)}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'});audio(ok?'match':'wrong');checkTimer.current=setTimeout(reveal,MOTION.sortVerdictMs);return;}

   if(checkingMode==='finish'||!bad.length){setChecking(false);setStars(starsForScore(items.length-bad.length,items.length));setScore('Верно: '+(items.length-bad.length)+' из '+items.length);setResult(bad.length?'Игра завершена':'Все карточки на своих местах!');}
   else{setWrong(bad.map(i=>i.word.id));checkTimer.current=setTimeout(()=>{setPlacements(p=>Object.fromEntries(Object.entries(p).filter(([id])=>!bad.some(i=>i.word.id===id))));setWrong([]);setVerdict({});setChecking(false);},MOTION.sortRetryMs);}
  };reveal();
 }
 const remainingItems=items.filter(i=>placements[i.word.id]===undefined);
 const geometry=sortingLayout(fieldSize.width,fieldSize.height,display==='all'?items.length:1,groups.map(g=>g.count));
 const rowCapacity=Math.max(1,Math.floor((fieldSize.width-24+8)/(geometry.card+8)));
 const visible=display==='all'?remainingItems:remainingItems.slice(0,display==='row'?rowCapacity:+display);
 function card(item:SortItem,index:number,total:number,width:number){const w=item.word,v=w.variants?.[0];return <CardButton feedback={wrong.includes(w.id)||verdict[w.id]===false?"wrong":verdict[w.id]===true?"correct":"idle"} style={balancedCardStyle(index,total,width,geometry.card)} data-motion-id={w.id} key={w.id} draggable={false} onPointerDown={e=>drag.begin(e,'[data-sort-group]',target=>place(w.id,Number(target.dataset.sortGroup)))} onClick={e=>{e.stopPropagation();if(drag.suppressClick())return;if(placements[w.id]!==undefined){setPlacements(p=>{const n={...p};delete n[w.id];return n})}else setSelected(w.id)}} disabled={paused||!!result||checking} aria-label={w.label} className={'sort-card '+(pictures&&captions?'has-caption ':'')+(selected===w.id?'chosen ':'')+(wrong.includes(w.id)?'sort-wrong':'')+(verdict[w.id]===true?' verdict-good':verdict[w.id]===false?' verdict-bad':'')}>{pictures&&v?<CardArtwork image={v} label={w.label}/>:<span className="unbroken-card-text" style={{fontSize:`min(24px, ${140/Math.max(5,w.label.length*.65)}px)`}}>{readingLabel(w.label,groups[item.accepted[0]]?.learning||initialLearning)}</span>}{pictures&&captions&&<small>{readingLabel(w.label,groups[item.accepted[0]]?.learning||initialLearning)}</small>}</CardButton>}
 useGameViewport(running);
 return <div className={'app v-root v-game-screen '+theme+(running?' game-active':'')} style={visualThemeVars(theme,import.meta.env.BASE_URL)} {...themeAttributes(theme)} ref={root}>{roundPlan.confirmation}<main>{!running?<SettingsWindow game="Сортировка" layout={{
 contentAs:"div",contentClassName:"settings sort-settings",
 primary:<><section className="v-settings-section settings-block" data-setup-section="material"><h2>Учебный материал</h2><div className="v-sort-group-settings sort-group-settings">{groups.map((g,i)=><section className="v-settings-section settings-block" key={i}><div className="v-group-title-edit group-title-edit"><strong>{groupTitle(g)}</strong><button className="v-control-button v-icon-button icon-button" aria-label={'Изменить заголовок группы '+(i+1)} onClick={()=>setEditName(editName===i?null:i)}>✎</button></div>{editName===i&&<input aria-label="Подзаголовок" value={g.edited.includes('name')?g.name:groupTitle(g)} onChange={e=>setGroups(gs=>gs.map((v,j)=>j===i?{...v,name:e.target.value,edited:[...new Set([...v.edited,'name'])]}:v))}/>}<QuantitySlider label="Элементов" value={g.count} min={2} max={20} onChange={value=>setGroups(gs=>changeCount(gs,i,value))}/><MaterialSettings textDisplayProvided={!pictures||captions} words={words} l={g.learning} f={g.filters} setF={part=>setGroups(gs=>updateGroup(gs,i,'filters',part))} setL={l=>{if(l.mode==='reading'&&l.contentKinds?.some(k=>k!=='words'))setPictures(false);if(l.mode==='math'){setPictures(false);l={...l,math:{...l.math,answerOnly:true}};}const changed=Object.fromEntries(Object.entries(l).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify((g.learning as any)[key])));setGroups(gs=>updateGroup(gs,i,'learning',changed))}}/>{g.learning.mode!=='math'&&(!pictures||captions)&&<TextDisplaySettings l={g.learning} setL={learning=>setGroups(gs=>gs.map((v,j)=>j===i?{...v,learning}:v))}/>}</section>)}</div></section><section className="v-settings-section settings-block" data-setup-section="rules"><h2>Правила игры</h2><h3>Общие исключения</h3>{exclusions.map((x,i)=><section className="v-settings-section settings-block" key={i}><MaterialSettings nested words={words} l={x.learning} f={x.filters} setL={l=>setExclusions(es=>es.map((v,j)=>j===i?{...v,learning:l}:v))} setF={f=>setExclusions(es=>es.map((v,j)=>j===i?{...v,filters:{...v.filters,...f}}:v))}/><button className="v-control-button v-button v-button--secondary secondary" type="button" onClick={()=>setExclusions(es=>es.filter((_,j)=>j!==i))}>Удалить</button></section>)}<SetupAddButton onClick={()=>setExclusions(es=>[...es,{learning:{...initialLearning,mode:'lexical'},filters:{...defaultFilters}}])}>Добавить исключение</SetupAddButton><label>Проверка<SelectControl value={checkingMode} onChange={e=>setCheckingMode(e.target.value)}><option value="instant">Сразу после перемещения</option><option value="correct">Проверить и исправить</option><option value="finish">Проверить и окончить</option></SelectControl></label>{roundPlan.settings(Math.max(1,Math.min(...groups.map(g=>g.count))))}<Challenges lifeCount={lifeCount} setLifeCount={setLifeCount} timed={timed} setTimed={setTimed} seconds={seconds} setSeconds={setSeconds} lives={withLives} setLives={setWithLives} lifeMode={lifeMode} setLifeMode={setLifeMode}/></section></>,
 secondary:<><section className="v-settings-section settings-block" data-setup-section="task"><h2>Задание</h2><fieldset className="v-settings-fieldset group-count-choice"><legend>Количество групп</legend><ToggleGroup label="Количество групп" value={groups.length} options={[2,3,4,5,6].map(n=>({value:n,label:n}))} onChange={n=>setGroups(gs=>Array.from({length:n},(_,i)=>gs[i]||{...newGroup(i),count:gs[0].count,learning:structuredClone(gs[0].learning),filters:structuredClone(gs[0].filters)}))}/></fieldset></section><section className="v-settings-section settings-block setup-presentation-options"><section className="v-card-presentation v-settings-section card-presentation settings-block"><h3>Показ карточек</h3><GameSelect hideLabel label="Карточки" value={pictures?'images':'words'} onChange={value=>setPictures(value==='images')}><option value="images">Картинки</option><option value="words">Слова и сочетания</option></GameSelect>{pictures&&<label className="v-choice check"><input type="checkbox" role="switch" checked={captions} onChange={e=>setCaptions(e.target.checked)}/>С подписями</label>}<label>На поле<SelectControl value={display} onChange={e=>setDisplay(e.target.value)}>{[['all','Все сразу'],['row','Одна строка'],['1','Одна карточка'],['3','Три карточки'],['5','Пять карточек']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</SelectControl></label></section></section></>,
 appearance:<section className="v-settings-section settings-block" data-setup-section="appearance"><h2>Оформление</h2><ThemePicker theme={theme} setTheme={setTheme}/></section>,
 footer:<><SetupPreview actions={<><button type="button" className="v-control-button v-icon-button icon-button" aria-label="Перемешать состав" onClick={()=>setPreviewOverride({source:preparation,items:makeSorting(pools,groups.map(g=>g.count))})} disabled={!!preparation.error}><Icon name="Return1"/></button><button type="button" className="v-control-button v-icon-button icon-button" aria-label="Выбрать слова вручную" onClick={()=>{setChosen(previewItems.map(i=>i.word.id));setSearch('');setPicker(true)}} disabled={!!preparation.error}><Icon name="Settings"/></button></>}
 message={error||preparation.error||(!previewItems.length?'Нет подходящих карточек. Измените темы или условия групп.':undefined)}>
 <p>{previewItems.map(i=>i.word.label).join(', ')}</p>
 </SetupPreview><button className="v-control-button v-button v-button--primary primary" disabled={!!error||!!preparation.error} data-size="launch" onClick={start}>Начать игру</button></>
 }}/>:<section className="v-play-area play-area"><GameToolbar task={pictures?'Назови и разложи по группам':'Прочитай и разложи по группам'}
 pause={<IconButton size="toolbar" label="Пауза" icon="Pause" className="icon-button toolbar-pause"  disabled={checking} onClick={()=>setPaused(!paused)}/>}
 sound={<IconButton size="toolbar" label="Звуки" icon={sound?'Sound':'SoundOff'} className="icon-button"  onClick={()=>setSound(!sound)}/>}
 hint={<IconButton size="toolbar" label={captions?'Скрыть подписи к картинкам':'Показать подписи к картинкам'} icon="Question" className="icon-button zg-caption-toggle"  title="Подписи к картинкам" aria-pressed={captions} disabled={!pictures} onClick={()=>setCaptions(value=>!value)}/>}
 fullscreen={<IconButton size="toolbar" label="Полный экран" icon="Sight" className="icon-button"  onClick={()=>document.fullscreenElement?document.exitFullscreen():root.current?.requestFullscreen()}/>}
 status={<>{clock.status}<span>{items.length-remainingItems.length} / {items.length}</span>{timed&&<span className="toolbar-timer">{remaining} сек.</span>}{withLives&&<LifeControls maximum={lifeCount} lives={lives} mode={lifeMode} disabled={paused||!!result||checking} onSpend={()=>{undo.current=lives;setLives(spendLives(lives))}} onUndo={()=>{if(undo.current!==null&&result!=='Все карточки на своих местах!'&&remaining>0){setLives(undo.current);undo.current=null;setResult('')}}}/>} </>}
 />{timed&&<TimeBar value={remaining} maximum={seconds}/>}<div className="v-live-stage stage sorting-stage" ref={field}><Scenery theme={theme} celebrate={result==='Все карточки на своих местах!'}/><SortingLayout style={{'--sort-card-size':geometry.card+'px','--sort-placed-card-size':geometry.placedCard+'px','--sort-bin-columns':geometry.columns} as React.CSSProperties} bankStyle={balancedGridStyle(visible.length,fieldSize.width-24,geometry.card)} bankRef={tray} bankLabel="Выберите карточку, затем группу. Можно перетаскивать." bank={<>{visible.map((item,i)=>card(item,i,visible.length,fieldSize.width-24))}</>} groups={<> {groups.map((g,i)=><SortingGroup title={groupTitle(g)} targetDisabled={!selected||paused||!!result||checking} onPlace={()=>{if(selected)place(selected,i)}} className={'sort-bin '+(selected&&!paused&&!checking&&!result?'drop-ready ':'')+(hoverGroup===i?'drop-hover':'')} key={i} data-sort-group={i} onClick={()=>selected&&place(selected,i)} onDragOver={e=>{e.preventDefault();setHoverGroup(i)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setHoverGroup(null)}} onDrop={e=>{e.preventDefault();setHoverGroup(null);place(e.dataTransfer.getData('text/plain'),i)}}>{items.filter(x=>placements[x.word.id]===i).map((item,j)=>card(item,j,items.filter(x=>placements[x.word.id]===i).length,(fieldSize.width-24-(geometry.columns-1)*8)/geometry.columns-16))}</SortingGroup>)}</>} actions={<> {!instant&&<button className="v-control-button v-button v-button--primary primary" disabled={!!remainingItems.length||paused||!!result||checking} onClick={check}>Проверить</button>}</>}/>{paused&&!result&&<GameDialog title="Небольшая пауза" description="Карточки и время подождут." onContinue={()=>setPaused(false)} onSettings={()=>setRunning(false)}/>}{result&&(roundPlan.isLast||withLives&&lives===0||timed&&remaining===0)&&<GameDialog stars={timed&&remaining===0||withLives&&lives===0?0:roundPlan.award} title={result} description={roundPlan.count===1&&score?score:undefined} onRepeat={()=>roundPlan.repeat(loadRound)} onSettings={()=>setRunning(false)}/>}</div></section>}{picker&&<ModalWindow className="modal word-selection-dialog" label="Карточки" onDismiss={()=>{setPicker(false);setError('')}}><WordSelectionBody words={candidates} selected={chosen} onChange={setChosen} search={search} setSearch={setSearch} max={groups.reduce((n,g)=>n+g.count,0)} disabled={chosen.length!==groups.reduce((n,g)=>n+g.count,0)} onConfirm={applyManual} onCancel={()=>{setPicker(false);setError('')}}/>{error&&<p role="status">{error}</p>}</ModalWindow>}</main></div>;
}












