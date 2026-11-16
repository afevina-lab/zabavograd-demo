import {useEffect,useState} from 'react';
import {artworkMask,maskPixels} from '../artwork-mask.ts';
import type {ImageVariant,Word} from '../material-types.ts';
type Prepared={src:string;bounds:NonNullable<ImageVariant['bounds']>};
const cache=new Map<string,Prepared|null>(),pending=new Map<string,Promise<Prepared|null>>();
const queue:Array<()=>void>=[];let running=0;
function schedule<T>(task:()=>Promise<T>):Promise<T>{return new Promise((resolve,reject)=>{queue.push(()=>{running++;task().then(resolve,reject).finally(()=>{running--;pump()})});pump()})}
function pump(){while(running<4&&queue.length)queue.shift()!()}
function derive(src:string,outline:boolean):Promise<Prepared|null>{
 const key=src+'|'+outline;
 if(cache.has(key)){const hit=cache.get(key)!;cache.delete(key);cache.set(key,hit);return Promise.resolve(hit)}
 if(pending.has(key))return pending.get(key)!;
 const promise=schedule(()=>new Promise<Prepared|null>(resolve=>{
  const img=new Image();let ended=false;
  const finish=(value:Prepared|null)=>{if(ended)return;ended=true;clearTimeout(timeout);img.onload=null;img.onerror=null;resolve(value)};
  const timeout=setTimeout(()=>{finish(null);img.src=''},15000);
  img.onload=()=>{try{
   const scale=Math.min(1,384/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.round(img.naturalWidth*scale),h=Math.round(img.naturalHeight*scale),canvas=document.createElement('canvas');
   canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx){finish(null);return}
   ctx.drawImage(img,0,0,w,h);const mask=artworkMask(ctx.getImageData(0,0,w,h).data,w,h);if(!mask){finish(null);return}
   let left=w,top=h,right=0,bottom=0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1)}
   const padding=Math.max(3,Math.round(Math.max(right-left,bottom-top)*.075));left=Math.max(0,left-padding);top=Math.max(0,top-padding);right=Math.min(w,right+padding);bottom=Math.min(h,bottom+padding);
   const output=ctx.createImageData(w,h);output.data.set(maskPixels(mask,w,h,outline));ctx.putImageData(output,0,0);
   // Both faces use exactly this crop and source coordinate system.
   finish({src:canvas.toDataURL(),bounds:{x:left/scale,y:top/scale,width:(right-left)/scale,height:(bottom-top)/scale,sourceWidth:img.naturalWidth,sourceHeight:img.naturalHeight}});
  }catch{finish(null)}};
  img.onerror=()=>finish(null);img.src=src;
 })).then(value=>{pending.delete(key);cache.set(key,value);while(cache.size>128)cache.delete(cache.keys().next().value!);return value});
 pending.set(key,promise);return promise;
}
export function prepareArtwork(image:ImageVariant,outline:boolean){return derive(import.meta.env.BASE_URL+image.src.replace(/^\//,''),outline)}
export async function prepareMaterial(words:Word[],outline:boolean,signal:AbortSignal,onProgress:(done:number)=>void=()=>{}){
 const result:Array<Word|null>=Array(words.length).fill(null);let cursor=0,done=0;
 await Promise.all(Array.from({length:Math.min(4,words.length)},async()=>{
  while(!signal.aborted){const index=cursor++;if(index>=words.length)return;const word=words[index],variants:ImageVariant[]=[];
   for(const image of word.variants||[]){if(signal.aborted)return;const prepared=await prepareArtwork(image,outline);if(prepared)variants.push({...image,bounds:prepared.bounds,derived:{kind:outline?'outline':'silhouette',src:prepared.src}})}
   if(signal.aborted)return;if(variants.length)result[index]={...word,variants};onProgress(++done);
  }
 }));return signal.aborted?[]:result.filter((word):word is Word=>!!word);
}
export function DerivedArtwork({image,outline,onReady}:{image:ImageVariant;outline:boolean;onReady?:(ok:boolean)=>void}){
 const kind=outline?'outline':'silhouette',embedded=image.derived?.kind===kind&&image.bounds?{src:image.derived.src,bounds:image.bounds}:null;
 const [prepared,setPrepared]=useState<Prepared|null|undefined>(embedded||undefined);
 const url=import.meta.env.BASE_URL+image.src.replace(/^\//,'');
 useEffect(()=>{let current=true;if(image.derived?.kind===kind&&image.bounds){setPrepared({src:image.derived.src,bounds:image.bounds});onReady?.(true);return}
 setPrepared(undefined);void derive(url,outline).then(value=>{if(current){setPrepared(value);onReady?.(!!value)}});return()=>{current=false}
 },[url,outline,onReady,image.derived,image.bounds,kind]);
 const value=embedded||prepared;
 return value?<svg className="bounded-image" viewBox={[value.bounds.x,value.bounds.y,value.bounds.width,value.bounds.height].join(' ')} preserveAspectRatio="xMidYMid meet" role="img" aria-label={outline?'Контур предмета':'Силуэт предмета'}><image href={value.src} width={value.bounds.sourceWidth} height={value.bounds.sourceHeight}/></svg>:<span role="status">{prepared===undefined?'Подготовка изображения…':'Не удалось отделить фон. Выберите другое изображение.'}</span>;
}
