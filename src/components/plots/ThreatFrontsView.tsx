import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
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
  Minus,
  Edit3,
  Check,
  X,
} from 'lucide-react';

export const ThreatFrontsView: React.FC = () => {
  const fronts = useCampaignStore((s) => s.fronts);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const setFrontClockValue = useCampaignStore((s) => s.setFrontClockValue);
  const advanceIgnoredFronts = useCampaignStore((s) => s.advanceIgnoredFronts);
  const toggleFrontPortent = useCampaignStore((s) => s.toggleFrontPortent);
  const addThreatFront = useCampaignStore((s) => s.addThreatFront);
  const updateThreatFront = useCampaignStore((s) => s.updateThreatFront);
  const deleteThreatFront = useCampaignStore((s) => s.deleteThreatFront);

  const [showNewModal, setShowNewModal] = useState(false);
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [handle, setHandle] = useState('');
  const [segments, setSegments] = useState<4 | 6 | 8>(6);
  const [desc, setDesc] = useState('');
  const [doom, setDoom] = useState('');
  const [consequence, setConsequence] = useState('');
  const [portentText, setPortentText] = useState('');
  const [isSecret, setIsSecret] = useState(false);

  const [editingFrontId, setEditingFrontId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDoom, setEditDoom] = useState('');
  const [editSegments, setEditSegments] = useState<4 | 6 | 8 | 12>(6);

  const visibleFronts = fronts.filter((f) => viewRole === 'gm' || !f.isSecret);

  const handleCreateFront = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const lines = portentText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    addThreatFront({
      name: name.trim(),
      subtitle: subtitle.trim() || 'Frente ativa',
      associatedEntityHandle: handle.trim(),
      description: desc.trim() || 'Ameaça em andamento no cenário.',
      clockSegments: segments,
      clockFilled: 1,
      impendingDoom: doom.trim() || 'Consequência crítica caso o relógio se complete.',
      ignoreConsequence:
        consequence.trim() || 'Avança +1 segmento a cada sessão sem intervenção.',
      grimPortents:
        lines.length > 0
          ? lines.map((t, idx) => ({
              id: `gp-${Date.now()}-${idx}`,
              step: idx + 1,
              text: t,
              triggered: idx === 0,
            }))
          : [
              { id: `gp-${Date.now()}-1`, step: 1, text: 'Primeiros sinais da ameaça surgem.', triggered: true },
              { id: `gp-${Date.now()}-2`, step: 2, text: 'Aliados locais sofrem pressão direta.', triggered: false },
              { id: `gp-${Date.now()}-3`, step: 3, text: 'O golpe final da frente é executado.', triggered: false },
            ],
      status: 'active',
      isSecret,
    });
    setName('');
    setSubtitle('');
    setDesc('');
    setDoom('');
    setConsequence('');
    setPortentText('');
    setShowNewModal(false);
  };

  return (
    <div className="space-y-4 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title">Frentes de ameaça</h2>
          <p className="text-[13px] text-fg-muted">
            Relógios de progresso e eventos que avançam fora de cena.
          </p>
        </div>

        {viewRole === 'gm' && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={advanceIgnoredFronts} className="btn btn-secondary btn-sm">
              <FastForward className="w-4 h-4" />
              <span>Avançar pendentes (+1)</span>
            </button>

            <button onClick={() => setShowNewModal(true)} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              <span>Nova frente</span>
            </button>
          </div>
        )}
      </div>

      {/* Lista de frentes */}
      {visibleFronts.length === 0 ? (
        <div className="card py-12 px-6 text-center">
          <Flame className="w-5 h-5 text-fg-subtle mx-auto mb-3" />
          <h3 className="text-sm font-medium text-fg">Nenhuma frente ativa</h3>
          <p className="text-[13px] text-fg-muted max-w-md mx-auto mt-1">
            Crie frentes com relógios de 4, 6 ou 8 segmentos para acompanhar planos de facções e
            perigos iminentes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {visibleFronts.map((front) => {
            const isComplete = front.clockFilled >= front.clockSegments;
            const isEditing = editingFrontId === front.id;

            return (
              <div
                key={front.id}
                className={`card p-4 flex flex-col justify-between gap-4 ${
                  isComplete ? 'border-danger/50' : ''
                }`}
              >
                <div className="space-y-4">
                  {/* Cabeçalho do card e relógio */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`badge ${isComplete ? 'badge-danger' : ''}`}>
                          {isComplete ? 'Concluído' : `${front.clockSegments} segmentos`}
                        </span>
                        {front.isSecret && (
                          <span className="badge">
                            <Lock className="w-3 h-3" /> Oculta
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="label">Nome</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="input"
                            />
                          </div>
                          <div>
                            <label className="label">Segmentos do relógio</label>
                            <select
                              value={editSegments}
                              onChange={(e) =>
                                setEditSegments(Number(e.target.value) as 4 | 6 | 8)
                              }
                              className="input"
                            >
                              <option value={4}>4 segmentos (curto)</option>
                              <option value={6}>6 segmentos (médio)</option>
                              <option value={8}>8 segmentos (longo)</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-base font-semibold text-fg leading-snug">
                            {front.name}
                          </h3>
                          <div className="text-[13px] text-fg-muted">
                            <MentionText text={front.subtitle} />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Relógio */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <ProgressClockSvg
                        segments={front.clockSegments}
                        filled={front.clockFilled}
                        size={88}
                        onSelectSegment={
                          viewRole === 'gm'
                            ? (val) => setFrontClockValue(front.id, val)
                            : undefined
                        }
                      />
                      {viewRole === 'gm' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setFrontClockValue(front.id, front.clockFilled - 1)}
                            className="btn btn-secondary btn-sm btn-icon"
                            title="Retroceder 1 segmento"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setFrontClockValue(front.id, front.clockFilled + 1)}
                            className="btn btn-secondary btn-sm btn-icon"
                            title="Avançar 1 segmento"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Descrição */}
                  <div className="text-sm text-fg leading-relaxed">
                    <MentionText text={front.description} />
                  </div>

                  {/* Presságios */}
                  <div className="space-y-2">
                    <div className="eyebrow">Presságios</div>
                    <ul className="rounded-md border border-line divide-y divide-line overflow-hidden">
                      {front.grimPortents.map((gp) => (
                        <li
                          key={gp.id}
                          onClick={() => viewRole === 'gm' && toggleFrontPortent(front.id, gp.id)}
                          className={`px-3 py-2 text-[13px] flex items-start gap-2 transition-colors ${
                            viewRole === 'gm' ? 'cursor-pointer hover:bg-surface-2' : ''
                          } ${gp.triggered ? 'text-fg' : 'text-fg-subtle'}`}
                        >
                          {gp.triggered ? (
                            <CheckSquare className="w-4 h-4 text-fg shrink-0 mt-px" />
                          ) : (
                            <Square className="w-4 h-4 text-fg-subtle shrink-0 mt-px" />
                          )}
                          <div className="flex-1 leading-relaxed">
                            <span className="tabular-nums text-fg-subtle mr-1.5">{gp.step}.</span>
                            <MentionText text={gp.text} className="inline" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Desfecho */}
                <div className="space-y-3 pt-3 border-t border-line">
                  <div className="rounded-md bg-surface-2 border border-line p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-danger">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Desfecho iminente</span>
                    </div>
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={editDoom}
                        onChange={(e) => setEditDoom(e.target.value)}
                        className="input"
                      />
                    ) : (
                      <div className="text-[13px] text-fg leading-relaxed">
                        <MentionText text={front.impendingDoom} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-fg-subtle">
                    <span className="truncate">{front.ignoreConsequence}</span>
                    {viewRole === 'gm' && (
                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => setEditingFrontId(null)}
                              className="btn btn-ghost btn-sm"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => {
                                updateThreatFront(front.id, {
                                  name: editName,
                                  clockSegments: editSegments,
                                  impendingDoom: editDoom,
                                });
                                setEditingFrontId(null);
                              }}
                              className="btn btn-primary btn-sm"
                            >
                              <Check className="w-4 h-4" /> Salvar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingFrontId(front.id);
                                setEditName(front.name);
                                setEditDoom(front.impendingDoom);
                                setEditSegments(front.clockSegments);
                              }}
                              className="btn btn-ghost btn-sm btn-icon"
                              title="Editar frente"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteThreatFront(front.id)}
                              className="btn btn-danger-ghost btn-sm btn-icon"
                              title="Excluir frente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: nova frente */}
      {showNewModal && (
        <div className="modal-backdrop">
          <form onSubmit={handleCreateFront} className="modal max-w-lg max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
              <h3 className="section-title">Nova frente de ameaça</h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="btn btn-ghost btn-sm btn-icon"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              <div>
                <label className="label">Nome</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Invasão da Horda Cinzenta"
                  className="input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Subtítulo ou escala</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Ex.: Regional"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Entidade ligada</label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="Ex.: @CultoCinzento"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Segmentos do relógio</label>
                <div className="segmented w-full">
                  {([4, 6, 8] as const).map((seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setSegments(seg)}
                      className={`segmented-item flex-1 ${
                        segments === seg ? 'segmented-item-active' : ''
                      }`}
                    >
                      {seg} segmentos
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Descrição</label>
                <MentionTextarea
                  rows={2}
                  value={desc}
                  onChange={setDesc}
                  placeholder="Suporta @NPC e #Local"
                />
              </div>

              <div>
                <label className="label">Desfecho</label>
                <input
                  type="text"
                  value={doom}
                  onChange={(e) => setDoom(e.target.value)}
                  placeholder="O que acontece se o relógio se completar"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Presságios</label>
                <textarea
                  rows={3}
                  value={portentText}
                  onChange={(e) => setPortentText(e.target.value)}
                  placeholder="Um por linha"
                  className="input"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => setIsSecret(e.target.checked)}
                  className="checkbox"
                />
                <span>Ocultar dos jogadores</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-surface-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Criar frente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
