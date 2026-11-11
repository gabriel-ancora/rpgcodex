import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { CharacterSheetModal } from './CharacterSheetModal';
import {
  X,
  Edit3,
  Plus,
} from 'lucide-react';

function calcMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export const DmPartyInspectDrawer: React.FC = () => {
  const isOpen = useCampaignStore((s) => s.isDmPartyDrawerOpen);
  const setIsDmPartyDrawerOpen = useCampaignStore((s) => s.setIsDmPartyDrawerOpen);
  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const inspectingCharacterId = useCampaignStore((s) => s.inspectingCharacterId);
  const updateCharacterSheet = useCampaignStore((s) => s.updateCharacterSheet);

  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [creatingNewSheet, setCreatingNewSheet] = useState(false);

  if (!isOpen) return null;

  const activeSheet =
    characterSheets.find((c) => c.id === inspectingCharacterId) || characterSheets[0];

  const handleQuickHpChange = (
    sheetId: string,
    currentHp: number,
    maxHp: number,
    delta: number
  ) => {
    const nextHp = Math.max(0, Math.min(maxHp, currentHp + delta));
    updateCharacterSheet(sheetId, { hp: nextHp });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs flex justify-end">
        <div className="w-full max-w-lg bg-[#111114] border-l border-white/[0.08] h-full flex flex-col shadow-elevated">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Fichas do Grupo
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Consulta e ajuste rápido em tempo real
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCreatingNewSheet(true)}
                className="btn-subtle px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova ficha</span>
              </button>
              <button
                onClick={() => setIsDmPartyDrawerOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Character Selector Strip */}
          <div className="px-5 py-2.5 border-b border-white/[0.06] flex items-center gap-1.5 overflow-x-auto">
            {characterSheets.map((cs) => {
              const isSelected = activeSheet?.id === cs.id;
              return (
                <button
                  key={cs.id}
                  onClick={() => setIsDmPartyDrawerOpen(true, cs.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-2 ${
                    isSelected
                      ? 'bg-white/[0.09] text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{cs.name}</span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {cs.hp}/{cs.maxHp}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sheet Details */}
          {activeSheet ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-[#16161a] border border-white/[0.07] space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-semibold text-zinc-100">
                      {activeSheet.name}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {activeSheet.race} · {activeSheet.className} Nv. {activeSheet.level}{' '}
                      {activeSheet.subclass ? `(${activeSheet.subclass})` : ''}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {activeSheet.playerName} · {activeSheet.background}
                    </p>
                  </div>

                  <button
                    onClick={() => setEditingSheetId(activeSheet.id)}
                    className="btn-subtle inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Ficha completa</span>
                  </button>
                </div>

                {/* Vitals */}
                <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-white/[0.06]">
                  <div className="p-2.5 rounded-lg bg-[#0e0e11] border border-white/[0.06]">
                    <span className="text-[10px] text-zinc-500 block">
                      Pontos de Vida
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-mono font-semibold text-zinc-100">
                        {activeSheet.hp}/{activeSheet.maxHp}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleQuickHpChange(
                              activeSheet.id,
                              activeSheet.hp,
                              activeSheet.maxHp,
                              -1
                            )
                          }
                          className="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-xs font-mono"
                        >
                          -
                        </button>
                        <button
                          onClick={() =>
                            handleQuickHpChange(
                              activeSheet.id,
                              activeSheet.hp,
                              activeSheet.maxHp,
                              1
                            )
                          }
                          className="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-xs font-mono"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0e0e11] border border-white/[0.06]">
                    <span className="text-[10px] text-zinc-500 block">
                      Defesa (CA)
                    </span>
                    <div className="text-sm font-mono font-semibold text-zinc-100 mt-1">
                      {activeSheet.armorClass}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0e0e11] border border-white/[0.06]">
                    <span className="text-[10px] text-zinc-500 block">
                      Percepção Passiva
                    </span>
                    <div className="text-sm font-mono font-semibold text-zinc-100 mt-1">
                      {activeSheet.passivePerception}
                    </div>
                  </div>
                </div>

                {/* Attributes */}
                <div className="grid grid-cols-6 gap-1.5">
                  {(
                    [
                      ['FOR', activeSheet.stats.str],
                      ['DES', activeSheet.stats.dex],
                      ['CON', activeSheet.stats.con],
                      ['INT', activeSheet.stats.int],
                      ['SAB', activeSheet.stats.wis],
                      ['CAR', activeSheet.stats.cha],
                    ] as const
                  ).map(([lbl, val]) => (
                    <div
                      key={lbl}
                      className="p-2 rounded-lg bg-[#0e0e11] border border-white/[0.05] text-center"
                    >
                      <span className="text-[9px] text-zinc-500 block">{lbl}</span>
                      <span className="text-xs font-semibold text-zinc-200">{val}</span>
                      <span className="text-[10px] font-mono text-zinc-400 block">
                        {calcMod(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Class Features (5.5e) */}
              {activeSheet.classFeatures && activeSheet.classFeatures.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-zinc-300">
                    Habilidades Nv. 1–{activeSheet.level} ({activeSheet.classFeatures.length})
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSheet.classFeatures.map((f, idx) => (
                      <span
                        key={idx}
                        title={f.description}
                        className="px-2 py-1 rounded-md bg-[#16161a] border border-white/[0.06] text-[11px] text-zinc-300"
                      >
                        <span className="text-zinc-500 font-mono mr-1">Nv{f.level}</span>
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Spells */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold text-zinc-300">
                    Grimório ({activeSheet.spells.length})
                  </h5>
                  <div className="flex gap-2.5 text-[11px] font-mono text-zinc-500">
                    <span>
                      Nv1 {activeSheet.spellSlots.level1.used}/{activeSheet.spellSlots.level1.max}
                    </span>
                    <span>
                      Nv2 {activeSheet.spellSlots.level2.used}/{activeSheet.spellSlots.level2.max}
                    </span>
                    <span>
                      Nv3 {activeSheet.spellSlots.level3.used}/{activeSheet.spellSlots.level3.max}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {activeSheet.spells.map((sp) => (
                    <div
                      key={sp.id}
                      className="p-3 rounded-lg bg-[#16161a] border border-white/[0.06] text-xs"
                    >
                      <div className="flex items-center justify-between font-medium text-zinc-200">
                        <span>{sp.name}</span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {sp.castingTime} · {sp.range}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        {sp.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-semibold text-zinc-300">
                  Equipamento ({activeSheet.equipment.length})
                </h5>
                <div className="space-y-1.5">
                  {activeSheet.equipment.map((eq) => (
                    <div
                      key={eq.id}
                      className="p-3 rounded-lg bg-[#16161a] border border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-medium text-zinc-200">{eq.name}</span>
                        <span className="text-[11px] text-zinc-500 block">
                          {eq.category} {eq.damage ? `· ${eq.damage}` : ''}{' '}
                          {eq.armorClass ? `· ${eq.armorClass}` : ''}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500">
                        ×{eq.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500">
              Nenhuma ficha cadastrada nesta campanha.
            </div>
          )}
        </div>
      </div>

      {(editingSheetId || creatingNewSheet) && (
        <CharacterSheetModal
          sheetId={creatingNewSheet ? null : editingSheetId}
          isOpen={true}
          isDmContext={true}
          onClose={() => {
            setEditingSheetId(null);
            setCreatingNewSheet(false);
          }}
        />
      )}
    </>
  );
};
