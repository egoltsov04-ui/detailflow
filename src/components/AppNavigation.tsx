import {LayoutDashboard,ClipboardList,Users,WalletCards,Package,CarFront,BarChart3,Settings,Menu} from 'lucide-react'
import {t} from '../i18n/core'
import {sectionFor} from '../lib/navigation'
export const mainNavigation = [['Огляд', LayoutDashboard], ['Роботи', ClipboardList], ['Клієнти', Users], ['Фінанси', WalletCards], ['Склад', Package], ['Команда', CarFront], ['Аналітика', BarChart3], ['Налаштування', Settings]] as const
export function OwnerBottomNavigation({page,financeAccess,moreOpen,onMore,onNavigate}:{page:string;financeAccess:boolean;moreOpen:boolean;onMore:()=>void;onNavigate:(page:string)=>void}){
 return <nav className="owner-bottom-nav" aria-label={t('Основна навігація')}>{mainNavigation.slice(0,4).filter(([label])=>financeAccess||label!=='Фінанси').map(([label,Icon])=><button key={label} aria-current={sectionFor(page)===sectionFor(label)?'page':undefined} onClick={()=>onNavigate(label)}><Icon size={21}/><span>{t(label)}</span></button>)}<button aria-current={!['overview','work','clients','finance'].includes(sectionFor(page))?'page':undefined} aria-expanded={moreOpen} onClick={onMore}><Menu size={21}/><span>{t('Ще')}</span></button></nav>
}
