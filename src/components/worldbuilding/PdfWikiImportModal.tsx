import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  FileUp,
  FileText,
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
  { label: string; icon: React.FC<{ className?: string }> }
> = {
  npc: { label: 'Personagem', icon: User },
  faction: { label: 'Facção', icon: Shield },
  location: { label: 'Local', icon: MapPin },
  item: { label: 'Item', icon: Package },
  monster: { label: 'Criatura', icon: Skull },
  lore: { label: 'Lore', icon: BookOpen },
};

export const PdfWikiImportModal: React.FC<PdfWikiImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const entities = useCampaignStore((s) => s.entities);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const campaignName = campaigns.find((c) => c.id === activeCampaignId)?.title || '';
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
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage(
        'O PDF excede o limite de 15 MB. Divida o arquivo em partes ou comprima-o.'
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
    setProgressText('Preparando arquivo…');

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
          'Nenhuma chave de API do Google Gemini cadastrada. Configure-a em Configurações.'
        );
      } else if (res.errorReason === 'file_too_large') {
        setErrorMessage('O arquivo PDF excede 15 MB.');
      } else if (res.errorReason === 'http_401' || res.errorReason === 'http_403') {
        setNeedsApiKey(true);
        setErrorMessage('A chave do Gemini cadastrada é inválida ou não tem permissão.');
      } else if (res.errorReason === 'http_429') {
        setErrorMessage('Limite de uso da API atingido. Aguarde e tente novamente.');
      } else {
        setErrorMessage(
          'Não foi possível extrair entradas deste PDF. Tente novamente ou use um arquivo menor.'
        );
      }
      return;
    }

    if (res.entities.length === 0) {
      setErrorMessage(
        'Nenhum personagem, local, item ou lore foi encontrado no documento.'
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

    showToast(`${toImport.length} entrada(s) importada(s) para o códice.`);
    resetModalState();
    onClose();
  };

  const allVisibleSelected =
    filteredExtracted.length > 0 &&
    filteredExtracted.every((e) => selectedIds.has(e.tempId));

  return (
    <div
      className="modal-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-import-title"
    >
      <div
        className="modal max-w-3xl max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-line flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 id="pdf-import-title" className="section-title">
              Importar PDF
            </h3>
            <p className="mt-0.5 text-[13px] text-fg-muted">
              Extrai personagens, locais, itens e lore de um PDF para o códice.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isAnalyzing}
            className="btn btn-ghost btn-icon shrink-0"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {extracted.length === 0 ? (
            <>
              {/* Área de envio */}
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
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isAnalyzing) {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`border border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-accent bg-accent-soft'
                    : 'border-line-strong bg-surface-2 hover:border-fg-subtle'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFileChosen(e.target.files?.[0])}
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-5 h-5 text-fg-muted" />
                    <p className="text-sm font-medium text-fg break-all">{selectedFile.name}</p>
                    <p className="text-[13px] text-fg-muted">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Clique para trocar
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileUp className="w-5 h-5 text-fg-subtle" />
                    <p className="text-sm font-medium text-fg">
                      Arraste um PDF ou clique para selecionar
                    </p>
                    <p className="text-[13px] text-fg-muted">
                      Aventuras, compêndios ou notas do mestre. Máximo de 15 MB.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="pdf-instructions" className="label">
                  Instruções adicionais
                </label>
                <textarea
                  id="pdf-instructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  disabled={isAnalyzing}
                  rows={2}
                  placeholder="Ex.: considere apenas NPCs e itens mágicos da masmorra."
                  className="input resize-none"
                />
                <p className="hint">Opcional.</p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 rounded-md bg-danger-soft flex flex-wrap items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2 text-[13px] text-danger">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                  {needsApiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        setIsSettingsModalOpen(true);
                      }}
                      className="btn btn-secondary btn-sm shrink-0"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Abrir configurações</span>
                    </button>
                  )}
                </div>
              )}

              {isAnalyzing && (
                <div role="status" className="card-muted p-3 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-fg-muted animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-fg">
                      {progressText || 'Processando…'}
                    </p>
                    <p className="text-[13px] text-fg-muted">
                      Pode levar alguns segundos, conforme o número de páginas.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Revisão */
            <div className="space-y-4">
              <div className="card-muted p-3 flex flex-wrap items-start justify-between gap-2">
                <div className="text-[13px] text-fg-muted min-w-0 flex-1">
                  <span className="font-medium text-fg">Resumo: </span>
                  {summaryNotes}
                </div>
                {modelUsed && <span className="badge font-mono">{modelUsed}</span>}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    aria-pressed={categoryFilter === 'all'}
                    className={`btn btn-sm ${
                      categoryFilter === 'all' ? 'btn-secondary border-line-strong text-fg bg-surface-2' : 'btn-ghost'
                    }`}
                  >
                    Todos
                    <span className="text-fg-subtle tabular-nums">{extracted.length}</span>
                  </button>
                  {(Object.keys(CATEGORY_LABELS) as EntityCategory[]).map((cat) => {
                    const count = extracted.filter((e) => e.category === cat).length;
                    if (count === 0) return null;
                    const active = categoryFilter === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        aria-pressed={active}
                        className={`btn btn-sm ${
                          active ? 'btn-secondary border-line-strong text-fg bg-surface-2' : 'btn-ghost'
                        }`}
                      >
                        {CATEGORY_LABELS[cat].label}
                        <span className="text-fg-subtle tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="btn btn-ghost btn-sm"
                >
                  {allVisibleSelected ? 'Desmarcar visíveis' : 'Selecionar visíveis'}
                </button>
              </div>

              <ul className="space-y-2">
                {filteredExtracted.map((item) => {
                  const isChecked = selectedIds.has(item.tempId);
                  const isDuplicate = existingNamesSet.has(
                    item.name.trim().toLowerCase()
                  );
                  const meta = CATEGORY_LABELS[item.category];
                  const Icon = meta.icon;

                  return (
                    <li
                      key={item.tempId}
                      className={`p-3 rounded-md border transition-colors ${
                        isChecked
                          ? 'bg-surface border-accent/40'
                          : 'bg-surface-2 border-line'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isChecked}
                          aria-label={`Selecionar ${item.name}`}
                          onClick={() => toggleSelect(item.tempId)}
                          className={`mt-2 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-accent border-accent text-accent-fg'
                              : 'border-line-strong bg-surface'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>

                        <div className={`flex-1 min-w-0 space-y-2 ${isChecked ? '' : 'opacity-70'}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                updateDraftEntity(item.tempId, { name: e.target.value })
                              }
                              className="input h-8 flex-1 min-w-[160px] font-medium"
                              aria-label="Nome"
                            />
                            <div className="relative">
                              <Icon className="w-4 h-4 text-fg-subtle absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <select
                                value={item.category}
                                onChange={(e) =>
                                  updateDraftEntity(item.tempId, {
                                    category: e.target.value as EntityCategory,
                                  })
                                }
                                className="input h-8 w-auto pl-8 text-[13px]"
                                aria-label="Categoria"
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
                              className="btn btn-secondary btn-sm"
                              title="Alternar visibilidade para jogadores"
                            >
                              {item.isPublicToPlayers ? (
                                <>
                                  <Eye className="w-4 h-4" />
                                  <span>Público</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-4 h-4" />
                                  <span>Oculto</span>
                                </>
                              )}
                            </button>
                            {isDuplicate && (
                              <span className="badge badge-warning">Já existe no códice</span>
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
                            className="input h-8 text-[13px]"
                            aria-label="Subtítulo"
                          />

                          <p className="text-[13px] text-fg-muted line-clamp-3">
                            {item.publicContent}
                          </p>

                          {(item.secrets.length > 0 || item.attributes.length > 0) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {item.secrets.length > 0 && (
                                <span className="badge">
                                  <Lock className="w-3 h-3" />
                                  {item.secrets.length} segredo(s)
                                </span>
                              )}
                              {item.attributes.slice(0, 4).map((a, i) => (
                                <span key={i} className="badge">
                                  {a.label}: <span className="text-fg">{a.value}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-5 py-3 border-t border-line bg-surface-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {extracted.length === 0 ? (
            <>
              <span className="text-xs text-fg-subtle">
                Usa a chave do Google Gemini definida em Configurações.
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isAnalyzing}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!selectedFile || isAnalyzing}
                  className="btn btn-primary"
                >
                  {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isAnalyzing ? 'Analisando…' : 'Analisar PDF'}</span>
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
                className="btn btn-ghost"
              >
                Escolher outro PDF
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" onClick={handleClose} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImportSelected}
                  disabled={selectedIds.size === 0}
                  className="btn btn-primary"
                >
                  Importar {selectedIds.size}{' '}
                  {selectedIds.size === 1 ? 'entrada' : 'entradas'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
