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
    <div className="space-y-5 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1">
      {/* Header Bar */}
      <div className="p-4 rounded-xl surface-panel flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
            Frentes de ameaça
          </h2>
          <p className="text-xs text-zinc-500">
            Relógios de progresso e eventos que avançam nos bastidores da campanha.
          </p>
        </div>

        {viewRole === 'gm' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={advanceIgnoredFronts}
              className="btn-subtle px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
            >
              <FastForward className="w-3.5 h-3.5 text-rose-400" />
              <span>Avançar pendentes (+1)</span>
            </button>

            <button
              onClick={() => setShowNewModal(true)}
              className="btn-solid px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova frente</span>
            </button>
          </div>
        )}
      </div>

      {/* Fronts Grid */}
      {visibleFronts.length === 0 ? (
        <div className="py-14 px-6 rounded-xl surface-panel text-center space-y-2.5">
          <Flame className="w-6 h-6 text-zinc-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-zinc-300">
              Nenhuma frente ativa
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Crie frentes e relógios de 4, 6 ou 8 segmentos para acompanhar planos de facções e perigos iminentes.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {visibleFronts.map((front) => {
            const isComplete = front.clockFilled >= front.clockSegments;
            const isEditing = editingFrontId === front.id;

            return (
              <div
                key={front.id}
                className={`rounded-xl bg-[#111114] border p-5 flex flex-col justify-between gap-4 transition-colors ${
                  isComplete
                    ? 'border-rose-500/45'
                    : 'border-white/[0.07] hover:border-white/[0.13]'
                }`}
              >
                <div className="space-y-4">
                  {/* Card Header & Clock */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            isComplete
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-white/[0.04] text-zinc-400 border-white/[0.07]'
                          }`}
                        >
                          {isComplete
                            ? 'Concluído'
                            : `${front.clockSegments} segmentos`}
                        </span>
                        {front.isSecret && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.07]">
                            <Lock className="w-2.5 h-2.5 text-rose-400/80" /> Oculta
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-1 text-xs">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="input-clean w-full px-2.5 py-1.5 rounded-md font-medium"
                          />
                          <div>
                            <label className="text-[11px] text-zinc-400 block mb-1">
                              Segmentos do relógio
                            </label>
                            <select
                              value={editSegments}
                              onChange={(e) =>
                                setEditSegments(Number(e.target.value) as 4 | 6 | 8)
                              }
                              className="input-clean w-full px-2 py-1 rounded-md text-xs"
                            >
                              <option value={4}>4 segmentos (curto)</option>
                              <option value={6}>6 segmentos (médio)</option>
                              <option value={8}>8 segmentos (longo)</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-lg font-serif font-medium text-zinc-100 leading-snug">
                            {front.name}
                          </h3>
                          <div className="text-xs text-zinc-400">
                            <MentionText text={front.subtitle} />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Radial Clock */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <ProgressClockSvg
                        segments={front.clockSegments}
                        filled={front.clockFilled}
                        size={92}
                        onSelectSegment={
                          viewRole === 'gm'
                            ? (val) => setFrontClockValue(front.id, val)
                            : undefined
                        }
                      />
                      {viewRole === 'gm' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setFrontClockValue(front.id, front.clockFilled - 1)
                            }
                            className="btn-subtle p-1 rounded"
                            title="Retroceder 1 segmento"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() =>
                              setFrontClockValue(front.id, front.clockFilled + 1)
                            }
                            className="btn-subtle px-2 py-0.5 rounded text-[11px] font-mono tabular-nums"
                            title="Avançar 1 segmento"
                          >
                            +1
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    <MentionText text={front.description} />
                  </div>

                  {/* Grim Portents */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-zinc-500">
                      Presságios & escalada
                    </div>
                    <div className="space-y-1">
                      {front.grimPortents.map((gp) => (
                        <div
                          key={gp.id}
                          onClick={() =>
                            viewRole === 'gm' && toggleFrontPortent(front.id, gp.id)
                          }
                          className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 transition-colors ${
                            viewRole === 'gm' ? 'cursor-pointer' : ''
                          } ${
                            gp.triggered
                              ? 'bg-white/[0.04] border-white/[0.10] text-zinc-200'
                              : 'bg-[#0e0e11] border-white/[0.05] text-zinc-500'
                          }`}
                        >
                          {gp.triggered ? (
                            <CheckSquare className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 leading-relaxed">
                            <span className="font-mono text-[10px] text-zinc-500 mr-1.5 tabular-nums">
                              {gp.step}.
                            </span>
                            <MentionText text={gp.text} className="inline" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Impending Doom Footer */}
                <div className="space-y-2.5 pt-3 border-t border-white/[0.06]">
                  <div className="p-3 rounded-lg bg-rose-500/[0.04] border border-rose-500/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-300/90">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Desfecho iminente</span>
                    </div>
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={editDoom}
                        onChange={(e) => setEditDoom(e.target.value)}
                        className="input-clean w-full px-2 py-1 rounded text-xs"
                      />
                    ) : (
                      <div className="text-xs text-zinc-300 leading-relaxed">
                        <MentionText text={front.impendingDoom} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                    <span className="truncate">{front.ignoreConsequence}</span>
                    {viewRole === 'gm' && (
                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => {
                                updateThreatFront(front.id, {
                                  name: editName,
                                  clockSegments: editSegments,
                                  impendingDoom: editDoom,
                                });
                                setEditingFrontId(null);
                              }}
                              className="btn-solid px-2.5 py-1 rounded text-xs inline-flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Salvar
                            </button>
                            <button
                              onClick={() => setEditingFrontId(null)}
                              className="btn-subtle p-1 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
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
                              className="p-1.5 rounded hover:bg-white/[0.05] text-zinc-500 hover:text-zinc-200 transition-colors"
                              title="Editar frente"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteThreatFront(front.id)}
                              className="p-1.5 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors"
                              title="Excluir frente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal: Create New Threat Front */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFront}
            className="w-full max-w-lg rounded-2xl bg-[#121215] border border-white/[0.09] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-semibold text-zinc-100">
                Nova frente de ameaça
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da frente (ex: Invasão da Horda Cinzenta)"
                className="input-clean w-full px-3 py-2 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Subtítulo ou escala"
                  className="input-clean px-3 py-2 rounded-lg"
                />
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="Entidade ligada (ex: @CultoCinzento)"
                  className="input-clean px-3 py-2 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Segmentos do relógio
                </label>
                <div className="flex gap-2">
                  {([4, 6, 8] as const).map((seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setSegments(seg)}
                      className={`flex-1 py-1.5 rounded-lg border font-mono text-xs transition-colors ${
                        segments === seg
                          ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold'
                          : 'bg-[#0e0e11] text-zinc-400 border-white/[0.07] hover:text-zinc-200'
                      }`}
                    >
                      {seg} fatias
                    </button>
                  ))}
                </div>
              </div>

              <MentionTextarea
                rows={2}
                value={desc}
                onChange={setDesc}
                placeholder="Descrição da ameaça (suporta @NPC e #Local)..."
              />

              <input
                type="text"
                value={doom}
                onChange={(e) => setDoom(e.target.value)}
                placeholder="Desfecho caso o relógio se complete..."
                className="input-clean w-full px-3 py-2 rounded-lg"
              />

              <textarea
                rows={3}
                value={portentText}
                onChange={(e) => setPortentText(e.target.value)}
                placeholder="Presságios de escalada (1 por linha)..."
                className="input-clean w-full px-3 py-2 rounded-lg"
              />

              <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => setIsSecret(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900"
                />
                <span>Manter frente oculta dos jogadores</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="btn-subtle px-3.5 py-2 rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-solid px-4 py-2 rounded-lg text-xs"
              >
                Criar frente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
