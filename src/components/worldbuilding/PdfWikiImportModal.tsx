import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  FileUp,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  User,
  Shield,
  MapPin,
  Package,
  Skull,
  BookOpen,
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { EntityCategory } from '../../types/campaign';
import {
  ExtractedWikiEntity,
  extractWikiEntitiesFromPdf,
} from '../../services/geminiService';

interface PdfWikiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<
  EntityCategory,
  { label: string; icon: React.FC<{ className?: string }>; badge: string }
> = {
  npc: {
    label: 'Personagem',
    icon: User,
    badge: 'text-amber-300 bg-amber-500/10 border-amber-500/25',
  },
  faction: {
    label: 'Facção',
    icon: Shield,
    badge: 'text-violet-300 bg-violet-500/10 border-violet-500/25',
  },
  location: {
    label: 'Local',
    icon: MapPin,
    badge: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
  },
  item: {
    label: 'Item',
    icon: Package,
    badge: 'text-sky-300 bg-sky-500/10 border-sky-500/25',
  },
  monster: {
    label: 'Criatura',
    icon: Skull,
    badge: 'text-rose-300 bg-rose-500/10 border-rose-500/25',
  },
  lore: {
    label: 'Lore / Info',
    icon: BookOpen,
    badge: 'text-zinc-300 bg-white/[0.06] border-white/[0.12]',
  },
};

export const PdfWikiImportModal: React.FC<PdfWikiImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const entities = useCampaignStore((s) => s.entities);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const campaignName = useCampaignStore((s) => s.campaignName);
  const geminiApiKey = useCampaignStore((s) => s.geminiApiKey);
  const addEntity = useCampaignStore((s) => s.addEntity);
  const showToast = useCampaignStore((s) => s.showToast);
  const setIsSettingsModalOpen = useCampaignStore((s) => s.setIsSettingsModalOpen);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);

  const [summaryNotes, setSummaryNotes] = useState('');
  const [modelUsed, setModelUsed] = useState<string | undefined>(undefined);
  const [extracted, setExtracted] = useState<ExtractedWikiEntity[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<EntityCategory | 'all'>('all');

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.id === activeCampaignId),
    [campaigns, activeCampaignId]
  );

  const existingNamesSet = useMemo(
    () => new Set(entities.map((e) => e.name.trim().toLowerCase())),
    [entities]
  );

  if (!isOpen) return null;

  const resetModalState = () => {
    setSelectedFile(null);
    setCustomInstructions('');
    setIsAnalyzing(false);
    setProgressText('');
    setErrorMessage(null);
    setNeedsApiKey(false);
    setSummaryNotes('');
    setModelUsed(undefined);
    setExtracted([]);
    setSelectedIds(new Set());
    setCategoryFilter('all');
  };

  const handleClose = () => {
    if (isAnalyzing) return;
    resetModalState();
    onClose();
  };

  const handleFileChosen = (file: File | undefined | null) => {
    if (!file) return;
    setErrorMessage(null);
    setNeedsApiKey(false);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Selecione um arquivo no formato .pdf.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage(
        'O PDF excede o limite de 50 MB da API Gemini. Tente dividir o arquivo em partes menores.'
      );
      return;
    }
    setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setErrorMessage(null);
    setNeedsApiKey(false);
    setProgressText('Preparando arquivo PDF...');

    const res = await extractWikiEntitiesFromPdf({
      file: selectedFile,
      apiKey: geminiApiKey,
      campaignName: activeCampaign?.title || campaignName,
      campaignSystem: activeCampaign?.system,
      worldContext: activeCampaign?.worldContext,
      customInstructions: customInstructions.trim() || undefined,
      existingEntityNames: entities.map((e) => e.name),
      onProgress: (stage) => setProgressText(stage),
    });

    setIsAnalyzing(false);
    setProgressText('');

    if (!res.ok) {
      if (res.errorReason === 'no_api_key') {
        setNeedsApiKey(true);
        setErrorMessage(
          'Nenhuma chave da API Google Gemini está cadastrada. Configure sua chave nas Configurações.'
        );
      } else if (res.errorReason === 'file_too_large') {
        setErrorMessage('O arquivo PDF excede o limite de 50 MB.');
      } else if (res.errorReason === 'http_401' || res.errorReason === 'http_403') {
        setNeedsApiKey(true);
        setErrorMessage('A chave Gemini cadastrada é inválida ou não tem permissão.');
      } else if (res.errorReason === 'http_429') {
        setErrorMessage('Limite de cota da API Gemini atingido. Aguarde um momento e tente novamente.');
      } else {
        setErrorMessage(
          'Não foi possível extrair entidades deste PDF. Tente novamente ou reduza o tamanho do documento.'
        );
      }
      return;
    }

    if (res.entities.length === 0) {
      setErrorMessage(
        'A IA analisou o documento, mas não encontrou personagens, locais, itens ou lore estruturáveis.'
      );
      return;
    }

    setSummaryNotes(res.summaryNotes);
    setModelUsed(res.modelUsed);
    setExtracted(res.entities);

    // Seleciona por padrão apenas entidades que ainda não existem na Wiki
    const initialSelected = new Set<string>();
    res.entities.forEach((ent) => {
      if (!existingNamesSet.has(ent.name.trim().toLowerCase())) {
        initialSelected.add(ent.tempId);
      }
    });
    setSelectedIds(initialSelected);
  };

  const toggleSelect = (tempId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId);
      else next.add(tempId);
      return next;
    });
  };

  const updateDraftEntity = (
    tempId: string,
    patch: Partial<ExtractedWikiEntity>
  ) => {
    setExtracted((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item))
    );
  };

  const filteredExtracted =
    categoryFilter === 'all'
      ? extracted
      : extracted.filter((e) => e.category === categoryFilter);

  const handleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allVisibleSelected =
        filteredExtracted.length > 0 &&
        filteredExtracted.every((e) => next.has(e.tempId));
      if (allVisibleSelected) {
        filteredExtracted.forEach((e) => next.delete(e.tempId));
      } else {
        filteredExtracted.forEach((e) => next.add(e.tempId));
      }
      return next;
    });
  };

  const handleImportSelected = () => {
    const toImport = extracted.filter((e) => selectedIds.has(e.tempId));
    if (toImport.length === 0) return;

    const stamp = Date.now();
    toImport.forEach((item, idx) => {
      addEntity({
        name: item.name.trim() || 'Entidade sem nome',
        subtitle: item.subtitle.trim() || 'Registro importado do PDF',
        category: item.category,
        tags: item.tags.length > 0 ? item.tags : ['PDF'],
        summary: item.summary.trim() || item.name,
        publicContent: item.publicContent.trim() || item.summary,
        isPublicToPlayers: item.isPublicToPlayers,
        secrets: item.secrets.map((sec, sIdx) => ({
          id: `sec-${stamp}-${idx}-${sIdx}`,
          title: sec.title,
          content: sec.content,
          isRevealed: false,
        })),
        attributes: item.attributes.map((attr, aIdx) => ({
          id: `attr-${stamp}-${idx}-${aIdx}`,
          label: attr.label,
          value: attr.value,
          category: 'meta',
        })),
      });
    });

    showToast(`${toImport.length} entidade(s) importada(s) do PDF para a Wiki!`);
    resetModalState();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-[#121215] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-100 truncate">
                Importar PDF para a Wiki com IA
              </h3>
              <p className="text-xs text-zinc-500 truncate">
                Extrai personagens, locais, itens e lore automaticamente usando a IA cadastrada
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isAnalyzing}
            className="text-zinc-500 hover:text-zinc-200 disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {extracted.length === 0 ? (
            <>
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileChosen(e.dataTransfer.files?.[0]);
                }}
                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-amber-400/60 bg-amber-500/[0.08]'
                    : selectedFile
                    ? 'border-emerald-500/40 bg-emerald-500/[0.05]'
                    : 'border-white/[0.12] hover:border-white/[0.25] bg-[#0e0e11]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFileChosen(e.target.files?.[0])}
                />
                <FileUp
                  className={`w-8 h-8 mx-auto mb-2.5 ${
                    selectedFile ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                />
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Clique para trocar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-200">
                      Arraste um PDF aqui ou clique para selecionar
                    </p>
                    <p className="text-xs text-zinc-500">
                      Aventuras, fichas de campanha, compêndios ou notas do mestre (máx. 50 MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Optional prompt */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Foco ou instruções para a IA (opcional)
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  disabled={isAnalyzing}
                  rows={2}
                  placeholder="Ex: Foque apenas nos NPCs e itens mágicos da masmorra, ou traduza tudo para português..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0e0e11] border border-white/[0.08] text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/40 resize-none"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 text-xs text-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                  {needsApiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        setIsSettingsModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-medium inline-flex items-center gap-1 shrink-0 hover:bg-amber-500/30"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Configurar IA</span>
                    </button>
                  )}
                </div>
              )}

              {isAnalyzing && (
                <div className="p-4 rounded-lg bg-amber-500/[0.07] border border-amber-500/25 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-amber-300 animate-spin shrink-0" />
                  <div className="text-xs">
                    <p className="text-amber-200 font-medium">
                      {progressText || 'Processando PDF...'}
                    </p>
                    <p className="text-zinc-400 mt-0.5">
                      Isso pode levar alguns segundos dependendo do número de páginas.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Review Stage */
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[#0e0e11] border border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-zinc-300 leading-relaxed">
                  <span className="font-semibold text-amber-300">Resumo da IA: </span>
                  {summaryNotes}
                </div>
                {modelUsed && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-zinc-400 border border-white/[0.08]">
                    {modelUsed}
                  </span>
                )}
              </div>

              {/* Filter & bulk select bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`px-2 py-1 rounded text-xs border transition-colors ${
                      categoryFilter === 'all'
                        ? 'bg-amber-500/15 text-amber-200 border-amber-500/35'
                        : 'bg-[#0e0e11] text-zinc-400 border-white/[0.08] hover:text-zinc-200'
                    }`}
                  >
                    Todos ({extracted.length})
                  </button>
                  {(Object.keys(CATEGORY_LABELS) as EntityCategory[]).map((cat) => {
                    const count = extracted.filter((e) => e.category === cat).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${
                          categoryFilter === cat
                            ? 'bg-amber-500/15 text-amber-200 border-amber-500/35'
                            : 'bg-[#0e0e11] text-zinc-400 border-white/[0.08] hover:text-zinc-200'
                        }`}
                      >
                        {CATEGORY_LABELS[cat].label} ({count})
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="text-xs text-zinc-400 hover:text-zinc-100 underline underline-offset-2"
                >
                  {filteredExtracted.length > 0 &&
                  filteredExtracted.every((e) => selectedIds.has(e.tempId))
                    ? 'Desmarcar visíveis'
                    : 'Selecionar visíveis'}
                </button>
              </div>

              {/* Extracted cards */}
              <div className="space-y-2.5">
                {filteredExtracted.map((item) => {
                  const isChecked = selectedIds.has(item.tempId);
                  const isDuplicate = existingNamesSet.has(
                    item.name.trim().toLowerCase()
                  );
                  const meta = CATEGORY_LABELS[item.category];
                  const Icon = meta.icon;

                  return (
                    <div
                      key={item.tempId}
                      className={`p-3 rounded-lg border transition-colors ${
                        isChecked
                          ? 'bg-[#17171b] border-amber-500/35'
                          : 'bg-[#0e0e11] border-white/[0.06] opacity-70'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSelect(item.tempId)}
                          className={`mt-1 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-amber-500 border-amber-400 text-zinc-950'
                              : 'border-white/25 bg-transparent'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                updateDraftEntity(item.tempId, { name: e.target.value })
                              }
                              className="flex-1 min-w-[160px] px-2 py-1 rounded bg-[#0b0b0e] border border-white/[0.08] text-sm font-medium text-zinc-100 focus:outline-none focus:border-amber-500/40"
                            />
                            <div className="inline-flex items-center gap-1">
                              <Icon className="w-3.5 h-3.5 text-zinc-400" />
                              <select
                                value={item.category}
                                onChange={(e) =>
                                  updateDraftEntity(item.tempId, {
                                    category: e.target.value as EntityCategory,
                                  })
                                }
                                className="px-2 py-1 rounded bg-[#0b0b0e] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none"
                              >
                                {(Object.keys(CATEGORY_LABELS) as EntityCategory[]).map(
                                  (c) => (
                                    <option key={c} value={c}>
                                      {CATEGORY_LABELS[c].label}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                updateDraftEntity(item.tempId, {
                                  isPublicToPlayers: !item.isPublicToPlayers,
                                })
                              }
                              className={`px-2 py-1 rounded text-[11px] border inline-flex items-center gap-1 ${
                                item.isPublicToPlayers
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                                  : 'bg-zinc-800 text-zinc-400 border-white/[0.08]'
                              }`}
                              title="Alternar visibilidade para jogadores"
                            >
                              {item.isPublicToPlayers ? (
                                <>
                                  <Eye className="w-3 h-3" />
                                  <span>Público</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  <span>Oculto</span>
                                </>
                              )}
                            </button>
                            {isDuplicate && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Já existe na Wiki
                              </span>
                            )}
                          </div>

                          <input
                            type="text"
                            value={item.subtitle}
                            onChange={(e) =>
                              updateDraftEntity(item.tempId, {
                                subtitle: e.target.value,
                              })
                            }
                            placeholder="Subtítulo"
                            className="w-full px-2 py-1 rounded bg-[#0b0b0e] border border-white/[0.06] text-xs text-zinc-300 focus:outline-none focus:border-amber-500/35"
                          />

                          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                            {item.publicContent}
                          </p>

                          {(item.secrets.length > 0 || item.attributes.length > 0) && (
                            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-zinc-400">
                              {item.secrets.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                  <Lock className="w-3 h-3" />
                                  {item.secrets.length} segredo(s) do mestre
                                </span>
                              )}
                              {item.attributes.slice(0, 4).map((a, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.07]"
                                >
                                  {a.label}: <strong className="text-zinc-200">{a.value}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/[0.08] flex items-center justify-between gap-3 shrink-0 bg-[#0e0e11]">
          {extracted.length === 0 ? (
            <>
              <span className="text-[11px] text-zinc-500">
                Usa a chave Google Gemini cadastrada nas Configurações.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isAnalyzing}
                  className="btn-subtle px-3 py-1.5 rounded-md text-xs disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!selectedFile || isAnalyzing}
                  className="btn-solid px-3.5 py-1.5 rounded-md text-xs inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analisando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analisar PDF com IA</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setExtracted([]);
                  setSelectedIds(new Set());
                }}
                className="btn-subtle px-3 py-1.5 rounded-md text-xs"
              >
                Enviar outro PDF
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-subtle px-3 py-1.5 rounded-md text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImportSelected}
                  disabled={selectedIds.size === 0}
                  className="btn-solid px-4 py-1.5 rounded-md text-xs inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Importar {selectedIds.size} para a Wiki</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
