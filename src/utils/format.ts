/**
 * Formatação de datas para exibição em PT-BR. O servidor entrega timestamps em ISO 8601;
 * valores que não são datas válidas (por exemplo, textos antigos) são devolvidos como estão.
 */

function parse(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "14:32:05" */
export function formatTime(iso?: string | null): string {
  const d = parse(iso);
  if (!d) return iso || '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** "24/11/2026, 14:32" */
export function formatDateTime(iso?: string | null): string {
  const d = parse(iso);
  if (!d) return iso || '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias" ou a data completa para períodos longos. */
export function formatRelativeDate(iso?: string | null): string {
  const d = parse(iso);
  if (!d) return iso || '';
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
