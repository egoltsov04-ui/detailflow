import StudioRecommendations,{type RecommendationFeed} from '../StudioRecommendations'
const preview:RecommendationFeed={readiness:{completed_orders:48,history_days:120,generated_at:'2026-10-04T09:00:00Z',method:'studio-rules-v1'},recommendations:[
 {id:'repeat',kind:'return',evidence:{client:'Тестовий клієнт',visits:4,typical_days:30,days_since:52},vote:'none',feedback_count:0,priority:75},
 {id:'timing',kind:'timing',evidence:{service:'Полірування · XL',samples:8,planned:120,actual:158},vote:'none',feedback_count:6,priority:68},
 {id:'upsell',kind:'upsell',evidence:{client:'Тестовий клієнт',base_service:'Мийка',service:'Захисне покриття',together:7,base_orders:18},vote:'none',feedback_count:0,priority:40}
]}
export default function RecommendationsPreview(){return <section className="content"><p>QA · Синтетичні дані · оцінки лише в пам’яті</p><StudioRecommendations preview={preview}/></section>}
