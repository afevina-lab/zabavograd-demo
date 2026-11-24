/** A source replaced during React commit must be retried, not accepted or reported as corrupt. */
export async function decodeCaptureImage(image){
 if(!image.isConnected||!image.complete)return false;
 const requested=image.src,source=image.currentSrc||image.src;
 if(!image.naturalWidth)throw Error('Visible image did not load: '+source);
 try{await image.decode()}catch(error){
  if(!image.isConnected||image.src!==requested||(image.currentSrc||image.src)!==source)return false;
  throw Error('Visible image decode failed: '+source+'; '+String(error));
 }
 return image.isConnected&&image.src===requested&&(image.currentSrc||image.src)===source;
}
