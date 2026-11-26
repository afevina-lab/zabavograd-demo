/** Installed only in fresh CI capture pages, never in application bundles. */
export function installCaptureClock(){
 const nativeFrame=globalThis.requestAnimationFrame.bind(globalThis);
 const nativeClear=globalThis.clearInterval.bind(globalThis);
 const intervals=new Map();let nextId=-1,seed=17123;
 const clock={now:1000,advance(milliseconds){
  if(!Number.isFinite(milliseconds)||milliseconds<0)throw Error('Invalid capture clock advance');
  this.now+=milliseconds;
  for(const [id,timer] of [...intervals]){
   while(intervals.has(id)&&timer.next<=this.now){timer.next+=timer.delay;timer.callback(...timer.args)}
  }
 }};
 globalThis.__visualCaptureClock=clock;
 globalThis.setInterval=(callback,delay=0,...args)=>{
  if(typeof callback!=='function')throw Error('Capture intervals require a function');
  const id=nextId--,period=Math.max(1,Number(delay)||1);
  intervals.set(id,{callback,args,delay:period,next:clock.now+period});return id;
 };
 globalThis.clearInterval=id=>{if(intervals.has(id))intervals.delete(id);else if(id>=0)nativeClear(id)};
 globalThis.requestAnimationFrame=callback=>nativeFrame(()=>callback(clock.now));
 Date.now=()=>1795478400000+clock.now;
 Math.random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
 localStorage.clear();
}
