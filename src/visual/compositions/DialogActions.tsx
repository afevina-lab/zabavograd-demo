import {IconButton,IconLink} from '../primitives/Buttons.tsx';
export type DialogActionClasses={root:string;button:string;primary:string};
const classes:DialogActionClasses={root:'v-dialog-actions',button:'',primary:''};
export type DialogActionsProps={onSettings:()=>void;onHome?:()=>void;homeHref?:string;action:{kind:'continue'|'repeat';onClick:()=>void};classNames?:DialogActionClasses};
export function DialogActions({onSettings,onHome,homeHref=import.meta.env.BASE_URL+'home.html',action,classNames=classes}:DialogActionsProps){
 return <div className={classNames.root}>
  <IconButton className={classNames.button} label="Настройки" icon="Settings" onClick={onSettings}/>
  {onHome?<IconButton className={classNames.button} label="Домой" icon="Home1" onClick={onHome}/>:<IconLink className={classNames.button} label="Домой" icon="Home1" href={homeHref}/>}
  <IconButton className={[classNames.button,classNames.primary].filter(Boolean).join(' ')} label={action.kind==='continue'?'Продолжить':'Ещё раз'} icon={action.kind==='continue'?'Play':'Return1'} onClick={action.onClick}/>
 </div>;
}
