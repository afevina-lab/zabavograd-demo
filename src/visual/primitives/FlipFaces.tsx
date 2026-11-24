import type {CSSProperties,ReactNode} from 'react';
const classes={inner:'v-flip-inner',back:'v-flip-back',front:'v-flip-front'};
/** Both faces share one transform owner; the game decides which face is visible. */
export function FlipFaces({back,front,frontStyle,revealed=false,classNames=classes}:{back:ReactNode;front:ReactNode;frontStyle?:CSSProperties;revealed?:boolean;classNames?:typeof classes}){
 return <span className={classNames.inner} data-revealed={revealed}><span className={classNames.back}>{back}</span><span className={classNames.front} style={frontStyle}>{front}</span></span>;
}

