import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { TimelineVisualTag } from '../../types/campaign';
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
  Check,
  Link2,
} from 'lucide-react';

// Cor do marcador de cada tipo de evento (apenas um ponto discreto ao lado do rótulo).
const VISUAL_TAG_DOT: Record<TimelineVisualTag, string> = {
  Batalha: 'bg-danger',
  Política: 'bg-warning',
  Mágica: 'bg-info',
  'Marco do Grupo': 'bg-success',
  Cataclismo: 'bg-accent',
};

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

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evYear, setEvYear] = useState(calendar.currentYear);
  const [evMonth, setEvMonth] = useState(calendar.currentMonthIndex);
  const [evDay, setEvDay] = useState(calendar.currentDay);
  const [evEpoch, setEvEpoch] = useState(calendar.epochName);
  const [evCategory] = useState<
    'historical' | 'session' | 'cataclysm' | 'intrigue'
  >('session');
  const [evVisualTag, setEvVisualTag] = useState<TimelineVisualTag>('Marco do Grupo');
  const [evLinkedHandle, setEvLinkedHandle] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evSecret, setEvSecret] = useState(false);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editYear, setEditYear] = useState(1492);
  const [editDesc, setEditDesc] = useState('');
  const [editTag, setEditTag] = useState<TimelineVisualTag>('Batalha');

  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

  const [newEraName, setNewEraName] = useState('');
  const [newMonthName, setNewMonthName] = useState('');
  const [newMonthSeason, setNewMonthSeason] = useState('Outono');

  const availableEras = calendar.availableEras || [
    'Era do Fogo Primordial',
    'EC (Era das Cinzas)',
    'Ano da Redenção',
  ];

  const currentMonth =
    calendar.months[calendar.currentMonthIndex] || calendar.months[0];
  const totalDayOfYear =
    calendar.months
      .slice(0, calendar.currentMonthIndex)
      .reduce((acc, m) => acc + m.days, 0) + calendar.currentDay;
  const weekdayName =
    calendar.weekdays[totalDayOfYear % calendar.weekdays.length] || 'Solis';

  const visibleEvents = timeline.filter(
    (ev) => viewRole === 'gm' || !ev.isSecret || ev.isRevealed
  );

  const getMoonPhaseLabel = (cycleDays: number, offset: number) => {
    const phaseRatio = ((totalDayOfYear + offset) % cycleDays) / cycleDays;
    if (phaseRatio < 0.12) return { name: 'Lua nova', pct: 5 };
    if (phaseRatio < 0.38) return { name: 'Quarto crescente', pct: 45 };
    if (phaseRatio < 0.62) return { name: 'Lua cheia', pct: 100 };
    return { name: 'Quarto minguante', pct: 40 };
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) return;
    addTimelineEvent({
      title: evTitle.trim(),
      year: Number(evYear),
      monthIndex: Number(evMonth),
      day: Number(evDay),
      epoch: evEpoch || calendar.epochName,
      category: evCategory,
      visualTag: evVisualTag,
      linkedWikiHandles: evLinkedHandle ? [evLinkedHandle] : [],
      description: evDesc.trim(),
      isSecret: evSecret,
      isRevealed: !evSecret,
    });
    setEvTitle('');
    setEvDesc('');
    setShowAddEvent(false);
  };

  const handleAddEra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEraName.trim()) return;
    const updatedEras = [...availableEras, newEraName.trim()];
    updateCalendarConfig({
      epochName: newEraName.trim(),
      availableEras: updatedEras,
    });
    setNewEraName('');
  };

  const handleAddCustomMonth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonthName.trim()) return;
    updateCalendarConfig({
      months: [
        ...calendar.months,
        {
          id: `m-${Date.now()}`,
          name: newMonthName.trim(),
          days: 30,
          season: newMonthSeason,
        },
      ],
    });
    setNewMonthName('');
  };

  const tagOptions = (
    <>
      <option value="Batalha">Batalha</option>
      <option value="Política">Política</option>
      <option value="Mágica">Mágica</option>
      <option value="Marco do Grupo">Marco do grupo</option>
      <option value="Cataclismo">Cataclismo</option>
    </>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-y-auto pb-4 items-start">
      {/* Coluna esquerda: calendário, luas, eras */}
      <div className="lg:col-span-5 space-y-4">
        <section className="card">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="w-4 h-4 text-fg-subtle shrink-0" />
              <h2 className="section-title truncate">{calendar.calendarName}</h2>
            </div>
            <select
              value={calendar.epochName}
              onChange={(e) => updateCalendarConfig({ epochName: e.target.value })}
              className="input h-8 w-auto max-w-[50%] text-[13px]"
              aria-label="Era atual"
            >
              {availableEras.map((era) => (
                <option key={era} value={era}>
                  {era}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 space-y-4">
            <div className="card-muted px-4 py-5 text-center">
              <div className="text-[13px] text-fg-muted">
                {weekdayName} · {currentMonth?.season}
              </div>
              <div className="mt-1 text-xl font-semibold text-fg">
                Dia {calendar.currentDay} de {currentMonth?.name}
              </div>
              <div className="mt-0.5 text-[13px] text-fg-muted tabular-nums">
                Ano {calendar.currentYear} · {calendar.epochName}
              </div>
            </div>

            {viewRole === 'gm' && (
              <div>
                <span className="label">Avançar tempo</span>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => advanceCalendarDays(-1)}
                    className="btn btn-secondary btn-sm"
                    aria-label="Voltar 1 dia"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="tabular-nums">1d</span>
                  </button>
                  <button
                    onClick={() => advanceCalendarDays(1)}
                    className="btn btn-primary btn-sm"
                    aria-label="Avançar 1 dia"
                  >
                    <span className="tabular-nums">1d</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => advanceCalendarDays(7)}
                    className="btn btn-secondary btn-sm tabular-nums"
                  >
                    +7d
                  </button>
                  <button
                    onClick={() => advanceCalendarDays(30)}
                    className="btn btn-secondary btn-sm tabular-nums"
                  >
                    +30d
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Ciclos lunares */}
        <section className="card">
          <div className="px-4 py-3 border-b border-line flex items-center gap-2">
            <Moon className="w-4 h-4 text-fg-subtle" />
            <h3 className="section-title">Luas</h3>
          </div>
          <ul className="divide-y divide-line">
            {calendar.moons.map((moon) => {
              const phase = getMoonPhaseLabel(moon.cycleDays, moon.offset);
              return (
                <li key={moon.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-line-strong shrink-0"
                        style={{ backgroundColor: moon.color }}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium text-fg truncate">
                        {moon.name}
                      </span>
                    </div>
                    <span className="text-[13px] text-fg-muted shrink-0">{phase.name}</span>
                  </div>
                  {moon.lore && (
                    <p className="mt-1 text-[13px] text-fg-muted">{moon.lore}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Eras e meses personalizados */}
        {viewRole === 'gm' && (
          <section className="card">
            <div className="px-4 py-3 border-b border-line">
              <h3 className="section-title">Eras e meses</h3>
            </div>
            <div className="p-4 space-y-3">
              <form onSubmit={handleAddEra} className="flex gap-2">
                <input
                  type="text"
                  value={newEraName}
                  onChange={(e) => setNewEraName(e.target.value)}
                  placeholder="Nova era (ex.: Era das Cinzas)"
                  className="input flex-1 min-w-0"
                  aria-label="Nome da nova era"
                />
                <button type="submit" className="btn btn-secondary shrink-0">
                  Adicionar era
                </button>
              </form>

              <form onSubmit={handleAddCustomMonth} className="flex flex-wrap sm:flex-nowrap gap-2">
                <input
                  type="text"
                  value={newMonthName}
                  onChange={(e) => setNewMonthName(e.target.value)}
                  placeholder="Novo mês (ex.: Vento Gélido)"
                  className="input flex-1 min-w-0"
                  aria-label="Nome do novo mês"
                />
                <select
                  value={newMonthSeason}
                  onChange={(e) => setNewMonthSeason(e.target.value)}
                  className="input w-auto"
                  aria-label="Estação"
                >
                  <option value="Primavera">Primavera</option>
                  <option value="Verão">Verão</option>
                  <option value="Outono">Outono</option>
                  <option value="Inverno">Inverno</option>
                </select>
                <button type="submit" className="btn btn-secondary shrink-0">
                  Adicionar mês
                </button>
              </form>
            </div>
          </section>
        )}
      </div>

      {/* Coluna direita: cronologia */}
      <section className="lg:col-span-7 card">
        <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Cronologia</h2>
            <p className="text-[13px] text-fg-muted">
              {viewRole === 'gm'
                ? 'Arraste os eventos para reordenar.'
                : 'Eventos conhecidos da campanha.'}
            </p>
          </div>

          {viewRole === 'gm' && (
            <button
              onClick={() => setShowAddEvent(!showAddEvent)}
              className="btn btn-primary"
              aria-expanded={showAddEvent}
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar evento</span>
            </button>
          )}
        </div>

        <div className="p-4 space-y-5">
          {/* Formulário de novo evento */}
          {showAddEvent && viewRole === 'gm' && (
            <form onSubmit={handleAddEvent} className="card-muted p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label htmlFor="ev-title" className="label">
                    Título
                  </label>
                  <input
                    id="ev-title"
                    type="text"
                    required
                    value={evTitle}
                    onChange={(e) => setEvTitle(e.target.value)}
                    placeholder="Ex.: Queda da Torre Norte"
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="ev-tag" className="label">
                    Tipo
                  </label>
                  <select
                    id="ev-tag"
                    value={evVisualTag}
                    onChange={(e) => setEvVisualTag(e.target.value as TimelineVisualTag)}
                    className="input"
                  >
                    {tagOptions}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="ev-day" className="label">
                    Dia
                  </label>
                  <input
                    id="ev-day"
                    type="number"
                    min={1}
                    max={35}
                    value={evDay}
                    onChange={(e) => setEvDay(Number(e.target.value))}
                    className="input tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="ev-month" className="label">
                    Mês
                  </label>
                  <select
                    id="ev-month"
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
                  <label htmlFor="ev-year" className="label">
                    Ano
                  </label>
                  <input
                    id="ev-year"
                    type="number"
                    value={evYear}
                    onChange={(e) => setEvYear(Number(e.target.value))}
                    className="input tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="ev-epoch" className="label">
                    Era
                  </label>
                  <select
                    id="ev-epoch"
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

              <div>
                <label htmlFor="ev-link" className="label">
                  Entrada do códice vinculada
                </label>
                <select
                  id="ev-link"
                  value={evLinkedHandle}
                  onChange={(e) => setEvLinkedHandle(e.target.value)}
                  className="input"
                >
                  <option value="">Nenhuma</option>
                  {entities.map((ent) => (
                    <option key={ent.id} value={`${ent.mentionPrefix}${ent.handle}`}>
                      {ent.mentionPrefix}
                      {ent.handle} — {ent.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="label">Descrição</span>
                <MentionTextarea
                  rows={3}
                  value={evDesc}
                  onChange={setEvDesc}
                  placeholder="Descreva o evento. Use @ e # para mencionar entradas."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={evSecret}
                    onChange={(e) => setEvSecret(e.target.checked)}
                  />
                  <span>Ocultar dos jogadores</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEvent(false)}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Salvar evento
                  </button>
                </div>
              </div>
            </form>
          )}

          {visibleEvents.length === 0 && !showAddEvent && (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-fg">Nenhum evento</p>
              <p className="mt-1 text-[13px] text-fg-muted">
                {viewRole === 'gm'
                  ? 'Registre marcos históricos e acontecimentos das sessões.'
                  : 'O mestre ainda não revelou eventos.'}
              </p>
              {viewRole === 'gm' && (
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="btn btn-secondary mt-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar evento</span>
                </button>
              )}
            </div>
          )}

          {/* Linha do tempo */}
          {visibleEvents.length > 0 && (
            <ol className="relative ml-1.5 pl-6 border-l border-line space-y-3">
              {visibleEvents.map((ev) => {
                const monthName = calendar.months[ev.monthIndex]?.name || 'Mês 1';
                const isEditing = editingEventId === ev.id;
                const vTag: TimelineVisualTag =
                  ev.visualTag ||
                  (ev.category === 'cataclysm'
                    ? 'Cataclismo'
                    : ev.category === 'intrigue'
                    ? 'Política'
                    : ev.category === 'session'
                    ? 'Marco do Grupo'
                    : 'Batalha');
                const isHidden = ev.isSecret && !ev.isRevealed;

                return (
                  <li
                    key={ev.id}
                    draggable={viewRole === 'gm'}
                    onDragStart={() => setDraggedEventId(ev.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedEventId) {
                        reorderTimelineEvents(draggedEventId, ev.id);
                        setDraggedEventId(null);
                      }
                    }}
                    className="relative group"
                  >
                    <span
                      className="absolute -left-[30px] top-4 w-2.5 h-2.5 rounded-full bg-surface border-2 border-line-strong"
                      aria-hidden="true"
                    />

                    <div className="rounded-md border border-line bg-surface hover:border-line-strong transition-colors p-3.5">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="input col-span-2"
                              aria-label="Título"
                            />
                            <input
                              type="number"
                              value={editYear}
                              onChange={(e) => setEditYear(Number(e.target.value))}
                              className="input tabular-nums"
                              aria-label="Ano"
                            />
                          </div>
                          <select
                            value={editTag}
                            onChange={(e) => setEditTag(e.target.value as TimelineVisualTag)}
                            className="input w-auto"
                            aria-label="Tipo"
                          >
                            {tagOptions}
                          </select>
                          <textarea
                            rows={3}
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="input"
                            aria-label="Descrição"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingEventId(null)}
                              className="btn btn-secondary btn-sm"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => {
                                updateTimelineEvent(ev.id, {
                                  title: editTitle,
                                  year: editYear,
                                  visualTag: editTag,
                                  description: editDesc,
                                });
                                setEditingEventId(null);
                              }}
                              className="btn btn-primary btn-sm"
                            >
                              <Check className="w-4 h-4" />
                              <span>Salvar</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                              {viewRole === 'gm' && (
                                <span title="Arraste para reordenar" className="-ml-1">
                                  <GripVertical className="w-4 h-4 text-fg-subtle cursor-grab" />
                                </span>
                              )}
                              <span className="text-xs text-fg-subtle tabular-nums">
                                {ev.day} de {monthName}, {ev.year} {ev.epoch}
                              </span>
                              <span className="badge">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${VISUAL_TAG_DOT[vTag]}`}
                                  aria-hidden="true"
                                />
                                {vTag}
                              </span>
                              {viewRole === 'gm' && isHidden && (
                                <span className="badge badge-warning">Oculto</span>
                              )}
                            </div>

                            {viewRole === 'gm' && (
                              <div className="flex items-center -mr-1.5 -mt-1 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingEventId(ev.id);
                                    setEditTitle(ev.title);
                                    setEditYear(ev.year);
                                    setEditDesc(ev.description);
                                    setEditTag(vTag);
                                  }}
                                  className="btn btn-ghost btn-icon"
                                  title="Editar evento"
                                  aria-label="Editar evento"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => toggleRevealTimelineEvent(ev.id)}
                                  className="btn btn-ghost btn-icon"
                                  title={isHidden ? 'Revelar aos jogadores' : 'Ocultar dos jogadores'}
                                  aria-label={isHidden ? 'Revelar aos jogadores' : 'Ocultar dos jogadores'}
                                >
                                  {isHidden ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => deleteTimelineEvent(ev.id)}
                                  className="btn btn-danger-ghost btn-icon"
                                  title="Excluir evento"
                                  aria-label="Excluir evento"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          <h4 className="text-sm font-semibold text-fg">{ev.title}</h4>
                          {ev.description && (
                            <div className="text-sm text-fg-muted">
                              <MentionText text={ev.description} />
                            </div>
                          )}

                          {ev.linkedWikiHandles && ev.linkedWikiHandles.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <Link2 className="w-4 h-4 text-fg-subtle" aria-hidden="true" />
                              {ev.linkedWikiHandles.map((h) => (
                                <button
                                  key={h}
                                  onClick={() => navigateToHandle(h)}
                                  className="badge font-mono hover:border-line-strong hover:text-fg transition-colors"
                                >
                                  {h}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
};
