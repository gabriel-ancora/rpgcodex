import React, { useState, useEffect, useMemo } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import {
  generateContextualEmergencyWithAI,
  buildContextualSystemPrompt,
  sanitizeGeneratedItemFields,
} from '../../services/geminiService';
import { MentionText, MentionTextarea } from '../common/MentionText';
import { WIKI_CONTEXT_WINDOW_ID } from '../worldbuilding/EntityWikiView';
import {
  Compass,
  UserPlus,
  MapPin,
  MessageSquare,
  Gem,
  BookMarked,
  Pin,
  FilePlus2,
  Lock,
  KeyRound,
  Code2,
  Loader2,
  FileText,
  Save,
  ArrowUpRight,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';

export const EmergencyGeneratorsView: React.FC = () => {
  const rawGeneratedItems = useCampaignStore((s) => s.recentGeneratedItems);
  const recordGeneratedItem = useCampaignStore((s) => s.recordGeneratedItem);
  const removeGeneratedItem = useCampaignStore((s) => s.removeGeneratedItem);
  const clearGeneratedItems = useCampaignStore((s) => s.clearGeneratedItems);
  const saveGeneratedItemToDatabase = useCampaignStore(
    (s) => s.saveGeneratedItemToDatabase
  );
  const addScratchpadLine = useCampaignStore((s) => s.addScratchpadLine);
  const showToast = useCampaignStore((s) => s.showToast);

  const entities = useCampaignStore((s) => s.entities);
  const fronts = useCampaignStore((s) => s.fronts);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const campaignName = useCampaignStore((s) => s.campaignName);
  const updateCampaign = useCampaignStore((s) => s.updateCampaign);
  const geminiApiKey = useCampaignStore((s) => s.geminiApiKey);
  const setIsSettingsModalOpen = useCampaignStore(
    (s) => s.setIsSettingsModalOpen
  );
  const setActiveModule = useCampaignStore((s) => s.setActiveModule);
  const setWorldSubTab = useCampaignStore((s) => s.setWorldSubTab);
  const setSelectedEntityId = useCampaignStore((s) => s.setSelectedEntityId);

  const activeCamp = campaigns.find((c) => c.id === activeCampaignId);
  const campaignTone = activeCamp?.tone || 'Fantasia & Investigação';
  const locationEntities = entities.filter((e) => e.category === 'location');

  // Auto-sanitize any previously generated items so titles & handles are always clean
  const recentGeneratedItems = useMemo(
    () => rawGeneratedItems.map((item) => sanitizeGeneratedItemFields(item)),
    [rawGeneratedItems]
  );

  const [selectedLocationHandle, setSelectedLocationHandle] = useState<string>(
    locationEntities[0]
      ? `${locationEntities[0].mentionPrefix}${locationEntities[0].handle}`
      : ''
  );
  const [customHint, setCustomHint] = useState('');
  const [loadingType, setLoadingType] = useState<
    'npc' | 'tavern' | 'rumor' | 'loot' | null
  >(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [worldContextDraft, setWorldContextDraft] = useState(
    activeCamp?.worldContext || ''
  );

  useEffect(() => {
    setWorldContextDraft(activeCamp?.worldContext || '');
  }, [activeCampaignId, activeCamp?.worldContext]);

  const handleSaveInlineContext = () => {
    if (!activeCampaignId) return;
    updateCampaign(activeCampaignId, { worldContext: worldContextDraft });
    showToast('Janela de Contexto atualizada.');
  };

  const handleOpenWikiContextWindow = () => {
    setSelectedEntityId(WIKI_CONTEXT_WINDOW_ID);
    setActiveModule('worldbuilding');
    setWorldSubTab('wiki');
  };

  const handleGenerate = async (type: 'npc' | 'tavern' | 'rumor' | 'loot') => {
    setLoadingType(type);
    try {
      if (activeCampaignId && worldContextDraft !== (activeCamp?.worldContext || '')) {
        updateCampaign(activeCampaignId, { worldContext: worldContextDraft });
      }

      const result = await generateContextualEmergencyWithAI(
        type,
        entities,
        fronts,
        campaignName,
        geminiApiKey,
        customHint.trim() || undefined,
        selectedLocationHandle || undefined,
        campaignTone,
        worldContextDraft.trim() || undefined
      );
      recordGeneratedItem(result.item);

      if (result.usedLiveGemini) {
        showToast('Elemento gerado pela IA Google Gemini.');
      } else if (geminiApiKey && result.fallbackReason === 'http_429') {
        showToast(
          'Limite temporário da API Gemini atingido (429); gerado via motor contextual local.'
        );
      } else if (
        geminiApiKey &&
        (result.fallbackReason === 'http_400' || result.fallbackReason === 'http_403')
      ) {
        showToast(
          'Chave Gemini recusada; verifique em Configurar API. Gerado via motor contextual local.'
        );
      } else {
        showToast(
          geminiApiKey
            ? 'Elemento gerado via motor contextual.'
            : 'Gerado localmente (conecte sua chave em "Configurar API" para usar o Gemini).'
        );
      }
    } finally {
      setLoadingType(null);
    }
  };

  const previewPrompt = buildContextualSystemPrompt('npc', {
    campaignName: campaignName || 'Campanha Atual',
    campaignTone,
    worldContext: worldContextDraft.trim() || undefined,
    currentLocationHandle: selectedLocationHandle,
    activeFactions: entities
      .filter((e) => e.category === 'faction')
      .map((e) => `${e.mentionPrefix}${e.handle}`),
    existingNpcs: entities
      .filter((e) => e.category === 'npc')
      .map((e) => `${e.mentionPrefix}${e.handle}`),
    existingLocations: locationEntities.map(
      (e) => `${e.mentionPrefix}${e.handle}`
    ),
    activeFronts: fronts.map((f) => ({ name: f.name, doom: f.impendingDoom })),
    customPromptHint: customHint.trim() || undefined,
  });

  const generatorTiles: {
    type: 'npc' | 'tavern' | 'rumor' | 'loot';
    title: string;
    desc: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      type: 'npc',
      title: 'Personagem (NPC)',
      desc: 'Nome, traço marcante, segredo e vínculo',
      icon: UserPlus,
    },
    {
      type: 'tavern',
      title: 'Ponto de interesse',
      desc: 'Atmosfera, anfitrião e gancho local',
      icon: MapPin,
    },
    {
      type: 'rumor',
      title: 'Rumor de mesa',
      desc: 'Boato circulante e verdade oculta',
      icon: MessageSquare,
    },
    {
      type: 'loot',
      title: 'Espólio & relíquia',
      desc: 'Objeto com história ligada às facções',
      icon: Gem,
    },
  ];

  const TYPE_LABELS: Record<string, string> = {
    npc: 'Personagem',
    tavern: 'Local',
    rumor: 'Rumor',
    loot: 'Relíquia',
  };

  return (
    <div className="space-y-5 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1">
      {/* Studio Context Panel */}
      <div className="p-5 rounded-xl surface-panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                Oráculo contextual
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded-md">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    geminiApiKey ? 'bg-emerald-400' : 'bg-zinc-500'
                  }`}
                />
                {geminiApiKey ? 'Gemini conectado' : 'Motor de cenário local'}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Improviso ancorado na Janela de Contexto da Wiki, facções, personagens e frentes ativas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {recentGeneratedItems.length > 0 && (
              <button
                type="button"
                onClick={clearGeneratedItems}
                className="btn-subtle px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 text-zinc-400 hover:text-rose-300"
                title="Limpar cartões gerados nesta sessão"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar histórico</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenWikiContextWindow}
              className="btn-subtle px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Janela de Contexto na Wiki</span>
              <ArrowUpRight className="w-3 h-3 text-zinc-500" />
            </button>
            <button
              type="button"
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="btn-subtle px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>{showPromptPreview ? 'Ocultar contexto' : 'Editar contexto'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="btn-subtle px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
              <span>{geminiApiKey ? 'Chave configurada' : 'Configurar API'}</span>
            </button>
          </div>
        </div>

        {/* Context Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-xl bg-[#0e0e11] border border-white/[0.06]">
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] text-zinc-400 block">
              Local de referência
            </label>
            <select
              value={selectedLocationHandle}
              onChange={(e) => setSelectedLocationHandle(e.target.value)}
              className="input-clean w-full px-3 py-1.5 rounded-lg text-xs"
            >
              <option value="">Contexto geral da campanha</option>
              {locationEntities.map((loc) => (
                <option
                  key={loc.id}
                  value={`${loc.mentionPrefix}${loc.handle}`}
                >
                  {loc.name} ({loc.mentionPrefix}
                  {loc.handle})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-8 space-y-1">
            <label className="text-[11px] text-zinc-400 block">
              Pedido específico para esta geração (opcional)
            </label>
            <input
              type="text"
              value={customHint}
              onChange={(e) => setCustomHint(e.target.value)}
              placeholder="Ex: ferreiro veterano da Batalha do Vau, estalagem dos guardiões..."
              className="input-clean w-full px-3 py-1.5 rounded-lg text-xs"
            />
          </div>
        </div>

        {showPromptPreview && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#0b0b0d] border border-white/[0.08]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Janela de Contexto Editável (Sincronizada com a Wiki)
                </span>
                <button
                  type="button"
                  onClick={handleSaveInlineContext}
                  className="btn-solid px-2.5 py-1 rounded-md text-[11px] inline-flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  <span>Salvar</span>
                </button>
              </div>
              <MentionTextarea
                value={worldContextDraft}
                onChange={setWorldContextDraft}
                rows={6}
                placeholder="Escreva diretrizes canônicas, história da região, regras da casa e tom (suporta @NPC e #Local)..."
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-zinc-400">
                Prompt combinado enviado ao Gemini
              </div>
              <pre className="p-3 rounded-lg bg-[#0e0e11] border border-white/[0.06] text-[11px] font-mono text-zinc-400 whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">
                {previewPrompt}
              </pre>
            </div>
          </div>
        )}

        {/* 4 Generator Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {generatorTiles.map((tile) => {
            const Icon = tile.icon;
            const isLoading = loadingType === tile.type;
            return (
              <button
                key={tile.type}
                disabled={loadingType !== null}
                onClick={() => handleGenerate(tile.type)}
                className="p-3.5 rounded-xl bg-[#0e0e11] hover:bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.16] transition-all flex items-start gap-3 text-left group disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-300 group-hover:text-white transition-colors shrink-0">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-100">
                    {tile.title}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                    {tile.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generated Stream */}
      {recentGeneratedItems.length === 0 ? (
        <div className="py-14 px-6 rounded-xl surface-panel text-center space-y-2.5">
          <Compass className="w-6 h-6 text-zinc-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-zinc-300">
              Nenhum elemento consultado nesta sessão
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Escolha o local atual e acione uma das categorias acima para gerar rascunhos prontos para o códice.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentGeneratedItems.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl surface-panel flex flex-col justify-between gap-4 overflow-hidden"
            >
              <div className="space-y-3.5 min-w-0">
                <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                      <span>
                        {TYPE_LABELS[item.type] || item.type} · {item.timestamp}
                      </span>
                      {item.aiGenerated && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px]">
                          <Sparkles className="w-2.5 h-2.5" />
                          Gemini
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-serif font-medium text-zinc-100 break-words leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-zinc-400 break-words">{item.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      title={`${item.type === 'npc' ? '@' : '#'}${item.rawHandle}`}
                      className="text-[11px] font-mono text-zinc-400 bg-[#0e0e11] px-2 py-0.5 rounded-md border border-white/[0.06] max-w-[155px] truncate"
                    >
                      {item.type === 'npc' ? '@' : '#'}
                      {item.rawHandle}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGeneratedItem(item.id)}
                      className="p-1 rounded-md text-zinc-600 hover:text-zinc-200 hover:bg-white/[0.05]"
                      title="Remover cartão"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {item.details.map((d, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs ${
                        d.isSecret
                          ? 'bg-rose-500/[0.03] border-rose-500/20'
                          : 'bg-[#0e0e11] border-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] mb-1 text-zinc-400">
                        {d.isSecret && (
                          <Lock className="w-3 h-3 text-rose-400/80" />
                        )}
                        <span
                          className={
                            d.isSecret ? 'text-rose-300 font-medium' : 'text-zinc-400 font-medium'
                          }
                        >
                          {d.label}
                        </span>
                      </div>
                      <div className="text-zinc-200 leading-relaxed break-words">
                        <MentionText text={d.value} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => saveGeneratedItemToDatabase(item, false)}
                  className="btn-solid flex-1 py-1.5 px-3 rounded-lg text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  <span>Salvar no códice</span>
                </button>

                <button
                  onClick={() => saveGeneratedItemToDatabase(item, true)}
                  className="btn-subtle flex-1 py-1.5 px-3 rounded-lg text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>Fixar na sessão</span>
                </button>

                <button
                  onClick={() => {
                    addScratchpadLine(
                      `${item.title} (${item.subtitle}) — ${item.details[0]?.value}`
                    );
                    showToast(`"${item.title}" adicionado às notas rápidas.`);
                  }}
                  className="btn-subtle p-1.5 rounded-lg"
                  title="Enviar para o bloco de notas rápidas"
                >
                  <FilePlus2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
