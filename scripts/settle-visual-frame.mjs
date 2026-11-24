/** Accept a frame only after it stays unchanged for a real quiet period. */
export async function captureStableFrame({capture,now=Date.now,sleep,quietMs=1000,pollMs=150,timeoutMs=6000}){
 const start=now();let previous,changedAt=start;
 while(now()-start<=timeoutMs){
  const frame=await capture(),at=now();
  if(frame!==previous){previous=frame;changedAt=at}
  if(at-changedAt>=quietMs)return frame;
  await sleep(pollMs);
 }
 throw Error('Visual capture never settled within '+timeoutMs+'ms');
}
