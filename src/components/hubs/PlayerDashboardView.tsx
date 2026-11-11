import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { CharacterSheetModal } from '../characters/CharacterSheetModal';
import {
  Plus,
  KeyRound,
  Trash2,
  ArrowRight,
  Users,
  UserCheck,
} from 'lucide-react';

export const PlayerDashboardView: React.FC = () => {
  const campaigns = useCampaignStore((s) => s.campaigns);
  const currentUser = useCampaignStore((s) => s.currentUser);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const selectCampaign = useCampaignStore((s) => s.selectCampaign);
  const joinCampaignByInviteCode = useCampaignStore((s) => s.joinCampaignByInviteCode);
  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const mySheets = characterSheets.filter(
    (s) => !s.playerId || s.playerId === currentUser?.id
  );
  const deleteCharacterSheet = useCampaignStore((s) => s.deleteCharacterSheet);
  const setActiveCharacterId = useCampaignStore((s) => s.setActiveCharacterId);
  const updateCharacterSheet = useCampaignStore((s) => s.updateCharacterSheet);
  const showToast = useCampaignStore((s) => s.showToast);

  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [modalSheetId, setModalSheetId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim() || isJoining) return;
    setIsJoining(true);
    try {
      const ok = await joinCampaignByInviteCode(inviteCodeInput);
      if (ok) {
        setInviteCodeInput('');
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-10">
      {/* Header & Invite Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Personagens & Mesas
          </h1>
          <p className="text-xs text-zinc-400">
            Gerencie suas fichas D&D 5e e ingresse em campanhas com o código do Mestre.
          </p>
        </div>

        <form onSubmit={handleJoinCode} className="flex items-center gap-2">
          <div className="relative">
            <KeyRound className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value)}
              placeholder="Código (Ex: MESA-4821)"
              className="input-clean pl-8 pr-3 py-2 rounded-lg text-xs font-mono w-48"
            />
          </div>
          <button
            type="submit"
            disabled={isJoining}
            className="btn-subtle px-3.5 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
          >
            {isJoining ? 'Entrando...' : 'Ingressar'}
          </button>
        </form>
      </div>

      {/* Section 1: Character Sheets */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">
              Fichas de Personagem
            </h2>
            <p className="text-xs text-zinc-500">
              Integradas ao catálogo oficial D&D 5e SRD
            </p>
          </div>

          <button
            onClick={() => {
              setModalSheetId(null);
              setIsModalOpen(true);
            }}
            className="btn-solid inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo personagem</span>
          </button>
        </div>

        {mySheets.length === 0 ? (
          <div className="surface-card rounded-xl p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-200">
                Nenhuma ficha criada ainda
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Monte seu personagem com raças, classes, magias e equipamentos do SRD 5e e vincule-o a qualquer mesa.
              </p>
            </div>
            <button
              onClick={() => {
                setModalSheetId(null);
                setIsModalOpen(true);
              }}
              className="btn-solid inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar primeiro personagem</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {mySheets.map((sheet) => {
              const hpPercent = Math.round(
                (sheet.hp / Math.max(1, sheet.maxHp)) * 100
              );
              const linkedCampaign = campaigns.find((c) => c.id === sheet.campaignId);
              return (
                <div
                  key={sheet.id}
                  className="surface-card rounded-xl p-5 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-4">
                    {/* Identity */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center font-serif text-base font-medium text-zinc-200 shrink-0">
                          {sheet.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-zinc-100 truncate">
                            {sheet.name}
                          </h3>
                          <p className="text-xs text-zinc-400 truncate">
                            {sheet.race} · {sheet.className} Nv. {sheet.level}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteCharacterSheet(sheet.id)}
                        className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                        title="Excluir ficha"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Tabular Vitals */}
                    <div className="p-3 rounded-lg bg-[#0e0e11] border border-white/[0.06] space-y-2.5">
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[10px] font-sans text-zinc-500 block">
                            Pontos de Vida
                          </span>
                          <span className="text-zinc-100 font-semibold">
                            {sheet.hp}/{sheet.maxHp}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-sans text-zinc-500 block">
                            Defesa (CA)
                          </span>
                          <span className="text-zinc-100 font-semibold">
                            {sheet.armorClass}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-sans text-zinc-500 block">
                            Percepção
                          </span>
                          <span className="text-zinc-100 font-semibold">
                            {sheet.passivePerception}
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            hpPercent > 35 ? 'bg-emerald-400/80' : 'bg-rose-400/80'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(4, hpPercent))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Counts & Campaign */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>
                        {sheet.spells.length} magias · {sheet.equipment.length} itens
                      </span>
                      <span className="truncate max-w-[150px]">
                        {linkedCampaign?.title || sheet.campaignTitle || 'Sem campanha'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveCharacterId(sheet.id);
                        setModalSheetId(sheet.id);
                        setIsModalOpen(true);
                      }}
                      className="btn-subtle flex-1 py-2 px-3 rounded-lg text-xs"
                    >
                      Editar ficha
                    </button>

                    <button
                      onClick={() => {
                        setActiveCharacterId(sheet.id);
                        const targetCamp =
                          linkedCampaign ||
                          (activeCampaignId
                            ? campaigns.find((c) => c.id === activeCampaignId)
                            : campaigns[0]);
                        if (!targetCamp) {
                          showToast(
                            'Ingresse em uma campanha com o código de convite antes de abrir a mesa.'
                          );
                          return;
                        }
                        if (sheet.campaignId !== targetCamp.id) {
                          updateCharacterSheet(sheet.id, {
                            campaignId: targetCamp.id,
                            campaignTitle: targetCamp.title,
                          });
                        }
                        selectCampaign(targetCamp.id, '/campaign/player-view');
                      }}
                      className="btn-solid py-2 px-3.5 rounded-lg text-xs inline-flex items-center gap-1.5"
                    >
                      <span>Jogar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Linked Campaigns */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">
            Campanhas Vinculadas ({campaigns.length})
          </h2>
          <p className="text-xs text-zinc-500">
            Mesas em que você participa atualmente
          </p>
        </div>

        {campaigns.length === 0 ? (
          <div className="surface-card rounded-xl p-8 text-center space-y-2">
            <p className="text-xs text-zinc-300 font-medium">
              Você ainda não ingressou em nenhuma campanha
            </p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Peça o código ou link de convite ao seu Mestre e cole no campo superior para sincronizar mapas, missões, diários e rolagens em tempo real.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((camp) => {
              const isActive = camp.id === activeCampaignId;
              return (
                <div
                  key={camp.id}
                  className={`surface-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isActive ? 'ring-1 ring-white/[0.15]' : ''
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.05] font-mono text-zinc-300">
                        {camp.inviteCode}
                      </span>
                      <span>Mestre: {camp.dmName}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px]">
                        {camp.isDm === false ? 'Participando' : 'Sua mesa'}
                      </span>
                    </div>
                    <h3 className="font-serif text-base font-medium text-zinc-100 truncate">
                      {camp.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2">
                      {camp.synopsis}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-1">
                      <Users className="w-3 h-3" />
                      <span>
                        {camp.activePlayersCount} membros · {camp.sessionsPlayed} sessões
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      selectCampaign(camp.id, '/campaign/player-view')
                    }
                    className="btn-solid shrink-0 py-2 px-4 rounded-lg text-xs inline-flex items-center gap-1.5"
                  >
                    <span>Abrir mesa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <CharacterSheetModal
        sheetId={modalSheetId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isDmContext={false}
      />
    </div>
  );
};
