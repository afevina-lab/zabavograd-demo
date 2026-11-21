import type {ReactNode} from 'react';

/** Shared fixed-footer preview across every game. Game components provide content only;
 * titles, spacing, action placement and empty/error messages have one owner.
 */
export function SetupPreview({actions,children,message}:{
 actions?:ReactNode;
 children?:ReactNode;
 message?:ReactNode;
}){
 return <section className="settings-block setup-preview" data-setup-section="preview">
  <div className="setup-preview-meta">
   <h2>В этой игре</h2>
   {actions&&<div className="setup-preview-actions">{actions}</div>}
  </div>
  <div className="setup-preview-content">
   {message?<p className="setup-preview-message" role="status">{message}</p>:children}
  </div>
 </section>;
}
