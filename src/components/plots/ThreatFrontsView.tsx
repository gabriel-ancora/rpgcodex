import React, { useMemo, useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import type {
  ClockVisualStyle,
  ThreatFront,
  ThreatFrontKind,
  ThreatPortent,
} from '../../types/campaign';
import { ProgressClockSvg } from './ProgressClockSvg';
import { MentionText, MentionTextarea } from '../common/MentionText';
import {
  Flame,
  Plus,
  FastForward,
  AlertTriangle,
  CheckSquare,
  Square,
  Trash2,
  Lock,
  Unlock,
  Minus,
  Edit3,
  X,
  Eye,
  EyeOff,
  Search,
  PauseCircle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

const KIND_META: Record<ThreatFrontKind, { label: string; defaultColor: string }> = {
  threat: { label: 'Ameaça', defaultColor: '#ef4444' },
  faction: { label: 'Plano de Facção', defaultColor: '#f59e0b' },
  project: { label: 'Projeto do Grupo', defaultColor: '#10b981' },
  ritual: { label: 'Ritual / Contagem', defaultColor: '#8b5cf6' },
  race: { label: 'Disputa / Perseguição', defaultColor: '#3b82f6' },
  custom: { label: 'Personalizado', defaultColor: '#ec4899' },
};

const STATUS_LABELS: Record<ThreatFront['status'], { label: string; badge: string }> = {
  active: { label: 'Ativo', badge: 'badge-info' },
  paused: { label: 'Pausado', badge: 'badge-warning' },
  triggered: { label: 'Disparado', badge: 'badge-danger' },
  resolved: { label: 'Resolvido', badge: 'badge-success' },
};

const CLOCK_COLOR_SWATCHES = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
];

const SEGMENT_PRESETS = [2, 3, 4, 6, 8, 10, 12, 16, 20];

export const ThreatFrontsView: React.FC = () => {
  const fronts = useCampaignStore((s) => s.fronts);
  const entities = useCampaignStore((s) => s.entities);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const setFrontClockValue = useCampaignStore((s) => s.setFrontClockValue);
  const advanceIgnoredFronts = useCampaignStore((s) => s.advanceIgnoredFronts);
  const toggleFrontPortent = useCampaignStore((s) => s.toggleFrontPortent);
  const addThreatFront = useCampaignStore((s) => s.addThreatFront);
  const updateThreatFront = useCampaignStore((s) => s.updateThreatFront);
  const deleteThreatFront = useCampaignStore((s) => s.deleteThreatFront);
  const navigateToHandle = useCampaignStore((s) => s.navigateToHandle);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ThreatFront['status'] | 'all'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'secret'>('all');

  // Modal de criação / edição completa
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFront, setEditingFront] = useState<ThreatFront | null>(null);

  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [handle, setHandle] = useState('');
  const [kind, setKind] = useState<ThreatFrontKind>('threat');
  const [clockStyle, setClockStyle] = useState<ClockVisualStyle>('pie');
  const [color, setColor] = useState('#ef4444');
  const [scale, setScale] = useState('Regional');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [segments, setSegments] = useState<number>(6);
  const [filled, setFilled] = useState<number>(0);
  const [status, setStatus] = useState<ThreatFront['status']>('active');
  const [desc, setDesc] = useState('');
  const [doom, setDoom] = useState('');
  const [consequence, setConsequence] = useState('');
  const [gmSecretNote, setGmSecretNote] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSecret, setIsSecret] = useState(true);
  const [formPortents, setFormPortents] = useState<ThreatPortent[]>([]);

  // Rascunho para adicionar marco rápido diretamente no card
  const [portentDrafts, setPortentDrafts] = useState<
    Record<string, { step: number; text: string; isSecret: boolean; open: boolean }>
  >({});

  const filteredFronts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return fronts.filter((f) => {
      if (viewRole === 'player' && f.isSecret) return false;
      if (kindFilter !== 'all' && (f.kind || 'threat') !== kindFilter) return false;
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (viewRole === 'gm') {
        if (visibilityFilter === 'public' && f.isSecret) return false;
        if (visibilityFilter === 'secret' && !f.isSecret) return false;
      }
      if (q) {
        const hay = [
          f.name,
          f.subtitle,
          f.associatedEntityHandle,
          f.description,
          f.impendingDoom,
          f.scale || '',
          ...(f.tags || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [fronts, viewRole, kindFilter, statusFilter, visibilityFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingFront(null);
    setName('');
    setSubtitle('');
    setHandle('');
    setKind('threat');
    setClockStyle('pie');
    setColor('#ef4444');
    setScale('Regional');
    setAutoAdvance(true);
    setSegments(6);
    setFilled(0);
    setStatus('active');
    setDesc('');
    setDoom('');
    setConsequence('Avança +1 segmento quando ignorado entre sessões.');
    setGmSecretNote('');
    setTagsInput('');
    setIsSecret(true);
    setFormPortents([
      { id: `gp-${Date.now()}-1`, step: 2, text: 'Primeiros sinais visíveis no cenário.', triggered: false, isSecret: false },
      { id: `gp-${Date.now()}-2`, step: 4, text: 'A pressão atinge aliados ou recursos locais.', triggered: false, isSecret: false },
      { id: `gp-${Date.now()}-3`, step: 6, text: 'O desfecho final se concretiza.', triggered: false, isSecret: true },
    ]);
    setModalOpen(true);
  };

  const openEditModal = (front: ThreatFront) => {
    setEditingFront(front);
    setName(front.name);
    setSubtitle(front.subtitle);
    setHandle(front.associatedEntityHandle);
    const fk = (front.kind as ThreatFrontKind) || 'threat';
    setKind(fk);
    setClockStyle((front.clockStyle as ClockVisualStyle) || 'pie');
    setColor(front.color || KIND_META[fk]?.defaultColor || '#ef4444');
    setScale(front.scale || 'Regional');
    setAutoAdvance(front.autoAdvance !== false);
    setSegments(front.clockSegments);
    setFilled(front.clockFilled);
    setStatus(front.status);
    setDesc(front.description);
    setDoom(front.impendingDoom);
    setConsequence(front.ignoreConsequence);
    setGmSecretNote(front.gmSecretNote || '');
    setTagsInput((front.tags || []).join(', '));
    setIsSecret(front.isSecret);
    setFormPortents(front.grimPortents.map((gp) => ({ ...gp })));
    setModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const safeSegments = Math.max(2, Math.min(24, Math.floor(Number(segments) || 6)));
    const safeFilled = Math.max(0, Math.min(safeSegments, Math.floor(Number(filled) || 0)));
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const normalizedPortents = formPortents
      .filter((gp) => gp.text.trim())
      .map((gp, idx) => {
        const st = Math.max(1, Math.min(safeSegments, Math.floor(Number(gp.step) || idx + 1)));
        return {
          id: gp.id || `gp-${Date.now()}-${idx}`,
          step: st,
          text: gp.text.trim(),
          triggered: gp.triggered || st <= safeFilled,
          isSecret: Boolean(gp.isSecret),
        };
      })
      .sort((a, b) => a.step - b.step);

    const payload = {
      name: name.trim(),
      subtitle: subtitle.trim() || KIND_META[kind]?.label || 'Frente ativa',
      associatedEntityHandle: handle.trim(),
      description: desc.trim() || 'Relógio de progresso em andamento.',
      kind,
      clockStyle,
      color,
      scale: scale.trim() || 'Regional',
      autoAdvance,
      gmSecretNote: gmSecretNote.trim() || undefined,
      tags: parsedTags,
      clockSegments: safeSegments,
      clockFilled: safeFilled,
      impendingDoom: doom.trim() || 'Consequência crítica quando o relógio se completa.',
      ignoreConsequence: consequence.trim() || 'Avança conforme eventos da mesa.',
      grimPortents: normalizedPortents,
      status: safeFilled >= safeSegments && status === 'active' ? ('triggered' as const) : status,
      isSecret,
    };

    if (editingFront) {
      await updateThreatFront(editingFront.id, payload);
    } else {
      await addThreatFront(payload);
    }
    setModalOpen(false);
    setEditingFront(null);
  };

  const handleAddCardPortent = (front: ThreatFront) => {
    const draft = portentDrafts[front.id];
    if (!draft || !draft.text.trim()) return;
    const step = Math.max(1, Math.min(front.clockSegments, Math.floor(Number(draft.step) || front.clockSegments)));
    const nextPortents = [
      ...front.grimPortents,
      {
        id: `gp-${Date.now()}`,
        step,
        text: draft.text.trim(),
        triggered: step <= front.clockFilled,
        isSecret: draft.isSecret,
      },
    ].sort((a, b) => a.step - b.step);
    void updateThreatFront(front.id, { grimPortents: nextPortents });
    setPortentDrafts((prev) => ({
      ...prev,
      [front.id]: { step: front.clockSegments, text: '', isSecret: false, open: false },
    }));
  };

  const handleDeleteCardPortent = (front: ThreatFront, portentId: string) => {
    void updateThreatFront(front.id, {
      grimPortents: front.grimPortents.filter((gp) => gp.id !== portentId),
    });
  };

  const handleToggleCardPortentSecret = (front: ThreatFront, portentId: string) => {
    void updateThreatFront(front.id, {
      grimPortents: front.grimPortents.map((gp) =>
        gp.id === portentId ? { ...gp, isSecret: !gp.isSecret } : gp
      ),
    });
  };

  const cycleClockStyle = (front: ThreatFront) => {
    const order: ClockVisualStyle[] = ['pie', 'ring', 'bars'];
    const cur = (front.clockStyle as ClockVisualStyle) || 'pie';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    void updateThreatFront(front.id, { clockStyle: next });
  };

  const autoAdvanceCount = fronts.filter((f) => f.status === 'active' && f.autoAdvance !== false).length;

  return (
    <div className="space-y-4 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1 pb-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title">Frentes e relógios de progresso</h2>
          <p className="text-[13px] text-fg-muted">
             Crie relógios de ameaça, planos de facção, rituais, disputas ou projetos de longo prazo com total personalização.
          </p>
        </div>

        {viewRole === 'gm' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void advanceIgnoredFronts()}
              disabled={autoAdvanceCount === 0}
              className="btn btn-secondary btn-sm"
              title="Avança +1 segmento em todas as frentes ativas marcadas para avanço automático"
            >
              <FastForward className="w-4 h-4" />
              <span>Avançar automáticos ({autoAdvanceCount})</span>
            </button>

            <button type="button" onClick={openCreateModal} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              <span>Novo relógio / frente</span>
            </button>
          </div>
        )}
      </div>

      {/* Barra de busca e filtros */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar frente, tag, @entidade…"
            className="input h-8 pl-9 text-[13px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="input h-8 w-auto text-[13px]"
            aria-label="Filtrar por categoria"
          >
            <option value="all">Todos os tipos</option>
            {(Object.keys(KIND_META) as ThreatFrontKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ThreatFront['status'] | 'all')}
            className="input h-8 w-auto text-[13px]"
            aria-label="Filtrar por status"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="paused">Pausados</option>
            <option value="triggered">Disparados</option>
            <option value="resolved">Resolvidos</option>
          </select>

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

      {/* Lista de frentes e relógios */}
      {filteredFronts.length === 0 ? (
        <div className="card py-12 px-6 text-center">
          <Flame className="w-5 h-5 text-fg-subtle mx-auto mb-3" />
          <h3 className="text-sm font-medium text-fg">Nenhum relógio ou frente encontrado</h3>
          <p className="text-[13px] text-fg-muted max-w-md mx-auto mt-1">
            Personalize relógios de 2 a 24 segmentos, estilos visuais (pizza, anel ou barras), cores, presságios por segmento e visibilidade para os jogadores.
          </p>
          {viewRole === 'gm' && (
            <button type="button" onClick={openCreateModal} className="btn btn-primary btn-sm mt-4">
              <Plus className="w-4 h-4" />
              <span>Criar primeiro relógio</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {filteredFronts.map((front) => {
            const isComplete = front.clockFilled >= front.clockSegments;
            const kindKey = (front.kind as ThreatFrontKind) || 'threat';
            const kindMeta = KIND_META[kindKey] || KIND_META.custom;
            const accentColor = front.color || kindMeta.defaultColor;
            const statusMeta = STATUS_LABELS[front.status] || STATUS_LABELS.active;
            const draft = portentDrafts[front.id] || {
              step: Math.min(front.clockSegments, Math.max(1, front.clockFilled + 1)),
              text: '',
              isSecret: false,
              open: false,
            };

            return (
              <article
                key={front.id}
                className={`card overflow-hidden flex flex-col justify-between ${
                  front.status === 'resolved' ? 'opacity-80' : ''
                }`}
                style={{ borderTopWidth: '3px', borderTopColor: accentColor }}
              >
                <div className="p-4 space-y-4">
                  {/* Cabeçalho e Relógio */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="badge font-medium"
                          style={{
                            borderColor: `${accentColor}55`,
                            color: accentColor,
                          }}
                        >
                          {kindMeta.label}
                        </span>
                        <span className={`badge ${statusMeta.badge}`}>{statusMeta.label}</span>
                        {front.scale && <span className="badge">{front.scale}</span>}
                        {viewRole === 'gm' && (
                          <span className={`badge ${front.isSecret ? '' : 'badge-success'}`}>
                            {front.isSecret ? (
                              <>
                                <Lock className="w-3 h-3" /> Oculto
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" /> Público
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-fg leading-snug">
                        {front.name}
                      </h3>
                      {front.subtitle && (
                        <div className="text-[13px] text-fg-muted">
                          <MentionText text={front.subtitle} />
                        </div>
                      )}

                      {front.associatedEntityHandle && (
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() => navigateToHandle(front.associatedEntityHandle)}
                            className="badge font-mono hover:border-line-strong hover:text-fg transition-colors"
                          >
                            {front.associatedEntityHandle}
                          </button>
                        </div>
                      )}

                      {front.tags && front.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {front.tags.map((tag) => (
                            <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded bg-surface-2 text-fg-subtle">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Relógio Interativo */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <ProgressClockSvg
                        segments={front.clockSegments}
                        filled={front.clockFilled}
                        size={92}
                        color={accentColor}
                        style={front.clockStyle || 'pie'}
                        onSelectSegment={
                          viewRole === 'gm'
                            ? (val) => void setFrontClockValue(front.id, val)
                            : undefined
                        }
                      />

                      {viewRole === 'gm' && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void setFrontClockValue(front.id, 0)}
                            disabled={front.clockFilled === 0}
                            className="btn btn-ghost btn-icon h-7 w-7"
                            title="Zerar relógio"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void setFrontClockValue(front.id, front.clockFilled - 1)
                            }
                            disabled={front.clockFilled <= 0}
                            className="btn btn-secondary btn-icon h-7 w-7"
                            title="Retroceder 1 segmento"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void setFrontClockValue(front.id, front.clockFilled + 1)
                            }
                            disabled={front.clockFilled >= front.clockSegments}
                            className="btn btn-secondary btn-icon h-7 w-7"
                            title="Avançar 1 segmento"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Descrição */}
                  {front.description && (
                    <div className="text-sm text-fg leading-relaxed">
                      <MentionText text={front.description} />
                    </div>
                  )}

                  {/* Marcos / Presságios */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="eyebrow">Marcos e presságios</span>
                      {viewRole === 'gm' && (
                        <button
                          type="button"
                          onClick={() =>
                            setPortentDrafts((prev) => ({
                              ...prev,
                              [front.id]: { ...draft, open: !draft.open },
                            }))
                          }
                          className="text-xs text-accent hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Novo marco</span>
                        </button>
                      )}
                    </div>

                    {front.grimPortents.length === 0 ? (
                      <p className="text-xs text-fg-subtle italic">
                        Nenhum presságio cadastrado para este relógio.
                      </p>
                    ) : (
                      <ul className="rounded-md border border-line divide-y divide-line overflow-hidden">
                        {front.grimPortents.map((gp) => (
                          <li
                            key={gp.id}
                            className={`px-3 py-2 text-[13px] flex items-start gap-2 transition-colors ${
                              gp.triggered ? 'bg-surface-2/50 text-fg' : 'text-fg-muted'
                            }`}
                          >
                            <button
                              type="button"
                              disabled={viewRole !== 'gm'}
                              onClick={() =>
                                viewRole === 'gm' && void toggleFrontPortent(front.id, gp.id)
                              }
                              className={`mt-0.5 shrink-0 ${
                                viewRole === 'gm' ? 'cursor-pointer' : 'cursor-default'
                              }`}
                              title={gp.triggered ? 'Desmarcar marco' : 'Marcar como ocorrido'}
                            >
                              {gp.triggered ? (
                                <CheckSquare className="w-4 h-4 text-success" />
                              ) : (
                                <Square className="w-4 h-4 text-fg-subtle" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0 leading-relaxed">
                              <span
                                className="inline-block font-mono text-[11px] px-1.5 py-0.2 rounded bg-surface-2 text-fg-subtle mr-1.5 tabular-nums"
                                title={`Dispara no segmento ${gp.step}`}
                              >
                                {gp.step}/{front.clockSegments}
                              </span>
                              <MentionText text={gp.text} className="inline" />
                              {viewRole === 'gm' && gp.isSecret && (
                                <span className="badge badge-warning ml-1.5">Secreto</span>
                              )}
                            </div>

                            {viewRole === 'gm' && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleCardPortentSecret(front, gp.id)}
                                  className="btn btn-ghost btn-icon h-6 w-6"
                                  title={
                                    gp.isSecret
                                      ? 'Tornar marco visível quando o relógio for público'
                                      : 'Ocultar este marco dos jogadores até disparar'
                                  }
                                >
                                  {gp.isSecret ? (
                                    <Lock className="w-3 h-3 text-warning" />
                                  ) : (
                                    <Unlock className="w-3 h-3 text-fg-subtle" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCardPortent(front, gp.id)}
                                  className="btn btn-danger-ghost btn-icon h-6 w-6"
                                  title="Remover marco"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {viewRole === 'gm' && draft.open && (
                      <div className="card-muted p-2.5 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-fg-subtle shrink-0">Seg.</label>
                          <input
                            type="number"
                            min={1}
                            max={front.clockSegments}
                            value={draft.step}
                            onChange={(e) =>
                              setPortentDrafts((prev) => ({
                                ...prev,
                                [front.id]: { ...draft, step: Number(e.target.value) },
                              }))
                            }
                            className="input h-7 w-16 text-xs font-mono tabular-nums"
                          />
                          <input
                            type="text"
                            value={draft.text}
                            onChange={(e) =>
                              setPortentDrafts((prev) => ({
                                ...prev,
                                [front.id]: { ...draft, text: e.target.value },
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCardPortent(front);
                              }
                            }}
                            placeholder="Descrição do marco…"
                            className="input h-7 text-xs flex-1"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <label className="inline-flex items-center gap-1.5 text-xs text-fg-muted cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draft.isSecret}
                              onChange={(e) =>
                                setPortentDrafts((prev) => ({
                                  ...prev,
                                  [front.id]: { ...draft, isSecret: e.target.checked },
                                }))
                              }
                            />
                            <span>Oculto até disparar</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setPortentDrafts((prev) => ({
                                  ...prev,
                                  [front.id]: { ...draft, open: false },
                                }))
                              }
                              className="btn btn-secondary btn-sm h-7 text-xs"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddCardPortent(front)}
                              className="btn btn-primary btn-sm h-7 text-xs"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nota secreta do Mestre */}
                  {viewRole === 'gm' && front.gmSecretNote && (
                    <div className="card-muted p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Notas secretas do Mestre</span>
                      </div>
                      <div className="text-[13px] text-fg leading-relaxed">
                        <MentionText text={front.gmSecretNote} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Rodapé: Desfecho e Controles Rápidos */}
                <div className="p-4 pt-3 border-t border-line space-y-3 bg-surface-2/30">
                  <div className="rounded-md bg-surface border border-line p-3 space-y-1">
                    <div
                      className={`flex items-center gap-1.5 text-xs font-medium ${
                        kindKey === 'project' ? 'text-success' : isComplete ? 'text-danger' : 'text-warning'
                      }`}
                    >
                      {kindKey === 'project' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {kindKey === 'project' ? 'Conclusão do projeto' : 'Desfecho ao completar'}
                      </span>
                    </div>
                    <div className="text-[13px] text-fg leading-relaxed">
                      <MentionText text={front.impendingDoom} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
                    <span className="truncate max-w-[55%]" title={front.ignoreConsequence}>
                      {front.autoAdvance === false ? 'Avanço manual · ' : ''}
                      {front.ignoreConsequence}
                    </span>

                    {viewRole === 'gm' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => cycleClockStyle(front)}
                          className="btn btn-ghost btn-sm h-7 px-2 text-xs"
                          title="Alternar formato visual (Pizza / Anel / Barras)"
                        >
                          {front.clockStyle === 'ring'
                            ? 'Anel'
                            : front.clockStyle === 'bars'
                            ? 'Barras'
                            : 'Pizza'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void updateThreatFront(front.id, {
                              status: front.status === 'paused' ? 'active' : 'paused',
                            })
                          }
                          className="btn btn-ghost btn-icon h-7 w-7"
                          title={front.status === 'paused' ? 'Retomar frente' : 'Pausar frente'}
                        >
                          <PauseCircle
                            className={`w-4 h-4 ${
                              front.status === 'paused' ? 'text-warning' : ''
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void updateThreatFront(front.id, { isSecret: !front.isSecret })
                          }
                          className="btn btn-ghost btn-icon h-7 w-7"
                          title={
                            front.isSecret
                              ? 'Revelar relógio aos jogadores'
                              : 'Ocultar relógio dos jogadores'
                          }
                        >
                          {front.isSecret ? (
                            <EyeOff className="w-4 h-4 text-fg-subtle" />
                          ) : (
                            <Eye className="w-4 h-4 text-success" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(front)}
                          className="btn btn-ghost btn-icon h-7 w-7"
                          title="Personalizar frente e relógio"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteThreatFront(front.id)}
                          className="btn btn-danger-ghost btn-icon h-7 w-7"
                          title="Excluir frente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Completo de Criação e Personalização */}
      {modalOpen && (
        <div className="modal-backdrop">
          <form onSubmit={handleSaveModal} className="modal max-w-2xl max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line shrink-0">
              <h3 className="section-title">
                {editingFront ? `Personalizar "${editingFront.name}"` : 'Nova frente ou relógio'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingFront(null);
                }}
                className="btn btn-ghost btn-sm btn-icon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-5 overflow-y-auto">
              {/* Pré-visualização ao vivo do relógio */}
              <div className="card-muted p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-fg-subtle">Pré-visualização do relógio</div>
                  <div className="text-sm font-semibold text-fg">
                    {name.trim() || 'Título do relógio'} · {segments} segmentos
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {(['pie', 'ring', 'bars'] as ClockVisualStyle[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setClockStyle(st)}
                        className={`btn btn-sm h-7 text-xs ${
                          clockStyle === st ? 'btn-primary' : 'btn-secondary'
                        }`}
                      >
                        {st === 'pie' ? 'Pizza' : st === 'ring' ? 'Anel radial' : 'Barras'}
                      </button>
                    ))}
                  </div>
                </div>

                <ProgressClockSvg
                  segments={segments}
                  filled={filled}
                  size={86}
                  color={color}
                  style={clockStyle}
                  onSelectSegment={setFilled}
                />
              </div>

              {/* Nome, Tipo e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Nome da frente ou relógio</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Ritual do Eclipse, Cerco a Valen…"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select
                    value={kind}
                    onChange={(e) => {
                      const nextKind = e.target.value as ThreatFrontKind;
                      setKind(nextKind);
                      if (!editingFront) setColor(KIND_META[nextKind].defaultColor);
                    }}
                    className="input"
                  >
                    {(Object.keys(KIND_META) as ThreatFrontKind[]).map((k) => (
                      <option key={k} value={k}>
                        {KIND_META[k].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subtítulo, Escala, Entidade e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="label">Subtítulo</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Ex.: Ameaça iminente"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Escala / Escopo</label>
                  <input
                    type="text"
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                    placeholder="Local, Regional, Reino…"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Entidade vinculada</label>
                  <input
                    type="text"
                    list="front-entity-handles"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="Ex.: @CultoCinzento"
                    className="input"
                  />
                  <datalist id="front-entity-handles">
                    {entities.map((ent) => (
                      <option
                        key={ent.id}
                        value={`${ent.mentionPrefix}${ent.handle}`}
                      >
                        {ent.name}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ThreatFront['status'])}
                    className="input"
                  >
                    <option value="active">Ativo</option>
                    <option value="paused">Pausado</option>
                    <option value="triggered">Disparado</option>
                    <option value="resolved">Resolvido</option>
                  </select>
                </div>
              </div>

              {/* Segmentos (2 a 24) + Preenchimento inicial + Cor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">Segmentos (2 a 24)</label>
                    <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
                      <span>Preenchidos:</span>
                      <input
                        type="number"
                        min={0}
                        max={segments}
                        value={filled}
                        onChange={(e) =>
                          setFilled(
                            Math.max(0, Math.min(segments, Number(e.target.value) || 0))
                          )
                        }
                        className="input h-7 w-14 text-center font-mono tabular-nums"
                      />
                      <span>/</span>
                      <input
                        type="number"
                        min={2}
                        max={24}
                        value={segments}
                        onChange={(e) => {
                          const s = Math.max(2, Math.min(24, Number(e.target.value) || 4));
                          setSegments(s);
                          if (filled > s) setFilled(s);
                        }}
                        className="input h-7 w-14 text-center font-mono tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {SEGMENT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setSegments(preset);
                          if (filled > preset) setFilled(preset);
                        }}
                        className={`h-7 px-2 rounded text-xs font-mono border transition-colors ${
                          segments === preset
                            ? 'bg-accent text-accent-fg border-accent'
                            : 'bg-surface border-line text-fg-muted hover:text-fg'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="label mb-0">Cor do relógio</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {CLOCK_COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw}
                        type="button"
                        onClick={() => setColor(sw)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          color.toLowerCase() === sw.toLowerCase()
                            ? 'scale-110 border-fg'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw }}
                        aria-label={`Cor ${sw}`}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-7 p-0 border border-line rounded cursor-pointer bg-transparent"
                      title="Escolher cor personalizada"
                    />
                  </div>
                </div>
              </div>

              {/* Descrição, Desfecho e Consequência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Descrição pública / geral</label>
                  <MentionTextarea
                    rows={2}
                    value={desc}
                    onChange={setDesc}
                    placeholder="Contexto do relógio. Suporta @NPC e #Local."
                  />
                </div>
                <div>
                  <label className="label">Desfecho ao completar</label>
                  <input
                    type="text"
                    value={doom}
                    onChange={(e) => setDoom(e.target.value)}
                    placeholder="O que acontece quando chega ao máximo"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Condição / Gatilho de avanço</label>
                  <input
                    type="text"
                    value={consequence}
                    onChange={(e) => setConsequence(e.target.value)}
                    placeholder="Ex.: +1 a cada descanso longo na masmorra"
                    className="input"
                  />
                </div>
              </div>

              {/* Tags e Nota Secreta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Ex.: Ato 2, Guerra, Subterrâneo"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Notas secretas do Mestre</label>
                  <input
                    type="text"
                    value={gmSecretNote}
                    onChange={(e) => setGmSecretNote(e.target.value)}
                    placeholder="Nunca visível aos jogadores"
                    className="input"
                  />
                </div>
              </div>

              {/* Editor estruturado de Marcos / Presságios */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="label mb-0">Marcos por segmento</label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormPortents((prev) => [
                        ...prev,
                        {
                          id: `gp-${Date.now()}-${prev.length}`,
                          step: Math.min(segments, (prev[prev.length - 1]?.step || 0) + 1),
                          text: '',
                          triggered: false,
                          isSecret: false,
                        },
                      ])
                    }
                    className="btn btn-secondary btn-sm h-7 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar marco</span>
                  </button>
                </div>

                {formPortents.length === 0 ? (
                  <p className="text-xs text-fg-subtle">Nenhum marco configurado.</p>
                ) : (
                  <div className="space-y-2">
                    {formPortents.map((gp, idx) => (
                      <div key={gp.id} className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={segments}
                          value={gp.step}
                          onChange={(e) =>
                            setFormPortents((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, step: Number(e.target.value) } : item
                              )
                            )
                          }
                          title="Segmento em que dispara"
                          className="input h-8 w-16 font-mono tabular-nums text-xs"
                        />
                        <input
                          type="text"
                          value={gp.text}
                          onChange={(e) =>
                            setFormPortents((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, text: e.target.value } : item
                              )
                            )
                          }
                          placeholder="O que acontece neste segmento…"
                          className="input h-8 text-[13px] flex-1"
                        />
                        <label
                          className="inline-flex items-center gap-1 text-xs text-fg-muted shrink-0 cursor-pointer"
                          title="Oculto dos jogadores até disparar"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(gp.isSecret)}
                            onChange={(e) =>
                              setFormPortents((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, isSecret: e.target.checked } : item
                                )
                              )
                            }
                          />
                          <span>Secreto</span>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setFormPortents((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="btn btn-danger-ghost btn-icon h-8 w-8 shrink-0"
                          title="Remover marco"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Opções de Visibilidade e Auto-avanço */}
              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="inline-flex items-center gap-2 text-sm text-fg cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!isSecret}
                    onChange={(e) => setIsSecret(!e.target.checked)}
                    className="checkbox"
                  />
                  <span>Mostrar relógio para os jogadores</span>
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-fg cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    className="checkbox"
                  />
                  <span>Incluir em "Avançar automáticos (+1)"</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-surface-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingFront(null);
                }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {editingFront ? 'Salvar alterações' : 'Criar frente / relógio'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
