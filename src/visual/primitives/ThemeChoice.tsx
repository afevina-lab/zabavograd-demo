import {THEMES,THEME_IDS,type ThemeId} from '../../design-system/themes.ts';

export type ThemeChoiceClasses={root:string;choices:string;thumbnail:string;selected:string};
const classes:ThemeChoiceClasses={root:'v-theme-section',choices:'v-theme-choice',thumbnail:'v-theme-thumbnail',selected:'is-selected'};
export function ThemeChoice({value,onChange,classNames=classes,thumbnailThemeClass=false}:{value:ThemeId;onChange:(value:ThemeId)=>void;classNames?:ThemeChoiceClasses;thumbnailThemeClass?:boolean}){
 return <div className={classNames.root}><div className={classNames.choices} role="group" aria-label="Оформление игры">
  {THEME_IDS.map(id=><button key={id} type="button" aria-pressed={value===id} className={value===id?classNames.selected:undefined} onClick={()=>onChange(id)}>
   <i className={[classNames.thumbnail,thumbnailThemeClass?id:''].filter(Boolean).join(' ')} aria-hidden="true" style={{backgroundColor:THEMES[id].palette.accent,backgroundImage:THEMES[id].scene.background?`url("${import.meta.env.BASE_URL+THEMES[id].scene.background}")`:undefined}}/>
   {THEMES[id].label}
  </button>)}
 </div></div>;
}
