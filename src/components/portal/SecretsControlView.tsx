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
    <div className="space-y-4 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title">
            {viewRole === 'gm' ? 'Visibilidade de segredos' : 'Conhecimento revelado'}
          </h2>
          <p className="text-[13px] text-fg-muted tabular-nums">
            {viewRole === 'gm'
              ? `${revealedSecretsCount} de ${totalSecrets} segredos revelados aos jogadores.`
              : `Registros públicos e ${revealedSecretsCount} descobertas confirmadas.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-fg-subtle absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filtrar entradas ou segredos"
              className="input pl-8 sm:w-64"
            />
          </div>

          <button
            onClick={() => setViewRole(viewRole === 'gm' ? 'player' : 'gm')}
            className={`btn ${viewRole === 'gm' ? 'btn-secondary' : 'btn-primary'}`}
          >
            {viewRole === 'gm' ? (
              <>
                <Eye className="w-4 h-4" />
                <span>Ver como jogador</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                <span>Voltar à visão do mestre</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Entradas */}
      {filteredEntities.length === 0 ? (
        <div className="card py-12 px-6 text-center">
          <Lock className="w-5 h-5 text-fg-subtle mx-auto mb-3" />
          <h3 className="text-sm font-medium text-fg">Nenhuma entrada encontrada</h3>
          <p className="text-[13px] text-fg-muted max-w-sm mx-auto mt-1">
            Adicione notas confidenciais às entradas do códice para controlar o que os jogadores veem.
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
              <div key={ent.id} className="card flex flex-col">
                <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-line">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-fg truncate">{ent.name}</h3>
                    <p className="text-[13px] text-fg-muted">
                      <span className="font-mono text-xs text-fg-subtle mr-1.5">
                        {ent.mentionPrefix}
                        {ent.handle}
                      </span>
                      {ent.subtitle}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedEntityId(ent.id);
                      setActiveModule('worldbuilding');
                      setWorldSubTab('wiki');
                    }}
                    className="btn btn-ghost btn-sm shrink-0"
                  >
                    <span>Abrir no códice</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Público */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Público</span>
                    </div>
                    <div className="text-sm text-fg leading-relaxed">
                      <MentionText text={ent.publicContent} />
                    </div>
                  </div>

                  {/* Segredos */}
                  {visibleSecrets.length > 0 ? (
                    <ul className="rounded-md border border-line divide-y divide-line">
                      {visibleSecrets.map((sec) => (
                        <li key={sec.id} className="px-3 py-2.5 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {sec.isRevealed ? (
                                <Unlock className="w-4 h-4 text-success shrink-0" />
                              ) : (
                                <Lock className="w-4 h-4 text-fg-subtle shrink-0" />
                              )}
                              <span className="text-sm font-medium text-fg">{sec.title}</span>
                              <span className={`badge ${sec.isRevealed ? 'badge-success' : ''}`}>
                                {sec.isRevealed ? 'Revelado' : 'Oculto'}
                              </span>
                            </div>

                            {viewRole === 'gm' && (
                              <button
                                onClick={() =>
                                  revealEntitySecret(ent.id, sec.id, !sec.isRevealed)
                                }
                                className={`btn btn-sm ${
                                  sec.isRevealed ? 'btn-ghost' : 'btn-secondary'
                                }`}
                              >
                                {sec.isRevealed ? (
                                  <>
                                    <EyeOff className="w-4 h-4" />
                                    <span>Ocultar</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4" />
                                    <span>Revelar</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div className="text-[13px] text-fg-muted leading-relaxed pl-6">
                            <MentionText text={sec.content} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    viewRole === 'player' && (
                      <p className="text-[13px] text-fg-subtle">
                        Nenhum segredo revelado sobre esta entrada.
                      </p>
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
