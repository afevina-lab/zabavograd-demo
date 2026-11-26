/** Capture-only bootstrap: use the application's exact fonts before its first layout. */
export function withReadyFonts(html){
 const module=/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/;
 if(!module.test(html))throw Error('Capture HTML has no external module entry');
 return html.replace(module,(_tag,src)=>`<script type="module">
await Promise.all([['Akt','Akt.ttf',{weight:'100 900'}],['Londrina','Londrina.ttf',{}]].map(async([name,file,descriptors])=>{
 const font=new FontFace(name,'url("'+new URL('assets/fonts/'+file,location.origin+'/').href+'")',descriptors);
 await font.load();document.fonts.add(font);
}));
await import(${JSON.stringify(src).replaceAll('<','\\u003c')});
</script>`);
}
