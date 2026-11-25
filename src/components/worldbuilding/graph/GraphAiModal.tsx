import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Loader2,
  Lock,
  Network,
  SearchCode,
  Settings,
  Sparkles,
  UserPlus,
  Wand2,
  X,
} from 'lucide-react';
import type {
  Entity,
  ManualGraphNode,
  Quest,
  RelationType,
  RelationshipEdge,
  SessionJournalEntry,
  ThreatFront,
} from '../../../types/campaign';
import {
  AiSuggestedGraphNode,
  AiSuggestedRelationship,
  analyzeCampaignGraphWithAI,
} from '../../../services/geminiService';
import {
  NODE_CATEGORY_META,
  RELATION_META,
  UnifiedGraphNode,
  inferGraphRelationshipsLocally,
} from './graphLayout';

interface GraphAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  allNodes: UnifiedGraphNode[];
  entities: Entity[];
  manualNodes: ManualGraphNode[];
  existingRelationships: RelationshipEdge[];
  fronts: ThreatFront[];
  quests: Quest[];
  journal: SessionJournalEntry[];
  campaignName: string;
  campaignTone: string;
  worldContext?: string;
  geminiApiKey: string;
  selectedNodeId?: string;
  onOpenSettings: () => void;
  onApplySuggestions: (payload: {
    nodesToCreate: AiSuggestedGraphNode[];
    relationshipsToCreate: AiSuggestedRelationship[];
    autoLayoutAfter: boolean;
  }) => Promise<void>;
}

type AssistantTab = 'extract' | 'intrigue' | 'mentions';

export const GraphAiModal: React.FC<GraphAiModalProps> = ({
  isOpen,
  onClose,
  allNodes,
  entities,
  manualNodes,
  existingRelationships,
  fronts,
  quests,
  journal,
  campaignName,
  campaignTone,
  worldContext,
  geminiApiKey,
  selectedNodeId,
  onOpenSettings,
  onApplySuggestions,
}) => {
  const [tab, setTab] = useState<AssistantTab>('extract');
  const [focusNodeId, setFocusNodeId] = useState<string>(selectedNodeId || '');
  const [customInstruction, setCustomInstruction] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [modelUsed, setModelUsed] = useState<string | undefined>(undefined);

  const [suggestedNodes, setSuggestedNodes] = useState<AiSuggestedGraphNode[]>([]);
  const [selectedNodeKeys, setSelectedNodeKeys] = useState<Set<string>>(new Set());

  const [suggestions, setSuggestions] = useState<AiSuggestedRelationship[]>([]);
  const [selectedRelIds, setSelectedRelIds] = useState<Set<string>>(new Set());
  const [autoLayoutAfter, setAutoLayoutAfter] = useState(true);

  if (!isOpen) return null;

  const nodeLabelById = (id: string): string => {
    const existing = allNodes.find((n) => n.id === id);
    if (existing) return `${existing.subtitle} (${existing.label})`;
    const proposed = suggestedNodes.find((n) => n.tempKey === id);
    if (proposed) return `✨ ${proposed.name} (novo)`;
    return id;
  };

  const handleRunAnalysis = async () => {
    setErrorMessage(null);
    setNeedsKey(false);

    if (tab === 'mentions') {
      const local = inferGraphRelationshipsLocally({
        entities,
        manualNodes,
        existingRelationships,
        quests,
        fronts,
      });
      setSuggestedNodes([]);
      setSelectedNodeKeys(new Set());
      setSuggestions(local);
      setSelectedRelIds(new Set(local.map((r) => r.id)));
      setModelUsed('Varredura local determinística');
      setSummaryText(
        local.length > 0
          ? `${local.length} vínculo(s) encontrado(s) cruzando menções @/# no Códice, Missões e Frentes.`
          : 'Todas as menções diretas @/# encontradas no Códice já possuem vínculo no grafo.'
      );
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await analyzeCampaignGraphWithAI({
        mode: tab,
        entities,
        manualNodes,
        existingRelationships,
        fronts,
        quests,
        journal,
        campaignName,
        campaignTone,
        worldContext,
        focusNodeId: focusNodeId || undefined,
        customInstruction: customInstruction.trim() || undefined,
        apiKey: geminiApiKey,
      });

      if (!res.ok) {
        if (res.errorReason === 'no_api_key') {
          setNeedsKey(true);
          // Oferece resultado local imediato para não travar o Mestre!
          const fallbackLocal = inferGraphRelationshipsLocally({
            entities,
            manualNodes,
            existingRelationships,
            quests,
            fronts,
          });
          if (fallbackLocal.length > 0) {
            setSuggestions(fallbackLocal);
            setSelectedRelIds(new Set(fallbackLocal.map((r) => r.id)));
            setSummaryText(
              `Sem chave Gemini configurada — exibindo ${fallbackLocal.length} vínculo(s) detectado(s) localmente pelas menções do Códice.`
            );
          }
        }
        setErrorMessage(res.errorMessage || 'Não foi possível consultar a IA agora.');
        return;
      }

      setSummaryText(res.summary);
      setModelUsed(res.modelUsed);
      setSuggestedNodes(res.suggestedNodes);
      setSelectedNodeKeys(new Set(res.suggestedNodes.map((n) => n.tempKey)));
      setSuggestions(res.relationships);
      setSelectedRelIds(new Set(res.relationships.map((r) => r.id)));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateSuggestionItem = (
    id: string,
    patch: Partial<AiSuggestedRelationship>
  ) => {
    setSuggestions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleApply = async () => {
    const chosenNodes = suggestedNodes.filter((n) =>
      selectedNodeKeys.has(n.tempKey)
    );
    const chosenRels = suggestions.filter((r) => selectedRelIds.has(r.id));
    if (chosenNodes.length === 0 && chosenRels.length === 0) return;

    setIsApplying(true);
    try {
      await onApplySuggestions({
        nodesToCreate: chosenNodes,
        relationshipsToCreate: chosenRels,
        autoLayoutAfter,
      });
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const totalSelectedCount = selectedRelIds.size + selectedNodeKeys.size;

  return (
    <div className="modal-backdrop">
      <div className="modal max-w-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="section-title">Arquiteto IA de Relações & Intrigas</h3>
              <p className="text-xs text-fg-muted">
                Extraia conexões ocultas do Códice ou gere triângulos políticos e ganchos dramáticos.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Mode Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                {
                  id: 'extract',
                  title: 'Mapear Códice (IA)',
                  desc: 'Lê lore, segredos e frentes para achar elos implícitos',
                  icon: Network,
                },
                {
                  id: 'intrigue',
                  title: 'Tecer Intrigas (IA)',
                  desc: 'Cria alianças, traições e pivôs entre grupos isolados',
                  icon: Wand2,
                },
                {
                  id: 'mentions',
                  title: 'Varredura @/# Local',
                  desc: 'Instantâneo e sem cota: cruza todas as @menções',
                  icon: SearchCode,
                },
              ] as const
            ).map((m) => {
              const Icon = m.icon;
              const active = tab === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTab(m.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    active
                      ? 'border-accent bg-accent-soft/40 ring-1 ring-accent/30'
                      : 'border-line hover:border-line-strong bg-surface'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-fg">
                    <Icon className={`w-4 h-4 ${active ? 'text-accent' : 'text-fg-muted'}`} />
                    <span>{m.title}</span>
                  </div>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">{m.desc}</p>
                </button>
              );
            })}
          </div>

          {/* AI Parameters */}
          {tab !== 'mentions' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 card-muted p-3.5">
              <div>
                <label className="label">Focar em um nó específico (opcional)</label>
                <select
                  value={focusNodeId}
                  onChange={(e) => setFocusNodeId(e.target.value)}
                  className="input h-8 text-xs"
                >
                  <option value="">Toda a campanha ({allNodes.length} nós)</option>
                  {allNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.subtitle} ({n.label})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Diretriz para a IA (opcional)</label>
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Ex.: Disputa pelo trono, traição na guilda…"
                  className="input h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* Action Trigger */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-fg-muted">
              {entities.length} entradas no Códice · {existingRelationships.length} vínculos atuais
            </span>
            <button
              type="button"
              disabled={isAnalyzing || allNodes.length < 2}
              onClick={() => void handleRunAnalysis()}
              className="btn btn-primary btn-sm"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analisando teia da campanha…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {tab === 'mentions'
                      ? 'Executar varredura @/#'
                      : tab === 'extract'
                      ? 'Descobrir vínculos com IA'
                      : 'Gerar intrigas com IA'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Error / API Key Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg border border-warning/40 bg-warning-soft/30 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2 text-fg">
                <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {needsKey && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="btn btn-secondary btn-sm shrink-0"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configurar chave</span>
                </button>
              )}
            </div>
          )}

          {/* Results Section */}
          {(summaryText || suggestions.length > 0 || suggestedNodes.length > 0) && (
            <div className="space-y-4 pt-2 border-t border-line">
              {summaryText && (
                <div className="p-3 rounded-lg bg-surface-2 border border-line text-xs text-fg flex items-start justify-between gap-3">
                  <p className="leading-relaxed">{summaryText}</p>
                  {modelUsed && (
                    <span className="badge shrink-0 font-mono text-[10px]">
                      {modelUsed}
                    </span>
                  )}
                </div>
              )}

              {/* Suggested New Bridge Nodes */}
              {suggestedNodes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-fg flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-accent" />
                    <span>Novas entradas-ponte sugeridas para o Códice ({suggestedNodes.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {suggestedNodes.map((sn) => {
                      const checked = selectedNodeKeys.has(sn.tempKey);
                      const catMeta =
                        NODE_CATEGORY_META[sn.category] || NODE_CATEGORY_META.npc;
                      return (
                        <label
                          key={sn.tempKey}
                          className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2.5 text-xs ${
                            checked
                              ? 'border-accent/50 bg-accent-soft/20'
                              : 'border-line bg-surface opacity-70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="checkbox mt-0.5"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedNodeKeys((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(sn.tempKey);
                                else next.delete(sn.tempKey);
                                return next;
                              });
                            }}
                          />
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: catMeta.color }}
                              />
                              <span className="font-semibold text-fg truncate">
                                {sn.name}
                              </span>
                              <span className="badge text-[10px]">{catMeta.badge}</span>
                            </div>
                            <p className="text-fg-muted">{sn.subtitle}</p>
                            {sn.summary && (
                              <p className="text-[11px] text-fg-subtle line-clamp-2">
                                {sn.summary}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Suggested Relationships */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-fg">
                      Vínculos propostos ({selectedRelIds.size}/{suggestions.length} selecionados)
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedRelIds(new Set(suggestions.map((s) => s.id)))
                        }
                        className="text-accent hover:underline"
                      >
                        Marcar todos
                      </button>
                      <span className="text-fg-subtle">·</span>
                      <button
                        type="button"
                        onClick={() => setSelectedRelIds(new Set())}
                        className="text-fg-muted hover:underline"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-line rounded-lg border border-line bg-surface max-h-72 overflow-y-auto">
                    {suggestions.map((rel) => {
                      const checked = selectedRelIds.has(rel.id);
                      return (
                        <div
                          key={rel.id}
                          className={`p-3 space-y-2 transition-colors ${
                            checked ? 'bg-surface' : 'bg-surface-2/40 opacity-65'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              className="checkbox mt-1"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedRelIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(rel.id);
                                  else next.delete(rel.id);
                                  return next;
                                });
                              }}
                            />
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="font-semibold text-fg">
                                  {nodeLabelById(rel.sourceId)}
                                </span>
                                <span className="text-fg-subtle">→</span>
                                <span className="font-semibold text-fg">
                                  {nodeLabelById(rel.targetId)}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={rel.label}
                                  onChange={(e) =>
                                    updateSuggestionItem(rel.id, {
                                      label: e.target.value,
                                    })
                                  }
                                  className="input h-7 text-xs w-48"
                                />
                                <select
                                  value={rel.type}
                                  onChange={(e) =>
                                    updateSuggestionItem(rel.id, {
                                      type: e.target.value as RelationType,
                                    })
                                  }
                                  className="input h-7 text-xs w-auto"
                                >
                                  {(Object.keys(RELATION_META) as RelationType[]).map(
                                    (rt) => (
                                      <option key={rt} value={rt}>
                                        {RELATION_META[rt].label}
                                      </option>
                                    )
                                  )}
                                </select>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSuggestionItem(rel.id, {
                                      isSecret: !rel.isSecret,
                                    })
                                  }
                                  className={`h-7 px-2 rounded border text-[11px] inline-flex items-center gap-1 ${
                                    rel.isSecret
                                      ? 'border-warning/40 bg-warning-soft text-warning'
                                      : 'border-line text-fg-muted'
                                  }`}
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>{rel.isSecret ? 'Secreto' : 'Público'}</span>
                                </button>
                              </div>

                              <p className="text-[11px] text-fg-muted leading-snug">
                                {rel.rationale}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-line bg-surface-2 shrink-0">
          <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer select-none">
            <input
              type="checkbox"
              className="checkbox"
              checked={autoLayoutAfter}
              onChange={(e) => setAutoLayoutAfter(e.target.checked)}
            />
            <span>Reorganizar layout automaticamente após aplicar</span>
          </label>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Fechar
            </button>
            <button
              type="button"
              disabled={totalSelectedCount === 0 || isApplying}
              onClick={() => void handleApply()}
              className="btn btn-primary"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Aplicando…</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Aplicar selecionados ({totalSelectedCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
