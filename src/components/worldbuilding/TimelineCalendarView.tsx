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
  X,
  Link2,
} from 'lucide-react';

const VISUAL_TAG_STYLES: Record<TimelineVisualTag, string> = {
  Batalha: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  Política: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  Mágica: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  'Marco do Grupo': 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Cataclismo: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1">
      {/* Left Column: Calendar, Moons & Era Settings */}
      <div className="lg:col-span-5 space-y-4">
        <div className="p-5 rounded-xl surface-panel space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-zinc-200">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold tracking-tight">
                {calendar.calendarName}
              </h2>
            </div>
            <select
              value={calendar.epochName}
              onChange={(e) => updateCalendarConfig({ epochName: e.target.value })}
              className="input-clean px-2.5 py-1 rounded-lg text-[11px] font-mono"
            >
              {availableEras.map((era) => (
                <option key={era} value={era}>
                  {era}
                </option>
              ))}
            </select>
          </div>

          <div className="p-5 rounded-xl bg-[#0e0e11] border border-white/[0.06] text-center space-y-1">
            <span className="text-[11px] text-zinc-500">
              {weekdayName} · {currentMonth?.season}
            </span>
            <div className="text-2xl font-serif font-medium text-zinc-100">
              Dia {calendar.currentDay} de {currentMonth?.name}
            </div>
            <div className="text-xs font-mono text-zinc-400 tabular-nums">
              Ano {calendar.currentYear} · {calendar.epochName}
            </div>
          </div>

          {viewRole === 'gm' && (
            <div className="space-y-2">
              <span className="text-[11px] text-zinc-500 block">
                Passagem de tempo
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => advanceCalendarDays(-1)}
                  className="btn-subtle py-1.5 px-2 rounded-lg text-xs font-mono inline-flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> 1d
                </button>
                <button
                  onClick={() => advanceCalendarDays(1)}
                  className="btn-solid py-1.5 px-2 rounded-lg text-xs font-mono inline-flex items-center justify-center gap-1"
                >
                  +1d <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => advanceCalendarDays(7)}
                  className="btn-subtle py-1.5 px-2 rounded-lg text-xs font-mono"
                >
                  +7d
                </button>
                <button
                  onClick={() => advanceCalendarDays(30)}
                  className="btn-subtle py-1.5 px-2 rounded-lg text-xs font-mono"
                >
                  +30d
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lunar Cycles */}
        <div className="p-5 rounded-xl surface-panel space-y-3">
          <div className="flex items-center gap-2 text-zinc-200">
            <Moon className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-medium">Ciclos lunares</h3>
          </div>
          <div className="space-y-2.5">
            {calendar.moons.map((moon) => {
              const phase = getMoonPhaseLabel(moon.cycleDays, moon.offset);
              return (
                <div
                  key={moon.id}
                  className="p-3 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: moon.color }}
                      />
                      <span className="text-xs font-medium text-zinc-100">
                        {moon.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {phase.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    {moon.lore}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Eras & Months */}
        {viewRole === 'gm' && (
          <div className="p-5 rounded-xl surface-panel space-y-3">
            <h3 className="text-xs font-medium text-zinc-300">
              Configurar eras & meses
            </h3>

            <form onSubmit={handleAddEra} className="flex gap-2 text-xs">
              <input
                type="text"
                value={newEraName}
                onChange={(e) => setNewEraName(e.target.value)}
                placeholder="Nova era (ex: Era das Cinzas)"
                className="input-clean flex-1 px-2.5 py-1.5 rounded-lg"
              />
              <button
                type="submit"
                className="btn-subtle px-3 py-1.5 rounded-lg"
              >
                + Era
              </button>
            </form>

            <form onSubmit={handleAddCustomMonth} className="flex gap-2 text-xs">
              <input
                type="text"
                value={newMonthName}
                onChange={(e) => setNewMonthName(e.target.value)}
                placeholder="Novo mês (ex: Vento Gélido)"
                className="input-clean flex-1 px-2.5 py-1.5 rounded-lg"
              />
              <select
                value={newMonthSeason}
                onChange={(e) => setNewMonthSeason(e.target.value)}
                className="input-clean px-2 py-1.5 rounded-lg"
              >
                <option value="Primavera">Primavera</option>
                <option value="Verão">Verão</option>
                <option value="Outono">Outono</option>
                <option value="Inverno">Inverno</option>
              </select>
              <button
                type="submit"
                className="btn-subtle px-3 py-1.5 rounded-lg"
              >
                + Mês
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Right Column: Chronological Timeline */}
      <div className="lg:col-span-7 surface-panel rounded-xl p-5 flex flex-col justify-between">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3.5">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Cronologia da campanha
              </h2>
              <p className="text-xs text-zinc-500">
                Arraste marcos para reordenar e conecte entradas do códice.
              </p>
            </div>

            {viewRole === 'gm' && (
              <button
                onClick={() => setShowAddEvent(!showAddEvent)}
                className="btn-solid px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo marco</span>
              </button>
            )}
          </div>

          {/* Add Event Form */}
          {showAddEvent && viewRole === 'gm' && (
            <form
              onSubmit={handleAddEvent}
              className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.08] space-y-3 text-xs"
            >
              <div className="font-medium text-zinc-200">
                Registrar evento histórico ou de sessão
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="Título do evento..."
                  className="input-clean md:col-span-2 px-3 py-1.5 rounded-lg"
                />
                <select
                  value={evVisualTag}
                  onChange={(e) => setEvVisualTag(e.target.value as TimelineVisualTag)}
                  className="input-clean px-2.5 py-1.5 rounded-lg"
                >
                  <option value="Batalha">Batalha</option>
                  <option value="Política">Política</option>
                  <option value="Mágica">Mágica</option>
                  <option value="Marco do Grupo">Marco do Grupo</option>
                  <option value="Cataclismo">Cataclismo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Dia</label>
                  <input
                    type="number"
                    min={1}
                    max={35}
                    value={evDay}
                    onChange={(e) => setEvDay(Number(e.target.value))}
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Mês</label>
                  <select
                    value={evMonth}
                    onChange={(e) => setEvMonth(Number(e.target.value))}
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  >
                    {calendar.months.map((m, idx) => (
                      <option key={m.id} value={idx}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Ano</label>
                  <input
                    type="number"
                    value={evYear}
                    onChange={(e) => setEvYear(Number(e.target.value))}
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Era</label>
                  <select
                    value={evEpoch}
                    onChange={(e) => setEvEpoch(e.target.value)}
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
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
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Vincular entrada do códice (opcional)
                </label>
                <select
                  value={evLinkedHandle}
                  onChange={(e) => setEvLinkedHandle(e.target.value)}
                  className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                >
                  <option value="">Nenhum vínculo direto</option>
                  {entities.map((ent) => (
                    <option key={ent.id} value={`${ent.mentionPrefix}${ent.handle}`}>
                      {ent.mentionPrefix}
                      {ent.handle} — {ent.name}
                    </option>
                  ))}
                </select>
              </div>

              <MentionTextarea
                rows={3}
                value={evDesc}
                onChange={setEvDesc}
                placeholder="Descrição com suporte a menções (@NPC, #Local)..."
              />

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={evSecret}
                    onChange={(e) => setEvSecret(e.target.checked)}
                  />
                  <span>Ocultar dos jogadores</span>
                </label>
                <button
                  type="submit"
                  className="btn-solid px-4 py-1.5 rounded-lg"
                >
                  Salvar evento
                </button>
              </div>
            </form>
          )}

          {/* Vertical Timeline Rail */}
          <div className="relative pl-6 border-l border-white/[0.09] space-y-3.5 py-1">
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

              return (
                <div
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
                  <div className="w-2.5 h-2.5 rounded-full bg-[#111114] border-2 border-zinc-400 absolute -left-[29.5px] top-4" />

                  <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.06] hover:border-white/[0.13] transition-colors space-y-2">
                    {isEditing ? (
                      <div className="space-y-2.5 text-xs">
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="input-clean col-span-2 px-2.5 py-1.5 rounded font-medium"
                          />
                          <input
                            type="number"
                            value={editYear}
                            onChange={(e) => setEditYear(Number(e.target.value))}
                            className="input-clean px-2.5 py-1.5 rounded"
                          />
                        </div>
                        <select
                          value={editTag}
                          onChange={(e) => setEditTag(e.target.value as TimelineVisualTag)}
                          className="input-clean px-2.5 py-1 rounded"
                        >
                          <option value="Batalha">Batalha</option>
                          <option value="Política">Política</option>
                          <option value="Mágica">Mágica</option>
                          <option value="Marco do Grupo">Marco do Grupo</option>
                          <option value="Cataclismo">Cataclismo</option>
                        </select>
                        <textarea
                          rows={2}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="input-clean w-full px-2.5 py-1.5 rounded"
                        />
                        <div className="flex justify-end gap-1.5">
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
                            className="btn-solid px-3 py-1 rounded inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Salvar
                          </button>
                          <button
                            onClick={() => setEditingEventId(null)}
                            className="btn-subtle px-2.5 py-1 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {viewRole === 'gm' && (
                              <span title="Arraste para reordenar">
                                <GripVertical className="w-3.5 h-3.5 text-zinc-600 cursor-grab" />
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                              {ev.day} de {monthName}, {ev.year} {ev.epoch}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${VISUAL_TAG_STYLES[vTag]}`}
                            >
                              {vTag}
                            </span>
                          </div>

                          {viewRole === 'gm' && (
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => {
                                  setEditingEventId(ev.id);
                                  setEditTitle(ev.title);
                                  setEditYear(ev.year);
                                  setEditDesc(ev.description);
                                  setEditTag(vTag);
                                }}
                                className="p-1 rounded hover:bg-white/[0.05] text-zinc-500 hover:text-zinc-200"
                                title="Editar evento"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleRevealTimelineEvent(ev.id)}
                                className="p-1 rounded hover:bg-white/[0.05] text-zinc-500 hover:text-zinc-200"
                                title={
                                  ev.isSecret && !ev.isRevealed
                                    ? 'Revelar aos jogadores'
                                    : 'Ocultar dos jogadores'
                                }
                              >
                                {ev.isSecret && !ev.isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteTimelineEvent(ev.id)}
                                className="p-1 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400"
                                title="Excluir evento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <h4 className="text-base font-serif font-medium text-zinc-100">
                          {ev.title}
                        </h4>
                        <div className="text-xs text-zinc-300 leading-relaxed">
                          <MentionText text={ev.description} />
                        </div>

                        {ev.linkedWikiHandles && ev.linkedWikiHandles.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <Link2 className="w-3 h-3 text-zinc-500" />
                            {ev.linkedWikiHandles.map((h) => (
                              <button
                                key={h}
                                onClick={() => navigateToHandle(h)}
                                className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[10px] font-mono text-zinc-300 transition-colors"
                              >
                                {h}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
