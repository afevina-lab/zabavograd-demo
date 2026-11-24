import {MaterialPreview} from './compositions/MaterialPreview.tsx';
import {SearchChoices} from './compositions/SearchChoices.tsx';
import {createRoot} from 'react-dom/client';
import {useMemo,useState} from 'react';
import {MaterialSettingsShell} from '../design-system/MaterialSettingsShell.tsx';
import {usePresetSource} from '../design-system/MaterialPresetContext.tsx';
import {useLibrary} from '../useLibrary.ts';
import {initialLearning} from '../learning.ts';
import {defaultFilters} from '../model.ts';
import {ThemeChoice,Range,VisualRoot,Button,IconButton,Select,Disclosure,Choice,Chip,Quantity,Card,Artwork,GameLayout,Toolbar,GameDialog,DialogActions,MemoryBoard,SortingBoard,MatchingBoard,ConveyorBoard,TransformationBoard} from './index.tsx';
import {THEME_IDS,type ThemeId} from '../design-system/themes.ts';
import './index.css';
const games=['memory','sorting','matching','conveyor','transformations'] as const;
type Game=typeof games[number];
const names:Record<Game,string>={memory:'Мемори',sorting:'Сортировка',matching:'Соотнесение',conveyor:'Конвейер',transformations:'Превращения'};
function LabMaterialSource(){
 const {words}=useLibrary(),learning=useMemo(()=>({...initialLearning}),[words]);
 usePresetSource({label:'Материал стенда',learning,filters:defaultFilters,wordIds:words.slice(0,6).map(word=>word.id)},words.length>0);
 return <span hidden data-material-source-ready={words.length>0}/>;
}
function Lab(){
 const params=new URLSearchParams(location.search),initial=params.get('theme') as ThemeId;
 const [theme,setTheme]=useState<ThemeId>(THEME_IDS.includes(initial)?initial:'neutral');
 const [game,setGame]=useState<Game>(games.find(g=>g===params.get('game'))||'memory');
 const [screen,setScreen]=useState<'settings'|'play'|'pause'|'result'>('settings');
 const [count,setCount]=useState(8),[rounds,setRounds]=useState(1),[sound,setSound]=useState(true),[hint,setHint]=useState(false),[captions,setCaptions]=useState(true),[selected,setSelected]=useState<string[]>([]),[query,setQuery]=useState('');
 const [range,setRange]=useState<[number,number]>([1,5]);
 const words=['Арбуз','Арфа','Бабочка','Дом','Кот','Лиса'];
 const cards=words.slice(0,Math.min(count,words.length)).map((word,i)=><Card key={word} label={word} frame={game==="matching"||game==="conveyor"?"sliced":"image"} selected={selected.includes(word)} onClick={()=>setSelected(old=>old.includes(word)?old.filter(w=>w!==word):[...old,word])}><Artwork src={import.meta.env.BASE_URL+'assets/words/'+['arbuz-dolka','arfa','babochka'][i%3]+'.webp'}/>{captions&&<span>{word}</span>}</Card>);
 const toolbar=<Toolbar pause={<IconButton size="toolbar" label="Пауза" icon="Pause" onClick={()=>setScreen('pause')}/>} sound={<IconButton size="toolbar" label={sound?'Выключить звук':'Включить звук'} icon={sound?'Sound':'SoundOff'} onClick={()=>setSound(v=>!v)}/>} hint={<IconButton size="toolbar" label="Подсказка" icon="Question" aria-pressed={hint} onClick={()=>setHint(v=>!v)}/>} task={hint?'Выбери карточку и назови слово':names[game]} counters={<span>♥ ♥ ♥</span>} fullscreen={<IconButton size="toolbar" label="Полный экран" icon="Sight" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen()}}/>}/>;
 const board=game==='sorting'?<SortingBoard bank={cards} groups={[{id:'a',title:'Первая группа',content:cards.slice(0,2)},{id:'b',title:'Вторая группа',content:cards.slice(2,4)}]}/>:game==='matching'?<MatchingBoard>{cards}</MatchingBoard>:game==='conveyor'?<ConveyorBoard>{cards}</ConveyorBoard>:game==='transformations'?<TransformationBoard>{cards[0]}</TransformationBoard>:<MemoryBoard>{cards}</MemoryBoard>;
 const primary=<><Select label="Игра" value={game} onChange={value=>setGame(value as Game)} options={games.map(value=>({value,label:names[value]}))}/><Disclosure title="Учебный материал" open><SearchChoices items={words.map(label=>({id:label,label}))} selected={selected} onChange={setSelected} search={query} setSearch={setQuery}/></Disclosure></>;
 const secondary=<><Quantity label="Количество элементов" min={2} max={20} value={count} onChange={setCount}/><Quantity label="Количество раундов" min={1} max={10} value={rounds} onChange={setRounds}/><Choice label="Подписи" kind="switch" checked={captions} onChange={setCaptions}/><Disclosure title="Правила игры"><Choice label="Звук" checked={sound} onChange={setSound}/><Range label="Длина слова" value={range} min={1} max={12} onChange={setRange}/><Button tone="quiet">Тихое действие</Button><Button disabled>Недоступное действие</Button><Chip selected={hint} onClick={()=>setHint(v=>!v)}>Подсказка</Chip></Disclosure></>;
 return <VisualRoot theme={theme}>{screen==='settings'?<MaterialSettingsShell title={names[game]} onHome={()=>setScreen('settings')} leading={<LabMaterialSource/>} primary={primary} secondary={secondary} appearance={<ThemeChoice value={theme} onChange={setTheme}/>} footer={<><MaterialPreview><p>{selected.length?selected.join(" · "):`Материал: ${count} · Раундов: ${rounds}`}</p></MaterialPreview><Button size="launch" onClick={()=>setScreen('play')}>Начать игру</Button></>}/>:<GameLayout toolbar={toolbar} board={<>{board}<Button onClick={()=>setScreen('result')}>Показать итог</Button></>} overlay={(screen==='pause'||screen==='result')&&<GameDialog title={screen==='pause'?'Пауза':'Отлично!'} award={screen==='result'?<img width="96" height="96" src={import.meta.env.BASE_URL+'assets/rewards/star.webp'} alt="Звезда"/>:undefined} onClose={()=>setScreen('play')} actions={<DialogActions onSettings={()=>setScreen('settings')} onHome={()=>setScreen('settings')} action={{kind:screen==='pause'?'continue':'repeat',onClick:()=>setScreen('play')}}/>}/>}/>}</VisualRoot>;
}
createRoot(document.getElementById('root')!).render(<Lab/>);



