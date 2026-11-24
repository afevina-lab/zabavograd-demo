import {SelectControl,selectIcon} from './design-system/SelectControl.tsx';
import {SettingsDisclosure} from './design-system/SettingsDisclosure.tsx';
import {QuantitySlider} from './QuantitySlider.tsx';
import type {LifeMode} from './life-policy.ts';
import React from 'react';
import {Effects} from './Effects.tsx';
import type {ThemeId} from './design-system/themes.ts';
import {ThemeChoice} from './visual/primitives/ThemeChoice.tsx';
import {SceneLayers} from './design-system/SceneLayers.tsx';
import {Icon} from './visual/primitives/Icon.tsx';
export {Icon} from './visual/primitives/Icon.tsx';
export {ScoreStars} from './visual/primitives/ScoreStars.tsx';
export function ThemePicker({theme,setTheme}:{theme:ThemeId;setTheme:(v:ThemeId)=>void}){
 return <ThemeChoice value={theme} onChange={setTheme} classNames={{root:'theme-section',choices:'themes',thumbnail:'',selected:'selected'}} thumbnailThemeClass/>;
}
export function Scenery({theme,celebrate=false}:{theme:ThemeId;celebrate?:boolean}){
 return <><SceneLayers theme={theme}/><Effects theme={theme} celebrate={celebrate}/></>;
}
export function Challenges({timed,setTimed,seconds,setSeconds,lives,setLives,lifeMode='manual',setLifeMode,lifeCount=5,setLifeCount}:{timed:boolean;setTimed:(v:boolean)=>void;seconds:number;setSeconds:(v:number)=>void;lives:boolean;setLives:(v:boolean)=>void;lifeMode?:LifeMode;setLifeMode?:(v:LifeMode)=>void;lifeCount?:number;setLifeCount?:(v:number)=>void}){return <SettingsDisclosure className="challenge" title="Время и жизни" description="" icon="Heart"><label className="check"><input type="checkbox" role="switch" checked={timed} onChange={e=>setTimed(e.target.checked)}/>На время · на один раунд</label>{timed&&<QuantitySlider label="Лимит времени, мин." value={Math.round(seconds/60)} min={1} max={10} onChange={minutes=>setSeconds(minutes*60)}/>} <label className="check"><input type="checkbox" role="switch" checked={lives} onChange={e=>setLives(e.target.checked)}/>Жизни</label>{lives&&setLifeCount&&<QuantitySlider label="Количество жизней" value={lifeCount} min={3} max={10} onChange={setLifeCount}/>}{lives&&setLifeMode&&<label>Списание жизней<SelectControl icon={selectIcon("Списание жизней")} aria-label="Списание жизней" value={lifeMode} onChange={e=>setLifeMode(e.target.value as LifeMode)}><option value="manual">Вручную: кнопка, сердце или F8</option><option value="mistakes">За ошибочный ответ</option><option value="both">Вручную и за ошибки</option></SelectControl></label>}</SettingsDisclosure>}


