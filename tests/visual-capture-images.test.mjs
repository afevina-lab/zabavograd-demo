import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeCaptureImage} from '../scripts/visual-capture-images.mjs';
const valid=()=>({isConnected:true,complete:true,currentSrc:'http://capture.local/image.webp',src:'http://capture.local/image.webp',naturalWidth:100,decode:async()=>{}});
test('visible capture image must decode successfully',async()=>{assert.equal(await decodeCaptureImage(valid()),true)});
test('pending image is retried instead of accepted',async()=>{assert.equal(await decodeCaptureImage({...valid(),complete:false}),false)});
test('image source changed while decoding is retried',async()=>{const image=valid();image.decode=async()=>{image.src=image.currentSrc='http://capture.local/replacement.webp';throw Error('EncodingError')};assert.equal(await decodeCaptureImage(image),false)});
test('unchanged corrupt visible image remains a hard failure with its URL',async()=>{await assert.rejects(decodeCaptureImage({...valid(),decode:async()=>{throw Error('EncodingError')}}),/Visible image decode failed: http:\/\/capture.local\/image.webp/)});

test('changed requested URL is retried even before currentSrc updates',async()=>{const image=valid();image.decode=async()=>{image.src='http://capture.local/replacement.webp';throw Error('EncodingError')};assert.equal(await decodeCaptureImage(image),false)});
