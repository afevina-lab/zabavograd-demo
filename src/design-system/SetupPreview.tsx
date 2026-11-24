import {MaterialPreview} from '../visual/compositions/MaterialPreview.tsx';
import type {ComponentProps} from 'react';
const classes={root:'settings-block setup-preview setup-material-preview',meta:'setup-preview-meta',actions:'setup-preview-actions',message:'setup-preview-message',well:'setup-preview-content',text:'setup-preview-fit'};
export function SetupPreview(props:Omit<ComponentProps<typeof MaterialPreview>,'classNames'>){return <MaterialPreview {...props} classNames={classes}/>}
