import {useEffect,useState} from 'react';
import type {Word} from './material-types.ts';
import {loadLibrary} from './library-loader.ts';

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
