import {defineConfig} from 'vite';
/** Real games and component lab now share the single replacement stylesheet tree. */
export default defineConfig({build:{outDir:'dist-visual',rollupOptions:{input:{game:'index.html',lab:'visual-lab.html',replacement:'visual-game.html'}}}});
