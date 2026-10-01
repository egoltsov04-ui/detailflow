import {mkdirSync,existsSync,writeFileSync} from 'node:fs'
import webpush from 'web-push'
const file='.tooling/push-production.env'
mkdirSync('.tooling',{recursive:true})
if(existsSync(file))console.log('Existing keys preserved in '+file)
else {
 const keys=webpush.generateVAPIDKeys()
 writeFileSync(file,`VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=https://detailflow-xi.vercel.app\n`,{flag:'wx',mode:0o600})
 console.log('Created '+file+' (ignored by Git). Do not share the private key in chat.')
}
