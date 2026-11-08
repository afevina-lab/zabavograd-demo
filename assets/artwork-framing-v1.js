/* Zabavograd: artwork-aware scaling for published memory cards.
   Preserves the original WebP files and editorial SVG bounds. */
(() => {
  'use strict';
  const cache = new Map();
  const SOURCE = 'zbArtworkSource';
  const STATE = 'zbArtworkState';

  function findBounds(image) {
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height) return null;
    const scale = Math.min(1, 256 / Math.max(width, height));
    const sw = Math.max(1, Math.round(width * scale));
    const sh = Math.max(1, Math.round(height * scale));
    const preview = document.createElement('canvas');
    preview.width = sw; preview.height = sh;
    const ctx = preview.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, sw, sh);
    const pixels = ctx.getImageData(0, 0, sw, sh).data;
    const at = (x, y) => {
      const i = (y * sw + x) * 4;
      return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
    };
    const corners = [at(0, 0), at(sw - 1, 0), at(0, sh - 1), at(sw - 1, sh - 1)];
    const transparent = corners.filter(p => p[3] < 48).length >= 3;
    const base = [0, 1, 2].map(c => Math.round(corners.reduce((n, p) => n + p[c], 0) / 4));
    const cornerDistance = p => Math.hypot(p[0] - base[0], p[1] - base[1], p[2] - base[2]);
    const uniform = corners.every(p => p[3] > 245 && cornerDistance(p) < 30);
    const bright = base[0] > 196 && base[1] > 190 && base[2] > 185;
    // Complex artwork or patterned background: never guess its crop.
    if (!transparent && (!uniform || !bright)) return null;

    let minX = sw, minY = sh, maxX = -1, maxY = -1, count = 0;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4, alpha = pixels[i + 3];
      const foreground = transparent ? alpha > 42 :
        alpha > 80 && Math.hypot(pixels[i] - base[0], pixels[i + 1] - base[1], pixels[i + 2] - base[2]) > 37;
      if (!foreground) continue;
      count++;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (count < sw * sh * .003 || count > sw * sh * .9 || maxX < minX) return null;
    const pad = Math.max(3, Math.round(Math.max(maxX - minX + 1, maxY - minY + 1) * .075));
    const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
    const right = Math.min(sw, maxX + pad + 1), bottom = Math.min(sh, maxY + pad + 1);
    if ((right - left) / sw > .97 && (bottom - top) / sh > .97) return null;
    const x = Math.round(left / scale), y = Math.round(top / scale);
    return {
      x, y, width: Math.min(width - x, Math.ceil((right - left) / scale)),
      height: Math.min(height - y, Math.ceil((bottom - top) / scale))
    };
  }

  function croppedSource(src) {
    if (cache.has(src)) return cache.get(src);
    const promise = new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        let bounds = null;
        try { bounds = findBounds(image); } catch (_) {}
        if (!bounds) { resolve(null); return; }
        try {
          const canvas = document.createElement('canvas');
          canvas.width = bounds.width; canvas.height = bounds.height;
          const context = canvas.getContext('2d');
          if (!context) { resolve(null); return; }
          context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height,
            0, 0, bounds.width, bounds.height);
          canvas.toBlob(blob => {
            resolve(blob ? URL.createObjectURL(blob) : null);
          }, 'image/webp', .95);
        } catch (_) { resolve(null); }
      };
      image.onerror = () => resolve(null);
      image.src = src;
    });
    cache.set(src, promise);
    return promise;
  }

  function frame(img) {
    const src = img.currentSrc || img.src;
    if (!src || src.startsWith('blob:') || src.startsWith('data:')) return;
    if (img.dataset[SOURCE] === src) return;
    img.dataset[SOURCE] = src;
    img.dataset[STATE] = 'pending';
    void croppedSource(src).then(framed => {
      if (!img.isConnected || img.dataset[SOURCE] !== src) return;
      img.dataset[STATE] = framed ? 'complete' : 'fallback';
      if (framed) img.src = framed;
    }).catch(() => { if (img.dataset[SOURCE] === src) img.dataset[STATE] = 'fallback'; });
  }

  function scan() {
    document.querySelectorAll('.picture-face img').forEach(frame);
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; scan(); });
  }
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList' || (record.type === 'attributes' && record.attributeName === 'src')) {
        schedule(); return;
      }
    }
  });
  observer.observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, attributeFilter: ['src']
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else schedule();
})();
