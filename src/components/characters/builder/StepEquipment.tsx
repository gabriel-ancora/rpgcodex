import React from 'react';
import { ITEMS_BY_ID } from '../../../data/dnd2024';
import type { StartingEquipmentOption } from '../../../data/dnd2024';
import { OptionCard, Section } from '../ui';
import type { StepProps } from './shared';

const OptionItems: React.FC<{ option: StartingEquipmentOption }> = ({ option }) => (
  <ul className="text-[13px] text-fg-muted space-y-0.5">
    {option.items.map((l, i) => {
      const item = ITEMS_BY_ID[l.itemId];
      const name = l.label || item?.name || l.itemId;
      const detail = item?.damage || (item?.ac ? `CA ${item.ac.base}` : item?.acBonus ? `+${item.acBonus} CA` : '');
      return (
        <li key={`${l.itemId}-${i}`} className="flex justify-between gap-3">
          <span>
            {l.quantity && l.quantity > 1 ? `${l.quantity} × ` : ''}
            {name}
          </span>
          {detail && <span className="text-fg-subtle shrink-0">{detail}</span>}
        </li>
      );
    })}
    <li className="flex justify-between gap-3 pt-1 font-medium text-fg">
      <span>Ouro</span>
      <span className="tabular-nums">{option.gold} PO</span>
    </li>
  </ul>
);

export const StepEquipment: React.FC<
  StepProps & { isEditing: boolean; resetEquipment: boolean; onResetEquipmentChange: (v: boolean) => void }
> = ({ build, c, update, isEditing, resetEquipment, onResetEquipmentChange }) => {
  const disabled = isEditing && !resetEquipment;
  return (
    <div className="space-y-8">
      {isEditing && (
        <label className="card-muted p-3 flex items-start gap-3 text-[13px]">
          <input
            type="checkbox"
            className="checkbox mt-0.5"
            checked={resetEquipment}
            onChange={(e) => onResetEquipmentChange(e.target.checked)}
          />
          <span>
            <span className="font-medium text-fg block">Substituir o inventário atual pelo equipamento inicial</span>
            <span className="text-fg-muted">
              Desmarcado, o inventário e as moedas da ficha são mantidos como estão.
            </span>
          </span>
        </label>
      )}

      <Section
        title={`Equipamento da classe (${c.cls.name})`}
        description="Escolha o pacote de equipamento ou comece apenas com ouro para comprar o que quiser."
      >
        <div className={`grid grid-cols-1 ${c.classEquipmentOptions.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-3`}>
          {c.classEquipmentOptions.map((opt) => (
            <OptionCard
              key={opt.id}
              disabled={disabled}
              selected={build.classEquipment === opt.id}
              onClick={() => update({ classEquipment: opt.id })}
              title={opt.items.length === 0 ? `${opt.label}: apenas ouro` : opt.label}
            >
              <OptionItems option={opt} />
            </OptionCard>
          ))}
        </div>
      </Section>

      {c.background ? (
        <Section title={`Equipamento do antecedente (${c.background.name})`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {c.backgroundEquipmentOptions.map((opt) => (
              <OptionCard
                key={opt.id}
                disabled={disabled}
                selected={build.backgroundEquipment === opt.id}
                onClick={() => update({ backgroundEquipment: opt.id })}
                title={opt.items.length === 0 ? `${opt.label}: apenas ouro` : opt.label}
              >
                <OptionItems option={opt} />
              </OptionCard>
            ))}
          </div>
        </Section>
      ) : (
        <p className="text-[13px] text-fg-subtle">Escolha um antecedente na etapa Origem para ver o equipamento dele.</p>
      )}

      <div className="card p-4 flex items-center justify-between">
        <span className="text-sm text-fg-muted">Ouro inicial</span>
        <span className="text-lg font-semibold text-fg tabular-nums">{c.startingGold} PO</span>
      </div>
    </div>
  );
};
