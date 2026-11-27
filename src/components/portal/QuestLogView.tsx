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
  Eye,
  EyeOff,
  Trash2,
  Pencil,
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
  const updateQuest = useCampaignStore((s) => s.updateQuest);
  const addQuest = useCampaignStore((s) => s.addQuest);
  const deleteQuest = useCampaignStore((s) => s.deleteQuest);

  const [statusFilter, setStatusFilter] = useState<Quest['status'] | 'all'>('all');
  const [showQuestModal, setShowQuestModal] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [newObjDrafts, setNewObjDrafts] = useState<Record<string, string>>({});

  const [qTitle, setQTitle] = useState('');
  const [qSub, setQSub] = useState('');
  const [qGiver, setQGiver] = useState('');
  const [qLoc, setQLoc] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qReward, setQReward] = useState('');
  const [qSecretNote, setQSecretNote] = useState('');
  const [qIsPublic, setQIsPublic] = useState(true);
  const [qObjs, setQObjs] = useState('');

  const filteredQuests = quests.filter((q) => {
    if (viewRole === 'player' && !q.isPublic) return false;
    if (statusFilter === 'all') return true;
    return q.status === statusFilter;
  });

  const openCreateModal = () => {
    setEditingQuest(null);
    setQTitle('');
    setQSub('');
    setQGiver('');
    setQLoc('');
    setQDesc('');
    setQReward('');
    setQSecretNote('');
    setQIsPublic(true);
    setQObjs('');
    setShowQuestModal(true);
  };

  const openEditModal = (quest: Quest) => {
    setEditingQuest(quest);
    setQTitle(quest.title);
    setQSub(quest.subtitle);
    setQGiver(quest.giverHandle);
    setQLoc(quest.locationHandle);
    setQDesc(quest.description);
    setQReward(quest.reward);
    setQSecretNote(quest.gmSecretNote || '');
    setQIsPublic(quest.isPublic);
    setQObjs(quest.objectives.map((o) => o.text).join('\n'));
    setShowQuestModal(true);
  };

  const handleSaveQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qTitle.trim()) return;
    const objLines = qObjs
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (editingQuest) {
      const existingByText = new Map(editingQuest.objectives.map((o) => [o.text, o]));
      const nextObjectives =
        objLines.length > 0
          ? objLines.map((t, i) => {
              const prev = existingByText.get(t);
              return (
                prev || {
                  id: `obj-${Date.now()}-${i}`,
                  text: t,
                  completed: false,
                }
              );
            })
          : editingQuest.objectives;

      void updateQuest(editingQuest.id, {
        title: qTitle.trim(),
        subtitle: qSub.trim() || 'Contrato de aventura',
        giverHandle: qGiver.trim() || '@Patrono',
        locationHandle: qLoc.trim() || '#Local',
        isPublic: qIsPublic,
        description: qDesc.trim() || 'Nova missão publicada para o grupo.',
        gmSecretNote: qSecretNote.trim() || undefined,
        reward: qReward.trim() || 'A negociar',
        objectives: nextObjectives,
      });
    } else {
      void addQuest({
        title: qTitle.trim(),
        subtitle: qSub.trim() || 'Contrato de aventura',
        giverHandle: qGiver.trim() || '@Patrono',
        locationHandle: qLoc.trim() || '#Local',
        status: 'active',
        isPublic: qIsPublic,
        description: qDesc.trim() || 'Nova missão publicada para o grupo.',
        gmSecretNote: qSecretNote.trim() || undefined,
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
    }

    setShowQuestModal(false);
    setEditingQuest(null);
  };

  const handleAddInlineObjective = (quest: Quest) => {
    const draft = (newObjDrafts[quest.id] || '').trim();
    if (!draft) return;
    void updateQuest(quest.id, {
      objectives: [
        ...quest.objectives,
        { id: `obj-${Date.now()}`, text: draft, completed: false },
      ],
    });
    setNewObjDrafts((prev) => ({ ...prev, [quest.id]: '' }));
  };

  const handleRemoveObjective = (quest: Quest, objectiveId: string) => {
    void updateQuest(quest.id, {
      objectives: quest.objectives.filter((o) => o.id !== objectiveId),
    });
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
            <button onClick={openCreateModal} className="btn btn-primary btn-sm">
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
            <button onClick={openCreateModal} className="btn btn-primary btn-sm mt-4">
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
                        {viewRole === 'gm' && !quest.isPublic && (
                          <span className="badge badge-warning">Oculta dos jogadores</span>
                        )}
                        <span className="text-xs text-fg-subtle">{quest.subtitle}</span>
                      </div>
                      <h3 className="text-base font-semibold text-fg">{quest.title}</h3>
                    </div>

                    {viewRole === 'gm' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={quest.status}
                          onChange={(e) =>
                            void updateQuestStatus(quest.id, e.target.value as Quest['status'])
                          }
                          className="input h-8 w-auto text-[13px]"
                          aria-label="Status da missão"
                        >
                          <option value="active">Em andamento</option>
                          <option value="completed">Concluída</option>
                          <option value="failed">Falhou</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => void updateQuest(quest.id, { isPublic: !quest.isPublic })}
                          className="btn btn-ghost btn-sm btn-icon"
                          title={
                            quest.isPublic
                              ? 'Ocultar missão dos jogadores'
                              : 'Publicar missão para os jogadores'
                          }
                        >
                          {quest.isPublic ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-warning" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(quest)}
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Editar missão"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteQuest(quest.id)}
                          className="btn btn-danger-ghost btn-sm btn-icon"
                          title="Excluir missão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
                          onClick={
                            viewRole === 'gm'
                              ? () => void toggleQuestObjective(quest.id, obj.id)
                              : undefined
                          }
                          className={`px-3 py-2 text-[13px] flex items-start gap-2.5 ${
                            viewRole === 'gm'
                              ? 'cursor-pointer hover:bg-surface-2 transition-colors'
                              : ''
                          } ${obj.completed ? 'text-fg-subtle line-through' : 'text-fg'}`}
                        >
                          {obj.completed ? (
                            <CheckSquare className="w-4 h-4 text-success shrink-0 mt-px" />
                          ) : (
                            <Square className="w-4 h-4 text-fg-subtle shrink-0 mt-px" />
                          )}
                          <div className="flex-1 leading-relaxed">
                            <MentionText text={obj.text} />
                          </div>
                          {viewRole === 'gm' && quest.objectives.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveObjective(quest, obj.id);
                              }}
                              className="btn btn-danger-ghost btn-icon h-6 w-6 shrink-0"
                              title="Remover objetivo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>

                    {viewRole === 'gm' && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={newObjDrafts[quest.id] || ''}
                          onChange={(e) =>
                            setNewObjDrafts((prev) => ({
                              ...prev,
                              [quest.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddInlineObjective(quest);
                            }
                          }}
                          placeholder="Novo objetivo…"
                          className="input h-8 text-[13px] flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddInlineObjective(quest)}
                          className="btn btn-secondary btn-sm h-8"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Nota do mestre */}
                  {viewRole === 'gm' && quest.gmSecretNote && (
                    <div className="card-muted p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Nota secreta do mestre</span>
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

      {/* Modal: criar/editar missão */}
      {showQuestModal && (
        <div className="modal-backdrop">
          <form onSubmit={handleSaveQuest} className="modal max-w-md max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
              <h3 className="section-title">
                {editingQuest ? 'Editar missão' : 'Nova missão'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowQuestModal(false);
                  setEditingQuest(null);
                }}
                className="btn btn-ghost btn-sm btn-icon"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div>
                  <label className="label">Subtítulo</label>
                  <input
                    type="text"
                    value={qSub}
                    onChange={(e) => setQSub(e.target.value)}
                    placeholder="Ex.: Contrato principal"
                    className="input"
                  />
                </div>
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
                <label className="label">Objetivos (um por linha)</label>
                <textarea
                  rows={3}
                  value={qObjs}
                  onChange={(e) => setQObjs(e.target.value)}
                  placeholder="Um por linha"
                  className="input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="flex items-end pb-1.5">
                  <label className="inline-flex items-center gap-2 text-[13px] text-fg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qIsPublic}
                      onChange={(e) => setQIsPublic(e.target.checked)}
                    />
                    <span>Visível aos jogadores</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="label">Nota secreta do Mestre (oculta dos jogadores)</label>
                <textarea
                  rows={2}
                  value={qSecretNote}
                  onChange={(e) => setQSecretNote(e.target.value)}
                  placeholder="Reviravoltas, segredos do patrono, armadilhas…"
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-surface-2">
              <button
                type="button"
                onClick={() => {
                  setShowQuestModal(false);
                  setEditingQuest(null);
                }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {editingQuest ? 'Salvar alterações' : 'Criar missão'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
