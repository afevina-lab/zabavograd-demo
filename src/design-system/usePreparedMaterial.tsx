import {useEffect,useMemo,useState} from 'react';
import type {Word} from '../material-types.ts';
import {shuffled} from '../matching.ts';
import {prepareMaterial} from './DerivedArtwork.tsx';
export function usePreparedMaterial(words:Word[],kind:'outline'|'silhouette'|null,limit=words.length){
 const [revision,setRevision]=useState(0),[priority,setPriority]=useState<{source:Word[];ids:string[]}|null>(null);
 const order=useMemo(()=>{const chosen=priority?.source===words?priority.ids:[];return [...chosen.flatMap(id=>words.find(w=>w.id===id)?[words.find(w=>w.id===id)!]:[]),...shuffled(words.filter(w=>w.weight>0&&!chosen.includes(w.id)))];},[words,priority,revision]);
 const [state,setState]=useState<{source:Word[];kind:typeof kind;limit:number;words:Word[];done:number;ready:boolean}|null>(null);
 const [cancelled,setCancelled]=useState<Word[]|null>(null);const stopped=cancelled===order;
 useEffect(()=>{if(!kind||stopped)return;const c=new AbortController();setState({source:order,kind,limit,words:[],done:0,ready:false});
 void prepareMaterial(order,kind==='outline',c.signal,done=>setState(s=>s?.source===order?{...s,done}:s),limit).then(result=>{if(!c.signal.aborted)setState({source:order,kind,limit,words:result,done:result.length,ready:true})});return()=>c.abort();
 },[order,kind,limit,stopped]);
 const current=state?.source===order&&state.kind===kind&&state.limit===limit;
 return {words:!kind?words:current&&state.ready&&!stopped?state.words:[],busy:!!kind&&!stopped&&!(current&&state.ready),done:current?state.done:0,cancelled:stopped,cancel:()=>setCancelled(order),retry:()=>setCancelled(null),shuffle:()=>{setPriority(null);setRevision(n=>n+1)},select:(ids:string[])=>setPriority({source:words,ids})};
}
