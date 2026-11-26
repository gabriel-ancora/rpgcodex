import { ConvexReactClient } from "convex/react";

/**
 * URL do deployment Convex. Não há valor padrão: sem `VITE_CONVEX_URL` o aplicativo
 * não inicia e `main.tsx` mostra `convexConfigError` em vez de se conectar a um backend errado.
 */
const rawUrl = (import.meta.env.VITE_CONVEX_URL as string | undefined)
  ?.trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\/+$/, "");

export const convexConfigError: string | null = rawUrl
  ? null
  : "Configuração ausente: a variável VITE_CONVEX_URL não foi definida. Defina-a no arquivo .env (veja .env.example) e reinicie o servidor de desenvolvimento ou refaça o build.";

/** Só deve ser usado depois de `convexConfigError` ser verificado (main.tsx faz isso). */
export const convexClient: ConvexReactClient = rawUrl
  ? new ConvexReactClient(rawUrl)
  : (null as unknown as ConvexReactClient);
