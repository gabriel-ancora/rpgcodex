import React, { useState, useEffect, useRef } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { convexClient } from '../../convexClient';
import { api } from '../../../convex/_generated/api';
import {
  exportCampaignAsJson,
  exportCampaignAsObsidianMarkdown,
  parseCampaignJsonFile,
} from '../../utils/campaignBackup';
import {
  sanitizeGeminiKey,
  validateGeminiApiKeyClientFallback,
} from '../../services/geminiService';
import {
  X,
  Check,
  ExternalLink,
  Download,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const isOpen = useCampaignStore((s) => s.isSettingsModalOpen);
  const setIsSettingsModalOpen = useCampaignStore((s) => s.setIsSettingsModalOpen);
  const geminiApiKey = useCampaignStore((s) => s.geminiApiKey);
  const setGeminiApiKey = useCampaignStore((s) => s.setGeminiApiKey);
  const workspaceMode = useCampaignStore((s) => s.workspaceMode);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const importCampaignBackup = useCampaignStore((s) => s.importCampaignBackup);
  const showToast = useCampaignStore((s) => s.showToast);

  const [keyInput, setKeyInput] = useState(geminiApiKey);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setKeyInput(geminiApiKey);
    setKeyStatus(null);
  }, [geminiApiKey, isOpen]);

  if (!isOpen) return null;

  const activeCamp = campaigns.find((c) => c.id === activeCampaignId);
  const isDm =
    workspaceMode === 'dm' &&
    viewRole === 'gm' &&
    activeCamp?.isDm !== false;

  const handleTestKey = async () => {
    setIsTestingKey(true);
    setKeyStatus(null);
    const cleaned = sanitizeGeminiKey(keyInput);
    try {
      const res = await convexClient.action(api.ai.validateKey, {
        apiKey: cleaned || undefined,
      });
      setKeyStatus({
        valid: res.valid,
        message: res.message,
      });
      if (res.valid && cleaned) {
        useCampaignStore.setState({ geminiApiKey: cleaned });
      }
    } catch {
      const fallback = await validateGeminiApiKeyClientFallback(cleaned);
      setKeyStatus(fallback);
      if (fallback.valid && cleaned) {
        useCampaignStore.setState({ geminiApiKey: cleaned });
      }
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleExportJson = () => {
    const s = useCampaignStore.getState();
    const activeCamp =
      s.campaigns.find((c) => c.id === s.activeCampaignId) || s.campaigns[0];
    if (!activeCamp) {
      showToast('Crie ou selecione uma campanha antes de exportar.');
      return;
    }

    exportCampaignAsJson({
      campaign: activeCamp,
      entities: s.entities,
      relationships: s.relationships,
      graphPositions: s.graphPositions,
      manualGraphNodes: s.manualGraphNodes,
      maps: s.maps,
      calendar: s.calendar,
      timeline: s.timeline,
      fronts: s.fronts,
      mysteryNodes: s.mysteryNodes,
      quests: s.quests,
      journal: s.journal,
      personalJournalNotes: s.personalJournalNotes,
      partyResources: s.partyResources,
      characterSheets: s.characterSheets,
    });
    showToast(`Backup JSON de "${activeCamp.title}" exportado.`);
  };

  const handleExportObsidianMd = () => {
    const s = useCampaignStore.getState();
    const activeCamp =
      s.campaigns.find((c) => c.id === s.activeCampaignId) || s.campaigns[0];
    if (!activeCamp) {
      showToast('Crie ou selecione uma campanha antes de exportar.');
      return;
    }

    exportCampaignAsObsidianMarkdown({
      campaign: activeCamp,
      entities: s.entities,
      fronts: s.fronts,
      quests: s.quests,
      journal: s.journal,
      characterSheets: s.characterSheets,
      calendar: s.calendar,
      timeline: s.timeline,
    });
    showToast(`Arquivo Markdown (.md) de "${activeCamp.title}" exportado.`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const parsed = await parseCampaignJsonFile(file);
      await importCampaignBackup(parsed);
      setIsSettingsModalOpen(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao importar backup JSON.'
      );
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(sanitizeGeminiKey(keyInput));
    setIsSettingsModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-lg w-full rounded-xl bg-[#131317] border border-white/[0.1] shadow-elevated overflow-hidden my-auto">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Configurações & Portabilidade
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Integrações opcionais e exportação de dados da campanha
            </p>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-5">
          {/* API Integration */}
          <div className="p-4 rounded-lg bg-[#0e0e11] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">
                Chave de API — Google Gemini
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1"
              >
                <span>Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Usada pelo Oráculo Contextual para criar personagens, rumores e locais
              conectados à campanha. Se deixada em branco, o gerador procedural local
              permanece ativo.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setKeyStatus(null);
                }}
                placeholder="AIzaSy..."
                className="input-clean flex-1 px-3 py-2 rounded-lg text-xs font-mono"
              />
              <button
                type="button"
                disabled={isTestingKey}
                onClick={handleTestKey}
                className="btn-subtle px-3 py-2 rounded-lg text-xs shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isTestingKey && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Validar</span>
              </button>
            </div>

            {keyStatus && (
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                  keyStatus.valid
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                }`}
              >
                {keyStatus.valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{keyStatus.message}</span>
              </div>
            )}
          </div>

          {/* Backup & Portabilidade */}
          {isDm && (
            <div className="p-4 rounded-lg bg-[#0e0e11] border border-white/[0.06] space-y-3">
              <div>
                <span className="text-xs font-semibold text-zinc-200 block">
                  Backup & Exportação
                </span>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                  Exporte o pacote completo da campanha em JSON ou gere notas em Markdown
                  com links compatíveis com o Obsidian.
                </p>
              </div>

              <input
                ref={backupInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={!activeCampaignId}
                  onClick={handleExportJson}
                  className="btn-subtle py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Exportar JSON</span>
                </button>

                <button
                  type="button"
                  disabled={!activeCampaignId}
                  onClick={handleExportObsidianMd}
                  className="btn-subtle py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Obsidian .md</span>
                </button>

                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => backupInputRef.current?.click()}
                  className="btn-subtle py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isImporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span>Importar JSON</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="btn-subtle px-4 py-2 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-solid px-4 py-2 rounded-lg text-xs inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
