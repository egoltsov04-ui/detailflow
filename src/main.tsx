import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { Dialogs, ErrorBoundary, ModalAccessibility } from './components/Dialogs'
import './ux-polish.css'
import { entryRoute } from './lib/entryRoute'

const LandingPage = lazy(() => import('./LandingPage'))
const App = lazy(() => import('./App'))
const isLanding = entryRoute(window.location.pathname, window.location.search, window.location.hash) === 'landing'

const Preview=import.meta.env.DEV&&window.location.pathname==='/__qa'?lazy(()=>import('./dev/ServicePreview')):null
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><Suspense fallback={<main className="access-portal">Завантаження Detailflow…</main>}>{Preview?<Preview/>:isLanding?<LandingPage/>:<App/>}</Suspense><Dialogs/><ModalAccessibility/></ErrorBoundary></StrictMode>)
