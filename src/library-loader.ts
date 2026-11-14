import type {Word} from './material-types.ts';

export function validateRuntimeLibrary(value:unknown):Word[]{
 if(!Array.isArray(value))throw Error('Библиотека должна быть массивом.');
 const ids=new Set<string>();
 for(const word of value){
  if(!word||typeof word.id!=='string'||!word.id||ids.has(word.id)||typeof word.label!=='string'||!Number.isFinite(word.weight)||!Array.isArray(word.opposition))throw Error('Некорректная запись библиотеки.');
  ids.add(word.id);
 }
 return value as Word[];
}
export async function loadLibrary(url:string,signal?:AbortSignal):Promise<Word[]>{
 const response=await fetch(url,{signal,cache:'no-store'});
 if(!response.ok)throw Error(`Не удалось открыть библиотеку: ${response.status}`);
 return validateRuntimeLibrary(await response.json());
}
