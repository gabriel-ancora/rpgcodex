import type { CharacterSheet } from '../types/campaign';

/** Aplica dano: consome primeiro os PV temporários. */
export function applyDamage(sheet: Pick<CharacterSheet, 'hp' | 'tempHp'>, amount: number): Pick<CharacterSheet, 'hp' | 'tempHp'> {
  const n = Math.max(0, Math.floor(amount));
  const fromTemp = Math.min(sheet.tempHp, n);
  return { tempHp: sheet.tempHp - fromTemp, hp: Math.max(0, sheet.hp - (n - fromTemp)) };
}

/** Aplica cura: nunca ultrapassa o máximo e não afeta PV temporários. */
export function applyHealing(sheet: Pick<CharacterSheet, 'hp' | 'maxHp'>, amount: number): Pick<CharacterSheet, 'hp'> {
  return { hp: Math.min(sheet.maxHp, sheet.hp + Math.max(0, Math.floor(amount))) };
}
