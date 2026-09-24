import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import './select.css'

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size' | 'value' | 'defaultValue'> & { value?: string | number; defaultValue?: string | number }
type Option = { value: string; label: string; disabled: boolean }
function optionsFrom(children: ReactNode, disabled = false): Option[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) return []
    const p = child.props
    if (child.type === 'option') { const label = Children.toArray(p.children).join(''); return [{ value: String(p.value ?? label), label, disabled: disabled || !!p.disabled }] }
    return optionsFrom(p.children, disabled || !!p.disabled)
  })
}

/** A native form value with a themed, keyboard-accessible popup. */
export function Select({ children, value, defaultValue, onChange, disabled, className = '', id, 'aria-label': ariaLabel, ...props }: Props) {
  const uid = useId(), root = useRef<HTMLSpanElement>(null), native = useRef<HTMLSelectElement>(null), trigger = useRef<HTMLButtonElement>(null), popup = useRef<HTMLDivElement>(null)
  const options = optionsFrom(children)
  const [internal, setInternal] = useState(String(defaultValue ?? options[0]?.value ?? ''))
  const selectedValue = String(value ?? internal), selected = options.find(o => o.value === selectedValue)
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [active, setActive] = useState(''), [label, setLabel] = useState(ariaLabel || ''), [invalid, setInvalid] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 240, maxHeight: 320 })
  const filtered = options.filter(o => o.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const available = filtered.filter(o => !o.disabled)
  useLayoutEffect(() => { setLabel(ariaLabel || Array.from(root.current?.closest('label')?.childNodes || []).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim() || 'Оберіть значення') }, [ariaLabel])
  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const rect = trigger.current!.getBoundingClientRect(), below = window.innerHeight - rect.bottom - 12, above = rect.top - 12
      const maxHeight = Math.min(360, Math.max(100, below >= 240 || below >= above ? below : above))
      const width = Math.min(Math.max(240, rect.width), window.innerWidth - 16)
      setPosition({ width, maxHeight, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: below >= 240 || below >= above ? rect.bottom + 6 : Math.max(8, rect.top - Math.min(popup.current?.scrollHeight || maxHeight, maxHeight) - 6) })
    }
    place(); const observer = new ResizeObserver(place); observer.observe(trigger.current!); if (popup.current) observer.observe(popup.current)
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true)
    return () => { observer.disconnect(); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, query])
  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node) && !popup.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  useEffect(() => { if (open) popup.current?.querySelector('[data-active=true]')?.scrollIntoView({ block: 'nearest' }) }, [active, open])
  useEffect(() => { if (disabled) setOpen(false) }, [disabled])
  function show() { setQuery(''); setActive(selected && !selected.disabled ? selected.value : options.find(o => !o.disabled)?.value || ''); setOpen(true) }
  function choose(option: Option) {
    if (option.disabled || !native.current) return
    setInternal(option.value); setInvalid(false)
    native.current.value = option.value
    native.current.dispatchEvent(new Event('change', { bubbles: true }))
    setOpen(false); trigger.current?.focus()
  }
  function keys(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); trigger.current?.focus(); return }
    if (e.key === 'Tab') { setOpen(false); if (e.target !== trigger.current) trigger.current?.focus(); return }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); e.stopPropagation()
      if (!open) { show(); return }
      const index = available.findIndex(o => o.value === active)
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? available.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + available.length) % available.length
      setActive(available[next]?.value || '')
    } else if (e.key === 'Enter' || (e.key === ' ' && e.target === trigger.current)) {
      e.preventDefault(); e.stopPropagation()
      if (!open) show(); else { const option = available.find(o => o.value === active); if (option) choose(option) }
    } else if (open && e.target === trigger.current && e.key.length === 1) {
      const option = available.find(o => o.label.toLocaleLowerCase().startsWith(e.key.toLocaleLowerCase())); if (option) setActive(option.value)
    }
  }
  return <span className={`select-control ${className}`} ref={root}>
    <button ref={trigger} id={id} type="button" className="select-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" aria-controls={`${uid}-list`} aria-activedescendant={open ? `${uid}-${options.findIndex(o => o.value === active)}` : undefined} aria-required={props.required} aria-invalid={invalid || undefined} disabled={disabled} onClick={() => open ? setOpen(false) : show()} onKeyDown={keys}><span>{selected?.label || 'Оберіть значення'}</span><ChevronDown size={16}/></button>
    <select {...props} className="select-native" ref={native} aria-hidden="true" tabIndex={-1} disabled={disabled} value={selectedValue} onChange={e => { setInternal(e.target.value); onChange?.(e) }} onInvalid={e => { e.preventDefault(); setInvalid(true); trigger.current?.focus(); show() }}>{children}</select>
    {invalid && <small className="field-error">Оберіть значення зі списку.</small>}
    {open && createPortal(<div className="select-popover" ref={popup} style={position} onKeyDown={keys}>
      {options.length > 6 && <div className="select-search"><Search size={16}/><input aria-label={`Пошук: ${label}`} placeholder="Пошук…" value={query} onChange={e => { setQuery(e.target.value); setActive(options.find(o => !o.disabled && o.label.toLocaleLowerCase().includes(e.target.value.toLocaleLowerCase()))?.value || '') }} role="combobox" aria-expanded="true" aria-controls={`${uid}-list`} aria-activedescendant={`${uid}-${options.findIndex(o => o.value === active)}`}/></div>}
      <div id={`${uid}-list`} role="listbox" aria-label={label} className="select-options">
        {filtered.map(o => <div key={o.value} id={`${uid}-${options.indexOf(o)}`} role="option" aria-selected={o.value === selectedValue} aria-disabled={o.disabled || undefined} data-active={o.value === active} className="select-option" onPointerMove={() => !o.disabled && setActive(o.value)} onMouseDown={e => e.preventDefault()} onClick={() => choose(o)}><span>{o.label}</span>{o.value === selectedValue && <Check size={17}/>}</div>)}
        {!filtered.length && <p className="select-empty">Нічого не знайдено</p>}
      </div>
    </div>, document.body)}
  </span>
}
