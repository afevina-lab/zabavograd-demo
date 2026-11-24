import {SelectControl} from './SelectControl.tsx';
import {SettingsDisclosure} from './SettingsDisclosure.tsx';
import {QuantitySlider} from '../QuantitySlider.tsx';
import {Choice} from '../visual/primitives/Choice.tsx';
import type {LifeMode} from '../life-policy.ts';
export function ChallengeSettings({timed,setTimed,seconds,setSeconds,lives,setLives,lifeMode='manual',setLifeMode,lifeCount=5,setLifeCount}:{timed:boolean;setTimed:(v:boolean)=>void;seconds:number;setSeconds:(v:number)=>void;lives:boolean;setLives:(v:boolean)=>void;lifeMode?:LifeMode;setLifeMode?:(v:LifeMode)=>void;lifeCount?:number;setLifeCount?:(v:number)=>void}){return <SettingsDisclosure className="challenge" title="Время и жизни" description="" icon="Heart"><Choice className="check" kind="switch" label="На время · на один раунд" checked={timed} onChange={setTimed}/>{timed&&<QuantitySlider label="Лимит времени, мин." value={Math.round(seconds/60)} min={1} max={10} onChange={minutes=>setSeconds(minutes*60)}/>} <Choice className="check" kind="switch" label="Жизни" checked={lives} onChange={setLives}/>{lives&&setLifeCount&&<QuantitySlider label="Количество жизней" value={lifeCount} min={3} max={10} onChange={setLifeCount}/>}{lives&&setLifeMode&&<label>Списание жизней<SelectControl icon="choices" aria-label="Списание жизней" value={lifeMode} onChange={e=>setLifeMode(e.target.value as LifeMode)}><option value="manual">Вручную: кнопка, сердце или F8</option><option value="mistakes">За ошибочный ответ</option><option value="both">Вручную и за ошибки</option></SelectControl></label>}</SettingsDisclosure>}



