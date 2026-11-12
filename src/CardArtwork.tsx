import React,{useEffect,useState} from 'react';
import type {ImageVariant} from './model.ts';

type Bounds=NonNullable<ImageVariant['bounds']>;
const boundsCache=new Map<string,Bounds|null>();
const pending=new Map<string,Promise<Bounds|null>>();

/**
 * Detect the visible illustration, not the rectangular WebP canvas.
 * Small, low-resolution sampling avoids downloading any extra assets.
 * Existing editorial bounds always take precedence.
 */
function findArtworkBounds(img:HTMLImageElement):Bounds|null{
 const width=img.naturalWidth,height=img.naturalHeight;
 if(!width||!height)return null;
 const scale=Math.min(1,256/Math.max(width,height));
 const sw=Math.max(1,Math.round(width*scale)),sh=Math.max(1,Math.round(height*scale));
 const canvas=document.createElement('canvas');canvas.width=sw;canvas.height=sh;
 const context=canvas.getContext('2d',{willReadFrequently:true});
 if(!context)return null;
 context.drawImage(img,0,0,sw,sh);
 const pixels=context.getImageData(0,0,sw,sh).data;
 const at=(x:number,y:number)=>{const i=(y*sw+x)*4;return [pixels[i],pixels[i+1],pixels[i+2],pixels[i+3]]};
 const corners=[at(0,0),at(sw-1,0),at(0,sh-1),at(sw-1,sh-1)];
 const transparent=corners.filter(p=>p[3]<48).length>=3;
 const base=[0,1,2].map(channel=>Math.round(corners.reduce((n,p)=>n+p[channel],0)/4));
 const backgroundUniform=corners.every(p=>p[3]>245&&Math.hypot(p[0]-base[0],p[1]-base[1],p[2]-base[2])<30);
 const brightNeutral=base[0]>196&&base[1]>190&&base[2]>185;
 if(!transparent&&(!backgroundUniform||!brightNeutral))return null;
 let minX=sw,minY=sh,maxX=-1,maxY=-1,count=0;
 // Ignore faint watercolor paper grain while retaining delicate object edges.
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
  const i=(y*sw+x)*4,alpha=pixels[i+3];
  const foreground=transparent?alpha>42:
    alpha>80&&Math.hypot(pixels[i]-base[0],pixels[i+1]-base[1],pixels[i+2]-base[2])>37;
  if(!foreground)continue;
  count++;minX=Math.min(minX,x);minY=Math.min(minY,y);
  maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
 }
 if(count<sw*sh*.003||count>sw*sh*.9||maxX<minX)return null;
 const padding=Math.max(3,Math.round(Math.max(maxX-minX+1,maxY-minY+1)*.075));
 const left=Math.max(0,minX-padding),top=Math.max(0,minY-padding);
 const right=Math.min(sw,maxX+padding+1),bottom=Math.min(sh,maxY+padding+1);
 if((right-left)/sw>.97&&(bottom-top)/sh>.97)return null;
 return {x:Math.round(left/scale),y:Math.round(top/scale),
  width:Math.min(width-Math.round(left/scale),Math.ceil((right-left)/scale)),
  height:Math.min(height-Math.round(top/scale),Math.ceil((bottom-top)/scale)),
  sourceWidth:width,sourceHeight:height};
}

function autoBounds(src:string):Promise<Bounds|null>{
 const cached=boundsCache.get(src);
 if(cached!==undefined)return Promise.resolve(cached);
 const existing=pending.get(src);if(existing)return existing;
 const promise=new Promise<Bounds|null>(resolve=>{
  const image=new Image();
  image.onload=()=>{
   let bounds:Bounds|null=null;
   try{bounds=findArtworkBounds(image)}catch{bounds=null}
   boundsCache.set(src,bounds);pending.delete(src);resolve(bounds);
  };
  image.onerror=()=>{boundsCache.set(src,null);pending.delete(src);resolve(null)};
  image.src=src;
 });
 pending.set(src,promise);return promise;
}

export function CardArtwork({image,label}:{image:ImageVariant;label:string}){
 const src=import.meta.env.BASE_URL+image.src.replace(/^\//,'');
 const [detected,setDetected]=useState<Bounds|null>(()=>boundsCache.get(src)||null);
 useEffect(()=>{
  if(image.bounds)return;
  let current=true;
  setDetected(boundsCache.get(src)||null);
  void autoBounds(src).then(bounds=>{if(current)setDetected(bounds)});
  return()=>{current=false};
 },[src,image.bounds]);
 const bounds=image.bounds||detected;
 return bounds?<svg className="bounded-image" viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
  preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
  <image href={src} width={bounds.sourceWidth} height={bounds.sourceHeight}/>
 </svg>:<img src={src} alt={label}/>;
}
