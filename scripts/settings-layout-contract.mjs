// Executed in Chromium against actual settings; checks the responsive design,
// rather than the old pinned appearance rail and asymmetric footer.
export function inspectSettingsLayout(){
 const root=document.querySelector('.v-settings'),scroll=root.querySelector('.v-settings-scroll'),body=root.querySelector('.v-settings-body'),appearance=root.querySelector('.v-settings-appearance'),footer=root.querySelector('.v-settings-footer');
 const words=footer.querySelector('.v-fit-copy'),copy=words.querySelector('.v-fit-copy-text'),actions=footer.querySelector('.v-preview-actions'),start=footer.querySelector(':scope>button');
 const r=root.getBoundingClientRect(),b=body.getBoundingClientRect(),a=actions.getBoundingClientRect(),w=words.getBoundingClientRect(),s=start.getBoundingClientRect(),f=footer.getBoundingClientRect(),ar=appearance.getBoundingClientRect();
 const wide=innerWidth>=1180&&innerHeight>=560,stacked=innerWidth<=600,centre=e=>e.top+e.height/2;
 return {
  inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,
  centred:Math.abs(r.left+r.width/2-innerWidth/2)<=1,
  scrollFits:scroll.scrollWidth<=scroll.clientWidth+1,
  appearanceScrolls:wide?getComputedStyle(body).overflowY==='auto'&&getComputedStyle(appearance.querySelector('.v-appearance-scroll')).overflowY==='auto':getComputedStyle(scroll).overflowY==='auto',
  appearancePosition:wide?ar.left>=b.right-1:ar.top>=b.bottom-1,
  footerInside:f.bottom<=r.bottom+1&&(wide?b.bottom:scroll.getBoundingClientRect().bottom)<=f.top+1,
  wordsLayout:stacked?w.bottom<=a.top+1&&Math.abs(w.left-a.left)<=1&&Math.abs(w.right-s.right)<=1:a.right<=w.left+1&&w.right<=s.left+1&&Math.abs(centre(w)-centre(s))<=1,
  actionsAligned:Math.abs(centre(a)-centre(s))<=1,
  readableCopy:copy.getBoundingClientRect().height<=parseFloat(getComputedStyle(copy).lineHeight)*2+1,
  largeStart:s.height>=56&&s.width>=(innerWidth<=360?96:110)&&s.right<=f.right+1,
  equalIcons:[...actions.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width>0).every(e=>Math.abs(e.getBoundingClientRect().height-s.height)<=1),
 };
}
