import React, { useState } from 'react';
import { useCampaignStore, isTempId } from '../../store/useCampaignStore';
import { CharacterSheetModal } from '../characters/CharacterSheetModal';
import { firstPendingStepForSheet } from '../../rules/levelUp';
import type { BuildStep } from '../../rules/engine';
import { useConfirm } from '../common/Modal';
import { Plus, Trash2, ArrowRight, Users, LogOut, Loader2, Sparkles } from 'lucide-react';

/**
 * Seção "Jogando" da página de campanhas: campanhas em que o usuário é jogador
 * (entrada por código de convite) e os personagens vinculados a elas.
 */
export const PlayerDashboardView: React.FC = () => {
  const campaigns = useCampaignStore((s) => s.campaigns);
  const campaignsLoaded = useCampaignStore((s) => s.campaignsLoaded);
  const currentUser = useCampaignStore((s) => s.currentUser);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const selectCampaign = useCampaignStore((s) => s.selectCampaign);
  const joinCampaignByInviteCode = useCampaignStore((s) => s.joinCampaignByInviteCode);
  const leaveCampaign = useCampaignStore((s) => s.leaveCampaign);
  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const deleteCharacterSheet = useCampaignStore((s) => s.deleteCharacterSheet);
  const setActiveCharacterId = useCampaignStore((s) => s.setActiveCharacterId);
  const updateCharacterSheet = useCampaignStore((s) => s.updateCharacterSheet);
  const showToast = useCampaignStore((s) => s.showToast);
  const confirm = useConfirm();

  const playerCampaigns = campaigns.filter((c) => !c.isDm);
  const mySheets = characterSheets.filter((s) => !s.playerId || s.playerId === currentUser?.id);

  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [modal, setModal] = useState<{
    id: string | null;
    campaignId?: string;
    initialEditStep?: BuildStep;
  } | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || isJoining) return;
    setIsJoining(true);
    try {
      if (await joinCampaignByInviteCode(inviteCode)) setInviteCode('');
    } finally {
      setIsJoining(false);
    }
  };

  const play = async (sheetId: string) => {
    const sheet = mySheets.find((s) => s.id === sheetId);
    if (!sheet) return;
    setActiveCharacterId(sheet.id);
    const target =
      campaigns.find((c) => c.id === sheet.campaignId) ||
      playerCampaigns.find((c) => c.id === activeCampaignId) ||
      playerCampaigns[0];
    if (!target) {
      showToast('Entre em uma campanha com o código do Mestre antes de abrir a mesa.', 'error');
      return;
    }
    if (sheet.campaignId !== target.id) {
      const ok = await updateCharacterSheet(sheet.id, { campaignId: target.id, campaignTitle: target.title });
      if (!ok) return;
    }
    selectCampaign(target.id);
  };

  const handleDeleteSheet = async (sheetId: string, name: string) => {
    const ok = await confirm({
      title: `Excluir "${name}"?`,
      message: 'A ficha será removida permanentemente.',
      confirmLabel: 'Excluir ficha',
    });
    if (ok) await deleteCharacterSheet(sheetId);
  };

  const handleLeave = async (campaignId: string, title: string) => {
    const ok = await confirm({
      title: `Sair de "${title}"?`,
      message: 'Você perde o acesso à mesa. Para voltar, será preciso um novo convite do Mestre. Suas fichas continuam existindo.',
      confirmLabel: 'Sair da campanha',
    });
    if (ok) await leaveCampaign(campaignId);
  };

  return (
    <section aria-labelledby="player-section-title" className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 id="player-section-title" className="section-title">
            Jogando
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            Campanhas em que você é jogador e os personagens vinculados a elas.
          </p>
        </div>
        <form onSubmit={handleJoin} className="flex items-end gap-2">
          <div>
            <label htmlFor="invite" className="label">
              Código de convite
            </label>
            <input
              id="invite"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="ABCD-2345"
              className="input w-44 font-mono uppercase"
              autoComplete="off"
            />
          </div>
          <button type="submit" disabled={isJoining || !inviteCode.trim()} className="btn btn-secondary">
            {isJoining ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-fg">Campanhas ({playerCampaigns.length})</h3>
        {!campaignsLoaded ? (
          <div className="card p-6 text-center text-sm text-fg-muted flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando campanhas…
          </div>
        ) : playerCampaigns.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm font-medium text-fg">Você ainda não joga em nenhuma campanha</p>
            <p className="text-[13px] text-fg-muted mt-1">Peça o código de convite ao Mestre e informe-o acima.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playerCampaigns.map((camp) => (
              <article
                key={camp.id}
                className={`card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  camp.id === activeCampaignId ? 'ring-1 ring-accent/40' : ''
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <h4 className="text-sm font-semibold text-fg truncate">{camp.title}</h4>
                  <p className="text-[13px] text-fg-muted line-clamp-2">{camp.synopsis}</p>
                  <p className="text-xs text-fg-subtle flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {camp.dmName} · {camp.activePlayersCount} jogador(es) · {camp.sessionsPlayed} sessões
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleLeave(camp.id, camp.title)}
                    className="btn btn-ghost btn-icon"
                    title="Sair da campanha"
                    aria-label={`Sair da campanha ${camp.title}`}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ id: null, campaignId: camp.id })}
                    className="btn btn-secondary"
                    title={`Criar ficha para ${camp.title}`}
                  >
                    <Plus className="w-4 h-4" />
                    Nova ficha
                  </button>
                  <button type="button" onClick={() => selectCampaign(camp.id, '/campaign/player-view')} className="btn btn-primary">
                    Abrir mesa
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-fg">Meus personagens</h3>
          {playerCampaigns.length > 0 && (
            <button
              type="button"
              onClick={() => setModal({ id: null, campaignId: playerCampaigns[0]?.id })}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Novo personagem
            </button>
          )}
        </div>

        {mySheets.length === 0 ? (
          <div className="card p-10 text-center space-y-3">
            <p className="text-sm font-medium text-fg">Nenhum personagem ainda</p>
            <p className="text-[13px] text-fg-muted">
              {playerCampaigns.length > 0
                ? 'Monte sua ficha passo a passo vinculada a uma campanha em que você joga.'
                : 'Entre em uma campanha com o código de convite do Mestre para criar sua ficha de personagem.'}
            </p>
            {playerCampaigns.length > 0 && (
              <button
                type="button"
                onClick={() => setModal({ id: null, campaignId: playerCampaigns[0]?.id })}
                className="btn btn-primary"
              >
                Criar personagem
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mySheets.map((sheet) => {
              const pct = Math.round((sheet.hp / Math.max(1, sheet.maxHp)) * 100);
              const linked = campaigns.find((c) => c.id === sheet.campaignId);
              const pending = isTempId(sheet.id);
              return (
                <article key={sheet.id} className="card p-4 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {sheet.avatarUrl ? (
                        <img
                          src={sheet.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-md object-cover border border-line shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-surface-2 border border-line flex items-center justify-center text-sm font-semibold text-fg-muted shrink-0">
                          {sheet.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-fg truncate">{sheet.name}</h4>
                        <p className="text-[13px] text-fg-muted truncate">
                          {sheet.race} · {sheet.className} {sheet.level}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSheet(sheet.id, sheet.name)}
                      className="btn btn-ghost btn-icon shrink-0"
                      aria-label={`Excluir ${sheet.name}`}
                      disabled={pending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <dl className="grid grid-cols-3 gap-2 text-[13px]">
                      <div>
                        <dt className="text-xs text-fg-subtle">PV</dt>
                        <dd className="font-semibold tabular-nums">
                          {sheet.hp}/{sheet.maxHp}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-fg-subtle">CA</dt>
                        <dd className="font-semibold tabular-nums">{sheet.armorClass}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-fg-subtle">Percepção</dt>
                        <dd className="font-semibold tabular-nums">{sheet.passivePerception}</dd>
                      </div>
                    </dl>
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden mt-2">
                      <div
                        className={`h-full ${pct > 50 ? 'bg-success' : pct > 25 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-fg-subtle">
                    <span>
                      {sheet.spells.length} magias · {sheet.equipment.length} itens
                    </span>
                    {pending ? (
                      <span className="badge badge-warning">Salvando</span>
                    ) : linked ? (
                      <span className="truncate max-w-[55%]">{linked.title}</span>
                    ) : (
                      <span className="badge badge-warning">Sem campanha</span>
                    )}
                  </div>

                  {sheet.pendingLevelUp && (
                    <div className="rounded-md bg-warning-soft/50 border border-warning/40 px-3 py-2 text-xs space-y-1.5">
                      <div className="font-semibold text-fg flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-warning shrink-0" />
                        <span>Subiu para o Nível {sheet.pendingLevelUp.toLevel}!</span>
                      </div>
                      <p className="text-fg-muted">
                        {sheet.pendingLevelUp.pendingChoices.length > 0
                          ? `${sheet.pendingLevelUp.pendingChoices.length} escolha(s) pendente(s) para concluir.`
                          : `${sheet.pendingLevelUp.gains.length} ganho(s) novo(s) aguardando confirmação.`}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCharacterId(sheet.id);
                          setModal({
                            id: sheet.id,
                            initialEditStep:
                              sheet.pendingLevelUp!.pendingChoices.length > 0
                                ? firstPendingStepForSheet(sheet)
                                : undefined,
                          });
                        }}
                        className="btn btn-primary btn-sm w-full"
                      >
                        {sheet.pendingLevelUp.pendingChoices.length > 0
                          ? `Selecionar escolhas do Nv. ${sheet.pendingLevelUp.toLevel}`
                          : `Revisar Nv. ${sheet.pendingLevelUp.toLevel}`}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-line mt-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCharacterId(sheet.id);
                        setModal({ id: sheet.id });
                      }}
                      className="btn btn-secondary flex-1"
                      disabled={pending}
                    >
                      Abrir ficha
                    </button>
                    <button type="button" onClick={() => void play(sheet.id)} className="btn btn-primary" disabled={pending}>
                      Jogar
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <CharacterSheetModal
          sheetId={modal.id}
          initialEditStep={modal.initialEditStep}
          defaultCampaignId={modal.campaignId}
          isOpen
          onClose={() => setModal(null)}
        />
      )}
    </section>
  );
};
