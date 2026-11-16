import {useEffect,useState} from 'react';
import type {Word} from '../material-types.ts';
import {prepareMaterial} from './DerivedArtwork.tsx';
export function usePreparedMaterial(words:Word[],kind:'outline'|'silhouette'|null){
 const [state,setState]=useState<{source:Word[];kind:typeof kind;words:Word[];done:number;ready:boolean}|null>(null);
 const [cancelled,setCancelled]=useState<{source:Word[];kind:typeof kind}|null>(null);
 const stopped=cancelled?.source===words&&cancelled.kind===kind;
 useEffect(()=>{if(!kind||stopped)return;const c=new AbortController();setState({source:words,kind,words:[],done:0,ready:false});
 void prepareMaterial(words,kind==='outline',c.signal,done=>setState(s=>s?.source===words?{...s,done}:s)).then(result=>{if(!c.signal.aborted)setState({source:words,kind,words:result,done:words.length,ready:true})});return()=>c.abort();
 },[words,kind,stopped]);
 const current=state?.source===words&&state.kind===kind;
 return {words:!kind?words:current&&state.ready&&!stopped?state.words:[],busy:!!kind&&!stopped&&!(current&&state.ready),done:current?state.done:0,cancelled:stopped,cancel:()=>setCancelled({source:words,kind}),retry:()=>setCancelled(null)};
}
