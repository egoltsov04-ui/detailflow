// Build stamp and environment, injected by vite.config.ts. Outside a Vite build (unit tests) they are absent.
export const appVersion=typeof __APP_VERSION__!=='undefined'?__APP_VERSION__:'dev'
const env=typeof __DEPLOY_ENV__!=='undefined'?__DEPLOY_ENV__:''
/** Staging is told apart by the build setting or by its address, so a forgotten setting still shows the badge. */
export const isStaging=()=>env==='staging'||(typeof location!=='undefined'&&/^staging\./.test(location.hostname))
