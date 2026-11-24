import {defineConfig} from 'vite';
export default defineConfig({build:{outDir:'dist-visual',rollupOptions:{input:{game:'index.html',lab:'visual-lab.html'}}}});
