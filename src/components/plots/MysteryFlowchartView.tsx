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
} from 'lucide-react';

const STATUS_STYLES: Record<
  MysterySceneNode['status'],
  { label: string; dot: string; border: string; activePill: string }
> = {
  visited: {
    label: 'Concluída',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/35',
    activePill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  active: {
    label: 'Cena atual',
    dot: 'bg-amber-400',
    border: 'border-amber-400/60',
    activePill: 'bg-zinc-100 text-zinc-950 border-zinc-100 font-medium',
  },
  unlocked: {
    label: 'Disponível',
    dot: 'bg-sky-400',
    border: 'border-white/[0.12]',
    activePill: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  locked: {
    label: 'Bloqueada',
    dot: 'bg-zinc-500',
    border: 'border-white/[0.06]',
    activePill: 'bg-white/[0.07] text-zinc-200 border-white/[0.14]',
  },
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-7.5rem)]">
      {/* Left Interactive Canvas */}
      <div className="lg:col-span-8 flex flex-col surface-panel rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Cenas & rede de pistas
            </h2>
            <p className="text-xs text-zinc-500">
              Arraste cenas livremente e mantenha ao menos 3 pistas por conclusão crítica.
            </p>
          </div>

          {viewRole === 'gm' && (
            <button
              onClick={() => setShowAddScene(true)}
              className="btn-solid px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova cena</span>
            </button>
          )}
        </div>

        {/* Flowchart Board */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDraggingNodeId(null)}
          onMouseLeave={() => setDraggingNodeId(null)}
          className="flex-1 relative overflow-auto bg-[#0b0b0d] bg-obsidian-grid select-none min-h-[520px]"
        >
          {/* SVG Connecting Clue Curves */}
          <svg className="absolute inset-0 w-[1100px] h-[600px] pointer-events-none">
            {mysteryNodes.map((node) =>
              node.clues.map((clue) => {
                const target = mysteryNodes.find(
                  (t) => t.id === clue.targetSceneId
                );
                if (!target || target.id === node.id) return null;

                const startX = node.x + 248;
                const startY = node.y + 54;
                const endX = target.x;
                const endY = target.y + 54;
                const ctrlX = (startX + endX) / 2;

                return (
                  <g key={clue.id}>
                    <path
                      d={`M ${startX} ${startY} C ${ctrlX} ${startY}, ${ctrlX} ${endY}, ${endX} ${endY}`}
                      fill="none"
                      stroke={clue.discovered ? '#10b981' : '#52525b'}
                      strokeWidth={clue.discovered ? 1.75 : 1.25}
                      strokeDasharray={clue.discovered ? undefined : '5 4'}
                      strokeOpacity={0.8}
                    />
                    <circle
                      cx={endX}
                      cy={endY}
                      r={3}
                      fill={clue.discovered ? '#10b981' : '#71717a'}
                    />
                  </g>
                );
              })
            )}
          </svg>

          {/* Draggable Scene Cards */}
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
                className={`absolute w-[248px] rounded-xl bg-[#131317]/95 backdrop-blur-md border p-3.5 cursor-grab active:cursor-grabbing transition-all shadow-lg ${
                  st.border
                } ${isSelected ? 'ring-1 ring-zinc-300/60 z-20' : 'z-10'}`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-zinc-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>

                  <span
                    title={
                      passesThreeClueRule
                        ? '3 ou mais pistas conectadas'
                        : 'Menos de 3 pistas conectadas — risco de gargalo'
                    }
                    className={`inline-flex items-center gap-1 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded border ${
                      passesThreeClueRule
                        ? 'bg-white/[0.04] text-zinc-300 border-white/[0.08]'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                    }`}
                  >
                    {passesThreeClueRule ? (
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
                    )}
                    <span>
                      {discoveredCount}/{clueCount}
                    </span>
                  </span>
                </div>

                <h4 className="text-xs font-semibold text-zinc-100 truncate">
                  {node.title}
                </h4>
                <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                  {node.subtitle}
                </p>

                {node.clues.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1">
                    {node.clues.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-1.5 text-[10px] text-zinc-400 truncate"
                      >
                        <span
                          className={`w-1 h-1 rounded-full shrink-0 ${
                            c.discovered ? 'bg-emerald-400' : 'bg-zinc-600'
                          }`}
                        />
                        <span className="truncate">{c.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {mysteryNodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 z-30">
              <GitBranch className="w-6 h-6 text-zinc-600" />
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-medium text-zinc-200">
                  Nenhuma cena mapeada
                </h3>
                <p className="text-xs text-zinc-500">
                  Adicione nós de cena e conecte pistas redundantes para visualizar a investigação.
                </p>
              </div>
              {viewRole === 'gm' && (
                <button
                  onClick={() => setShowAddScene(true)}
                  className="btn-solid px-3.5 py-1.5 rounded-lg text-xs"
                >
                  Criar primeira cena
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Scene Inspector */}
      {selectedNode ? (
        <div className="lg:col-span-4 flex flex-col surface-panel rounded-xl p-5 overflow-y-auto space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-3.5">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-mono text-zinc-500">
                {selectedNode.locationHandle || '#Local'}
              </span>
              <h3 className="text-lg font-serif font-medium text-zinc-100">
                {selectedNode.title}
              </h3>
              <p className="text-xs text-zinc-400">{selectedNode.subtitle}</p>
            </div>
            {viewRole === 'gm' && mysteryNodes.length > 0 && (
              <button
                onClick={() => deleteMysteryNode(selectedNode.id)}
                className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-rose-500/10 transition-colors"
                title="Excluir cena"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {viewRole === 'gm' && (
            <div className="grid grid-cols-2 gap-1.5">
              {(
                ['visited', 'active', 'unlocked', 'locked'] as MysterySceneNode['status'][]
              ).map((stKey) => (
                <button
                  key={stKey}
                  onClick={() => updateMysteryNodeStatus(selectedNode.id, stKey)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs border text-left transition-colors flex items-center gap-1.5 ${
                    selectedNode.status === stKey
                      ? STATUS_STYLES[stKey].activePill
                      : 'bg-[#0e0e11] text-zinc-400 border-white/[0.06] hover:text-zinc-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[stKey].dot}`}
                  />
                  <span>{STATUS_STYLES[stKey].label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-[#0e0e11] border border-white/[0.06] text-xs text-zinc-300 leading-relaxed">
            <MentionText text={selectedNode.description} />
          </div>

          {/* Clues List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                <span>Pistas conectadas</span>
              </span>
              <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                {selectedNode.clues.length} / 3 recomendadas
              </span>
            </div>

            <div className="space-y-2">
              {selectedNode.clues.map((clue) => {
                const targetScene = mysteryNodes.find(
                  (n) => n.id === clue.targetSceneId
                );
                return (
                  <div
                    key={clue.id}
                    onClick={() => toggleMysteryClue(selectedNode.id, clue.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors space-y-1 ${
                      clue.discovered
                        ? 'bg-emerald-500/[0.05] border-emerald-500/25'
                        : 'bg-[#0e0e11] border-white/[0.06] hover:border-white/[0.14]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-medium text-zinc-100">
                        {clue.discovered ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        )}
                        <span>{clue.name}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                        {clue.type}
                      </span>
                    </div>
                    <div className="text-zinc-400 pl-5 leading-relaxed">
                      <MentionText text={clue.description} />
                    </div>
                    {targetScene && (
                      <div className="pl-5 text-[11px] font-mono text-zinc-500">
                        → {targetScene.title}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Clue Form */}
          {viewRole === 'gm' && (
            <form
              onSubmit={handleCreateClue}
              className="p-3.5 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-2.5 text-xs"
            >
              <div className="text-xs font-medium text-zinc-300">
                Nova pista nesta cena
              </div>
              <input
                type="text"
                required
                value={clueName}
                onChange={(e) => setClueName(e.target.value)}
                placeholder="Nome da pista (ex: Pegadas de lama branca)"
                className="input-clean w-full px-2.5 py-1.5 rounded-lg"
              />
              <input
                type="text"
                value={clueDesc}
                onChange={(e) => setClueDesc(e.target.value)}
                placeholder="Descrição (suporta @NPC e #Local)"
                className="input-clean w-full px-2.5 py-1.5 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={clueTargetId}
                  onChange={(e) => setClueTargetId(e.target.value)}
                  className="input-clean px-2 py-1.5 rounded-lg"
                >
                  {mysteryNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      Aponta: {n.title}
                    </option>
                  ))}
                </select>
                <select
                  value={clueType}
                  onChange={(e) =>
                    setClueType(
                      e.target.value as
                        | 'social'
                        | 'investigation'
                        | 'occult'
                        | 'physical'
                    )
                  }
                  className="input-clean px-2 py-1.5 rounded-lg"
                >
                  <option value="investigation">Investigação</option>
                  <option value="social">Social</option>
                  <option value="physical">Física</option>
                  <option value="occult">Arcana</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn-subtle w-full py-1.5 rounded-lg font-medium"
              >
                Vincular pista
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 text-center surface-panel rounded-xl text-zinc-500 space-y-2">
          <GitBranch className="w-6 h-6 text-zinc-600" />
          <p className="text-xs">Selecione uma cena no quadro ao lado.</p>
        </div>
      )}

      {/* Modal: Create New Mystery Scene */}
      {showAddScene && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateScene}
            className="w-full max-w-md rounded-2xl bg-[#121215] border border-white/[0.09] p-6 space-y-3.5 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-semibold text-zinc-100">
                Nova cena investigativa
              </h3>
              <button
                type="button"
                onClick={() => setShowAddScene(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título da cena (ex: O Cais Abandonado)"
              className="input-clean w-full px-3 py-2 rounded-lg"
            />
            <input
              type="text"
              value={newSubtitle}
              onChange={(e) => setNewSubtitle(e.target.value)}
              placeholder="Foco dramático ou subtítulo"
              className="input-clean w-full px-3 py-2 rounded-lg"
            />
            <input
              type="text"
              value={newLoc}
              onChange={(e) => setNewLoc(e.target.value)}
              placeholder="Local opcional (ex: #CaisAntigo)"
              className="input-clean w-full px-3 py-2 rounded-lg"
            />
            <textarea
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Descrição da cena..."
              className="input-clean w-full px-3 py-2 rounded-lg"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddScene(false)}
                className="btn-subtle px-3.5 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-solid px-4 py-2 rounded-lg"
              >
                Criar cena
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
