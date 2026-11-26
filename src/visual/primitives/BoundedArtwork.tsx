export type ArtworkBounds={x:number;y:number;width:number;height:number;sourceWidth:number;sourceHeight:number};
/** Rendering only: detection, cropping and silhouette generation stay with the material adapter. */
export function BoundedArtwork({src,label,bounds,className='v-bounded-artwork',fallbackClassName='v-artwork'}:{src:string;label:string;bounds?:ArtworkBounds|null;className?:string;fallbackClassName?:string}){
 return bounds?<svg className={['v-bounded-artwork',className].filter(Boolean).join(' ')} viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
  <image href={src} width={bounds.sourceWidth} height={bounds.sourceHeight}/>
 </svg>:<img className={['v-artwork',fallbackClassName].filter(Boolean).join(' ')} src={src} alt={label}/>;
}

