import React, { useMemo, useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import type {
  CalendarCustomTag,
  CalendarMonth,
  CalendarMoon,
  TimelineEvent,
  TimelineEventCategory,
  TimelineImportance,
} from '../../types/campaign';
import { MentionText, MentionTextarea } from '../common/MentionText';
import {
  Calendar,
  Moon,
  Plus,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  GripVertical,
  Link2,
  Settings2,
  Search,
  Lock,
  X,
  ArrowUp,
  ArrowDown,
  Sparkles,
  MapPin,
} from 'lucide-react';

const DEFAULT_TAGS: CalendarCustomTag[] = [
  { name: 'Batalha', color: '#ef4444' },
  { name: 'Política', color: '#f59e0b' },
  { name: 'Mágica', color: '#3b82f6' },
  { name: 'Marco do Grupo', color: '#10b981' },
  { name: 'Cataclismo', color: '#8b5cf6' },
  { name: 'Profecia', color: '#ec4899' },
  { name: 'Festival', color: '#06b6d4' },
];

const CATEGORY_LABELS: Record<TimelineEventCategory, string> = {
  session: 'Sessão de Jogo',
  historical: 'Histórico / Lore',
  intrigue: 'Intriga / Política',
  cataclysm: 'Cataclismo / Guerra',
  personal: 'Arco Pessoal',
  prophecy: 'Profecia / Presságio',
  festival: 'Festival / Data Cívica',
  custom: 'Personalizado',
};

const IMPORTANCE_META: Record<TimelineImportance, { label: string; dotSize: string; badge: string }> = {
  minor: { label: 'Menor', dotSize: 'w-2 h-2', badge: '' },
  normal: { label: 'Normal', dotSize: 'w-2.5 h-2.5', badge: '' },
  major: { label: 'Importante', dotSize: 'w-3 h-3', badge: 'badge-info' },
  epochal: { label: 'Marco Histórico', dotSize: 'w-3.5 h-3.5', badge: 'badge-accent' },
};

const CALENDAR_TEMPLATES: {
  id: string;
  label: string;
  description: string;
  weekdays: string[];
  seasons: string[];
  months: CalendarMonth[];
  moons: CalendarMoon[];
}[] = [
  {
    id: 'classic-4',
    label: 'Fantasia Clássico (4 meses · 120 dias)',
    description: 'Quatro meses sazonais de 30 dias e semana de 7 dias.',
    weekdays: ['Solis', 'Lunaris', 'Ferrum', 'Cineris', 'Vespera', 'Umbra', 'Sacrum'],
    seasons: ['Primavera', 'Verão', 'Outono', 'Inverno'],
    months: [
      { id: 'm1', name: 'Alvorada', days: 30, season: 'Primavera' },
      { id: 'm2', name: 'Solstício', days: 30, season: 'Verão' },
      { id: 'm3', name: 'Colheita', days: 30, season: 'Outono' },
      { id: 'm4', name: 'Bruma', days: 30, season: 'Inverno' },
    ],
    moons: [
      { id: 'moon-1', name: 'Lua Maior', cycleDays: 28, offset: 0, color: '#e2e8f0', lore: 'Ciclo lunar principal.' },
    ],
  },
  {
    id: 'solar-12',
    label: 'Solar Completo (12 meses · 365 dias)',
    description: 'Doze meses tradicionais com durações variadas e semana de 7 dias.',
    weekdays: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    seasons: ['Inverno', 'Primavera', 'Verão', 'Outono'],
    months: [
      { id: 'g1', name: 'Janeiro', days: 31, season: 'Verão' },
      { id: 'g2', name: 'Fevereiro', days: 28, season: 'Verão' },
      { id: 'g3', name: 'Março', days: 31, season: 'Outono' },
      { id: 'g4', name: 'Abril', days: 30, season: 'Outono' },
      { id: 'g5', name: 'Maio', days: 31, season: 'Outono' },
      { id: 'g6', name: 'Junho', days: 30, season: 'Inverno' },
      { id: 'g7', name: 'Julho', days: 31, season: 'Inverno' },
      { id: 'g8', name: 'Agosto', days: 31, season: 'Inverno' },
      { id: 'g9', name: 'Setembro', days: 30, season: 'Primavera' },
      { id: 'g10', name: 'Outubro', days: 31, season: 'Primavera' },
      { id: 'g11', name: 'Novembro', days: 30, season: 'Primavera' },
      { id: 'g12', name: 'Dezembro', days: 31, season: 'Verão' },
    ],
    moons: [
      { id: 'moon-g1', name: 'Selene', cycleDays: 29, offset: 4, color: '#f8fafc', lore: 'Ciclo sinódico padrão.' },
    ],
  },
  {
    id: 'tenday-12',
    label: 'Dezenas Arcanas (12 meses · semanas de 10 dias)',
    description: 'Inspirado em grandes reinos de fantasia: 3 dezenas por mês (360 dias) e duas luas.',
    weekdays: ['1º Dia', '2º Dia', '3º Dia', '4º Dia', '5º Dia', '6º Dia', '7º Dia', '8º Dia', '9º Dia', '10º Dia'],
    seasons: ['Degelo', 'Chamas', 'Folhas Caídas', 'Geada Profunda'],
    months: [
      { id: 't1', name: 'Martelo', days: 30, season: 'Geada Profunda' },
      { id: 't2', name: 'Garra da Bruma', days: 30, season: 'Geada Profunda' },
      { id: 't3', name: 'Retorno das Águas', days: 30, season: 'Degelo' },
      { id: 't4', name: 'Sementeira', days: 30, season: 'Degelo' },
      { id: 't5', name: 'Florada', days: 30, season: 'Degelo' },
      { id: 't6', name: 'Sol Alto', days: 30, season: 'Chamas' },
      { id: 't7', name: 'Chama Dourada', days: 30, season: 'Chamas' },
      { id: 't8', name: 'Âmbar Ardente', days: 30, season: 'Chamas' },
      { id: 't9', name: 'Folha Rubra', days: 30, season: 'Folhas Caídas' },
      { id: 't10', name: 'Ceifa Alta', days: 30, season: 'Folhas Caídas' },
      { id: 't11', name: 'Véu Cinzento', days: 30, season: 'Folhas Caídas' },
      { id: 't12', name: 'Noite Longa', days: 30, season: 'Geada Profunda' },
    ],
    moons: [
      { id: 'moon-t1', name: 'Dama Prateada', cycleDays: 30, offset: 0, color: '#e2e8f0', lore: 'Cheia na virada de cada mês.' },
      { id: 'moon-t2', name: 'Olho Carmesim', cycleDays: 72, offset: 15, color: '#f87171', lore: 'Lua errante associada a presságios arcanos.' },
    ],
  },
];

export const TimelineCalendarView: React.FC = () => {
  const calendar = useCampaignStore((s) => s.calendar);
  const timeline = useCampaignStore((s) => s.timeline);
  const entities = useCampaignStore((s) => s.entities);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const advanceCalendarDays = useCampaignStore((s) => s.advanceCalendarDays);
  const updateCalendarConfig = useCampaignStore((s) => s.updateCalendarConfig);
  const addTimelineEvent = useCampaignStore((s) => s.addTimelineEvent);
  const updateTimelineEvent = useCampaignStore((s) => s.updateTimelineEvent);
  const reorderTimelineEvents = useCampaignStore((s) => s.reorderTimelineEvents);
  const toggleRevealTimelineEvent = useCampaignStore((s) => s.toggleRevealTimelineEvent);
  const deleteTimelineEvent = useCampaignStore((s) => s.deleteTimelineEvent);
  const navigateToHandle = useCampaignStore((s) => s.navigateToHandle);

  // Navegação na grade mensal
  const [browseMonthIdx, setBrowseMonthIdx] = useState<number | null>(null);
  const [browseYear, setBrowseYear] = useState<number | null>(null);
  const [selectedGridDay, setSelectedGridDay] = useState<number | null>(null);
  const [customStepDays, setCustomStepDays] = useState<number>(3);

  // Filtros e modos da linha do tempo
  const [searchQuery, setSearchQuery] = useState('');
  const [eraFilter, setEraFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [importanceFilter, setImportanceFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'secret'>('all');
  const [sortMode, setSortMode] = useState<'chronological' | 'manual'>('chronological');
  const [groupByYear, setGroupByYear] = useState<boolean>(false);

  // Modal de Evento (Criar e Editar Completo)
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [evTitle, setEvTitle] = useState('');
  const [evCategory, setEvCategory] = useState<TimelineEventCategory>('session');
  const [evVisualTag, setEvVisualTag] = useState('Marco do Grupo');
  const [evColor, setEvColor] = useState('#10b981');
  const [evImportance, setEvImportance] = useState<TimelineImportance>('normal');
  const [evYear, setEvYear] = useState(calendar.currentYear);
  const [evMonth, setEvMonth] = useState(calendar.currentMonthIndex);
  const [evDay, setEvDay] = useState(calendar.currentDay);
  const [evEpoch, setEvEpoch] = useState(calendar.epochName);
  const [evHasEndDate, setEvHasEndDate] = useState(false);
  const [evEndYear, setEvEndYear] = useState(calendar.currentYear);
  const [evEndMonth, setEvEndMonth] = useState(calendar.currentMonthIndex);
  const [evEndDay, setEvEndDay] = useState(calendar.currentDay);
  const [evSessionNumber, setEvSessionNumber] = useState<string>('');
  const [evLocationHandle, setEvLocationHandle] = useState('');
  const [evLinkedHandles, setEvLinkedHandles] = useState<string[]>([]);
  const [evLinkInput, setEvLinkInput] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evGmSecretNote, setEvGmSecretNote] = useState('');
  const [evSecret, setEvSecret] = useState(false);

  // Modal do Construtor Completo do Calendário
  const [configOpen, setConfigOpen] = useState(false);
  const [configTab, setConfigTab] = useState<'general' | 'eras' | 'months' | 'weekdays' | 'moons'>('general');
  const [newEraInput, setNewEraInput] = useState('');
  const [newSeasonInput, setNewSeasonInput] = useState('');
  const [newWeekdayInput, setNewWeekdayInput] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#f59e0b');

  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

  const availableEras = useMemo(() => {
    const base = calendar.availableEras && calendar.availableEras.length > 0
      ? calendar.availableEras
      : ['Era Primordial', calendar.epochName];
    return base.includes(calendar.epochName) ? base : [...base, calendar.epochName];
  }, [calendar.availableEras, calendar.epochName]);

  const seasonsList = useMemo(() => {
    const base = calendar.customSeasons && calendar.customSeasons.length > 0
      ? calendar.customSeasons
      : ['Primavera', 'Verão', 'Outono', 'Inverno'];
    const fromMonths = calendar.months.map((m) => m.season).filter(Boolean);
    return Array.from(new Set([...base, ...fromMonths]));
  }, [calendar.customSeasons, calendar.months]);

  const allTags = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of DEFAULT_TAGS) map.set(t.name, t.color);
    for (const t of calendar.customTags || []) map.set(t.name, t.color);
    return Array.from(map.entries()).map(([name, color]) => ({ name, color }));
  }, [calendar.customTags]);

  const tagColorFor = (ev: TimelineEvent): string => {
    if (ev.color) return ev.color;
    const found = allTags.find((t) => t.name === ev.visualTag);
    if (found) return found.color;
    if (ev.category === 'cataclysm') return '#8b5cf6';
    if (ev.category === 'intrigue') return '#f59e0b';
    if (ev.category === 'session') return '#10b981';
    return '#ef4444';
  };

  const totalDaysPerYear = useMemo(
    () => calendar.months.reduce((sum, m) => sum + Math.max(1, m.days), 0),
    [calendar.months]
  );

  const absoluteDayFor = (year: number, monthIndex: number, day: number) => {
    const clampedMonth = Math.max(0, Math.min(calendar.months.length - 1, monthIndex));
    const daysBeforeMonth = calendar.months
      .slice(0, clampedMonth)
      .reduce((acc, m) => acc + Math.max(1, m.days), 0);
    return year * Math.max(1, totalDaysPerYear) + daysBeforeMonth + day;
  };

  const currentMonth = calendar.months[calendar.currentMonthIndex] || calendar.months[0];
  const currentAbsDay = absoluteDayFor(
    calendar.currentYear,
    calendar.currentMonthIndex,
    calendar.currentDay
  );
  const weekdayCount = Math.max(1, calendar.weekdays.length);
  const currentWeekday =
    calendar.weekdays[((currentAbsDay % weekdayCount) + weekdayCount) % weekdayCount] || 'Dia 1';

  const getMoonPhase = (cycleDays: number, offset: number, absDay = currentAbsDay) => {
    const cycle = Math.max(2, cycleDays);
    const dayInCycle = (((absDay + offset) % cycle) + cycle) % cycle;
    const ratio = dayInCycle / cycle;
    if (ratio < 0.08 || ratio >= 0.92) return { name: 'Lua nova', pct: 4, dayInCycle };
    if (ratio < 0.22) return { name: 'Crescente côncava', pct: 25, dayInCycle };
    if (ratio < 0.32) return { name: 'Quarto crescente', pct: 50, dayInCycle };
    if (ratio < 0.45) return { name: 'Crescente gibosa', pct: 75, dayInCycle };
    if (ratio < 0.58) return { name: 'Lua cheia', pct: 100, dayInCycle };
    if (ratio < 0.72) return { name: 'Minguante gibosa', pct: 75, dayInCycle };
    if (ratio < 0.82) return { name: 'Quarto minguante', pct: 50, dayInCycle };
    return { name: 'Minguante côncava', pct: 25, dayInCycle };
  };

  // Mês exibido na grade mensal
  const gridMonthIdx = browseMonthIdx ?? calendar.currentMonthIndex;
  const gridYear = browseYear ?? calendar.currentYear;
  const gridMonth = calendar.months[gridMonthIdx] || calendar.months[0];
  const firstDayAbs = absoluteDayFor(gridYear, gridMonthIdx, 1);
  const startWeekdayOffset = ((firstDayAbs % weekdayCount) + weekdayCount) % weekdayCount;

  const visibleEventsBase = useMemo(
    () => timeline.filter((ev) => viewRole === 'gm' || !ev.isSecret || ev.isRevealed),
    [timeline, viewRole]
  );

  const gridMonthEventsByDay = useMemo(() => {
    const map = new Map<number, TimelineEvent[]>();
    for (const ev of visibleEventsBase) {
      if (ev.epoch === calendar.epochName && ev.year === gridYear && ev.monthIndex === gridMonthIdx) {
        const list = map.get(ev.day) || [];
        list.push(ev);
        map.set(ev.day, list);
      }
    }
    return map;
  }, [visibleEventsBase, calendar.epochName, gridYear, gridMonthIdx]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = visibleEventsBase.filter((ev) => {
      if (eraFilter !== 'all' && ev.epoch !== eraFilter) return false;
      if (tagFilter !== 'all' && (ev.visualTag || '') !== tagFilter && ev.category !== tagFilter) {
        return false;
      }
      if (importanceFilter !== 'all' && (ev.importance || 'normal') !== importanceFilter) {
        return false;
      }
      if (viewRole === 'gm') {
        const hidden = ev.isSecret && !ev.isRevealed;
        if (visibilityFilter === 'public' && hidden) return false;
        if (visibilityFilter === 'secret' && !hidden) return false;
      }
      if (q) {
        const hay = [
          ev.title,
          ev.description,
          ev.visualTag || '',
          ev.epoch,
          ev.locationHandle || '',
          ...(ev.linkedWikiHandles || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortMode === 'chronological') {
      return [...list].sort((a, b) => {
        const eraIdxA = availableEras.indexOf(a.epoch);
        const eraIdxB = availableEras.indexOf(b.epoch);
        if (eraIdxA !== eraIdxB && eraIdxA !== -1 && eraIdxB !== -1) {
          return eraIdxA - eraIdxB;
        }
        return (
          absoluteDayFor(a.year, a.monthIndex, a.day) -
          absoluteDayFor(b.year, b.monthIndex, b.day)
        );
      });
    }
    return list;
  }, [
    visibleEventsBase,
    eraFilter,
    tagFilter,
    importanceFilter,
    viewRole,
    visibilityFilter,
    searchQuery,
    sortMode,
    availableEras,
  ]);

  const stepGridMonth = (delta: -1 | 1) => {
    let nextM = gridMonthIdx + delta;
    let nextY = gridYear;
    if (nextM >= calendar.months.length) {
      nextM = 0;
      nextY += 1;
    } else if (nextM < 0) {
      nextM = Math.max(0, calendar.months.length - 1);
      nextY -= 1;
    }
    setBrowseMonthIdx(nextM);
    setBrowseYear(nextY);
    setSelectedGridDay(null);
  };

  const openCreateEventModal = (preset?: { day: number; monthIndex: number; year: number }) => {
    setEditingEvent(null);
    setEvTitle('');
    setEvCategory('session');
    setEvVisualTag('Marco do Grupo');
    setEvColor('#10b981');
    setEvImportance('normal');
    setEvDay(preset?.day ?? calendar.currentDay);
    setEvMonth(preset?.monthIndex ?? calendar.currentMonthIndex);
    setEvYear(preset?.year ?? calendar.currentYear);
    setEvEpoch(calendar.epochName);
    setEvHasEndDate(false);
    setEvEndDay(preset?.day ?? calendar.currentDay);
    setEvEndMonth(preset?.monthIndex ?? calendar.currentMonthIndex);
    setEvEndYear(preset?.year ?? calendar.currentYear);
    setEvSessionNumber('');
    setEvLocationHandle('');
    setEvLinkedHandles([]);
    setEvLinkInput('');
    setEvDesc('');
    setEvGmSecretNote('');
    setEvSecret(false);
    setEventModalOpen(true);
  };

  const openEditEventModal = (ev: TimelineEvent) => {
    setEditingEvent(ev);
    setEvTitle(ev.title);
    setEvCategory((ev.category as TimelineEventCategory) || 'historical');
    setEvVisualTag(ev.visualTag || 'Marco do Grupo');
    setEvColor(tagColorFor(ev));
    setEvImportance(ev.importance || 'normal');
    setEvDay(ev.day);
    setEvMonth(ev.monthIndex);
    setEvYear(ev.year);
    setEvEpoch(ev.epoch || calendar.epochName);
    const hasEnd = ev.endYear !== undefined || ev.endMonthIndex !== undefined || ev.endDay !== undefined;
    setEvHasEndDate(hasEnd);
    setEvEndYear(ev.endYear ?? ev.year);
    setEvEndMonth(ev.endMonthIndex ?? ev.monthIndex);
    setEvEndDay(ev.endDay ?? ev.day);
    setEvSessionNumber(ev.sessionNumber !== undefined ? String(ev.sessionNumber) : '');
    setEvLocationHandle(ev.locationHandle || '');
    setEvLinkedHandles([...(ev.linkedWikiHandles || [])]);
    setEvLinkInput('');
    setEvDesc(ev.description);
    setEvGmSecretNote(ev.gmSecretNote || '');
    setEvSecret(ev.isSecret && !ev.isRevealed);
    setEventModalOpen(true);
  };

  const handleAddHandleChip = () => {
    const clean = evLinkInput.trim();
    if (!clean) return;
    if (!evLinkedHandles.includes(clean)) {
      setEvLinkedHandles((prev) => [...prev, clean]);
    }
    setEvLinkInput('');
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) return;

    const payload: Omit<TimelineEvent, 'id'> = {
      title: evTitle.trim(),
      category: evCategory,
      visualTag: evVisualTag.trim() || 'Marco do Grupo',
      color: evColor,
      importance: evImportance,
      day: Math.max(1, Number(evDay) || 1),
      monthIndex: Number(evMonth) || 0,
      year: Number(evYear) || 1,
      epoch: evEpoch || calendar.epochName,
      endDay: evHasEndDate ? Math.max(1, Number(evEndDay) || 1) : undefined,
      endMonthIndex: evHasEndDate ? Number(evEndMonth) || 0 : undefined,
      endYear: evHasEndDate ? Number(evEndYear) || 1 : undefined,
      sessionNumber: evSessionNumber.trim() ? Number(evSessionNumber) : undefined,
      locationHandle: evLocationHandle.trim() || undefined,
      linkedWikiHandles: evLinkedHandles,
      description: evDesc.trim(),
      gmSecretNote: evGmSecretNote.trim() || undefined,
      isSecret: evSecret,
      isRevealed: !evSecret,
    };

    if (editingEvent) {
      await updateTimelineEvent(editingEvent.id, payload);
    } else {
      await addTimelineEvent(payload);
    }
    setEventModalOpen(false);
    setEditingEvent(null);
  };

  const applyCalendarTemplate = (tplId: string) => {
    const tpl = CALENDAR_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    void updateCalendarConfig({
      weekdays: [...tpl.weekdays],
      customSeasons: [...tpl.seasons],
      months: tpl.months.map((m) => ({ ...m })),
      moons: tpl.moons.map((mn) => ({ ...mn })),
      currentMonthIndex: 0,
      currentDay: 1,
    });
    setBrowseMonthIdx(null);
    setBrowseYear(null);
  };

  const formatEventDate = (ev: TimelineEvent) => {
    const mName = calendar.months[ev.monthIndex]?.name || `Mês ${ev.monthIndex + 1}`;
    const startStr = `${ev.day} de ${mName}, Ano ${ev.year} (${ev.epoch})`;
    if (ev.endYear !== undefined) {
      const endM = calendar.months[ev.endMonthIndex ?? 0]?.name || `Mês ${(ev.endMonthIndex ?? 0) + 1}`;
      return `${startStr} → ${ev.endDay ?? 1} de ${endM}, Ano ${ev.endYear}`;
    }
    return startStr;
  };

  const renderEventCard = (ev: TimelineEvent) => {
    const color = tagColorFor(ev);
    const imp = IMPORTANCE_META[ev.importance || 'normal'] || IMPORTANCE_META.normal;
    const isHidden = ev.isSecret && !ev.isRevealed;

    return (
      <li
        key={ev.id}
        draggable={viewRole === 'gm' && sortMode === 'manual'}
        onDragStart={() => setDraggedEventId(ev.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          if (draggedEventId && sortMode === 'manual') {
            void reorderTimelineEvents(draggedEventId, ev.id);
            setDraggedEventId(null);
          }
        }}
        className="relative group"
      >
        <span
          className={`absolute -left-[30px] top-4 rounded-full border-2 border-surface ${imp.dotSize}`}
          style={{ backgroundColor: color, boxShadow: `0 0 0 1px ${color}` }}
          aria-hidden="true"
        />

        <div
          className="rounded-md border border-line bg-surface hover:border-line-strong transition-colors p-3.5 space-y-2"
          style={{ borderLeftWidth: '3px', borderLeftColor: color }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              {viewRole === 'gm' && sortMode === 'manual' && (
                <span title="Arraste para reordenar" className="-ml-1">
                  <GripVertical className="w-4 h-4 text-fg-subtle cursor-grab" />
                </span>
              )}
              <span className="text-xs text-fg-subtle tabular-nums">
                {formatEventDate(ev)}
              </span>
              {ev.visualTag && (
                <span
                  className="badge font-medium"
                  style={{ borderColor: `${color}55`, color }}
                >
                  {ev.visualTag}
                </span>
              )}
              <span className="badge text-fg-subtle">
                {CATEGORY_LABELS[ev.category as TimelineEventCategory] || ev.category}
              </span>
              {ev.importance && ev.importance !== 'normal' && (
                <span className={`badge ${imp.badge}`}>{imp.label}</span>
              )}
              {ev.sessionNumber !== undefined && (
                <span className="badge font-mono">Sessão #{ev.sessionNumber}</span>
              )}
              {viewRole === 'gm' && isHidden && (
                <span className="badge badge-warning">Oculto</span>
              )}
            </div>

            {viewRole === 'gm' && (
              <div className="flex items-center gap-0.5 -mr-1 -mt-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditEventModal(ev)}
                  className="btn btn-ghost btn-icon h-7 w-7"
                  title="Editar evento"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void toggleRevealTimelineEvent(ev.id)}
                  className="btn btn-ghost btn-icon h-7 w-7"
                  title={isHidden ? 'Revelar aos jogadores' : 'Ocultar dos jogadores'}
                >
                  {isHidden ? (
                    <EyeOff className="w-3.5 h-3.5 text-warning" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteTimelineEvent(ev.id)}
                  className="btn btn-danger-ghost btn-icon h-7 w-7"
                  title="Excluir evento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <h4 className="text-sm font-semibold text-fg">{ev.title}</h4>

          {ev.description && (
            <div className="text-sm text-fg-muted leading-relaxed">
              <MentionText text={ev.description} />
            </div>
          )}

          {viewRole === 'gm' && ev.gmSecretNote && (
            <div className="card-muted p-2.5 text-xs space-y-1">
              <div className="flex items-center gap-1 font-medium text-fg-muted">
                <Lock className="w-3 h-3" />
                <span>Segredo cronológico (apenas Mestre)</span>
              </div>
              <div className="text-fg leading-relaxed">
                <MentionText text={ev.gmSecretNote} />
              </div>
            </div>
          )}

          {(ev.locationHandle || (ev.linkedWikiHandles && ev.linkedWikiHandles.length > 0)) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {ev.locationHandle && (
                <button
                  type="button"
                  onClick={() => navigateToHandle(ev.locationHandle!)}
                  className="badge font-mono hover:border-line-strong hover:text-fg transition-colors inline-flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3 text-fg-subtle" />
                  {ev.locationHandle}
                </button>
              )}
              {ev.linkedWikiHandles && ev.linkedWikiHandles.length > 0 && (
                <>
                  <Link2 className="w-3.5 h-3.5 text-fg-subtle" aria-hidden="true" />
                  {ev.linkedWikiHandles.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => navigateToHandle(h)}
                      className="badge font-mono hover:border-line-strong hover:text-fg transition-colors"
                    >
                      {h}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-y-auto pb-6 items-start">
      {/* Coluna esquerda: Calendário Interativo, Grade Mensal e Luas */}
      <div className="lg:col-span-5 space-y-4">
        <section className="card">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="w-4 h-4 text-fg-subtle shrink-0" />
              <h2 className="section-title truncate">{calendar.calendarName}</h2>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {viewRole === 'gm' ? (
                <select
                  value={calendar.epochName}
                  onChange={(e) => void updateCalendarConfig({ epochName: e.target.value })}
                  className="input h-8 w-auto max-w-[160px] text-xs"
                  aria-label="Era atual"
                >
                  {availableEras.map((era) => (
                    <option key={era} value={era}>
                      {era}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="badge">{calendar.epochName}</span>
              )}

              {viewRole === 'gm' && (
                <button
                  type="button"
                  onClick={() => setConfigOpen(true)}
                  className="btn btn-secondary btn-sm"
                  title="Personalizar estrutura completa do calendário"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Personalizar</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Data atual em destaque */}
            <div className="card-muted px-4 py-4 text-center space-y-1">
              <div className="text-xs text-fg-muted">
                {currentWeekday} · {currentMonth?.season || 'Estação'}
              </div>
              <div className="text-xl font-semibold text-fg">
                Dia {calendar.currentDay} de {currentMonth?.name || 'Mês 1'}
              </div>
              <div className="text-[13px] text-fg-muted tabular-nums">
                Ano {calendar.currentYear} · {calendar.epochName} ({totalDaysPerYear} dias/ano)
              </div>
            </div>

            {/* Controles rápidos de tempo (Mestre) */}
            {viewRole === 'gm' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-6 gap-1.5">
                  {[-30, -7, -1, 1, 7, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => void advanceCalendarDays(d)}
                      className={`btn btn-sm px-0 font-mono tabular-nums ${
                        d === 1 ? 'btn-primary' : 'btn-secondary'
                      }`}
                    >
                      {d > 0 ? `+${d}d` : `${d}d`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={customStepDays}
                    onChange={(e) => setCustomStepDays(Number(e.target.value))}
                    className="input h-8 w-20 font-mono tabular-nums text-xs"
                    aria-label="Dias personalizados"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customStepDays !== 0) void advanceCalendarDays(customStepDays);
                    }}
                    className="btn btn-secondary btn-sm h-8"
                  >
                    Avançar/voltar dias
                  </button>
                  <div className="ml-auto flex items-center gap-1 text-xs text-fg-subtle">
                    <span>Ano:</span>
                    <input
                      type="number"
                      value={calendar.currentYear}
                      onChange={(e) =>
                        void updateCalendarConfig({ currentYear: Number(e.target.value) || 1 })
                      }
                      className="input h-8 w-20 font-mono tabular-nums text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Grade Mensal Interativa */}
            {gridMonth && (
              <div className="rounded-lg border border-line p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => stepGridMonth(-1)}
                    className="btn btn-ghost btn-icon h-7 w-7"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-fg">
                      {gridMonth.name} · Ano {gridYear}
                    </div>
                    <div className="text-[11px] text-fg-subtle">
                      {gridMonth.season} · {gridMonth.days} dias
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {(browseMonthIdx !== null || browseYear !== null) && (
                      <button
                        type="button"
                        onClick={() => {
                          setBrowseMonthIdx(null);
                          setBrowseYear(null);
                          setSelectedGridDay(null);
                        }}
                        className="btn btn-ghost btn-sm h-7 px-2 text-xs"
                      >
                        Hoje
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => stepGridMonth(1)}
                      className="btn btn-ghost btn-icon h-7 w-7"
                      title="Próximo mês"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  className="grid gap-1 text-center text-[10px] font-medium text-fg-subtle"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(10, weekdayCount)}, minmax(0, 1fr))`,
                  }}
                >
                  {calendar.weekdays.slice(0, 10).map((wd, idx) => (
                    <div key={`${wd}-${idx}`} className="truncate py-0.5" title={wd}>
                      {wd.slice(0, 3)}
                    </div>
                  ))}
                </div>

                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(10, weekdayCount)}, minmax(0, 1fr))`,
                  }}
                >
                  {weekdayCount <= 10 &&
                    Array.from({ length: startWeekdayOffset }).map((_, i) => (
                      <div key={`pad-${i}`} className="h-8" />
                    ))}

                  {Array.from({ length: Math.max(1, gridMonth.days) }).map((_, i) => {
                    const dayNum = i + 1;
                    const isCampaignToday =
                      gridYear === calendar.currentYear &&
                      gridMonthIdx === calendar.currentMonthIndex &&
                      dayNum === calendar.currentDay;
                    const isSelected = selectedGridDay === dayNum;
                    const dayEvents = gridMonthEventsByDay.get(dayNum) || [];

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() =>
                          setSelectedGridDay(isSelected ? null : dayNum)
                        }
                        className={`h-8 rounded-md text-xs tabular-nums flex flex-col items-center justify-center relative border transition-colors ${
                          isCampaignToday
                            ? 'bg-accent-soft border-accent text-fg font-semibold'
                            : isSelected
                            ? 'bg-surface-2 border-line-strong text-fg font-medium'
                            : 'border-transparent hover:bg-surface-2 text-fg-muted'
                        }`}
                      >
                        <span>{dayNum}</span>
                        {dayEvents.length > 0 && (
                          <span className="flex items-center gap-0.5 mt-0.5">
                            {dayEvents.slice(0, 3).map((ev) => (
                              <span
                                key={ev.id}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: tagColorFor(ev) }}
                              />
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedGridDay !== null && (
                  <div className="pt-2 border-t border-line space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-fg">
                        Dia {selectedGridDay} de {gridMonth.name}, Ano {gridYear}
                      </span>
                      {viewRole === 'gm' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              void updateCalendarConfig({
                                currentDay: selectedGridDay,
                                currentMonthIndex: gridMonthIdx,
                                currentYear: gridYear,
                              });
                              setBrowseMonthIdx(null);
                              setBrowseYear(null);
                            }}
                            className="btn btn-secondary btn-sm h-7 text-xs"
                          >
                            Definir como hoje
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openCreateEventModal({
                                day: selectedGridDay,
                                monthIndex: gridMonthIdx,
                                year: gridYear,
                              })
                            }
                            className="btn btn-primary btn-sm h-7 text-xs"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Evento</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {(gridMonthEventsByDay.get(selectedGridDay) || []).length > 0 ? (
                      <ul className="space-y-1">
                        {(gridMonthEventsByDay.get(selectedGridDay) || []).map((ev) => (
                          <li key={ev.id} className="flex items-center gap-1.5 text-fg-muted">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: tagColorFor(ev) }}
                            />
                            <span className="font-medium text-fg truncate">{ev.title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-fg-subtle">Nenhum evento registrado neste dia.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Ciclos lunares */}
        <section className="card">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-fg-subtle" />
              <h3 className="section-title">Luas e astros ({calendar.moons.length})</h3>
            </div>
            {viewRole === 'gm' && (
              <button
                type="button"
                onClick={() => {
                  setConfigTab('moons');
                  setConfigOpen(true);
                }}
                className="btn btn-ghost btn-sm h-7 text-xs"
              >
                Gerenciar luas
              </button>
            )}
          </div>

          {calendar.moons.length === 0 ? (
            <p className="p-4 text-[13px] text-fg-subtle">Nenhuma lua cadastrada.</p>
          ) : (
            <ul className="divide-y divide-line">
              {calendar.moons.map((moon) => {
                const phase = getMoonPhase(moon.cycleDays, moon.offset);
                return (
                  <li key={moon.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-line-strong shrink-0"
                          style={{ backgroundColor: moon.color }}
                        />
                        <span className="text-sm font-medium text-fg truncate">{moon.name}</span>
                        <span className="text-xs text-fg-subtle tabular-nums">
                          (ciclo {moon.cycleDays}d)
                        </span>
                      </div>
                      <span className="badge">{phase.name}</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${phase.pct}%`,
                          backgroundColor: moon.color || '#94a3b8',
                        }}
                      />
                    </div>
                    {moon.lore && <p className="text-xs text-fg-muted">{moon.lore}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Coluna direita: Linha do Tempo Altamente Personalizável */}
      <section className="lg:col-span-7 card">
        <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Cronologia ({filteredEvents.length})</h2>
            <p className="text-[13px] text-fg-muted">
              Marcos históricos, períodos, profecias e sessões com cores, importância e filtros.
            </p>
          </div>

          {viewRole === 'gm' && (
            <button
              type="button"
              onClick={() => openCreateEventModal()}
              className="btn btn-primary btn-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Novo evento</span>
            </button>
          )}
        </div>

        {/* Barra de busca, filtros e ordenação */}
        <div className="p-4 border-b border-line bg-surface-2/30 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar título, descrição, @NPC, #Local…"
                className="input h-8 pl-9 text-xs"
              />
            </div>

            <select
              value={eraFilter}
              onChange={(e) => setEraFilter(e.target.value)}
              className="input h-8 w-auto text-xs"
              aria-label="Filtrar era"
            >
              <option value="all">Todas as eras</option>
              {availableEras.map((era) => (
                <option key={era} value={era}>
                  {era}
                </option>
              ))}
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="input h-8 w-auto text-xs"
              aria-label="Filtrar etiqueta"
            >
              <option value="all">Todas as etiquetas</option>
              {allTags.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={importanceFilter}
              onChange={(e) => setImportanceFilter(e.target.value)}
              className="input h-8 w-auto text-xs"
              aria-label="Filtrar importância"
            >
              <option value="all">Qualquer importância</option>
              <option value="epochal">Marco Histórico</option>
              <option value="major">Importante</option>
              <option value="normal">Normal</option>
              <option value="minor">Menor</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="segmented">
                <button
                  type="button"
                  onClick={() => setSortMode('chronological')}
                  className={`segmented-item text-xs ${
                    sortMode === 'chronological' ? 'segmented-item-active' : ''
                  }`}
                >
                  Data cronológica
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode('manual')}
                  className={`segmented-item text-xs ${
                    sortMode === 'manual' ? 'segmented-item-active' : ''
                  }`}
                >
                  Ordem manual
                </button>
              </div>

              <label className="inline-flex items-center gap-1.5 text-xs text-fg-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={groupByYear}
                  onChange={(e) => setGroupByYear(e.target.checked)}
                />
                <span>Agrupar por Era / Ano</span>
              </label>
            </div>

            {viewRole === 'gm' && (
              <div className="segmented">
                {(['all', 'public', 'secret'] as const).map((vf) => (
                  <button
                    key={vf}
                    type="button"
                    onClick={() => setVisibilityFilter(vf)}
                    className={`segmented-item text-xs ${
                      visibilityFilter === vf ? 'segmented-item-active' : ''
                    }`}
                  >
                    {vf === 'all' ? 'Todos' : vf === 'public' ? 'Públicos' : 'Ocultos'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-fg">Nenhum evento encontrado</p>
              <p className="mt-1 text-[13px] text-fg-muted">
                {viewRole === 'gm'
                  ? 'Adicione marcos históricos, profecias ou acontecimentos das sessões.'
                  : 'Nenhum evento visível corresponde aos filtros atuais.'}
              </p>
              {viewRole === 'gm' && (
                <button
                  type="button"
                  onClick={() => openCreateEventModal()}
                  className="btn btn-secondary btn-sm mt-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar evento</span>
                </button>
              )}
            </div>
          ) : groupByYear ? (
            <div className="space-y-6">
              {Array.from(
                filteredEvents.reduce((acc, ev) => {
                  const key = `${ev.epoch} · Ano ${ev.year}`;
                  if (!acc.has(key)) acc.set(key, []);
                  acc.get(key)!.push(ev);
                  return acc;
                }, new Map<string, TimelineEvent[]>())
              ).map(([heading, group]) => (
                <div key={heading} className="space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle px-1">
                    {heading}
                  </div>
                  <ol className="relative ml-1.5 pl-6 border-l border-line space-y-3">
                    {group.map(renderEventCard)}
                  </ol>
                </div>
              ))}
            </div>
          ) : (
            <ol className="relative ml-1.5 pl-6 border-l border-line space-y-3">
              {filteredEvents.map(renderEventCard)}
            </ol>
          )}
        </div>
      </section>

      {/* Modal Completo de Criação / Edição de Evento */}
      {eventModalOpen && viewRole === 'gm' && (
        <div className="modal-backdrop">
          <form onSubmit={handleSaveEvent} className="modal max-w-2xl max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line shrink-0">
              <h3 className="section-title">
                {editingEvent ? `Editar "${editingEvent.title}"` : 'Novo evento cronológico'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEventModalOpen(false);
                  setEditingEvent(null);
                }}
                className="btn btn-ghost btn-sm btn-icon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Título do evento</label>
                  <input
                    type="text"
                    required
                    value={evTitle}
                    onChange={(e) => setEvTitle(e.target.value)}
                    placeholder="Ex.: Tratado das Três Coroas, Queda do Meteoro…"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Importância</label>
                  <select
                    value={evImportance}
                    onChange={(e) => setEvImportance(e.target.value as TimelineImportance)}
                    className="input"
                  >
                    <option value="minor">Menor</option>
                    <option value="normal">Normal</option>
                    <option value="major">Importante</option>
                    <option value="epochal">Marco Histórico</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Categoria</label>
                  <select
                    value={evCategory}
                    onChange={(e) => setEvCategory(e.target.value as TimelineEventCategory)}
                    className="input"
                  >
                    {(Object.keys(CATEGORY_LABELS) as TimelineEventCategory[]).map((k) => (
                      <option key={k} value={k}>
                        {CATEGORY_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Etiqueta (livre ou lista)</label>
                  <input
                    type="text"
                    list="timeline-custom-tags"
                    value={evVisualTag}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEvVisualTag(val);
                      const matched = allTags.find((t) => t.name.toLowerCase() === val.toLowerCase());
                      if (matched) setEvColor(matched.color);
                    }}
                    placeholder="Ex.: Batalha, Descoberta…"
                    className="input"
                  />
                  <datalist id="timeline-custom-tags">
                    {allTags.map((t) => (
                      <option key={t.name} value={t.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="label">Cor do marcador</label>
                  <div className="flex items-center gap-2 h-9">
                    <input
                      type="color"
                      value={evColor}
                      onChange={(e) => setEvColor(e.target.value)}
                      className="w-9 h-8 p-0 border border-line rounded cursor-pointer bg-transparent"
                    />
                    <span className="text-xs font-mono text-fg-muted">{evColor}</span>
                  </div>
                </div>
              </div>

              {/* Data inicial */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="label">Dia</label>
                  <input
                    type="number"
                    min={1}
                    max={calendar.months[evMonth]?.days || 100}
                    value={evDay}
                    onChange={(e) => setEvDay(Number(e.target.value))}
                    className="input tabular-nums"
                  />
                </div>
                <div>
                  <label className="label">Mês</label>
                  <select
                    value={evMonth}
                    onChange={(e) => setEvMonth(Number(e.target.value))}
                    className="input"
                  >
                    {calendar.months.map((m, idx) => (
                      <option key={m.id} value={idx}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Ano</label>
                  <input
                    type="number"
                    value={evYear}
                    onChange={(e) => setEvYear(Number(e.target.value))}
                    className="input tabular-nums"
                  />
                </div>
                <div>
                  <label className="label">Era</label>
                  <select
                    value={evEpoch}
                    onChange={(e) => setEvEpoch(e.target.value)}
                    className="input"
                  >
                    {availableEras.map((era) => (
                      <option key={era} value={era}>
                        {era}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Período opcional */}
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-fg cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={evHasEndDate}
                    onChange={(e) => setEvHasEndDate(e.target.checked)}
                  />
                  <span>Definir data de término (guerras, reinados, viagens ou períodos)</span>
                </label>

                {evHasEndDate && (
                  <div className="grid grid-cols-3 gap-3 card-muted p-3">
                    <div>
                      <label className="label">Dia final</label>
                      <input
                        type="number"
                        min={1}
                        value={evEndDay}
                        onChange={(e) => setEvEndDay(Number(e.target.value))}
                        className="input h-8 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="label">Mês final</label>
                      <select
                        value={evEndMonth}
                        onChange={(e) => setEvEndMonth(Number(e.target.value))}
                        className="input h-8"
                      >
                        {calendar.months.map((m, idx) => (
                          <option key={m.id} value={idx}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Ano final</label>
                      <input
                        type="number"
                        value={evEndYear}
                        onChange={(e) => setEvEndYear(Number(e.target.value))}
                        className="input h-8 tabular-nums"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sessão, Local e Múltiplos Vínculos do Códice */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Nº da sessão (opcional)</label>
                  <input
                    type="number"
                    min={0}
                    value={evSessionNumber}
                    onChange={(e) => setEvSessionNumber(e.target.value)}
                    placeholder="Ex.: 12"
                    className="input tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Local principal (opcional)</label>
                  <input
                    type="text"
                    list="timeline-entities-list"
                    value={evLocationHandle}
                    onChange={(e) => setEvLocationHandle(e.target.value)}
                    placeholder="Ex.: #CidadelaNorte"
                    className="input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label mb-0">Entradas vinculadas do códice (@NPCs, @Facções, #Itens…)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    list="timeline-entities-list"
                    value={evLinkInput}
                    onChange={(e) => setEvLinkInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddHandleChip();
                      }
                    }}
                    placeholder="Escolha ou digite @Handle / #Handle…"
                    className="input h-8 text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddHandleChip}
                    className="btn btn-secondary btn-sm h-8"
                  >
                    Vincular
                  </button>
                </div>
                <datalist id="timeline-entities-list">
                  {entities.map((ent) => (
                    <option key={ent.id} value={`${ent.mentionPrefix}${ent.handle}`}>
                      {ent.name}
                    </option>
                  ))}
                </datalist>
                {evLinkedHandles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {evLinkedHandles.map((h) => (
                      <span key={h} className="badge font-mono inline-flex items-center gap-1">
                        {h}
                        <button
                          type="button"
                          onClick={() =>
                            setEvLinkedHandles((prev) => prev.filter((x) => x !== h))
                          }
                          className="hover:text-danger"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Descrição pública</label>
                <MentionTextarea
                  rows={3}
                  value={evDesc}
                  onChange={setEvDesc}
                  placeholder="Descreva o acontecimento. Suporta @NPC e #Local."
                />
              </div>

              <div>
                <label className="label">Nota secreta do Mestre (nunca enviada aos jogadores)</label>
                <textarea
                  rows={2}
                  value={evGmSecretNote}
                  onChange={(e) => setEvGmSecretNote(e.target.value)}
                  placeholder="Verdade oculta por trás do evento, culpados reais, ganchos…"
                  className="input"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-fg cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={evSecret}
                  onChange={(e) => setEvSecret(e.target.checked)}
                  className="checkbox"
                />
                <span>Manter evento inteiro oculto dos jogadores</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-surface-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEventModalOpen(false);
                  setEditingEvent(null);
                }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {editingEvent ? 'Salvar alterações' : 'Registrar evento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Construtor Completo do Calendário */}
      {configOpen && viewRole === 'gm' && (
        <div className="modal-backdrop">
          <div className="modal max-w-3xl max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line shrink-0">
              <div>
                <h3 className="section-title">Personalizar Calendário e Etiquetas</h3>
                <p className="text-xs text-fg-subtle">
                  Configure nome, modelos, eras, meses, durações, dias da semana, luas e etiquetas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfigOpen(false)}
                className="btn btn-ghost btn-sm btn-icon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pt-2 border-b border-line shrink-0">
              <div className="tabs">
                {(
                  [
                    { id: 'general', label: 'Geral e Modelos' },
                    { id: 'months', label: `Meses (${calendar.months.length})` },
                    { id: 'weekdays', label: `Semana (${calendar.weekdays.length})` },
                    { id: 'eras', label: `Eras (${availableEras.length})` },
                    { id: 'moons', label: `Luas e Etiquetas` },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setConfigTab(t.id)}
                    className={`tab ${configTab === t.id ? 'tab-active' : ''}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {configTab === 'general' && (
                <div className="space-y-5">
                  <div>
                    <label className="label">Nome do calendário do mundo</label>
                    <input
                      type="text"
                      value={calendar.calendarName}
                      onChange={(e) =>
                        void updateCalendarConfig({ calendarName: e.target.value })
                      }
                      className="input"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="label">Estações do ano disponíveis</span>
                    <div className="flex flex-wrap gap-1.5">
                      {seasonsList.map((season) => (
                        <span key={season} className="badge inline-flex items-center gap-1">
                          {season}
                          {seasonsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                void updateCalendarConfig({
                                  customSeasons: seasonsList.filter((s) => s !== season),
                                })
                              }
                              className="hover:text-danger"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 max-w-sm">
                      <input
                        type="text"
                        value={newSeasonInput}
                        onChange={(e) => setNewSeasonInput(e.target.value)}
                        placeholder="Nova estação (ex.: Monções, Eclipse…)"
                        className="input h-8 text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const s = newSeasonInput.trim();
                          if (!s) return;
                          void updateCalendarConfig({
                            customSeasons: Array.from(new Set([...seasonsList, s])),
                          });
                          setNewSeasonInput('');
                        }}
                        className="btn btn-secondary btn-sm h-8"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="label flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      Modelos prontos de calendário
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {CALENDAR_TEMPLATES.map((tpl) => (
                        <div key={tpl.id} className="card p-3 flex flex-col justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold text-fg">{tpl.label}</div>
                            <p className="text-xs text-fg-muted mt-1">{tpl.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => applyCalendarTemplate(tpl.id)}
                            className="btn btn-secondary btn-sm w-full"
                          >
                            Aplicar modelo
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {configTab === 'months' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-fg-muted">
                      Total anual atual: <strong>{totalDaysPerYear} dias</strong> em {calendar.months.length} mês(es).
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void updateCalendarConfig({
                          months: [
                            ...calendar.months,
                            {
                              id: `m-${Date.now()}`,
                              name: `Mês ${calendar.months.length + 1}`,
                              days: 30,
                              season: seasonsList[0] || 'Primavera',
                            },
                          ],
                        })
                      }
                      className="btn btn-primary btn-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Novo mês</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {calendar.months.map((m, idx) => (
                      <div key={m.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 card p-2.5">
                        <span className="text-xs font-mono text-fg-subtle w-6 text-center">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) =>
                            void updateCalendarConfig({
                              months: calendar.months.map((item, i) =>
                                i === idx ? { ...item, name: e.target.value } : item
                              ),
                            })
                          }
                          className="input h-8 text-xs flex-1 min-w-[130px]"
                          aria-label="Nome do mês"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={120}
                            value={m.days}
                            onChange={(e) =>
                              void updateCalendarConfig({
                                months: calendar.months.map((item, i) =>
                                  i === idx
                                    ? { ...item, days: Math.max(1, Number(e.target.value) || 1) }
                                    : item
                                ),
                              })
                            }
                            className="input h-8 w-16 text-xs font-mono tabular-nums"
                          />
                          <span className="text-xs text-fg-subtle">dias</span>
                        </div>
                        <select
                          value={m.season}
                          onChange={(e) =>
                            void updateCalendarConfig({
                              months: calendar.months.map((item, i) =>
                                i === idx ? { ...item, season: e.target.value } : item
                              ),
                            })
                          }
                          className="input h-8 w-auto text-xs"
                        >
                          {seasonsList.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              const next = [...calendar.months];
                              [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                              void updateCalendarConfig({ months: next });
                            }}
                            className="btn btn-ghost btn-icon h-7 w-7"
                            title="Subir"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === calendar.months.length - 1}
                            onClick={() => {
                              const next = [...calendar.months];
                              [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                              void updateCalendarConfig({ months: next });
                            }}
                            className="btn btn-ghost btn-icon h-7 w-7"
                            title="Descer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          {calendar.months.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = calendar.months.filter((_, i) => i !== idx);
                                void updateCalendarConfig({
                                  months: next,
                                  currentMonthIndex: Math.min(
                                    calendar.currentMonthIndex,
                                    next.length - 1
                                  ),
                                });
                              }}
                              className="btn btn-danger-ghost btn-icon h-7 w-7"
                              title="Remover mês"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {configTab === 'weekdays' && (
                <div className="space-y-3">
                  <p className="text-xs text-fg-muted">
                    Defina quantos dias compõem uma semana no seu mundo (ex.: 5, 7 ou 10 dias).
                  </p>
                  <div className="space-y-2">
                    {calendar.weekdays.map((wd, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-fg-subtle w-6 text-center">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={wd}
                          onChange={(e) =>
                            void updateCalendarConfig({
                              weekdays: calendar.weekdays.map((w, i) =>
                                i === idx ? e.target.value : w
                              ),
                            })
                          }
                          className="input h-8 text-xs flex-1"
                        />
                        {calendar.weekdays.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              void updateCalendarConfig({
                                weekdays: calendar.weekdays.filter((_, i) => i !== idx),
                              })
                            }
                            className="btn btn-danger-ghost btn-icon h-8 w-8"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newWeekdayInput}
                      onChange={(e) => setNewWeekdayInput(e.target.value)}
                      placeholder="Novo dia da semana…"
                      className="input h-8 text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newWeekdayInput.trim()) return;
                        void updateCalendarConfig({
                          weekdays: [...calendar.weekdays, newWeekdayInput.trim()],
                        });
                        setNewWeekdayInput('');
                      }}
                      className="btn btn-secondary btn-sm h-8"
                    >
                      Adicionar dia
                    </button>
                  </div>
                </div>
              )}

              {configTab === 'eras' && (
                <div className="space-y-3">
                  <p className="text-xs text-fg-muted">
                    A ordem das eras abaixo define a sequência histórica na ordenação cronológica.
                  </p>
                  <div className="space-y-2">
                    {availableEras.map((era, idx) => (
                      <div key={`${era}-${idx}`} className="flex items-center gap-2 card p-2.5">
                        <span className="text-xs font-mono text-fg-subtle w-6 text-center">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={era}
                          onChange={(e) => {
                            const nextEras = availableEras.map((er, i) =>
                              i === idx ? e.target.value : er
                            );
                            void updateCalendarConfig({
                              availableEras: nextEras,
                              ...(calendar.epochName === era
                                ? { epochName: e.target.value }
                                : {}),
                            });
                          }}
                          className="input h-8 text-xs flex-1"
                        />
                        {calendar.epochName === era ? (
                          <span className="badge badge-success">Era atual</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void updateCalendarConfig({ epochName: era })}
                            className="btn btn-secondary btn-sm h-7 text-xs"
                          >
                            Tornar atual
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            const next = [...availableEras];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            void updateCalendarConfig({ availableEras: next });
                          }}
                          className="btn btn-ghost btn-icon h-7 w-7"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === availableEras.length - 1}
                          onClick={() => {
                            const next = [...availableEras];
                            [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                            void updateCalendarConfig({ availableEras: next });
                          }}
                          className="btn btn-ghost btn-icon h-7 w-7"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        {availableEras.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = availableEras.filter((_, i) => i !== idx);
                              void updateCalendarConfig({
                                availableEras: next,
                                epochName:
                                  calendar.epochName === era ? next[0] : calendar.epochName,
                              });
                            }}
                            className="btn btn-danger-ghost btn-icon h-7 w-7"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newEraInput}
                      onChange={(e) => setNewEraInput(e.target.value)}
                      placeholder="Ex.: Terceira Era do Sol…"
                      className="input h-8 text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newEraInput.trim();
                        if (!val) return;
                        void updateCalendarConfig({
                          availableEras: [...availableEras, val],
                          epochName: val,
                        });
                        setNewEraInput('');
                      }}
                      className="btn btn-primary btn-sm h-8"
                    >
                      Adicionar era
                    </button>
                  </div>
                </div>
              )}

              {configTab === 'moons' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="label mb-0">Luas e corpos celestes</span>
                      <button
                        type="button"
                        onClick={() =>
                          void updateCalendarConfig({
                            moons: [
                              ...calendar.moons,
                              {
                                id: `moon-${Date.now()}`,
                                name: `Lua ${calendar.moons.length + 1}`,
                                cycleDays: 28,
                                offset: 0,
                                color: '#c4b5fd',
                                lore: '',
                              },
                            ],
                          })
                        }
                        className="btn btn-secondary btn-sm h-7 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nova lua</span>
                      </button>
                    </div>

                    {calendar.moons.map((mn, idx) => (
                      <div key={mn.id} className="card p-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                          <div className="sm:col-span-2 flex items-center gap-2">
                            <input
                              type="color"
                              value={mn.color || '#e2e8f0'}
                              onChange={(e) =>
                                void updateCalendarConfig({
                                  moons: calendar.moons.map((item, i) =>
                                    i === idx ? { ...item, color: e.target.value } : item
                                  ),
                                })
                              }
                              className="w-8 h-8 p-0 border border-line rounded cursor-pointer bg-transparent shrink-0"
                            />
                            <input
                              type="text"
                              value={mn.name}
                              onChange={(e) =>
                                void updateCalendarConfig({
                                  moons: calendar.moons.map((item, i) =>
                                    i === idx ? { ...item, name: e.target.value } : item
                                  ),
                                })
                              }
                              placeholder="Nome da lua"
                              className="input h-8 text-xs flex-1"
                            />
                          </div>
                          <label className="flex items-center gap-1 text-xs text-fg-subtle">
                            Ciclo:
                            <input
                              type="number"
                              min={2}
                              max={1000}
                              value={mn.cycleDays}
                              onChange={(e) =>
                                void updateCalendarConfig({
                                  moons: calendar.moons.map((item, i) =>
                                    i === idx
                                      ? {
                                          ...item,
                                          cycleDays: Math.max(2, Number(e.target.value) || 28),
                                        }
                                      : item
                                  ),
                                })
                              }
                              className="input h-8 w-16 font-mono tabular-nums text-xs"
                            />
                            d
                          </label>
                          <div className="flex items-center justify-between gap-1">
                            <label className="flex items-center gap-1 text-xs text-fg-subtle">
                              Offset:
                              <input
                                type="number"
                                value={mn.offset}
                                onChange={(e) =>
                                  void updateCalendarConfig({
                                    moons: calendar.moons.map((item, i) =>
                                      i === idx
                                        ? { ...item, offset: Number(e.target.value) || 0 }
                                        : item
                                    ),
                                  })
                                }
                                className="input h-8 w-14 font-mono tabular-nums text-xs"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                void updateCalendarConfig({
                                  moons: calendar.moons.filter((_, i) => i !== idx),
                                })
                              }
                              className="btn btn-danger-ghost btn-icon h-7 w-7"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={mn.lore}
                          onChange={(e) =>
                            void updateCalendarConfig({
                              moons: calendar.moons.map((item, i) =>
                                i === idx ? { ...item, lore: e.target.value } : item
                              ),
                            })
                          }
                          placeholder="Influência mística, marés, presságios desta lua…"
                          className="input h-8 text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Etiquetas personalizadas */}
                  <div className="space-y-2.5 pt-3 border-t border-line">
                    <span className="label mb-0">Etiquetas personalizadas de eventos</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(calendar.customTags || []).map((t) => (
                        <span
                          key={t.name}
                          className="badge inline-flex items-center gap-1.5"
                          style={{ borderColor: `${t.color}66`, color: t.color }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: t.color }}
                          />
                          {t.name}
                          <button
                            type="button"
                            onClick={() =>
                              void updateCalendarConfig({
                                customTags: (calendar.customTags || []).filter(
                                  (x) => x.name !== t.name
                                ),
                              })
                            }
                            className="hover:text-danger"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 max-w-md">
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-9 h-8 p-0 border border-line rounded cursor-pointer bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Nova etiqueta (ex.: Intriga Arcana)…"
                        className="input h-8 text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const clean = newTagName.trim();
                          if (!clean) return;
                          const rest = (calendar.customTags || []).filter(
                            (x) => x.name.toLowerCase() !== clean.toLowerCase()
                          );
                          void updateCalendarConfig({
                            customTags: [...rest, { name: clean, color: newTagColor }],
                          });
                          setNewTagName('');
                        }}
                        className="btn btn-secondary btn-sm h-8"
                      >
                        Salvar etiqueta
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end px-5 py-3 border-t border-line bg-surface-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfigOpen(false)}
                className="btn btn-primary"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
