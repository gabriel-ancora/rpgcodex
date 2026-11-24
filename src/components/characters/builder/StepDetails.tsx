import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ABILITIES, ALIGNMENTS, formatModifier } from '../../../data/dnd2024';
import type { CampaignSummary } from '../../../types/campaign';
import { Section, Stat } from '../ui';
import type { StepProps } from './shared';

export interface IdentityState {
  name: string;
  alignment: string;
  avatarUrl: string;
  notes: string;
  campaignId: string;
}

export const StepDetails: React.FC<
  StepProps & {
    identity: IdentityState;
    setIdentity: (patch: Partial<IdentityState>) => void;
    campaigns: CampaignSummary[];
    canChangeCampaign: boolean;
    issues: string[];
  }
> = ({ build, c, update, identity, setIdentity, campaigns, canChangeCampaign, issues }) => {
  return (
    <div className="space-y-8">
      <Section title="Identidade">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="char-name">Nome do personagem</label>
            <input id="char-name" className="input" value={identity.name} onChange={(e) => setIdentity({ name: e.target.value })} placeholder="Ex.: Lia Valebrisa" />
          </div>
          <div>
            <label className="label" htmlFor="char-alignment">Tendência</label>
            <select id="char-alignment" className="input" value={identity.alignment} onChange={(e) => setIdentity({ alignment: e.target.value })}>
              {ALIGNMENTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="char-campaign">Campanha</label>
            <select
              id="char-campaign"
              className="input"
              value={identity.campaignId}
              disabled={!canChangeCampaign}
              onChange={(e) => setIdentity({ campaignId: e.target.value })}
            >
              {campaigns.length === 0 && <option value="">Nenhuma campanha como jogador</option>}
              {campaigns.map((camp) => (
                <option key={camp.id} value={camp.id}>
                  {camp.title}
                </option>
              ))}
            </select>
            <p className="hint">
              {identity.campaignId
                ? 'O Mestre desta campanha poderá visualizar e editar esta ficha em tempo real.'
                : 'Entre em uma campanha com o código de convite do Mestre para criar sua ficha.'}
            </p>
          </div>
          <div>
            <label className="label" htmlFor="char-avatar">Imagem (URL, opcional)</label>
            <input id="char-avatar" className="input" value={identity.avatarUrl} onChange={(e) => setIdentity({ avatarUrl: e.target.value })} placeholder="https://…" />
          </div>
        </div>
      </Section>

      <Section title="Pontos de Vida" description="No nível 1 você recebe o valor máximo do Dado de Vida. Nos níveis seguintes, use a média fixa ou role.">
        <div className="segmented mb-3">
          <button type="button" onClick={() => update({ hpMethod: 'average' })} className={`segmented-item ${build.hpMethod === 'average' ? 'segmented-item-active' : ''}`}>
            Média fixa ({c.cls.hitDie / 2 + 1} por nível)
          </button>
          <button type="button" onClick={() => update({ hpMethod: 'rolled' })} className={`segmented-item ${build.hpMethod === 'rolled' ? 'segmented-item-active' : ''}`}>
            Rolagens
          </button>
        </div>
        {build.hpMethod === 'rolled' && c.level > 1 && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: c.level - 1 }, (_, i) => (
              <label key={i} className="flex flex-col items-center gap-1">
                <span className="text-xs text-fg-subtle">Nv. {i + 2}</span>
                <input
                  type="number"
                  min={1}
                  max={c.cls.hitDie}
                  value={build.hpRolls[i] || ''}
                  placeholder={`d${c.cls.hitDie}`}
                  onChange={(e) => {
                    const rolls = [...build.hpRolls];
                    rolls[i] = Math.max(1, Math.min(c.cls.hitDie, Number(e.target.value) || 0));
                    update({ hpRolls: rolls });
                  }}
                  className="input h-8 w-16 text-center"
                />
              </label>
            ))}
          </div>
        )}
      </Section>

      <Section title="Resumo">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Pontos de Vida" value={c.maxHp} hint={c.hitDice} />
          <Stat label="Iniciativa" value={formatModifier(c.initiative)} />
          <Stat label="Deslocamento" value={c.speedLabel.split(' (')[0]} />
          <Stat label="Proficiência" value={`+${c.proficiencyBonus}`} />
          <Stat label="Percepção passiva" value={c.passivePerception} />
          <Stat label="Ouro inicial" value={`${c.startingGold} PO`} />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
          {ABILITIES.map((a) => (
            <div key={a.id} className="card px-2 py-2 text-center">
              <div className="text-xs text-fg-subtle">{a.short}</div>
              <div className="text-base font-semibold tabular-nums">{c.scores[a.id]}</div>
              <div className="text-xs text-fg-muted tabular-nums">{formatModifier(c.mods[a.id])}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Pendências">
        {issues.length === 0 ? (
          <div className="flex items-center gap-2 text-[13px] text-success">
            <CheckCircle2 className="w-4 h-4" />
            Todas as escolhas obrigatórias foram feitas.
          </div>
        ) : (
          <ul className="card divide-y divide-line">
            {issues.map((i) => (
              <li key={i} className="px-3 py-2 flex items-start gap-2 text-[13px] text-fg">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                {i}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Anotações">
        <textarea
          className="input min-h-[120px]"
          value={identity.notes}
          onChange={(e) => setIdentity({ notes: e.target.value })}
          placeholder="História, personalidade, vínculos…"
        />
      </Section>
    </div>
  );
};
