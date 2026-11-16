import {useEffect,useState} from 'react';
import type {Word} from './material-types.ts';
import {loadLibrary,loadFamilies} from './library-loader.ts';

export function useLibrary(){
 const [words,setWords]=useState<Word[]>([]),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  loadLibrary(import.meta.env.BASE_URL+'library.json',controller.signal)
   .then(data=>{if(!controller.signal.aborted)setWords(data)})
   .catch(()=>{if(!controller.signal.aborted)setError('Не удалось загрузить библиотеку. Обновите страницу.')});
  return()=>controller.abort();
 },[]);
 return {words,error};
}
export function useFamilies(){
 const [families,setFamilies]=useState<import('./matching.ts').Family[]>([]),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();loadFamilies(import.meta.env.BASE_URL+'semantic-graph.json',c.signal).then(v=>{if(!c.signal.aborted)setFamilies(v)}).catch(()=>{if(!c.signal.aborted)setError('Не удалось загрузить связи животных.')});return()=>c.abort()},[]);
 return {families,error};
}

