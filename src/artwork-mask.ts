/** Connected-background removal preserves white regions enclosed inside the object. */
export function artworkMask(rgba:Uint8ClampedArray,width:number,height:number):Uint8Array|null{
 if(width<3||height<3||rgba.length!==width*height*4)return null;
 const corners=[0,width-1,(height-1)*width,width*height-1];
 const transparent=corners.filter(i=>rgba[i*4+3]<40).length>=3;
 const base=[0,1,2].map(c=>corners.reduce((v,i)=>v+rgba[i*4+c],0)/4);
 if(!transparent&&(!base.every(v=>v>190)||!corners.every(i=>Math.hypot(...base.map((v,c)=>rgba[i*4+c]-v))<35)))return null;
 const mask=new Uint8Array(width*height);
 if(transparent){for(let i=0;i<mask.length;i++)mask[i]=rgba[i*4+3]>48?1:0;}
 else{
 const seen=new Uint8Array(mask.length),queue:number[]=[];
 const background=(i:number)=>rgba[i*4+3]<48||Math.hypot(...base.map((v,c)=>rgba[i*4+c]-v))<42;
 const add=(i:number)=>{if(!seen[i]&&background(i)){seen[i]=1;queue.push(i)}};
 for(let x=0;x<width;x++){add(x);add((height-1)*width+x)}
 for(let y=0;y<height;y++){add(y*width);add(y*width+width-1)}
 for(let n=0;n<queue.length;n++){const i=queue[n],x=i%width,y=Math.floor(i/width);if(x)add(i-1);if(x<width-1)add(i+1);if(y)add(i-width);if(y<height-1)add(i+width)}
 for(let i=0;i<mask.length;i++)mask[i]=seen[i]?0:1;
 }
 const count=mask.reduce((a,b)=>a+b,0);return count<mask.length*.005||count>mask.length*.9?null:mask;
}
export function maskPixels(mask:Uint8Array,width:number,height:number,outline:boolean,thickness=3):Uint8ClampedArray{
 const pixels=new Uint8ClampedArray(width*height*4);
 const radius=Math.max(1,Math.min(8,Math.round(thickness)));
 const offsets:number[][]=[];for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(dx*dx+dy*dy<=radius*radius)offsets.push([dx,dy]);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(!mask[i])continue;
 const edge=!outline||offsets.some(([dx,dy])=>x+dx<0||y+dy<0||x+dx>=width||y+dy>=height||!mask[(y+dy)*width+x+dx]);
 if(edge){pixels[i*4]=35;pixels[i*4+1]=35;pixels[i*4+2]=40;pixels[i*4+3]=255;}
 }return pixels;
}
