import React, { useState, useEffect, useRef } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import {
  exportCampaignAsJson,
  exportCampaignAsMarkdown,
  parseCampaignJsonFile,
} from '../../utils/campaignBackup';
import {
  sanitizeGeminiKey,
  validateGeminiKey,
} from '../../services/geminiService';
import {
  X,
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
  const isDm = viewRole === 'gm' && activeCamp?.isDm !== false;

  const handleTestKey = async () => {
    setIsTestingKey(true);
    setKeyStatus(null);
    const cleaned = sanitizeGeminiKey(keyInput);
    try {
      const res = await validateGeminiKey(cleaned);
      setKeyStatus({
        valid: res.valid,
        message: res.message,
      });
      if (res.valid && cleaned) {
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

    exportCampaignAsMarkdown({
      campaign: activeCamp,
      entities: s.entities,
      fronts: s.fronts,
      quests: s.quests,
      journal: s.journal,
      characterSheets: s.characterSheets,
      calendar: s.calendar,
      timeline: s.timeline,
    });
    showToast(`Markdown de "${activeCamp.title}" exportado.`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const { payload } = await parseCampaignJsonFile(file);
      await importCampaignBackup(payload);
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
    <div
      className="modal-backdrop overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="modal max-w-lg my-auto">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
          <h3 id="settings-modal-title" className="section-title">
            Configurações
          </h3>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="btn btn-ghost btn-icon"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="divide-y divide-line">
            {/* Integração */}
            <section className="px-5 py-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-fg">Chave de API do Google Gemini</h4>
                  <p className="mt-0.5 text-[13px] text-fg-muted">
                    Opcional. Usada pelo oráculo e pela importação de PDF. Sem chave, o
                    gerador local é usado.
                  </p>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[13px] text-accent hover:underline inline-flex items-center gap-1"
                >
                  <span>Obter chave</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => {
                    setKeyInput(e.target.value);
                    setKeyStatus(null);
                  }}
                  placeholder="AIzaSy…"
                  className="input flex-1 font-mono"
                  aria-label="Chave de API do Google Gemini"
                />
                <button
                  type="button"
                  disabled={isTestingKey}
                  onClick={handleTestKey}
                  className="btn btn-secondary shrink-0"
                >
                  {isTestingKey && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Validar</span>
                </button>
              </div>

              {keyStatus && (
                <div
                  role="status"
                  className={`p-2.5 rounded-md text-[13px] flex items-center gap-2 ${
                    keyStatus.valid
                      ? 'bg-success-soft text-success'
                      : 'bg-danger-soft text-danger'
                  }`}
                >
                  {keyStatus.valid ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{keyStatus.message}</span>
                </div>
              )}
            </section>

            {/* Backup e exportação */}
            {isDm && (
              <section className="px-5 py-5 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-fg">Backup e exportação</h4>
                  <p className="mt-0.5 text-[13px] text-fg-muted">
                    Exporte a campanha em JSON ou em Markdown compatível com Obsidian.
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
                    className="btn btn-secondary"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar JSON</span>
                  </button>

                  <button
                    type="button"
                    disabled={!activeCampaignId}
                    onClick={handleExportObsidianMd}
                    className="btn btn-secondary"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Exportar .md</span>
                  </button>

                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={() => backupInputRef.current?.click()}
                    className="btn btn-secondary"
                  >
                    {isImporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>Importar JSON</span>
                  </button>
                </div>
              </section>
            )}
          </div>

          <div className="px-5 py-3 border-t border-line bg-surface-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
