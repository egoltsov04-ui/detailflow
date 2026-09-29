import { defineConfig } from 'vite'
import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync} from 'node:fs'
import react from '@vitejs/plugin-react'

export default defineConfig({ plugins: [react(),{name:'version-service-worker',writeBundle(options,bundle){const hash=createHash('sha256').update(Object.keys(bundle).sort().join('|')).digest('hex').slice(0,16);const path=(options.dir||'dist')+'/sw.js';writeFileSync(path,readFileSync(path,'utf8').replace('__BUILD_ID__',hash))}}] })
