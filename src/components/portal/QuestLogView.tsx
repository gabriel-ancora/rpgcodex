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

const STATUS_META: Record<Quest['status'], { label: string; badge: string }> = {
  active: { label: 'Em andamento', badge: 'badge-info' },
  completed: { label: 'Concluída', badge: 'badge-success' },
  failed: { label: 'Falhou', badge: 'badge-danger' },
};

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
    <div className="space-y-4 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title">Missões</h2>
          <p className="text-[13px] text-fg-muted">
            Objetivos, recompensas e progresso do grupo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="segmented overflow-x-auto max-w-full">
            {(['all', 'active', 'completed', 'failed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`segmented-item ${
                  statusFilter === st ? 'segmented-item-active' : ''
                }`}
              >
                {st === 'all'
                  ? 'Todas'
                  : st === 'active'
                  ? 'Ativas'
                  : st === 'completed'
                  ? 'Concluídas'
                  : 'Falhas'}
              </button>
            ))}
          </div>

          {viewRole === 'gm' && (
            <button onClick={() => setShowAddQuest(true)} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              <span>Nova missão</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {filteredQuests.length === 0 ? (
        <div className="card py-12 px-6 text-center">
          <Scroll className="w-5 h-5 text-fg-subtle mx-auto mb-3" />
          <h3 className="text-sm font-medium text-fg">Nenhuma missão encontrada</h3>
          <p className="text-[13px] text-fg-muted max-w-md mx-auto mt-1">
            {statusFilter === 'all'
              ? 'Nenhuma missão registrada nesta campanha.'
              : 'Nenhuma missão corresponde ao filtro selecionado.'}
          </p>
          {viewRole === 'gm' && (
            <button onClick={() => setShowAddQuest(true)} className="btn btn-primary btn-sm mt-4">
              Criar missão
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredQuests.map((quest) => {
            const completedCount = quest.objectives.filter((o) => o.completed).length;
            const totalCount = Math.max(1, quest.objectives.length);
            const pct = Math.round((completedCount / totalCount) * 100);
            const meta = STATUS_META[quest.status];

            return (
              <div
                key={quest.id}
                className={`card flex flex-col justify-between ${
                  quest.status === 'failed' ? 'opacity-75' : ''
                }`}
              >
                <div className="p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge ${meta.badge}`}>{meta.label}</span>
                        <span className="text-xs text-fg-subtle">{quest.subtitle}</span>
                      </div>
                      <h3 className="text-base font-semibold text-fg">{quest.title}</h3>
                    </div>

                    {viewRole === 'gm' && (
                      <select
                        value={quest.status}
                        onChange={(e) =>
                          updateQuestStatus(quest.id, e.target.value as Quest['status'])
                        }
                        className="input h-8 w-auto text-[13px]"
                        aria-label="Status da missão"
                      >
                        <option value="active">Em andamento</option>
                        <option value="completed">Concluída</option>
                        <option value="failed">Falhou</option>
                      </select>
                    )}
                  </div>

                  {/* Patrono e local */}
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <dt className="text-fg-subtle">Patrono</dt>
                      <dd className="truncate">
                        <MentionText text={quest.giverHandle} className="inline" />
                      </dd>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <dt className="text-fg-subtle">Local</dt>
                      <dd className="truncate">
                        <MentionText text={quest.locationHandle} className="inline" />
                      </dd>
                    </div>
                  </dl>

                  {/* Descrição */}
                  <div className="text-sm text-fg leading-relaxed">
                    <MentionText text={quest.description} />
                  </div>

                  {/* Objetivos */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-fg-muted">
                        Objetivos{' '}
                        <span className="tabular-nums text-fg-subtle font-normal">
                          {completedCount}/{quest.objectives.length}
                        </span>
                      </span>
                      <span className="tabular-nums text-fg-subtle">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          pct === 100 ? 'bg-success' : 'bg-fg-muted'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <ul className="rounded-md border border-line divide-y divide-line overflow-hidden">
                      {quest.objectives.map((obj) => (
                        <li
                          key={obj.id}
                          onClick={() => toggleQuestObjective(quest.id, obj.id)}
                          className={`px-3 py-2 text-[13px] flex items-start gap-2.5 cursor-pointer hover:bg-surface-2 transition-colors ${
                            obj.completed ? 'text-fg-subtle line-through' : 'text-fg'
                          }`}
                        >
                          {obj.completed ? (
                            <CheckSquare className="w-4 h-4 text-success shrink-0 mt-px" />
                          ) : (
                            <Square className="w-4 h-4 text-fg-subtle shrink-0 mt-px" />
                          )}
                          <div className="flex-1 leading-relaxed">
                            <MentionText text={obj.text} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Nota do mestre */}
                  {viewRole === 'gm' && quest.gmSecretNote && (
                    <div className="card-muted p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Nota do mestre</span>
                      </div>
                      <div className="text-[13px] text-fg leading-relaxed">
                        <MentionText text={quest.gmSecretNote} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Recompensa */}
                <div className="px-4 py-2.5 border-t border-line flex items-center gap-2 text-[13px] text-fg">
                  <Coins className="w-4 h-4 text-fg-subtle shrink-0" />
                  <span>
                    <span className="text-fg-subtle">Recompensa:</span> {quest.reward}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: nova missão */}
      {showAddQuest && (
        <div className="modal-backdrop">
          <form onSubmit={handleCreateQuest} className="modal max-w-md max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
              <h3 className="section-title">Nova missão</h3>
              <button
                type="button"
                onClick={() => setShowAddQuest(false)}
                className="btn btn-ghost btn-sm btn-icon"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              <div>
                <label className="label">Título</label>
                <input
                  type="text"
                  required
                  value={qTitle}
                  onChange={(e) => setQTitle(e.target.value)}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Patrono</label>
                  <input
                    type="text"
                    value={qGiver}
                    onChange={(e) => setQGiver(e.target.value)}
                    placeholder="Ex.: @CapitaoGuarda"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Local</label>
                  <input
                    type="text"
                    value={qLoc}
                    onChange={(e) => setQLoc(e.target.value)}
                    placeholder="Ex.: #RuinasNorte"
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea
                  rows={2}
                  value={qDesc}
                  onChange={(e) => setQDesc(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Objetivos</label>
                <textarea
                  rows={3}
                  value={qObjs}
                  onChange={(e) => setQObjs(e.target.value)}
                  placeholder="Um por linha"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Recompensa</label>
                <input
                  type="text"
                  value={qReward}
                  onChange={(e) => setQReward(e.target.value)}
                  placeholder="Ex.: 300 PO"
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-surface-2">
              <button
                type="button"
                onClick={() => setShowAddQuest(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Criar missão
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
