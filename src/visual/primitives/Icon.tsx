/** Canonical icon catalogue shared by current games and the replacement visual layer. */
const iconFiles:Record<string,string> = {
 Play:'play.svg',Settings:'settings.svg',Save:'save.svg',Trash:'trash.svg',Pause:'pause.svg',RightArrow1:'arrow-right.svg',
 Home1:'house.svg',Question:'question-mark.svg',Star:'star.svg',
 X:'cross.svg',Check:'tick.svg',Sight:'expand.svg',Return1:'refresh.svg',
 Sound:'volume.svg',SoundOff:'mute.svg',Heart:'heart.svg'
};
export function Icon({name}:{name:string}){
 if(name==='Heart'||name==='Star')return <img className="garden-icon garden-art-icon" aria-hidden="true" alt="" src={import.meta.env.BASE_URL+'assets/rewards/'+(name==='Heart'?'heart':'star')+'.webp'}/>;
 const src=import.meta.env.BASE_URL+'assets/icons-new/'+(iconFiles[name]||'star.svg');
 return <span className="garden-icon" aria-hidden="true" style={{maskImage:`url("${src}")`,WebkitMaskImage:`url("${src}")`}}/>;
}
