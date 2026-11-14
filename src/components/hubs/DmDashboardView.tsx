import React, { useState, useRef } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { CampaignSummary } from '../../types/campaign';
import { REGISTERED_RPG_SYSTEMS } from '../../data/rpgSystems';
import { uploadImageToCloudStorage } from '../../services/storageService';
import {
  Plus,
  Users,
  Copy,
  Check,
  Eye,
  Settings,
  X,
  ArrowUpRight,
  Pencil,
  Trash2,
  Loader2,
  Minus,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

export const DmDashboardView: React.FC = () => {
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const createCampaign = useCampaignStore((s) => s.createCampaign);
  const updateCampaign = useCampaignStore((s) => s.updateCampaign);
  const deleteCampaign = useCampaignStore((s) => s.deleteCampaign);
  const selectCampaign = useCampaignStore((s) => s.selectCampaign);
  const setCurrentRoute = useCampaignStore((s) => s.setCurrentRoute);
  const currentUser = useCampaignStore((s) => s.currentUser);
  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const setIsDmPartyDrawerOpen = useCampaignStore((s) => s.setIsDmPartyDrawerOpen);
  const setIsSettingsModalOpen = useCampaignStore((s) => s.setIsSettingsModalOpen);
  const showToast = useCampaignStore((s) => s.showToast);

  const dmCampaigns = campaigns.filter((c) => c.isDm !== false);
  const playerJoinedCampaigns = campaigns.filter((c) => c.isDm === false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignSummary | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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
    setShowCreateModal(true);
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
    setShowCreateModal(true);
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }
    setIsUploadingCover(true);
    try {
      const res = await uploadImageToCloudStorage(file);
      setFormCover(res.url);
      setFormCoverStorageId(res.storageId);
      setClearCoverFlag(false);
      showToast(
        res.usedCloudStorage
          ? 'Imagem de capa enviada para a nuvem!'
          : 'Imagem otimizada localmente.'
      );
    } catch {
      showToast('Não foi possível processar a imagem selecionada.');
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleCopyInvite = (code: string, title: string) => {
    const inviteLink = `${window.location.origin}/player-dashboard?invite=${code}`;
    navigator.clipboard?.writeText(inviteLink).catch(() => {});
    setCopiedCode(code);
    showToast(`Link de convite de "${title}" (${code}) copiado.`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSubmitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || isSubmitting || isUploadingCover) return;

    if (editingCampaign) {
      updateCampaign(editingCampaign.id, {
        title: formTitle.trim(),
        synopsis: formSynopsis.trim() || 'Campanha em andamento.',
        system: formSystem.trim() || defaultSys.name,
        tone: formTone.trim() || 'Fantasia',
        coverUrl: formCover.trim(),
        ...(formCoverStorageId ? { coverStorageId: formCoverStorageId } : {}),
        ...(clearCoverFlag ? { clearCoverImage: true } : {}),
      });
      setShowCreateModal(false);
      setEditingCampaign(null);
      showToast(`Campanha "${formTitle.trim()}" atualizada.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createCampaign({
        title: formTitle.trim(),
        synopsis:
          formSynopsis.trim() ||
          'Crônica criada no estúdio Obsidian Codex.',
        system: formSystem.trim() || defaultSys.name,
        tone: formTone.trim() || 'Fantasia',
        coverUrl: formCover.trim(),
        ...(formCoverStorageId ? { coverStorageId: formCoverStorageId } : {}),
        dmName: currentUser?.name || 'Mestre',
      });
      if (created) {
        setShowCreateModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Campanhas
          </h1>
          <p className="text-xs text-zinc-400">
            Gerencie seus cenários, compartilhe convites e acesse o estúdio de preparação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeCampaignId && (
            <button
              onClick={() => setIsDmPartyDrawerOpen(true)}
              className="btn-subtle inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            >
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Fichas do grupo ({characterSheets.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="btn-subtle inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span>Backups & API</span>
          </button>

          <button
            onClick={openCreateModal}
            className="btn-solid inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova campanha</span>
          </button>
        </div>
      </div>

      {/* Joined as Player Notice */}
      {playerJoinedCampaigns.length > 0 && (
        <div className="px-4 py-3 rounded-xl bg-[#131317] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-400">
            Você também participa de{' '}
            <strong className="text-zinc-200">{playerJoinedCampaigns.length}</strong>{' '}
            {playerJoinedCampaigns.length === 1 ? 'mesa como Jogador' : 'mesas como Jogador'}.
          </p>
          <button
            type="button"
            onClick={() => setCurrentRoute('/player-dashboard')}
            className="btn-subtle px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
          >
            <span>Ver minhas fichas & mesas como Jogador</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Empty State */}
      {dmCampaigns.length === 0 ? (
        <div className="surface-card rounded-2xl p-10 sm:p-14 text-center max-w-xl mx-auto space-y-5">
          <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-300">
            <Plus className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl text-zinc-100">
              Seu estúdio está pronto
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
              Crie sua primeira campanha para habilitar o Códice interligado, cartografia tática, frentes de ameaça e código de convite para seus jogadores.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              onClick={openCreateModal}
              className="btn-solid inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar primeira campanha</span>
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="btn-subtle inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span>Importar backup JSON</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dmCampaigns.map((camp) => {
            const isSelected = camp.id === activeCampaignId;
            const isConfirmingDelete = confirmDeleteId === camp.id;
            return (
              <div
                key={camp.id}
                className={`surface-card rounded-xl overflow-hidden flex flex-col justify-between group ${
                  isSelected ? 'ring-1 ring-white/[0.16]' : ''
                }`}
              >
                <div>
                  {/* Cover Banner */}
                  <div className="h-40 relative overflow-hidden bg-[#0e0e12] bg-obsidian-grid">
                    {camp.coverUrl ? (
                      <img
                        src={camp.coverUrl}
                        alt={camp.title}
                        className="w-full h-full object-cover opacity-70 group-hover:scale-[1.02] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-900/90 via-[#111116] to-zinc-950 flex items-center justify-center">
                        <span className="font-serif text-5xl text-white/[0.05] select-none">
                          {camp.title.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141418] via-[#141418]/30 to-transparent" />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-black/70 border border-white/[0.1] text-[10px] font-medium text-zinc-200 backdrop-blur-md">
                        {camp.system}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/70 border border-white/[0.1] text-[10px] font-medium text-zinc-200 backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Ativa
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(camp)}
                        className="p-1.5 rounded-md bg-black/70 border border-white/[0.1] text-zinc-300 hover:text-white backdrop-blur-md transition-colors"
                        title="Editar campanha"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDeleteId(isConfirmingDelete ? null : camp.id)
                        }
                        className="p-1.5 rounded-md bg-black/70 border border-white/[0.1] text-zinc-400 hover:text-rose-400 backdrop-blur-md transition-colors"
                        title="Excluir campanha"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="font-serif text-lg font-medium text-zinc-100 leading-snug line-clamp-2">
                        {camp.title}
                      </h3>
                    </div>
                  </div>

                  {/* Delete Confirmation Inline Banner */}
                  {isConfirmingDelete && (
                    <div className="px-4 py-3 bg-rose-950/40 border-b border-rose-500/25 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-rose-200">
                        Excluir campanha permanentemente?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded text-[11px] text-zinc-300 hover:bg-white/[0.06]"
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteCampaign(camp.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-[11px] font-medium text-white"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-4 space-y-4">
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {camp.synopsis}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-white/[0.05]">
                      <div className="flex items-center gap-2">
                        <span>{camp.activePlayersCount} membros</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 font-mono text-zinc-300">
                          <button
                            type="button"
                            onClick={() =>
                              updateCampaign(camp.id, {
                                sessionsPlayed: Math.max(0, camp.sessionsPlayed - 1),
                              })
                            }
                            className="p-0.5 rounded hover:bg-white/[0.08] text-zinc-500 hover:text-zinc-200"
                            title="Diminuir sessões jogadas"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span>{camp.sessionsPlayed} sessões</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCampaign(camp.id, {
                                sessionsPlayed: camp.sessionsPlayed + 1,
                              })
                            }
                            className="p-0.5 rounded hover:bg-white/[0.08] text-zinc-500 hover:text-zinc-200"
                            title="Registrar sessão concluída"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      </div>
                      <span className="truncate max-w-[110px]">{camp.tone}</span>
                    </div>

                    {/* Invite Code Row */}
                    <div className="px-3 py-2 rounded-lg bg-[#0e0e11] border border-white/[0.06] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] text-zinc-500 block">
                          Convite
                        </span>
                        <span className="text-xs font-mono font-medium text-zinc-200">
                          {camp.inviteCode}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyInvite(camp.inviteCode, camp.title)}
                        className="btn-subtle inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px]"
                        title="Copiar link de convite"
                      >
                        {copiedCode === camp.inviteCode ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-zinc-400" />
                            <span>Copiar link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 pt-0 flex items-center gap-2">
                  <button
                    onClick={() => selectCampaign(camp.id, '/campaign/session')}
                    className="btn-solid flex-1 py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Abrir estúdio</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => selectCampaign(camp.id, '/campaign/player-view')}
                    className="btn-subtle py-2 px-3 rounded-lg text-xs flex items-center gap-1.5"
                    title="Visualizar portal dos jogadores"
                  >
                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Mesa</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-xl bg-[#131317] border border-white/[0.1] shadow-elevated overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">
                {editingCampaign ? 'Editar campanha' : 'Nova campanha'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCampaign(null);
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCampaign} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Título da campanha
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: A Fronteira de Cinzas"
                  className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Sistema cadastrado
                  </label>
                  <select
                    value={formSystem}
                    onChange={(e) => {
                      const chosen = e.target.value;
                      setFormSystem(chosen);
                      if (!editingCampaign) {
                        const sysObj = REGISTERED_RPG_SYSTEMS.find((s) => s.name === chosen);
                        if (sysObj) setFormTone(sysObj.defaultTone);
                      }
                    }}
                    className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                  >
                    {REGISTERED_RPG_SYSTEMS.map((sys) => (
                      <option key={sys.id} value={sys.name} className="bg-[#131317] text-zinc-100">
                        {sys.name}
                      </option>
                    ))}
                    {!REGISTERED_RPG_SYSTEMS.some((s) => s.name === formSystem) && formSystem && (
                      <option value={formSystem} className="bg-[#131317] text-zinc-100">
                        {formSystem}
                      </option>
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Tom narrativo
                  </label>
                  <input
                    type="text"
                    value={formTone}
                    onChange={(e) => setFormTone(e.target.value)}
                    placeholder="Investigação, Fantasia Sombria..."
                    className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Sinopse
                </label>
                <textarea
                  rows={3}
                  value={formSynopsis}
                  onChange={(e) => setFormSynopsis(e.target.value)}
                  placeholder="Premissa central e ponto de partida dos jogadores..."
                  className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-zinc-300">
                    Imagem de capa (opcional)
                  </label>
                  {formCover && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormCover('');
                        setFormCoverStorageId(undefined);
                        setClearCoverFlag(true);
                      }}
                      className="text-[11px] text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Remover capa
                    </button>
                  )}
                </div>

                {formCover ? (
                  <div className="relative h-28 rounded-lg overflow-hidden border border-white/[0.1] bg-[#0e0e11]">
                    <img
                      src={formCover}
                      alt="Prévia da capa"
                      className="w-full h-full object-cover opacity-85"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      disabled={isUploadingCover}
                      className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-black/75 border border-white/[0.15] text-[11px] text-zinc-200 hover:text-white inline-flex items-center gap-1.5 backdrop-blur-md"
                    >
                      {isUploadingCover ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      <span>Trocar imagem</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      disabled={isUploadingCover}
                      className="btn-subtle px-3.5 py-2 rounded-lg text-xs inline-flex items-center justify-center gap-2 shrink-0"
                    >
                      {isUploadingCover ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Fazer upload</span>
                        </>
                      )}
                    </button>

                    <div className="relative flex-1">
                      <ImageIcon className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={formCover}
                        onChange={(e) => {
                          setFormCover(e.target.value);
                          setFormCoverStorageId(undefined);
                          setClearCoverFlag(false);
                        }}
                        placeholder="Ou cole uma URL https://..."
                        className="input-clean w-full pl-8 pr-3 py-2 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}

                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileChange}
                  className="hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCampaign(null);
                  }}
                  className="btn-subtle px-4 py-2 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-solid px-4 py-2 rounded-lg text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {editingCampaign ? 'Salvar alterações' : 'Criar campanha'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
