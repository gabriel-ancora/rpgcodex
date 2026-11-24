import React, { useState } from 'react';
import { X, Plus, Minus, FileText, Users } from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { ABILITIES, abilityModifier, formatModifier } from '../../data/dnd2024';
import { CharacterSheetModal } from './CharacterSheetModal';
import { applyDamage, applyHealing } from '../../rules/hp';

export const DmPartyInspectDrawer: React.FC = () => {
  const isOpen = useCampaignStore((s) => s.isDmPartyDrawerOpen);
  const setIsDmPartyDrawerOpen = useCampaignStore((s) => s.setIsDmPartyDrawerOpen);
  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const inspectingCharacterId = useCampaignStore((s) => s.inspectingCharacterId);
  const updateCharacterSheet = useCampaignStore((s) => s.updateCharacterSheet);

  const [modal, setModal] = useState<{ id: string | null } | null>(null);
  const [hpInput, setHpInput] = useState('');

  if (!isOpen) return null;

  const partySheets = characterSheets.filter((c) => c.campaignId === activeCampaignId);
  const activeSheet = partySheets.find((c) => c.id === inspectingCharacterId) || partySheets[0];

  const changeHp = (sign: 1 | -1) => {
    if (!activeSheet) return;
    const n = Math.abs(parseInt(hpInput, 10));
    if (!n) return;
    void updateCharacterSheet(activeSheet.id, sign === -1 ? applyDamage(activeSheet, n) : applyHealing(activeSheet, n));
    setHpInput('');
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 flex justify-end" onClick={() => setIsDmPartyDrawerOpen(false)}>
        <aside
          className="w-full max-w-md bg-surface border-l border-line h-full flex flex-col shadow-elevated"
          onClick={(e) => e.stopPropagation()}
          aria-label="Fichas do grupo"
        >
          <header className="h-14 px-4 border-b border-line flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-[15px] font-semibold text-fg">Fichas do grupo</h3>
              <p className="text-xs text-fg-subtle">{partySheets.length} personagem(ns) nesta campanha</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setIsDmPartyDrawerOpen(false)} className="btn btn-ghost btn-icon" aria-label="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {partySheets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-2">
              <Users className="w-5 h-5 text-fg-subtle" />
              <p className="text-sm font-medium text-fg">Nenhuma ficha de jogador ainda</p>
              <p className="text-[13px] text-fg-muted max-w-xs">
                As fichas aparecem aqui assim que os jogadores que entraram nesta campanha criarem seus personagens. Você poderá visualizar e editar todas elas por aqui.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-line overflow-x-auto shrink-0">
                <ul className="flex gap-1 p-2">
                  {partySheets.map((cs) => {
                    const selected = activeSheet?.id === cs.id;
                    const pct = cs.hp / Math.max(1, cs.maxHp);
                    return (
                      <li key={cs.id} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsDmPartyDrawerOpen(true, cs.id)}
                          aria-current={selected}
                          className={`px-3 py-1.5 rounded-md text-[13px] flex items-center gap-2 ${
                            selected ? 'bg-surface-2 text-fg font-medium' : 'text-fg-muted hover:bg-surface-2/60'
                          }`}
                        >
                          <span>{cs.name}</span>
                          <span className={`tabular-nums text-xs ${pct <= 0.25 ? 'text-danger' : 'text-fg-subtle'}`}>
                            {cs.hp}/{cs.maxHp}
                          </span>
                          {cs.id.startsWith('char-') && <span className="badge badge-warning">salvando</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {activeSheet && (
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-base font-semibold text-fg truncate">{activeSheet.name}</h4>
                      <p className="text-[13px] text-fg-muted">
                        {activeSheet.race} · {activeSheet.className} {activeSheet.level}
                        {activeSheet.subclass ? ` · ${activeSheet.subclass}` : ''}
                      </p>
                      <p className="text-xs text-fg-subtle">
                        {activeSheet.playerName} · {activeSheet.background}
                      </p>
                    </div>
                    <button type="button" onClick={() => setModal({ id: activeSheet.id })} className="btn btn-secondary btn-sm shrink-0">
                      <FileText className="w-4 h-4" />
                      Ficha completa
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="card px-3 py-2">
                      <div className="text-xs text-fg-subtle">PV</div>
                      <div className="text-lg font-semibold tabular-nums">
                        {activeSheet.hp}
                        <span className="text-sm text-fg-subtle font-normal">/{activeSheet.maxHp}</span>
                      </div>
                      {activeSheet.tempHp > 0 && <div className="text-xs text-info">+{activeSheet.tempHp} temp.</div>}
                    </div>
                    <div className="card px-3 py-2">
                      <div className="text-xs text-fg-subtle">CA</div>
                      <div className="text-lg font-semibold tabular-nums">{activeSheet.armorClass}</div>
                    </div>
                    <div className="card px-3 py-2">
                      <div className="text-xs text-fg-subtle">Percepção passiva</div>
                      <div className="text-lg font-semibold tabular-nums">{activeSheet.passivePerception}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={hpInput}
                      onChange={(e) => setHpInput(e.target.value)}
                      className="input w-24"
                      placeholder="Valor"
                      aria-label="Dano ou cura"
                    />
                    <button type="button" className="btn btn-secondary" onClick={() => changeHp(-1)}>
                      <Minus className="w-4 h-4" />
                      Dano
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => changeHp(1)}>
                      <Plus className="w-4 h-4" />
                      Cura
                    </button>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5">
                    {ABILITIES.map((a) => (
                      <div key={a.id} className="card px-1 py-2 text-center">
                        <div className="text-xs text-fg-subtle">{a.short}</div>
                        <div className="text-sm font-semibold tabular-nums">{formatModifier(abilityModifier(activeSheet.stats[a.id]))}</div>
                        <div className="text-xs text-fg-subtle tabular-nums">{activeSheet.stats[a.id]}</div>
                      </div>
                    ))}
                  </div>

                  {activeSheet.spells.length > 0 && (
                    <div>
                      <h5 className="text-[13px] font-medium text-fg-muted mb-1.5">Magias ({activeSheet.spells.length})</h5>
                      <p className="text-[13px] text-fg leading-relaxed">
                        {activeSheet.spells.map((s) => s.name).join(', ')}
                      </p>
                    </div>
                  )}

                  {activeSheet.equipment.length > 0 && (
                    <div>
                      <h5 className="text-[13px] font-medium text-fg-muted mb-1.5">Equipamento</h5>
                      <ul className="card divide-y divide-line">
                        {activeSheet.equipment.map((eq) => (
                          <li key={eq.id} className="px-3 py-2 flex items-center justify-between gap-3 text-[13px]">
                            <span className="min-w-0">
                              <span className="text-fg">{eq.name}</span>
                              {eq.equipped && <span className="badge ml-2">equipado</span>}
                            </span>
                            <span className="text-fg-subtle tabular-nums shrink-0">× {eq.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {modal && <CharacterSheetModal sheetId={modal.id} isOpen onClose={() => setModal(null)} />}
    </>
  );
};
