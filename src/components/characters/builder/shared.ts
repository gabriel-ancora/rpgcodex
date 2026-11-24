import type { CharacterBuild } from '../../../rules/build';
import type { ComputedCharacter } from '../../../rules/engine';

export type BuildUpdate = (
  patch: Partial<CharacterBuild> | ((b: CharacterBuild) => Partial<CharacterBuild>)
) => void;

export interface StepProps {
  build: CharacterBuild;
  c: ComputedCharacter;
  update: BuildUpdate;
}

export function toggleInList<T>(list: T[], value: T, max?: number): T[] {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (typeof max === 'number' && max <= 1) return [value];
  if (typeof max === 'number' && list.length >= max) return list;
  return [...list, value];
}
