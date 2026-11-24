import React, { useMemo, useState } from 'react';
import { Search, Check, ChevronDown, ChevronRight, Lock, X } from 'lucide-react';
import { normalizeSearch, SPELL_SCHOOLS } from '../../data/dnd2024';
import type { SpellData } from '../../data/dnd2024';

// ---------------------------------------------------------------------------
// Básicos
// ---------------------------------------------------------------------------

export const SearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}> = ({ value, onChange, placeholder = 'Buscar…', autoFocus, className = '' }) => (
  <div className={`relative ${className}`}>
    <Search className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    <input
      type="search"
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="input pl-9 pr-8"
      aria-label={placeholder}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-fg-subtle hover:text-fg"
        aria-label="Limpar busca"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

export const CountBadge: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const done = value >= max;
  const over = value > max;
  return (
    <span className={`badge ${over ? 'badge-danger' : done ? 'badge-success' : 'badge-warning'}`}>
      {value}/{max}
    </span>
  );
};

export const Section: React.FC<{
  title: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, aside, children }) => (
  <section className="space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="section-title">{title}</h3>
        {description && <p className="text-[13px] text-fg-muted mt-0.5">{description}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
    {children}
  </section>
);

/** Botão de escolha (chip) usado em perícias, idiomas etc. */
export const ChoiceChip: React.FC<{
  selected: boolean;
  disabled?: boolean;
  locked?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}> = ({ selected, disabled, locked, onClick, children, title }) => (
  <button
    type="button"
    title={title}
    disabled={(disabled && !selected) || locked}
    onClick={onClick}
    aria-pressed={selected}
    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-[13px] transition-colors ${
      selected
        ? 'bg-accent-soft border-accent/40 text-accent font-medium'
        : 'bg-surface border-line text-fg hover:border-line-strong'
    } ${disabled && !selected ? 'opacity-40 cursor-not-allowed' : ''} ${locked ? 'cursor-default' : ''}`}
  >
    {locked ? <Lock className="w-3.5 h-3.5" /> : selected ? <Check className="w-3.5 h-3.5" /> : null}
    {children}
  </button>
);

/** Card selecionável (opções de equipamento, ordens, etc.). */
export const OptionCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
}> = ({ selected, onClick, title, subtitle, children, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    className={`w-full text-left rounded-lg border p-3.5 transition-colors ${
      selected ? 'border-accent bg-accent-soft/50 ring-1 ring-accent/30' : 'border-line bg-surface hover:border-line-strong'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
          selected ? 'border-accent bg-accent' : 'border-line-strong'
        }`}
      >
        {selected && <span className="w-1.5 h-1.5 rounded-full bg-accent-fg" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-fg">{title}</div>
        {subtitle && <div className="text-[13px] text-fg-muted mt-0.5">{subtitle}</div>}
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  </button>
);

// ---------------------------------------------------------------------------
// Lista mestre-detalhe com busca (classes, espécies, antecedentes)
// ---------------------------------------------------------------------------

export interface MasterItem {
  id: string;
  title: string;
  subtitle?: string;
  /** texto extra considerado na busca */
  keywords?: string;
}

export const MasterDetail: React.FC<{
  items: MasterItem[];
  selectedId?: string;
  renderDetail: (id: string) => React.ReactNode;
  searchPlaceholder?: string;
  emptyDetail?: React.ReactNode;
}> = ({ items, selectedId, renderDetail, searchPlaceholder, emptyDetail }) => {
  const [query, setQuery] = useState('');
  const [previewId, setPreviewId] = useState<string | undefined>(selectedId);
  const q = normalizeSearch(query.trim());
  const filtered = useMemo(
    () =>
      q
        ? items.filter((i) => normalizeSearch(`${i.title} ${i.subtitle || ''} ${i.keywords || ''}`).includes(q))
        : items,
    [items, q]
  );
  const shownId = previewId || selectedId;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 min-h-0">
      <div className="space-y-2 min-w-0">
        <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />
        <ul className="card divide-y divide-line max-h-[52vh] overflow-y-auto" role="listbox">
          {filtered.map((item) => {
            const isSelected = item.id === selectedId;
            const isShown = item.id === shownId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => setPreviewId(item.id)}
                  className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                    isShown ? 'bg-surface-2' : 'hover:bg-surface-2/60'
                  }`}
                >
                  <span className="min-w-0">
                    <span className={`block text-sm truncate ${isSelected ? 'font-semibold text-fg' : 'text-fg'}`}>
                      {item.title}
                    </span>
                    {item.subtitle && <span className="block text-xs text-fg-subtle truncate">{item.subtitle}</span>}
                  </span>
                  {isSelected ? (
                    <Check className="w-4 h-4 text-accent shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-fg-subtle">Nada encontrado.</li>}
        </ul>
      </div>
      <div className="min-w-0">{shownId ? renderDetail(shownId) : emptyDetail}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Magias
// ---------------------------------------------------------------------------

export const circleLabel = (level: number) => (level === 0 ? 'Truque' : `${level}º círculo`);

export const SpellMeta: React.FC<{ spell: SpellData }> = ({ spell }) => (
  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-[13px]">
    <div>
      <dt className="text-xs text-fg-subtle">Conjuração</dt>
      <dd className="text-fg">{spell.castingTime}{spell.ritual ? ' ou Ritual' : ''}</dd>
    </div>
    <div>
      <dt className="text-xs text-fg-subtle">Alcance</dt>
      <dd className="text-fg">{spell.range}</dd>
    </div>
    <div>
      <dt className="text-xs text-fg-subtle">Componentes</dt>
      <dd className="text-fg">{spell.components}</dd>
    </div>
    <div>
      <dt className="text-xs text-fg-subtle">Duração</dt>
      <dd className="text-fg">{spell.duration}</dd>
    </div>
  </dl>
);

export const SpellDescription: React.FC<{ spell: Pick<SpellData, 'description' | 'higherLevels' | 'level'> }> = ({ spell }) => (
  <div className="space-y-2 text-[13px] leading-relaxed text-fg-muted">
    <p className="whitespace-pre-line">{spell.description}</p>
    {spell.higherLevels && (
      <p>
        <span className="font-medium text-fg">{spell.level === 0 ? 'Aprimoramento de Truque. ' : 'Em círculos superiores. '}</span>
        {spell.higherLevels.replace(/^(Aprimoramento de Truque|Usando um Espaço de Magia de Círculo Superior)[:.]?\s*/i, '')}
      </p>
    )}
  </div>
);

const SCHOOL_OPTIONS = ['Todas', ...SPELL_SCHOOLS];

/**
 * Seletor de magias com busca, filtros por círculo/escola, descrição expansível e limite.
 */
export const SpellPicker: React.FC<{
  spells: SpellData[];
  selected: string[];
  onToggle: (id: string) => void;
  max?: number;
  /** magias concedidas: aparecem marcadas e travadas */
  locked?: Record<string, string>;
  emptyText?: string;
  /** mostrar filtro de círculo */
  showLevelFilter?: boolean;
}> = ({ spells, selected, onToggle, max, locked = {}, emptyText = 'Nenhuma magia disponível.', showLevelFilter = true }) => {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<number | 'all'>('all');
  const [school, setSchool] = useState('Todas');
  const [onlySelected, setOnlySelected] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const levels = useMemo(() => Array.from(new Set(spells.map((s) => s.level))).sort((a, b) => a - b), [spells]);
  const q = normalizeSearch(query.trim());
  const filtered = useMemo(
    () =>
      spells
        .filter((s) => (level === 'all' ? true : s.level === level))
        .filter((s) => (school === 'Todas' ? true : s.school === school))
        .filter((s) => (onlySelected ? selected.includes(s.id) || Boolean(locked[s.id]) : true))
        .filter((s) => (q ? normalizeSearch(`${s.name} ${s.nameEn}`).includes(q) : true))
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'pt-BR')),
    [spells, level, school, onlySelected, q, selected, locked]
  );
  const atMax = typeof max === 'number' && selected.length >= max;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar magia (português ou inglês)" className="flex-1" />
        <select value={school} onChange={(e) => setSchool(e.target.value)} className="input sm:w-44" aria-label="Escola">
          {SCHOOL_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'Todas' ? 'Todas as escolas' : s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {showLevelFilter && levels.length > 1 && (
          <div className="segmented overflow-x-auto max-w-full">
            <button type="button" onClick={() => setLevel('all')} className={`segmented-item ${level === 'all' ? 'segmented-item-active' : ''}`}>
              Todos
            </button>
            {levels.map((l) => (
              <button key={l} type="button" onClick={() => setLevel(l)} className={`segmented-item ${level === l ? 'segmented-item-active' : ''}`}>
                {l === 0 ? 'Truques' : `${l}º`}
              </button>
            ))}
          </div>
        )}
        <label className="inline-flex items-center gap-2 text-[13px] text-fg-muted ml-auto">
          <input type="checkbox" className="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} />
          Só escolhidas
        </label>
      </div>

      <ul className="card divide-y divide-line max-h-[46vh] overflow-y-auto">
        {filtered.map((s) => {
          const isLocked = Boolean(locked[s.id]);
          const isSelected = isLocked || selected.includes(s.id);
          const isOpen = expanded === s.id;
          const disabled = !isSelected && atMax;
          return (
            <li key={s.id}>
              <div className={`flex items-center gap-3 px-3 py-2 ${isSelected ? 'bg-accent-soft/40' : ''}`}>
                <button
                  type="button"
                  disabled={isLocked || disabled}
                  onClick={() => onToggle(s.id)}
                  aria-pressed={isSelected}
                  aria-label={isSelected ? `Remover ${s.name}` : `Escolher ${s.name}`}
                  className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-accent border-accent text-accent-fg' : 'border-line-strong bg-surface hover:border-accent'
                  } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {isLocked ? <Lock className="w-3 h-3" /> : isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="min-w-0">
                    <span className="text-sm text-fg">{s.name}</span>
                    <span className="text-xs text-fg-subtle ml-2 hidden sm:inline">{s.nameEn}</span>
                    {isLocked && <span className="block text-xs text-fg-subtle">Concedida por {locked[s.id]}</span>}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {s.concentration && <span className="badge" title="Concentração">C</span>}
                    {s.ritual && <span className="badge" title="Ritual">R</span>}
                    <span className="text-xs text-fg-subtle w-24 text-right hidden sm:inline">{s.school}</span>
                    <span className="text-xs text-fg-muted w-16 text-right">{circleLabel(s.level)}</span>
                    <ChevronDown className={`w-4 h-4 text-fg-subtle transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>
              </div>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 ml-8 space-y-3">
                  <SpellMeta spell={s} />
                  <SpellDescription spell={s} />
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-fg-subtle">{emptyText}</li>}
      </ul>
    </div>
  );
};

/** Lista de opções com busca (Invocações, Manobras, Metamagia, Talentos). */
export const OptionPicker: React.FC<{
  options: { id: string; name: string; description: string; prerequisite?: string; disabled?: boolean }[];
  selected: string[];
  onToggle: (id: string) => void;
  max?: number;
  single?: boolean;
}> = ({ options, selected, onToggle, max, single }) => {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const q = normalizeSearch(query.trim());
  const filtered = q ? options.filter((o) => normalizeSearch(`${o.name} ${o.description}`).includes(q)) : options;
  const atMax = !single && typeof max === 'number' && selected.length >= max;
  return (
    <div className="space-y-2">
      {options.length > 6 && <SearchInput value={query} onChange={setQuery} placeholder="Buscar opção" />}
      <ul className="card divide-y divide-line max-h-[40vh] overflow-y-auto">
        {filtered.map((o) => {
          const isSelected = selected.includes(o.id);
          const disabled = (!isSelected && atMax) || o.disabled;
          const isOpen = expanded === o.id || isSelected;
          return (
            <li key={o.id} className={isSelected ? 'bg-accent-soft/40' : ''}>
              <div className="flex items-start gap-3 px-3 py-2.5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(o.id)}
                  aria-pressed={isSelected}
                  className={`mt-0.5 w-5 h-5 ${single ? 'rounded-full' : 'rounded'} border flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-accent border-accent text-accent-fg' : 'border-line-strong bg-surface hover:border-accent'
                  } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  aria-label={o.name}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <button type="button" onClick={() => setExpanded(expanded === o.id ? null : o.id)} className="text-left w-full">
                    <span className="text-sm text-fg font-medium">{o.name}</span>
                    {o.prerequisite && <span className="text-xs text-fg-subtle ml-2">{o.prerequisite}</span>}
                  </button>
                  {isOpen && <p className="text-[13px] text-fg-muted leading-relaxed mt-1">{o.description}</p>}
                </div>
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-fg-subtle">Nada encontrado.</li>}
      </ul>
    </div>
  );
};

export const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="card px-3 py-2.5">
    <div className="text-xs text-fg-subtle">{label}</div>
    <div className="text-lg font-semibold text-fg tabular-nums leading-tight mt-0.5">{value}</div>
    {hint && <div className="text-xs text-fg-subtle mt-0.5">{hint}</div>}
  </div>
);

export const FeatureList: React.FC<{ features: { level: number; name: string; description: string; source?: string }[] }> = ({ features }) => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ul className="card divide-y divide-line">
      {features.map((f, idx) => (
        <li key={`${f.name}-${idx}`}>
          <button
            type="button"
            onClick={() => setOpen(open === idx ? null : idx)}
            className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-surface-2/60"
            aria-expanded={open === idx}
          >
            <span className="text-xs text-fg-subtle w-10 shrink-0 tabular-nums">Nv. {f.level}</span>
            <span className="flex-1 min-w-0 text-sm text-fg">{f.name}</span>
            {f.source && <span className="text-xs text-fg-subtle hidden sm:inline truncate max-w-[40%]">{f.source}</span>}
            <ChevronDown className={`w-4 h-4 text-fg-subtle shrink-0 transition-transform ${open === idx ? 'rotate-180' : ''}`} />
          </button>
          {open === idx && (
            <p className="px-3 pb-3 pl-[4.25rem] text-[13px] leading-relaxed text-fg-muted whitespace-pre-line">{f.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
};
