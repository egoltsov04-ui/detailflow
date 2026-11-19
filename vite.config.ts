import { defineConfig } from 'vite'
import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync} from 'node:fs'
import react from '@vitejs/plugin-react'
import {execSync} from 'node:child_process'

// Shown in the site footer and the profile menu: build date and commit, filled in automatically on every build.
const commit=(()=>{try{return execSync('git rev-parse --short HEAD',{stdio:['ignore','pipe','ignore']}).toString().trim()}catch{return ''}})()
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv'}).format(new Date()).replaceAll('-','.')
const appVersion=commit?`${day} · ${commit}`:day
const deployEnv=process.env.DEPLOYMENT_ENV||(process.env.VERCEL_ENV==='preview'?'staging':'')

export default defineConfig({ define:{__APP_VERSION__:JSON.stringify(appVersion),__DEPLOY_ENV__:JSON.stringify(deployEnv)}, plugins: [react(),{name:'version-service-worker',writeBundle(options,bundle){const hash=createHash('sha256').update(Object.keys(bundle).sort().join('|')).digest('hex').slice(0,16);const path=(options.dir||'dist')+'/sw.js';writeFileSync(path,readFileSync(path,'utf8').replace('__BUILD_ID__',hash))}}] })
