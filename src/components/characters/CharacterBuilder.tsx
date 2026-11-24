import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Info, Loader2, X } from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import type { CharacterSheet } from '../../types/campaign';
import { createEmptyBuild, type CharacterBuild } from '../../rules/build';
import { buildIssues, computeCharacter, normalizeBuild, type BuildStep } from '../../rules/engine';
import { useConfirm } from '../common/Modal';
import { sheetFromBuild } from '../../rules/toSheet';
import { buildFromSheet } from '../../rules/legacy';
import { StepClass } from './builder/StepClass';
import { StepOrigin } from './builder/StepOrigin';
import { StepAbilities } from './builder/StepAbilities';
import { StepChoices } from './builder/StepChoices';
import { StepSpells } from './builder/StepSpells';
import { StepEquipment } from './builder/StepEquipment';
import { StepDetails, type IdentityState } from './builder/StepDetails';
import type { BuildUpdate } from './builder/shared';

const STEPS: { id: BuildStep; label: string; hint: string }[] = [
  { id: 'class', label: 'Classe', hint: 'Classe, nível e subclasse' },
  { id: 'origin', label: 'Origem', hint: 'Antecedente, espécie e idiomas' },
  { id: 'abilities', label: 'Atributos', hint: 'Valores e aumentos' },
  { id: 'choices', label: 'Características', hint: 'Perícias e escolhas da classe' },
  { id: 'spells', label: 'Magias', hint: 'Truques e magias preparadas' },
  { id: 'equipment', label: 'Equipamento', hint: 'Pacote inicial ou ouro' },
  { id: 'details', label: 'Detalhes', hint: 'Nome, campanha e revisão' },
];

export const CharacterBuilder: React.FC<{
  sheet?: CharacterSheet;
  defaultCampaignId?: string;
  onClose: () => void;
  onSaved?: (id: string) => void;
  initialStep?: BuildStep;
}> = ({ sheet, defaultCampaignId, onClose, onSaved, initialStep = 'class' }) => {
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const currentUser = useCampaignStore((s) => s.currentUser);
  const createCharacterSheet = useCampaignStore((s) => s.createCharacterSheet);
  const updateCharacterSheet = useCampaignStore((s) => s.updateCharacterSheet);

  const playerCampaigns = useMemo(() => campaigns.filter((c) => !c.isDm), [campaigns]);

  const initial = useMemo(() => (sheet ? buildFromSheet(sheet) : { build: createEmptyBuild(), inferred: false }), [sheet]);
  const [build, setBuild] = useState<CharacterBuild>(initial.build);
  const [step, setStep] = useState<BuildStep>(initialStep);
  const [resetEquipment, setResetEquipment] = useState(!sheet);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const confirm = useConfirm();
  const [identity, setIdentityState] = useState<IdentityState>(() => {
    const preferredCampaignId =
      sheet?.campaignId ??
      (defaultCampaignId && playerCampaigns.some((c) => c.id === defaultCampaignId)
        ? defaultCampaignId
        : playerCampaigns.some((c) => c.id === activeCampaignId)
        ? activeCampaignId
        : playerCampaigns[0]?.id || '');
    return {
      name: sheet?.name || '',
      alignment: sheet?.alignment || 'Neutro',
      avatarUrl: sheet?.avatarUrl || '',
      notes: sheet?.notes || '',
      campaignId: preferredCampaignId,
    };
  });

  const requestClose = useCallback(async () => {
    if (saving) return;
    if (dirty) {
      const ok = await confirm({
        title: 'Descartar alterações?',
        message: sheet
          ? 'As alterações feitas nesta edição não foram salvas.'
          : 'O personagem ainda não foi criado e as escolhas feitas serão perdidas.',
        confirmLabel: 'Descartar',
        cancelLabel: 'Continuar editando',
      });
      if (!ok) return;
    }
    onClose();
  }, [saving, dirty, confirm, sheet, onClose]);

  // Esc fecha (com confirmação se houver alterações)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelectorAll('[data-dialog-root]').length > 0) return;
      void requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const update: BuildUpdate = useCallback((patch) => {
    setDirty(true);
    setBuild((b) => ({ ...b, ...(typeof patch === 'function' ? patch(b) : patch) }));
  }, []);
  const setIdentity = (patch: Partial<IdentityState>) => {
    setDirty(true);
    setIdentityState((s) => ({ ...s, ...patch }));
  };

  const c = useMemo(() => computeCharacter(build), [build]);
  const needsPlayerCampaign = !sheet && !playerCampaigns.some((x) => x.id === identity.campaignId);
  const issues = useMemo(() => {
    const list = buildIssues(build, c);
    if (!identity.name.trim()) list.push({ step: 'details', text: 'Dê um nome ao personagem.' });
    if (needsPlayerCampaign) {
      list.push({ step: 'details', text: 'Selecione uma campanha em que você participa como jogador.' });
    }
    return list;
  }, [build, c, identity.name, needsPlayerCampaign]);
  const issuesByStep = useMemo(() => {
    const map: Partial<Record<BuildStep, number>> = {};
    for (const i of issues) map[i.step] = (map[i.step] || 0) + 1;
    return map;
  }, [issues]);

  const isOwner = !sheet || sheet.playerId === currentUser?.id;
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const camp = campaigns.find((x) => x.id === identity.campaignId);
    // Remove escolhas que ficaram inválidas (classe, espécie ou nível alterados) antes de gravar.
    const cleanBuild = normalizeBuild(build);
    const cleanComputed = computeCharacter(cleanBuild);
    const fields = sheetFromBuild(
      cleanBuild,
      cleanComputed,
      {
        name: identity.name,
        alignment: identity.alignment,
        avatarUrl: identity.avatarUrl.trim() || undefined,
        notes: identity.notes,
        campaignId: camp?.id || '',
        campaignTitle: camp?.title || '',
      },
      sheet,
      resetEquipment
    );
    try {
      if (sheet) {
        const payload: Partial<CharacterSheet> = { ...fields };
        // Só o dono pode mover a ficha de campanha (o servidor também valida).
        if (!isOwner || fields.campaignId === sheet.campaignId) {
          delete payload.campaignId;
          delete payload.campaignTitle;
        }
        const ok = await updateCharacterSheet(sheet.id, payload);
        if (ok) {
          onSaved?.(sheet.id);
          onClose();
        }
      } else {
        const id = await createCharacterSheet({
          ...fields,
          playerId: currentUser?.id || '',
          playerName: currentUser?.name || 'Jogador',
        });
        if (id) {
          onSaved?.(id);
          onClose();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const stepProps = { build, c, update };

  return (
    <div className="modal-backdrop p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="builder-title">
      <div className="modal max-w-6xl h-full sm:h-[92vh] rounded-none sm:rounded-xl">
        {/* Cabeçalho */}
        <header className="h-14 px-4 sm:px-5 border-b border-line flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 id="builder-title" className="text-[15px] font-semibold text-fg truncate">
              {sheet ? `Editar ${sheet.name}` : 'Novo personagem'}
            </h2>
            <p className="text-xs text-fg-subtle truncate">
              {[c.species?.name, c.cls.name, `nível ${c.level}`, c.subclass?.name].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button type="button" onClick={() => void requestClose()} className="btn btn-ghost btn-icon" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Navegação de etapas */}
          <nav className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-line bg-surface-2/50 overflow-x-auto md:overflow-y-auto">
            <ol className="flex md:flex-col p-2 gap-1">
              {STEPS.map((s, i) => {
                const pending = issuesByStep[s.id] || 0;
                const active = s.id === step;
                return (
                  <li key={s.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setStep(s.id)}
                      aria-current={active ? 'step' : undefined}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                        active ? 'bg-surface border border-line shadow-subtle' : 'hover:bg-surface/70 border border-transparent'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 ${
                          active
                            ? 'bg-accent text-accent-fg'
                            : pending
                            ? 'bg-warning-soft text-warning'
                            : 'bg-surface-3 text-fg-muted'
                        }`}
                      >
                        {!active && !pending && i < stepIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-sm ${active ? 'font-semibold text-fg' : 'text-fg'}`}>{s.label}</span>
                        <span className="hidden md:block text-xs text-fg-subtle truncate">
                          {pending ? `${pending} pendência(s)` : s.hint}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
              {initial.inferred && step === 'class' && (
                <div className="card-muted p-3 flex items-start gap-2 text-[13px] text-fg-muted">
                  <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
                  Esta ficha foi criada na versão anterior do Codex. As escolhas foram recuperadas quando possível; revise cada etapa
                  antes de salvar.
                </div>
              )}
              <div>
                <h3 className="page-title">{STEPS[stepIndex].label}</h3>
                <p className="text-[13px] text-fg-muted">{STEPS[stepIndex].hint}</p>
              </div>
              {step === 'class' && <StepClass {...stepProps} />}
              {step === 'origin' && <StepOrigin {...stepProps} />}
              {step === 'abilities' && <StepAbilities {...stepProps} />}
              {step === 'choices' && <StepChoices {...stepProps} />}
              {step === 'spells' && <StepSpells {...stepProps} />}
              {step === 'equipment' && (
                <StepEquipment
                  {...stepProps}
                  isEditing={Boolean(sheet)}
                  resetEquipment={resetEquipment}
                  onResetEquipmentChange={setResetEquipment}
                />
              )}
              {step === 'details' && (
                <StepDetails
                  {...stepProps}
                  identity={identity}
                  setIdentity={setIdentity}
                  campaigns={isOwner ? playerCampaigns : campaigns}
                  canChangeCampaign={isOwner}
                  issues={issues.map((i) => i.text)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <footer className="px-4 sm:px-5 py-3 border-t border-line flex items-center justify-between gap-3 shrink-0 bg-surface">
          <span className="text-[13px] text-fg-muted">
            {!c.species || !c.background
              ? 'Escolha espécie e antecedente (etapa Origem) para salvar.'
              : needsPlayerCampaign
              ? 'Entre em uma campanha como jogador (etapa Detalhes) para criar a ficha.'
              : issues.length === 0
              ? 'Pronto para salvar.'
              : `${issues.length} pendência(s). Você pode salvar e terminar depois.`}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={stepIndex === 0}
              onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)].id)}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            {stepIndex < STEPS.length - 1 && (
              <button type="button" className="btn btn-secondary" onClick={() => setStep(STEPS[stepIndex + 1].id)}>
                Próximo
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || !c.species || !c.background || needsPlayerCampaign}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {sheet ? 'Salvar alterações' : 'Criar personagem'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
