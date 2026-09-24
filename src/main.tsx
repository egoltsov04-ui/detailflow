import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { Dialogs, ErrorBoundary, ModalAccessibility } from './components/Dialogs'
import './ux-polish.css'

const Preview=import.meta.env.DEV&&window.location.pathname==='/__qa'?lazy(()=>import('./dev/ServicePreview')):null
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary>{Preview?<Suspense fallback="Завантаження стенду…"><Preview/></Suspense>:<App/>}<Dialogs/><ModalAccessibility/></ErrorBoundary></StrictMode>)
