import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { Quest } from '../../types/campaign';
import { MentionText } from '../common/MentionText';
import {
  Scroll,
  CheckSquare,
  Square,
  Coins,
  Plus,
  Lock,
  X,
} from 'lucide-react';

export const QuestLogView: React.FC = () => {
  const quests = useCampaignStore((s) => s.quests);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const toggleQuestObjective = useCampaignStore((s) => s.toggleQuestObjective);
  const updateQuestStatus = useCampaignStore((s) => s.updateQuestStatus);
  const addQuest = useCampaignStore((s) => s.addQuest);

  const [statusFilter, setStatusFilter] = useState<Quest['status'] | 'all'>('all');
  const [showAddQuest, setShowAddQuest] = useState(false);

  const [qTitle, setQTitle] = useState('');
  const [qSub, setQSub] = useState('');
  const [qGiver, setQGiver] = useState('');
  const [qLoc, setQLoc] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qReward, setQReward] = useState('');
  const [qObjs, setQObjs] = useState('');

  const filteredQuests = quests.filter((q) => {
    if (viewRole === 'player' && !q.isPublic) return false;
    if (statusFilter === 'all') return true;
    return q.status === statusFilter;
  });

  const handleCreateQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qTitle.trim()) return;
    const objLines = qObjs
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    addQuest({
      title: qTitle.trim(),
      subtitle: qSub.trim() || 'Contrato de aventura',
      giverHandle: qGiver.trim() || '@Patrono',
      locationHandle: qLoc.trim() || '#Local',
      status: 'active',
      isPublic: true,
      description: qDesc.trim() || 'Nova missão publicada para o grupo.',
      reward: qReward.trim() || 'A negociar',
      objectives:
        objLines.length > 0
          ? objLines.map((t, i) => ({
              id: `obj-${Date.now()}-${i}`,
              text: t,
              completed: false,
            }))
          : [
              {
                id: `obj-${Date.now()}-1`,
                text: 'Investigar os rumores locais',
                completed: false,
              },
            ],
    });
    setQTitle('');
    setQSub('');
    setQGiver('');
    setQLoc('');
    setQDesc('');
    setQReward('');
    setQObjs('');
    setShowAddQuest(false);
  };

  return (
    <div className="space-y-5 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1">
      {/* Header Bar */}
      <div className="p-4 rounded-xl surface-panel flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
            Missões & contratos
          </h2>
          <p className="text-xs text-zinc-500">
            Objetivos ativos, recompensas acordadas e progresso do grupo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#0e0e11] border border-white/[0.06] rounded-lg p-1">
            {(['all', 'active', 'completed', 'failed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {st === 'all'
                  ? 'Todas'
                  : st === 'active'
                  ? 'Ativas'
                  : st === 'completed'
                  ? 'Concluídas'
                  : 'Falhadas'}
              </button>
            ))}
          </div>

          {viewRole === 'gm' && (
            <button
              onClick={() => setShowAddQuest(true)}
              className="btn-solid px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova missão</span>
            </button>
          )}
        </div>
      </div>

      {/* Quests Grid */}
      {filteredQuests.length === 0 ? (
        <div className="py-14 px-6 rounded-xl surface-panel text-center space-y-3">
          <Scroll className="w-6 h-6 text-zinc-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-zinc-300">
              Nenhuma missão encontrada
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              {statusFilter === 'all'
                ? 'Nenhum contrato registrado para esta campanha.'
                : 'Nenhuma missão corresponde ao filtro selecionado.'}
            </p>
          </div>
          {viewRole === 'gm' && (
            <button
              onClick={() => setShowAddQuest(true)}
              className="btn-solid px-4 py-2 rounded-lg text-xs"
            >
              Publicar primeira missão
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredQuests.map((quest) => {
            const completedCount = quest.objectives.filter(
              (o) => o.completed
            ).length;
            const totalCount = Math.max(1, quest.objectives.length);
            const pct = Math.round((completedCount / totalCount) * 100);

            return (
              <div
                key={quest.id}
                className={`p-5 rounded-xl surface-panel flex flex-col justify-between gap-4 ${
                  quest.status === 'failed' ? 'opacity-75' : ''
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              quest.status === 'active'
                                ? 'bg-amber-400'
                                : quest.status === 'completed'
                                ? 'bg-emerald-400'
                                : 'bg-rose-400'
                            }`}
                          />
                          {quest.status === 'active'
                            ? 'Em andamento'
                            : quest.status === 'completed'
                            ? 'Concluída'
                            : 'Falhada'}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-xs text-zinc-500">
                          {quest.subtitle}
                        </span>
                      </div>

                      <h3 className="text-xl font-serif font-medium text-zinc-100">
                        {quest.title}
                      </h3>
                    </div>

                    {viewRole === 'gm' && (
                      <select
                        value={quest.status}
                        onChange={(e) =>
                          updateQuestStatus(
                            quest.id,
                            e.target.value as Quest['status']
                          )
                        }
                        className="input-clean px-2.5 py-1 rounded-lg text-xs"
                      >
                        <option value="active">Em andamento</option>
                        <option value="completed">Concluída</option>
                        <option value="failed">Falhada</option>
                      </select>
                    )}
                  </div>

                  {/* Giver & Location */}
                  <div className="flex flex-wrap items-center gap-3 text-xs bg-[#0e0e11] px-3 py-2 rounded-lg border border-white/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Patrono:</span>
                      <MentionText text={quest.giverHandle} className="inline" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Local:</span>
                      <MentionText text={quest.locationHandle} className="inline" />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    <MentionText text={quest.description} />
                  </div>

                  {/* Objectives */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className="text-zinc-400">
                        Objetivos ({completedCount}/{quest.objectives.length})
                      </span>
                      <span className="text-zinc-300">{pct}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-white/[0.07] overflow-hidden">
                      <div
                        className="h-full bg-zinc-200 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {quest.objectives.map((obj) => (
                        <div
                          key={obj.id}
                          onClick={() => toggleQuestObjective(quest.id, obj.id)}
                          className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 cursor-pointer transition-colors ${
                            obj.completed
                              ? 'bg-white/[0.02] border-white/[0.05] text-zinc-500 line-through'
                              : 'bg-[#0e0e11] border-white/[0.06] hover:border-white/[0.14] text-zinc-200'
                          }`}
                        >
                          {obj.completed ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 leading-relaxed">
                            <MentionText text={obj.text} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* GM Secret Note */}
                  {viewRole === 'gm' && quest.gmSecretNote && (
                    <div className="p-3 rounded-xl bg-rose-500/[0.04] border border-rose-500/20 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-300">
                        <Lock className="w-3 h-3" />
                        <span>Nota confidencial do mestre</span>
                      </div>
                      <div className="text-xs text-zinc-300 leading-relaxed">
                        <MentionText text={quest.gmSecretNote} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Reward Footer */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2 text-xs text-zinc-300">
                  <Coins className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span>
                    <span className="text-zinc-500">Recompensa:</span> {quest.reward}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Quest */}
      {showAddQuest && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateQuest}
            className="w-full max-w-md rounded-2xl bg-[#121215] border border-white/[0.09] p-6 space-y-3.5 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-semibold text-zinc-100">
                Nova missão
              </h3>
              <button
                type="button"
                onClick={() => setShowAddQuest(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={qTitle}
              onChange={(e) => setQTitle(e.target.value)}
              placeholder="Título da missão"
              className="input-clean w-full px-3 py-2 rounded-lg"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={qGiver}
                onChange={(e) => setQGiver(e.target.value)}
                placeholder="Patrono (ex: @CapitaoGuarda)"
                className="input-clean px-3 py-1.5 rounded-lg"
              />
              <input
                type="text"
                value={qLoc}
                onChange={(e) => setQLoc(e.target.value)}
                placeholder="Local (ex: #RuinasNorte)"
                className="input-clean px-3 py-1.5 rounded-lg"
              />
            </div>
            <textarea
              rows={2}
              value={qDesc}
              onChange={(e) => setQDesc(e.target.value)}
              placeholder="Descrição da missão..."
              className="input-clean w-full px-3 py-2 rounded-lg"
            />
            <textarea
              rows={3}
              value={qObjs}
              onChange={(e) => setQObjs(e.target.value)}
              placeholder="Objetivos parciais (1 por linha)..."
              className="input-clean w-full px-3 py-2 rounded-lg"
            />
            <input
              type="text"
              value={qReward}
              onChange={(e) => setQReward(e.target.value)}
              placeholder="Recompensa prometida (ex: 300 PO)"
              className="input-clean w-full px-3 py-2 rounded-lg"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddQuest(false)}
                className="btn-subtle px-3.5 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-solid px-4 py-2 rounded-lg"
              >
                Publicar missão
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
