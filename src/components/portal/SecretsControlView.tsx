import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { MentionText } from '../common/MentionText';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ExternalLink,
  Search,
} from 'lucide-react';

export const SecretsControlView: React.FC = () => {
  const entities = useCampaignStore((s) => s.entities);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const setViewRole = useCampaignStore((s) => s.setViewRole);
  const revealEntitySecret = useCampaignStore((s) => s.revealEntitySecret);
  const setSelectedEntityId = useCampaignStore((s) => s.setSelectedEntityId);
  const setActiveModule = useCampaignStore((s) => s.setActiveModule);
  const setWorldSubTab = useCampaignStore((s) => s.setWorldSubTab);

  const [filterText, setFilterText] = useState('');

  const totalSecrets = entities.reduce((acc, e) => acc + e.secrets.length, 0);
  const revealedSecretsCount = entities.reduce(
    (acc, e) => acc + e.secrets.filter((s) => s.isRevealed).length,
    0
  );

  const filteredEntities = entities.filter((e) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.handle.toLowerCase().includes(q) ||
      e.secrets.some(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.content.toLowerCase().includes(q)
      )
    );
  });

  return (
    <div className="space-y-5 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1">
      {/* Header Bar */}
      <div className="p-4 rounded-xl surface-panel flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
            {viewRole === 'gm'
              ? 'Segredos & névoa de conhecimento'
              : 'Conhecimento revelado em mesa'}
          </h2>
          <p className="text-xs text-zinc-500 tabular-nums">
            {viewRole === 'gm'
              ? `${revealedSecretsCount} de ${totalSecrets} segredos revelados aos jogadores.`
              : `Exibindo registros públicos e ${revealedSecretsCount} descobertas confirmadas.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filtrar entrada ou segredo..."
              className="input-clean pl-8 pr-3 py-1.5 rounded-lg text-xs w-56"
            />
          </div>

          <button
            onClick={() => setViewRole(viewRole === 'gm' ? 'player' : 'gm')}
            className={`px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 ${
              viewRole === 'gm' ? 'btn-subtle' : 'btn-solid'
            }`}
          >
            {viewRole === 'gm' ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Prévia do jogador</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Voltar ao mestre</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Matrix */}
      {filteredEntities.length === 0 ? (
        <div className="py-14 px-6 rounded-xl surface-panel text-center space-y-2">
          <Lock className="w-6 h-6 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-medium text-zinc-300">
            Nenhuma entrada correspondente
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Adicione notas confidenciais às entradas do códice para controlar o que os jogadores enxergam.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEntities.map((ent) => {
            const visibleSecrets =
              viewRole === 'gm'
                ? ent.secrets
                : ent.secrets.filter((s) => s.isRevealed);

            return (
              <div
                key={ent.id}
                className="p-5 rounded-xl surface-panel space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-3">
                    <div>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {ent.mentionPrefix}
                        {ent.handle}
                      </span>
                      <h3 className="text-lg font-serif font-medium text-zinc-100">
                        {ent.name}
                      </h3>
                      <p className="text-xs text-zinc-400">{ent.subtitle}</p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedEntityId(ent.id);
                        setActiveModule('worldbuilding');
                        setWorldSubTab('wiki');
                      }}
                      className="btn-subtle px-2.5 py-1 rounded-md text-xs inline-flex items-center gap-1"
                    >
                      <span>Códice</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Public Block */}
                  <div className="p-3.5 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1.5 font-medium text-zinc-400">
                        <Eye className="w-3 h-3" />
                        <span>Conhecimento público</span>
                      </span>
                      <span>Visível</span>
                    </div>
                    <div className="text-xs text-zinc-300 leading-relaxed">
                      <MentionText text={ent.publicContent} />
                    </div>
                  </div>

                  {/* Secret Blocks */}
                  {visibleSecrets.length > 0 ? (
                    <div className="space-y-2">
                      {visibleSecrets.map((sec) => (
                        <div
                          key={sec.id}
                          className={`p-3.5 rounded-xl border space-y-2 transition-colors ${
                            sec.isRevealed
                              ? 'bg-amber-500/[0.04] border-amber-500/25'
                              : 'bg-[#0e0e11] border-white/[0.07]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {sec.isRevealed ? (
                                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-rose-400/80" />
                              )}
                              <span className="text-xs font-medium text-zinc-100">
                                {sec.title}
                              </span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  sec.isRevealed
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                                    : 'bg-white/[0.04] text-zinc-400 border-white/[0.08]'
                                }`}
                              >
                                {sec.isRevealed ? 'Revelado' : 'Confidencial'}
                              </span>
                            </div>

                            {viewRole === 'gm' && (
                              <button
                                onClick={() =>
                                  revealEntitySecret(
                                    ent.id,
                                    sec.id,
                                    !sec.isRevealed
                                  )
                                }
                                className={`px-2.5 py-1 rounded-md text-xs inline-flex items-center gap-1 ${
                                  sec.isRevealed ? 'btn-subtle' : 'btn-solid'
                                }`}
                              >
                                {sec.isRevealed ? (
                                  <>
                                    <EyeOff className="w-3 h-3" />
                                    <span>Ocultar</span>
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    <span>Revelar</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div className="text-xs text-zinc-300 leading-relaxed">
                            <MentionText text={sec.content} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    viewRole === 'player' && (
                      <div className="text-[11px] text-zinc-500 px-1">
                        Nenhum segredo adicional revelado sobre esta entrada.
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
