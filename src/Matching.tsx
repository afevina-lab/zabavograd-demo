import {useRef,useState} from 'react';
import {useLibrary,useFamilies} from './useLibrary.ts';
import {familyGroups,visualGroups,validateGroups,checkMatching,shuffled,inTopic,type MatchGroup,type MatchElement} from './matching.ts';
import {CardArtwork} from './CardArtwork.tsx';
import {DerivedArtwork,prepareArtwork} from './design-system/DerivedArtwork.tsx';
import {GameToolbar} from './GameToolbar.tsx';
import {QuantitySlider} from './QuantitySlider.tsx';
import {Icon,Scenery,ThemePicker} from './GameUI.tsx';
import {useTheme} from './design-system/useTheme.ts';
import {themeAttributes,themeVars} from './design-system/themes.ts';
export function Matching(){
 const {words,error}=useLibrary(),{families,error:familyError}=useFamilies();
 const [theme,setTheme]=useTheme(),[topic,setTopic]=useState(''),[mode,setMode]=useState('family'),[size,setSize]=useState(2),[count,setCount]=useState(4);
 const [manual,setManual]=useState<string[][]>([Array(2).fill('')]),[session,setSession]=useState<MatchGroup[]>([]),[bank,setBank]=useState<MatchElement[]>([]);
 const [placements,setPlacements]=useState<Record<string,string[]>>({}),[selected,setSelected]=useState<string|null>(null),[message,setMessage]=useState(''),[paused,setPaused]=useState(false);
 const [checkMode,setCheckMode]=useState('instant'),[verdict,setVerdict]=useState<Record<string,boolean>>({}),[finished,setFinished]=useState(false),[busy,setBusy]=useState(false),[captions,setCaptions]=useState(false);
 const suppressClick=useRef(false);
 const topics=[...new Set(words.flatMap(w=>(w.categories||[]).flatMap(p=>p.split('/').map((_,i)=>p.split('/').slice(0,i+1).join('/')))))].sort();
 const available=words.filter(w=>inTopic(w,topic));
 const familyAvailable=familyGroups(words,families,topic,2).length>0;
 const groups:MatchGroup[]=mode==='family'?familyGroups(words,families,topic,size):mode==='manual'?manual.map((row,i)=>({id:'manual-'+i,elements:row.flatMap((id,j)=>{const w=words.find(w=>w.id===id);return w?[{id:'manual-'+i+':'+j,word:w,appearance:'original' as const}]:[]})})):visualGroups(words,topic,mode==='shadow'?'silhouette':'outline');
 const setupError=validateGroups(groups,size)||(mode==='manual'&&manual.some(row=>new Set(row).size!==row.length)?'Внутри одной группы выберите разные слова.':'');
 const placed=new Set(Object.values(placements).flat()),remaining=bank.filter(e=>!placed.has(e.id)),complete=remaining.length===0;
 async function start(){
 setBusy(true);setMessage('');
 let candidates=mode==='manual'?groups:shuffled(groups);
 if(mode==='shadow'||mode==='outline'){const checked=await Promise.all(candidates.map(async g=>({g,ok:!!await prepareArtwork(g.elements[0].word.variants![0],mode==='outline')})));candidates=checked.filter(x=>x.ok).map(x=>x.g);}
 const next=mode==='manual'?candidates:candidates.slice(0,count);
 if(!next.length){setMessage('Нет изображений с отделяемым фоном. Выберите другую тему или задание.');setBusy(false);return;}
 setSession(next);setBank(shuffled(next.flatMap(g=>g.elements.slice(1))));setPlacements({});setVerdict({});setSelected(null);setFinished(false);setPaused(false);setBusy(false);
 if(next.length<count&&mode!=='manual')setMessage('Доступно полных групп: '+next.length+'.');
 }
 function place(id:string,groupId:string){
 if(paused||finished)return;
 const existing=placements[groupId]||[],g=session.find(g=>g.id===groupId);
 if(!g||existing.length>=g.elements.length-1||placed.has(id))return;
 const next={...placements,[groupId]:[...existing,id]},v=checkMatching(session,next);
 if(checkMode==='instant'&&!v[id]){setMessage('Попробуй другую группу.');setVerdict({[id]:false});setSelected(null);return;}
 setPlacements(next);setVerdict({});setMessage('');setSelected(null);
 if(checkMode==='instant'&&Object.values(next).flat().length===bank.length){setFinished(true);setMessage('Все элементы на своих местах!');}
 }
 function check(){
 if(!complete||paused||finished)return;const v=checkMatching(session,placements);setVerdict(v);
 const correct=Object.values(v).filter(Boolean).length;setMessage('Верно: '+correct+' из '+bank.length+'.');
 if(checkMode==='finish'||correct===bank.length)setFinished(true);
 }
 function retry(){setPlacements(p=>Object.fromEntries(Object.entries(p).map(([id,ids])=>[id,ids.filter(id=>verdict[id])])));setVerdict({});setMessage('Исправьте оставшиеся соответствия.');}
 function remove(id:string){if(paused||finished)return;setPlacements(p=>Object.fromEntries(Object.entries(p).map(([g,ids])=>[g,ids.filter(x=>x!==id)])));setVerdict({});setSelected(null);}
 function artwork(e:MatchElement){const image=e.word.variants?.[0];return <>{image?(e.appearance==='silhouette'||e.appearance==='outline'?<DerivedArtwork image={image} outline={e.appearance==='outline'}/>:<CardArtwork image={image} label={e.word.label}/>):<span>{e.word.label}</span>}{captions&&image&&e.appearance==='original'&&<small>{e.word.label}</small>}</>;}
 function card(e:MatchElement,isPlaced=false){return <button type="button" key={e.id} data-match-card={e.id} disabled={paused||finished} className={'matching-card '+(selected===e.id?'chosen ':'')+(verdict[e.id]===false?'verdict-bad':verdict[e.id]===true?'verdict-good':'')} aria-label={e.appearance==='original'?e.word.label:e.appearance==='outline'?'Контур':'Тень'} onClick={()=>{if(suppressClick.current)return;if(isPlaced)remove(e.id);else setSelected(e.id)}} onPointerDown={event=>{
 if(paused||finished||isPlaced||event.button!==0)return;
 const el=event.currentTarget,rect=el.getBoundingClientRect(),x=event.clientX,y=event.clientY,previous=el.style.cssText;let moved=false;
 el.setPointerCapture(event.pointerId);
 const move=(ev:PointerEvent)=>{if(!moved&&Math.hypot(ev.clientX-x,ev.clientY-y)<6)return;moved=true;suppressClick.current=true;Object.assign(el.style,{position:'fixed',left:rect.left+ev.clientX-x+'px',top:rect.top+ev.clientY-y+'px',width:rect.width+'px',height:rect.height+'px',zIndex:'1000',pointerEvents:'none',margin:'0'});};
 const end=(ev:PointerEvent)=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);const target=moved?document.elementFromPoint(ev.clientX,ev.clientY)?.closest<HTMLElement>('[data-match-group]'):null;el.style.cssText=previous;if(target&&ev.type!=='pointercancel')place(e.id,target.dataset.matchGroup!);setTimeout(()=>{suppressClick.current=false},0);};
 el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
 }}>{artwork(e)}</button>;}
 function resize(n:number){setSize(n);setManual(rows=>rows.map(row=>Array.from({length:n},(_,i)=>row[i]||'')));if(n>3)setMode('manual');}
 return <div className={'app '+(session.length?'game-active':'')} {...themeAttributes(theme)} style={themeVars(theme,import.meta.env.BASE_URL)}>
 {!session.length?<main className="matching-setup settings"><a href={import.meta.env.BASE_URL+'home.html'}>← Домой</a><h1>Соотнесение</h1><p>Выбери карточку из общего банка и помести её под подходящим элементом. Можно перетаскивать или нажимать.</p>
 <label>Лексическая тема<select aria-label="Лексическая тема" value={topic} disabled={busy} onChange={e=>{setTopic(e.target.value);setManual([Array(size).fill('')]);setMessage('')}}><option value="">Сначала выберите тему</option>{topics.map(t=><option key={t}>{t}</option>)}</select></label>
 {topic&&<><label>Задание<select aria-label="Задание" value={mode} disabled={busy} onChange={e=>{setMode(e.target.value);setMessage('');if(e.target.value==='shadow'||e.target.value==='outline')resize(2)}}>{familyAvailable&&<option value="family">Животное — детёныш / семья</option>}<option value="shadow">Предмет — тень</option><option value="outline">Предмет — контур</option><option value="manual">Свои группы</option>{!familyAvailable&&mode==='family'&&<option value="family" disabled>Для темы нет проверенных семей</option>}</select></label>
 {(mode==='family'||mode==='manual')&&<label>Элементов в группе<select aria-label="Элементов в группе" value={size} disabled={busy} onChange={e=>resize(+e.target.value)}>{[2,3,4,5].map(n=><option key={n} value={n}>{n} (опора + {n-1})</option>)}</select></label>}
 {mode==='manual'?<section><p>Первый элемент — опора. Остальные подходят к нему в любом порядке. Группы задаются только для этого занятия.</p>{manual.map((row,i)=><fieldset key={i}><legend>Группа {i+1}</legend><div className="matching-manual">{row.map((id,j)=><label key={j}>{j===0?'Опора':'Ответ '+j}<select value={id} disabled={busy} onChange={e=>setManual(rows=>rows.map((r,k)=>k===i?r.map((v,l)=>l===j?e.target.value:v):r))}><option value="">Выберите слово</option>{available.map(w=><option key={w.id} value={w.id}>{w.label}</option>)}</select></label>)}</div><button type="button" disabled={busy||manual.length===1} onClick={()=>setManual(rows=>rows.filter((_,j)=>j!==i))}>Удалить группу</button></fieldset>)}<button type="button" disabled={busy||manual.length>=8} onClick={()=>setManual(rows=>[...rows,Array(size).fill('')])}>Добавить группу</button></section>:<QuantitySlider label="Количество групп" value={count} min={1} max={8} onChange={setCount}/>}
 <label>Проверка<select aria-label="Проверка" value={checkMode} onChange={e=>setCheckMode(e.target.value)}><option value="instant">Сразу</option><option value="correct">В конце с исправлением</option><option value="finish">В конце с результатом</option></select></label>
 <label className="check"><input type="checkbox" checked={captions} onChange={e=>setCaptions(e.target.checked)}/>Подписи к исходным картинкам</label><p className="hint">Если рисунка пока нет, показывается слово. Подписи к теням и контурам скрыты.</p>
 <ThemePicker theme={theme} setTheme={setTheme}/><p role="status">{error||familyError||message||setupError||('Доступно групп: '+groups.length)}</p><button className="primary" disabled={busy||!!setupError||!!error||(mode==='family'&&!!familyError)} onClick={()=>void start()}>{busy?'Готовим изображения…':'Начать игру'}</button></>}
 </main>:<section className="play-area"><GameToolbar><a className="icon-button" aria-label="Домой" href={import.meta.env.BASE_URL+'home.html'}><Icon name="Home1"/></a><button className="icon-button" aria-label="Настройки" onClick={()=>{setSession([]);setMessage('')}}><Icon name="Settings"/></button><button className="icon-button" aria-label={paused?'Продолжить':'Пауза'} onClick={()=>setPaused(v=>!v)}><Icon name={paused?'RightArrow1':'Pause'}/></button><span>{placed.size} / {bank.length}</span></GameToolbar>
 <div className="stage matching-stage"><Scenery theme={theme}/><div className="matching-content"><h1>Найди подходящие элементы</h1><div className="matching-groups">{session.map(g=><section className="matching-group" key={g.id} data-match-group={g.id}><div className="matching-card matching-anchor">{artwork(g.elements[0])}</div><div className="matching-slots">{(placements[g.id]||[]).map(id=>card(bank.find(e=>e.id===id)!,true))}{Array.from({length:g.elements.length-1-(placements[g.id]?.length||0)},(_,i)=><button type="button" className="matching-slot" key={'slot-'+i} aria-label={'Поместить под '+g.elements[0].word.label} disabled={!selected||paused||finished} onClick={()=>selected&&place(selected,g.id)}>+</button>)}</div></section>)}</div>
 {!finished&&<section className="matching-bank" aria-label="Общий банк"><h2>Общий банк</h2><div>{remaining.map(e=>card(e))}</div></section>}
 <p role="status">{paused?'Пауза':message}</p>{checkMode!=='instant'&&!finished&&<button className="primary" disabled={!complete||paused} onClick={check}>Проверить</button>}{checkMode==='correct'&&Object.values(verdict).some(v=>!v)&&<button className="primary" disabled={paused} onClick={retry}>Вернуть ошибки в банк</button>}
 {finished&&<button className="primary" onClick={()=>{setSession([]);setMessage('')}}>К настройкам</button>}</div></div></section>}
 </div>;
}
