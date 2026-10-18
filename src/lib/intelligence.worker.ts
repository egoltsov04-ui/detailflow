import {customerForecast} from './studioIntelligence'
self.onmessage=event=>{try{self.postMessage({result:customerForecast(event.data)})}catch{self.postMessage({error:true})}}
