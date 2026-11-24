/**
 * Infraestrutura de escrita da store: mutações honestas, criações pendentes e
 * persistência com debounce. Não depende da store (evita importação circular);
 * a store registra o callback de toast via `bindToast`.
 */
import { convexErrorMessage } from '../utils/sheetPayload';

export type ToastVariant = 'info' | 'success' | 'error';
type ToastFn = (message: string, variant?: ToastVariant) => void;

let toast: ToastFn = () => {};
export function bindToast(fn: ToastFn) {
  toast = fn;
}

// ---------------------------------------------------------------------------
// Ids temporários e criações pendentes
// ---------------------------------------------------------------------------

let tempCounter = 0;
/** Gera um id temporário (`tmp-<tipo>-…`). Fichas de personagem mantêm o prefixo `char-`. */
export function tempId(kind: string): string {
  tempCounter += 1;
  return `tmp-${kind}-${Date.now().toString(36)}${tempCounter.toString(36)}`;
}

export function isTempId(id: string | undefined | null): boolean {
  return Boolean(id && (id.startsWith('tmp-') || id.startsWith('char-')));
}

/** id temporário → promessa do id definitivo (null se a criação falhou). */
export const pendingCreations = new Map<string, Promise<string | null>>();
/** id temporário → id definitivo, para chamadas que ainda usem o id antigo. */
const idAliases = new Map<string, string>();

/** Registra uma criação em andamento. A promessa nunca deve rejeitar (resolve com null em falha). */
export function trackCreation(temp: string, creation: Promise<string | null>) {
  pendingCreations.set(temp, creation);
  void creation.then((real) => {
    if (pendingCreations.get(temp) === creation) pendingCreations.delete(temp);
    if (real) idAliases.set(temp, real);
  });
}

export function isPendingCreation(id: string | undefined | null): boolean {
  return Boolean(id && pendingCreations.has(id));
}

/**
 * Devolve o id definitivo de um registro. Se a criação ainda está em andamento, espera por ela;
 * se falhou, lança um erro (a edição/exclusão não deve ser enviada ao servidor).
 */
export async function resolveId(id: string): Promise<string> {
  if (!isTempId(id)) return id;
  const pending = pendingCreations.get(id);
  if (pending) {
    const real = await pending;
    if (!real) throw new Error('O item ainda não foi salvo no servidor.');
    return real;
  }
  const alias = idAliases.get(id);
  if (alias) return alias;
  throw new Error('O item ainda não foi salvo no servidor.');
}

export async function resolveIds(ids: string[] | undefined): Promise<string[] | undefined> {
  if (!ids) return ids;
  return Promise.all(ids.map(resolveId));
}

export async function resolveOptionalId(id: string | undefined): Promise<string | undefined> {
  return id ? resolveId(id) : undefined;
}

export function clearCreationTracking() {
  idAliases.clear();
}

// ---------------------------------------------------------------------------
// runMutation
// ---------------------------------------------------------------------------

export type MutationResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Executa uma escrita no servidor de forma honesta.
 *
 * 1. O chamador já aplicou o estado otimista e passa `rollback` para desfazê-lo.
 * 2. `fn` é aguardada. Dentro dela, use `resolveId` para ids que possam ser temporários.
 * 3. Em caso de falha: `rollback()` e toast de erro com `convexErrorMessage`.
 *    Em sucesso: toast opcional (`success`).
 *
 * Nunca rejeita; devolve `{ ok, value | error }`.
 */
export async function runMutation<T>(
  label: string,
  rollback: (() => void) | undefined,
  fn: () => Promise<T>,
  opts: { success?: string; silent?: boolean } = {}
): Promise<MutationResult<T>> {
  try {
    const value = await fn();
    if (opts.success) toast(opts.success, 'success');
    return { ok: true, value };
  } catch (err) {
    const message = convexErrorMessage(err);
    try {
      rollback?.();
    } catch {
      // o rollback não pode impedir o aviso ao usuário
    }
    if (!opts.silent) toast(`Não foi possível ${label}: ${message}`, 'error');
    return { ok: false, error: message };
  }
}

/** Execução em série por chave (ex.: gravações do array de formas de um mapa). */
const queues = new Map<string, Promise<unknown>>();
export function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(task, task);
  queues.set(key, next);
  void next.finally(() => {
    if (queues.get(key) === next) queues.delete(key);
  });
  return next;
}

// ---------------------------------------------------------------------------
// Persistência com debounce (rascunhos)
// ---------------------------------------------------------------------------

interface PendingWrite {
  patch: Record<string, unknown>;
  timer: ReturnType<typeof setTimeout>;
  label: string;
  rollback?: () => void;
  flush: (patch: Record<string, unknown>) => Promise<unknown>;
  waiters: Array<(ok: boolean) => void>;
}

const pendingWrites = new Map<string, PendingWrite>();
/** Patches já enviados, mas ainda não confirmados: continuam valendo como rascunho. */
const inFlightPatches = new Map<string, Record<string, unknown>>();

export const DEFAULT_DEBOUNCE_MS = 600;

/**
 * Agenda uma gravação com debounce. Várias chamadas com a mesma `key` são combinadas
 * em um único patch. Enquanto o patch existir (agendado ou em voo), `getPendingPatch(key)`
 * o devolve para que snapshots do servidor não sobrescrevam o que o usuário está digitando.
 *
 * `rollback` deve restaurar o estado anterior à primeira edição da rajada; só o primeiro é mantido.
 * Resolve com `true` quando o servidor confirmou, `false` se falhou.
 */
export function scheduleWrite<P extends Record<string, unknown>>(opts: {
  key: string;
  patch: P;
  label: string;
  flush: (merged: P) => Promise<unknown>;
  rollback?: () => void;
  delayMs?: number;
}): Promise<boolean> {
  const delay = opts.delayMs ?? DEFAULT_DEBOUNCE_MS;
  const existing = pendingWrites.get(opts.key);
  return new Promise<boolean>((resolve) => {
    if (existing) clearTimeout(existing.timer);
    const entry: PendingWrite = existing ?? {
      patch: {},
      timer: undefined as unknown as ReturnType<typeof setTimeout>,
      label: opts.label,
      rollback: opts.rollback,
      flush: opts.flush as (patch: Record<string, unknown>) => Promise<unknown>,
      waiters: [],
    };
    entry.patch = { ...entry.patch, ...opts.patch };
    entry.flush = opts.flush as (patch: Record<string, unknown>) => Promise<unknown>;
    entry.waiters.push(resolve);
    entry.timer = setTimeout(() => void flushKey(opts.key), delay);
    pendingWrites.set(opts.key, entry);
  });
}

async function flushKey(key: string): Promise<void> {
  const entry = pendingWrites.get(key);
  if (!entry) return;
  clearTimeout(entry.timer);
  pendingWrites.delete(key);
  inFlightPatches.set(key, entry.patch);
  const result = await runMutation(entry.label, entry.rollback, () => entry.flush(entry.patch));
  // Só libera o rascunho se nenhuma edição nova chegou durante o envio.
  if (inFlightPatches.get(key) === entry.patch) inFlightPatches.delete(key);
  entry.waiters.forEach((w) => w(result.ok));
}

/** Grava imediatamente os rascunhos cujas chaves começam com `prefix` (todos, se omitido). */
export async function flushPendingWrites(prefix = ''): Promise<void> {
  const keys = Array.from(pendingWrites.keys()).filter((k) => k.startsWith(prefix));
  await Promise.all(keys.map(flushKey));
}

/** Rascunho vigente para a chave (agendado ou em voo), ou undefined. */
export function getPendingPatch(key: string): Record<string, unknown> | undefined {
  const queued = pendingWrites.get(key)?.patch;
  const flying = inFlightPatches.get(key);
  if (queued && flying) return { ...flying, ...queued };
  return queued ?? flying;
}

export function hasPendingWrites(prefix = ''): boolean {
  for (const k of pendingWrites.keys()) if (k.startsWith(prefix)) return true;
  for (const k of inFlightPatches.keys()) if (k.startsWith(prefix)) return true;
  return false;
}

/** Descarta rascunhos sem gravar (usar apenas depois de `flushPendingWrites`). */
export function discardPendingWrites() {
  for (const entry of pendingWrites.values()) {
    clearTimeout(entry.timer);
    entry.waiters.forEach((w) => w(false));
  }
  pendingWrites.clear();
  inFlightPatches.clear();
}

/** Chaves de rascunho usadas pela store e pela bridge. */
export const draftKey = {
  entity: (id: string) => `entity:${id}`,
  attribute: (id: string) => `attr:${id}`,
  timeline: (id: string) => `timeline:${id}`,
  calendar: (campaignId: string) => `calendar:${campaignId}`,
  stronghold: (campaignId: string) => `stronghold:${campaignId}`,
  graphNode: (id: string) => `gpos:${id}`,
  scene: (id: string) => `scene:${id}`,
  journal: (id: string) => `journal:${id}`,
  personalNote: (id: string) => `pnote:${id}`,
} as const;
