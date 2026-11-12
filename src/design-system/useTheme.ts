import {useEffect,useState} from 'react';
import {asThemeId,type ThemeId} from './themes.ts';
const storageKey='zabavograd.preferences';
/** The selected theme persists across game templates without erasing other preferences. */
export function readPreferences():Record<string,unknown>{
 try{
  const value=JSON.parse(localStorage.getItem(storageKey)||'{}');
  return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 }catch{return {}}
}
export function useTheme():readonly [ThemeId,(theme:ThemeId)=>void]{
 const [theme,setTheme]=useState<ThemeId>(()=>asThemeId(readPreferences().theme));
 useEffect(()=>{
  try{localStorage.setItem(storageKey,JSON.stringify({...readPreferences(),theme}))}catch{/* Storage may be disabled. */}
 },[theme]);
 return [theme,setTheme] as const;
}
