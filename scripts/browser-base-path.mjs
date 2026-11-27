// Local HTTP probes exercise the actual public-base build, without changing assets.
const mount=process.env.UI_BASE_PATH||'/';
if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(mount))throw Error('Invalid UI_BASE_PATH');
export function probePath(url){
 const pathname=decodeURIComponent(new URL(url,'http://localhost').pathname);
 if(!pathname.startsWith(mount))return null;
 return '/'+pathname.slice(mount.length);
}
export function probeOrigin(port){return 'http://127.0.0.1:'+port+mount;}
