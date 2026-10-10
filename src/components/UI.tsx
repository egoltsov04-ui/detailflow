import {createElement,type ComponentPropsWithoutRef,type ElementType,type ReactNode} from 'react'
import {t} from '../i18n/core'
import './ui.css'
type BoxProps<T extends ElementType>={as?:T;children?:ReactNode;className?:string}&Omit<ComponentPropsWithoutRef<T>,'as'>
function box<T extends ElementType>(fallback:ElementType,base:string,{as,className='',...props}:BoxProps<T>){return createElement(as||fallback,{...props,className:base+' '+className})}
export function Card<T extends ElementType='section'>(props:BoxProps<T>){return box('section','ui-card',props)}
export function PageHeader<T extends ElementType='div'>(props:BoxProps<T>){return box('div','ui-page-header',props)}
export function FormField(props:ComponentPropsWithoutRef<'label'>){return <label {...props} className={'ui-field '+(props.className||'')}/>}
export function Tabs(props:ComponentPropsWithoutRef<'nav'>){return <nav {...props} className={'ui-tabs '+(props.className||'')}/>}
export function Modal<T extends ElementType='div'>(props:BoxProps<T>){return box('div','ui-modal',props)}
export function Drawer({title,close,children,className=''}:{title:string;close:()=>void;children:ReactNode;className?:string}){return <div className="overlay ui-drawer-overlay"><Modal className={'modal ui-drawer '+className} role="dialog" aria-modal="true" aria-label={title}><button className="modal-close" type="button" onClick={close} aria-label={t('Закрити')}>×</button>{children}</Modal></div>}
export type TableColumn<T>={key:string;label:string;render:(row:T)=>ReactNode}
export function Table<T>({rows,columns,rowKey,empty='Немає даних'}:{rows:T[];columns:TableColumn<T>[];rowKey:(row:T)=>string;empty?:string}){return <div className="ui-table-wrap"><table className="ui-table"><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={rowKey(row)}>{columns.map(c=><td key={c.key} data-label={c.label}><div className="ui-table-value">{c.render(row)}</div></td>)}</tr>)}</tbody></table>{!rows.length&&<p className="ui-empty">{t(empty)}</p>}</div>}
