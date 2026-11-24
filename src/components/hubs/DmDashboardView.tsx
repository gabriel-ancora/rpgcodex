import React, { useState, useRef } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { CampaignSummary } from '../../types/campaign';
import { REGISTERED_RPG_SYSTEMS } from '../../data/rpgSystems';
import { uploadImageToCloudStorage } from '../../services/storageService';
import { Modal, useConfirm } from '../common/Modal';
import { formatRelativeDate } from '../../utils/format';
import {
  Plus,
  Copy,
  Check,
  Pencil,
  Trash2,
  Loader2,
  Minus,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

/**
 * Seção "Mestrando" da página de campanhas: campanhas em que o usuário é Mestre
 * (`campaign.isDm`). Criação, edição, exclusão, convite e abertura do estúdio.
 */
export const DmDashboardView: React.FC = () => {
  const campaigns = useCampaignStore((s) => s.campaigns);
  const campaignsLoaded = useCampaignStore((s) => s.campaignsLoaded);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const createCampaign = useCampaignStore((s) => s.createCampaign);
  const updateCampaign = useCampaignStore((s) => s.updateCampaign);
  const deleteCampaign = useCampaignStore((s) => s.deleteCampaign);
  const selectCampaign = useCampaignStore((s) => s.selectCampaign);
  const showToast = useCampaignStore((s) => s.showToast);
  const confirm = useConfirm();

  const dmCampaigns = campaigns.filter((c) => c.isDm);

  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignSummary | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultSys = REGISTERED_RPG_SYSTEMS[0];
  const [formTitle, setFormTitle] = useState('');
  const [formSynopsis, setFormSynopsis] = useState('');
  const [formSystem, setFormSystem] = useState(defaultSys.name);
  const [formTone, setFormTone] = useState(defaultSys.defaultTone);
  const [formCover, setFormCover] = useState('');
  const [formCoverStorageId, setFormCoverStorageId] = useState<string | undefined>(undefined);
  const [clearCoverFlag, setClearCoverFlag] = useState(false);

  const openCreateModal = () => {
    setEditingCampaign(null);
    setFormTitle('');
    setFormSynopsis('');
    setFormSystem(defaultSys.name);
    setFormTone(defaultSys.defaultTone);
    setFormCover('');
    setFormCoverStorageId(undefined);
    setClearCoverFlag(false);
    setShowModal(true);
  };

  const openEditModal = (camp: CampaignSummary) => {
    setEditingCampaign(camp);
    setFormTitle(camp.title);
    setFormSynopsis(camp.synopsis);
    setFormSystem(camp.system || defaultSys.name);
    setFormTone(camp.tone);
    setFormCover(camp.coverUrl || '');
    setFormCoverStorageId(camp.coverStorageId);
    setClearCoverFlag(false);
    setShowModal(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setShowModal(false);
    setEditingCampaign(null);
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const res = await uploadImageToCloudStorage(file);
      setFormCover(res.url);
      setFormCoverStorageId(res.storageId);
      setClearCoverFlag(false);
      showToast('Imagem de capa enviada.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.', 'error');
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleCopyInvite = (code: string, title: string) => {
    const inviteLink = `${window.location.origin}/campaigns?invite=${encodeURIComponent(code)}`;
    navigator.clipboard
      ?.writeText(inviteLink)
      .then(() => {
        setCopiedCode(code);
        showToast(`Link de convite de "${title}" copiado.`, 'success');
        setTimeout(() => setCopiedCode(null), 2500);
      })
      .catch(() => showToast('Não foi possível copiar. Copie o código manualmente.', 'error'));
  };

  const handleDelete = async (camp: CampaignSummary) => {
    const ok = await confirm({
      title: `Excluir "${camp.title}"?`,
      message:
        'A campanha e todo o seu conteúdo (códice, mapas, missões, diário) serão excluídos permanentemente. As fichas dos jogadores são apenas desvinculadas.',
      confirmLabel: 'Excluir campanha',
    });
    if (ok) await deleteCampaign(camp.id);
  };

  const handleSubmitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || isSubmitting || isUploadingCover) return;

    const base = {
      title: formTitle.trim(),
      synopsis: formSynopsis.trim() || 'Campanha em andamento.',
      system: formSystem.trim() || defaultSys.name,
      tone: formTone.trim() || 'Fantasia',
      coverUrl: formCover.trim(),
    };

    setIsSubmitting(true);
    try {
      if (editingCampaign) {
        const ok = await updateCampaign(editingCampaign.id, {
          ...base,
          ...(formCoverStorageId ? { coverStorageId: formCoverStorageId } : {}),
          ...(clearCoverFlag ? { clearCoverImage: true } : {}),
        });
        if (ok) {
          showToast(`Campanha "${base.title}" atualizada.`, 'success');
          setShowModal(false);
          setEditingCampaign(null);
        }
        return;
      }
      const created = await createCampaign({
        ...base,
        ...(formCoverStorageId ? { coverStorageId: formCoverStorageId } : {}),
      });
      if (created) setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="dm-section-title" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 id="dm-section-title" className="section-title">
            Mestrando
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-muted">Campanhas que você conduz como Mestre.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            <span>Criar campanha</span>
          </button>
        </div>
      </div>

      {!campaignsLoaded ? (
        <div className="card px-6 py-10 text-center text-sm text-fg-muted flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando campanhas…
        </div>
      ) : dmCampaigns.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <h3 className="text-sm font-semibold text-fg">Nenhuma campanha como Mestre</h3>
          <p className="mt-1.5 text-sm text-fg-muted">
            Crie uma campanha para organizar o mundo e convidar jogadores.
          </p>
          <button onClick={openCreateModal} className="btn btn-primary mt-5">
            <Plus className="w-4 h-4" />
            <span>Criar campanha</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dmCampaigns.map((camp) => {
            const isSelected = camp.id === activeCampaignId;
            return (
              <div
                key={camp.id}
                className={`card overflow-hidden flex flex-col transition-colors hover:border-line-strong ${
                  isSelected ? 'border-accent/50 ring-1 ring-accent/30' : ''
                }`}
              >
                <div className="h-32 bg-surface-2 border-b border-line overflow-hidden flex items-center justify-center">
                  {camp.coverUrl ? (
                    <img src={camp.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold text-fg-subtle select-none">
                      {camp.title.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold text-fg leading-snug line-clamp-2">{camp.title}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="badge">{camp.system}</span>
                        {isSelected && <span className="badge badge-accent">Ativa</span>}
                      </div>
                    </div>
                    <div className="flex items-center -mr-1.5 -mt-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(camp)}
                        className="btn btn-ghost btn-icon"
                        title="Editar campanha"
                        aria-label={`Editar a campanha ${camp.title}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(camp)}
                        className="btn btn-danger-ghost btn-icon"
                        title="Excluir campanha"
                        aria-label={`Excluir a campanha ${camp.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-fg-muted line-clamp-2">{camp.synopsis}</p>

                  <dl className="grid grid-cols-3 gap-2 pt-3 border-t border-line text-[13px]">
                    <div className="min-w-0">
                      <dt className="text-xs text-fg-subtle">Jogadores</dt>
                      <dd className="text-fg tabular-nums">{camp.activePlayersCount}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-fg-subtle">Sessões</dt>
                      <dd className="flex items-center gap-1 text-fg">
                        <button
                          type="button"
                          onClick={() =>
                            void updateCampaign(camp.id, { sessionsPlayed: Math.max(0, camp.sessionsPlayed - 1) })
                          }
                          className="w-5 h-5 rounded flex items-center justify-center text-fg-subtle hover:bg-surface-2 hover:text-fg"
                          title="Diminuir sessões jogadas"
                          aria-label="Diminuir sessões jogadas"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="tabular-nums min-w-[1.25rem] text-center">{camp.sessionsPlayed}</span>
                        <button
                          type="button"
                          onClick={() => void updateCampaign(camp.id, { sessionsPlayed: camp.sessionsPlayed + 1 })}
                          className="w-5 h-5 rounded flex items-center justify-center text-fg-subtle hover:bg-surface-2 hover:text-fg"
                          title="Registrar sessão concluída"
                          aria-label="Registrar sessão concluída"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-fg-subtle">Tom</dt>
                      <dd className="text-fg truncate" title={camp.tone}>
                        {camp.tone}
                      </dd>
                    </div>
                  </dl>

                  {camp.inviteCode && (
                    <div className="card-muted px-3 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-xs text-fg-subtle">Código de convite</span>
                        <span className="text-sm font-mono font-medium text-fg">{camp.inviteCode}</span>
                      </div>
                      <button
                        onClick={() => handleCopyInvite(camp.inviteCode, camp.title)}
                        className="btn btn-secondary btn-sm"
                        title="Copiar link de convite"
                      >
                        {copiedCode === camp.inviteCode ? (
                          <>
                            <Check className="w-4 h-4 text-success" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copiar link</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-fg-subtle">Atualizada {formatRelativeDate(camp.updatedAt)}</p>
                </div>

                <div className="px-4 pb-4 flex items-center gap-2">
                  <button onClick={() => selectCampaign(camp.id, '/campaign/session')} className="btn btn-primary flex-1">
                    Gerenciar campanha
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingCampaign ? 'Editar campanha' : 'Criar campanha'}
        dismissOnBackdrop={false}
        footer={
          <>
            <button type="button" onClick={closeModal} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" form="campaign-form" disabled={isSubmitting || isUploadingCover} className="btn btn-primary">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingCampaign ? 'Salvar' : 'Criar campanha'}</span>
            </button>
          </>
        }
      >
        <form id="campaign-form" onSubmit={handleSubmitCampaign} className="space-y-4">
          <div>
            <label htmlFor="camp-title" className="label">
              Título
            </label>
            <input
              id="camp-title"
              type="text"
              required
              maxLength={120}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ex.: A Fronteira de Cinzas"
              className="input"
              data-autofocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="camp-system" className="label">
                Sistema
              </label>
              <select
                id="camp-system"
                value={formSystem}
                onChange={(e) => {
                  const chosen = e.target.value;
                  setFormSystem(chosen);
                  if (!editingCampaign) {
                    const sysObj = REGISTERED_RPG_SYSTEMS.find((s) => s.name === chosen);
                    if (sysObj) setFormTone(sysObj.defaultTone);
                  }
                }}
                className="input"
              >
                {REGISTERED_RPG_SYSTEMS.map((sys) => (
                  <option key={sys.id} value={sys.name}>
                    {sys.name}
                  </option>
                ))}
                {!REGISTERED_RPG_SYSTEMS.some((s) => s.name === formSystem) && formSystem && (
                  <option value={formSystem}>{formSystem}</option>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="camp-tone" className="label">
                Tom
              </label>
              <input
                id="camp-tone"
                type="text"
                value={formTone}
                onChange={(e) => setFormTone(e.target.value)}
                placeholder="Investigação, fantasia sombria…"
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="camp-synopsis" className="label">
              Sinopse
            </label>
            <textarea
              id="camp-synopsis"
              rows={3}
              value={formSynopsis}
              onChange={(e) => setFormSynopsis(e.target.value)}
              placeholder="Premissa e ponto de partida dos jogadores"
              className="input"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="label mb-0">Imagem de capa</span>
              {formCover && (
                <button
                  type="button"
                  onClick={() => {
                    setFormCover('');
                    setFormCoverStorageId(undefined);
                    setClearCoverFlag(true);
                  }}
                  className="btn btn-danger-ghost btn-sm"
                >
                  Remover
                </button>
              )}
            </div>

            {formCover ? (
              <div className="space-y-2">
                <div className="h-28 rounded-md overflow-hidden border border-line bg-surface-2">
                  <img src={formCover} alt="Prévia da capa" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="btn btn-secondary btn-sm"
                >
                  {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>Trocar imagem</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="btn btn-secondary shrink-0"
                >
                  {isUploadingCover ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Enviar imagem</span>
                    </>
                  )}
                </button>

                <div className="relative flex-1">
                  <ImageIcon className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="url"
                    value={formCover}
                    onChange={(e) => {
                      setFormCover(e.target.value);
                      setFormCoverStorageId(undefined);
                      setClearCoverFlag(false);
                    }}
                    placeholder="Ou cole uma URL"
                    className="input pl-9"
                    aria-label="URL da imagem de capa"
                  />
                </div>
              </div>
            )}
            <p className="hint">Opcional. PNG, JPG ou WebP, até 10 MB.</p>

            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverFileChange}
              className="hidden"
            />
          </div>
        </form>
      </Modal>
    </section>
  );
};
