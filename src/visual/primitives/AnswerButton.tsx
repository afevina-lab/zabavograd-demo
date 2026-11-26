import type {ButtonHTMLAttributes} from 'react';
import {IconButton} from './Buttons.tsx';
/** Consistent answer control; the game supplies the actual action and accessible wording. */
export function AnswerButton({answer,label,className='',...props}:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'aria-label'>&{answer:'positive'|'negative';label:string}){
 return <IconButton {...props} className={className} size="answer" label={label} icon={answer==='positive'?'Check':'X'} data-answer={answer}/>;
}
