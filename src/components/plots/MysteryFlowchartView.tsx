import React, { useState, useRef } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { MysterySceneNode } from '../../types/campaign';
import { MentionText } from '../common/MentionText';
import {
  GitBranch,
  Plus,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  Square,
  Trash2,
  KeyRound,
  X,
  ArrowRight,
} from 'lucide-react';

const STATUS_STYLES: Record<
  MysterySceneNode['status'],
  { label: string; badge: string; border: string }
> = {
  visited: {
    label: 'Concluída',
    badge: 'badge-success',
    border: 'border-line',
  },
  active: {
    label: 'Cena atual',
    badge: 'badge-accent',
    border: 'border-accent',
  },
  unlocked: {
    label: 'Disponível',
    badge: 'badge-info',
    border: 'border-line',
  },
  locked: {
    label: 'Bloqueada',
    badge: '',
    border: 'border-line',
  },
};

const CLUE_TYPE_LABELS: Record<string, string> = {
  investigation: 'Investigação',
  social: 'Social',
  physical: 'Física',
  occult: 'Arcana',
};

export const MysteryFlowchartView: React.FC = () => {
  const mysteryNodes = useCampaignStore((s) => s.mysteryNodes);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const updateMysteryNodePosition = useCampaignStore(
    (s) => s.updateMysteryNodePosition
  );
  const updateMysteryNodeStatus = useCampaignStore(
    (s) => s.updateMysteryNodeStatus
  );
  const toggleMysteryClue = useCampaignStore((s) => s.toggleMysteryClue);
  const addMysteryNode = useCampaignStore((s) => s.addMysteryNode);
  const addMysteryClue = useCampaignStore((s) => s.addMysteryClue);
  const deleteMysteryNode = useCampaignStore((s) => s.deleteMysteryNode);

  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    mysteryNodes[0]?.id || ''
  );
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [showAddScene, setShowAddScene] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newLoc, setNewLoc] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [clueName, setClueName] = useState('');
  const [clueDesc, setClueDesc] = useState('');
  const [clueTargetId, setClueTargetId] = useState(mysteryNodes[0]?.id || '');
  const [clueType, setClueType] = useState<
    'social' | 'investigation' | 'occult' | 'physical'
  >('investigation');

  const selectedNode =
    mysteryNodes.find((n) => n.id === selectedNodeId) || mysteryNodes[0];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingNodeId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(20, Math.min(820, e.clientX - rect.left - 130));
    const y = Math.max(20, Math.min(440, e.clientY - rect.top - 50));
    updateMysteryNodePosition(draggingNodeId, Math.round(x), Math.round(y));
  };

  const handleCreateScene = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addMysteryNode(
      newTitle.trim(),
      newSubtitle.trim() || 'Cena investigativa',
      newLoc.trim(),
      newDesc.trim() || 'Descreva o foco dramático desta cena.'
    );
    setNewTitle('');
    setNewSubtitle('');
    setNewLoc('');
    setNewDesc('');
    setShowAddScene(false);
  };

  const handleCreateClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode || !clueName.trim()) return;
    addMysteryClue(
      selectedNode.id,
      clueName.trim(),
      clueDesc.trim() || 'Pista conectada à próxima cena.',
      clueTargetId,
      clueType
    );
    setClueName('');
    setClueDesc('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-7.5rem)]">
      {/* Quadro */}
      <div className="lg:col-span-8 flex flex-col card overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Cenas e pistas</h2>
            <p className="text-[13px] text-fg-muted">
              Arraste as cenas para organizar. Recomenda-se ao menos 3 pistas por conclusão.
            </p>
          </div>

          {viewRole === 'gm' && (
            <button onClick={() => setShowAddScene(true)} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              <span>Nova cena</span>
            </button>
          )}
        </div>

        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDraggingNodeId(null)}
          onMouseLeave={() => setDraggingNodeId(null)}
          className="flex-1 relative overflow-auto bg-canvas select-none min-h-[520px]"
          style={{
            backgroundImage: 'radial-gradient(rgb(var(--line-strong)) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* Conexões entre pistas */}
          <svg className="absolute inset-0 w-[1100px] h-[600px] pointer-events-none">
            {mysteryNodes.map((node) =>
              node.clues.map((clue) => {
                const target = mysteryNodes.find((t) => t.id === clue.targetSceneId);
                if (!target || target.id === node.id) return null;

                const startX = node.x + 248;
                const startY = node.y + 54;
                const endX = target.x;
                const endY = target.y + 54;
                const ctrlX = (startX + endX) / 2;

                return (
                  <g
                    key={clue.id}
                    className={clue.discovered ? 'text-success' : 'text-fg-subtle'}
                  >
                    <path
                      d={`M ${startX} ${startY} C ${ctrlX} ${startY}, ${ctrlX} ${endY}, ${endX} ${endY}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={clue.discovered ? 1.75 : 1.25}
                      strokeDasharray={clue.discovered ? undefined : '5 4'}
                    />
                    <circle cx={endX} cy={endY} r={3} fill="currentColor" />
                  </g>
                );
              })
            )}
          </svg>

          {/* Cenas arrastáveis */}
          {mysteryNodes.map((node) => {
            const isSelected = node.id === selectedNode?.id;
            const clueCount = node.clues.length;
            const discoveredCount = node.clues.filter((c) => c.discovered).length;
            const passesThreeClueRule = clueCount >= 3;
            const st = STATUS_STYLES[node.status];

            return (
              <div
                key={node.id}
                style={{ left: `${node.x}px`, top: `${node.y}px` }}
                onMouseDown={() => {
                  setSelectedNodeId(node.id);
                  setDraggingNodeId(node.id);
                }}
                className={`absolute w-[248px] rounded-lg bg-surface border p-3 cursor-grab active:cursor-grabbing shadow-card transition-shadow ${
                  st.border
                } ${isSelected ? 'ring-2 ring-accent/40 z-20' : 'z-10'} ${
                  node.status === 'locked' ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className={`badge ${st.badge}`}>{st.label}</span>

                  <span
                    title={
                      passesThreeClueRule
                        ? '3 ou mais pistas conectadas'
                        : 'Menos de 3 pistas conectadas'
                    }
                    className={`inline-flex items-center gap-1 text-xs tabular-nums ${
                      passesThreeClueRule ? 'text-fg-muted' : 'text-warning'
                    }`}
                  >
                    {passesThreeClueRule ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {discoveredCount}/{clueCount}
                    </span>
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-fg truncate">{node.title}</h4>
                <p className="text-xs text-fg-muted truncate">{node.subtitle}</p>

                {node.clues.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-line space-y-0.5">
                    {node.clues.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        className={`flex items-center gap-1.5 text-xs truncate ${
                          c.discovered ? 'text-fg' : 'text-fg-subtle'
                        }`}
                      >
                        {c.discovered ? (
                          <CheckSquare className="w-3 h-3 text-success shrink-0" />
                        ) : (
                          <Square className="w-3 h-3 shrink-0" />
                        )}
                        <span className="truncate">{c.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {mysteryNodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-30">
              <GitBranch className="w-5 h-5 text-fg-subtle mb-3" />
              <h3 className="text-sm font-medium text-fg">Nenhuma cena mapeada</h3>
              <p className="text-[13px] text-fg-muted max-w-sm mt-1">
                Adicione cenas e conecte pistas redundantes para visualizar a investigação.
              </p>
              {viewRole === 'gm' && (
                <button
                  onClick={() => setShowAddScene(true)}
                  className="btn btn-primary btn-sm mt-4"
                >
                  Criar cena
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inspetor da cena */}
      {selectedNode ? (
        <div className="lg:col-span-4 flex flex-col card p-4 overflow-y-auto space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-line pb-3">
            <div className="min-w-0">
              <span className="text-xs text-fg-subtle">
                {selectedNode.locationHandle || 'Sem local'}
              </span>
              <h3 className="text-base font-semibold text-fg">{selectedNode.title}</h3>
              <p className="text-[13px] text-fg-muted">{selectedNode.subtitle}</p>
            </div>
            {viewRole === 'gm' && mysteryNodes.length > 0 && (
              <button
                onClick={() => deleteMysteryNode(selectedNode.id)}
                className="btn btn-danger-ghost btn-sm btn-icon shrink-0"
                title="Excluir cena"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {viewRole === 'gm' && (
            <div>
              <label className="label">Estado</label>
              <div className="segmented w-full flex-wrap">
                {(
                  ['visited', 'active', 'unlocked', 'locked'] as MysterySceneNode['status'][]
                ).map((stKey) => (
                  <button
                    key={stKey}
                    onClick={() => updateMysteryNodeStatus(selectedNode.id, stKey)}
                    className={`segmented-item flex-1 ${
                      selectedNode.status === stKey ? 'segmented-item-active' : ''
                    }`}
                  >
                    {STATUS_STYLES[stKey].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-fg leading-relaxed">
            <MentionText text={selectedNode.description} />
          </div>

          {/* Pistas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-fg flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-fg-muted" />
                <span>Pistas</span>
              </span>
              <span
                className={`text-xs tabular-nums ${
                  selectedNode.clues.length >= 3 ? 'text-fg-subtle' : 'text-warning'
                }`}
              >
                {selectedNode.clues.length} de 3 recomendadas
              </span>
            </div>

            {selectedNode.clues.length > 0 && (
              <ul className="rounded-md border border-line divide-y divide-line overflow-hidden">
                {selectedNode.clues.map((clue) => {
                  const targetScene = mysteryNodes.find((n) => n.id === clue.targetSceneId);
                  return (
                    <li
                      key={clue.id}
                      onClick={() => toggleMysteryClue(selectedNode.id, clue.id)}
                      className="px-3 py-2.5 cursor-pointer hover:bg-surface-2 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-fg min-w-0">
                          {clue.discovered ? (
                            <CheckSquare className="w-4 h-4 text-success shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-fg-subtle shrink-0" />
                          )}
                          <span className="truncate">{clue.name}</span>
                        </div>
                        <span className="badge shrink-0">
                          {CLUE_TYPE_LABELS[clue.type] ?? clue.type}
                        </span>
                      </div>
                      <div className="text-[13px] text-fg-muted pl-6 leading-relaxed">
                        <MentionText text={clue.description} />
                      </div>
                      {targetScene && (
                        <div className="pl-6 text-xs text-fg-subtle flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          {targetScene.title}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Nova pista */}
          {viewRole === 'gm' && (
            <form onSubmit={handleCreateClue} className="card-muted p-3 space-y-2.5">
              <div className="text-sm font-medium text-fg">Adicionar pista</div>
              <input
                type="text"
                required
                value={clueName}
                onChange={(e) => setClueName(e.target.value)}
                placeholder="Nome (ex.: Pegadas de lama branca)"
                className="input"
              />
              <input
                type="text"
                value={clueDesc}
                onChange={(e) => setClueDesc(e.target.value)}
                placeholder="Descrição (suporta @NPC e #Local)"
                className="input"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="label">Leva a</label>
                  <select
                    value={clueTargetId}
                    onChange={(e) => setClueTargetId(e.target.value)}
                    className="input"
                  >
                    {mysteryNodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select
                    value={clueType}
                    onChange={(e) =>
                      setClueType(
                        e.target.value as 'social' | 'investigation' | 'occult' | 'physical'
                      )
                    }
                    className="input"
                  >
                    <option value="investigation">Investigação</option>
                    <option value="social">Social</option>
                    <option value="physical">Física</option>
                    <option value="occult">Arcana</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-secondary btn-sm w-full">
                Vincular pista
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 text-center card">
          <GitBranch className="w-5 h-5 text-fg-subtle mb-2" />
          <p className="text-[13px] text-fg-muted">Selecione uma cena no quadro.</p>
        </div>
      )}

      {/* Modal: nova cena */}
      {showAddScene && (
        <div className="modal-backdrop">
          <form onSubmit={handleCreateScene} className="modal max-w-md max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
              <h3 className="section-title">Nova cena</h3>
              <button
                type="button"
                onClick={() => setShowAddScene(false)}
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
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex.: O Cais Abandonado"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Subtítulo</label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="Foco dramático"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Local</label>
                <input
                  type="text"
                  value={newLoc}
                  onChange={(e) => setNewLoc(e.target.value)}
                  placeholder="Opcional (ex.: #CaisAntigo)"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-surface-2">
              <button
                type="button"
                onClick={() => setShowAddScene(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Criar cena
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
