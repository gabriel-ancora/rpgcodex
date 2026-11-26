import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { AlertCircle, Loader2, KeyRound } from 'lucide-react';

interface LoginViewProps {
  pendingInviteCode?: string | null;
  onAuthenticated?: () => void;
}

const CodexMark: React.FC = () => (
  <div className="w-7 h-7 rounded-md bg-accent text-accent-fg flex items-center justify-center shrink-0">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5L14 5V11L8 14.5L2 11V5L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 1.5V14.5M2 5L8 8.5L14 5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export const LoginView: React.FC<LoginViewProps> = ({
  pendingInviteCode,
  onAuthenticated,
}) => {
  const registerAccount = useCampaignStore((s) => s.registerAccount);
  const loginWithPassword = useCampaignStore((s) => s.loginWithPassword);

  const [mode, setMode] = useState<'login' | 'register'>(
    pendingInviteCode ? 'register' : 'login'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cleanConvexError = (err: unknown): string => {
    if (
      err &&
      typeof err === 'object' &&
      'data' in err &&
      typeof (err as { data?: unknown }).data === 'string'
    ) {
      return (err as { data: string }).data;
    }
    const raw = err instanceof Error ? err.message : String(err);
    const uncaughtMatch = raw.match(/Uncaught (?:Convex)?Error:\s*([^\n]+)/i);
    if (uncaughtMatch?.[1]) return uncaughtMatch[1].trim();
    if (/Server Error/i.test(raw)) {
      return mode === 'login'
        ? 'E-mail ou senha incorretos (se ainda não criou conta neste ambiente, use a aba Criar conta).'
        : 'Não foi possível concluir o cadastro com esses dados.';
    }
    return raw.replace(/^\[CONVEX[^\]]*\]\s*/i, '').trim() || 'Erro ao autenticar.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      if (mode === 'register') {
        await registerAccount(name, email, password);
      } else {
        await loginWithPassword(email, password);
      }
      onAuthenticated?.();
    } catch (err) {
      setErrorMsg(cleanConvexError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-canvas text-fg overflow-y-auto">
      {/* Coluna informativa */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-line bg-surface-2">
        <div className="flex items-center gap-2.5">
          <CodexMark />
          <span className="text-[15px] font-semibold text-fg">Codex</span>
        </div>

        <div className="max-w-md space-y-3">
          <h1 className="text-2xl font-semibold text-fg leading-snug">
            Gerencie suas campanhas de RPG em um só lugar.
          </h1>
          <p className="text-sm text-fg-muted leading-relaxed">
            Códice do mundo, mapas, cronologia, frentes de ameaça e fichas de personagem,
            compartilhados entre Mestre e jogadores.
          </p>
        </div>

        <p className="text-xs text-fg-subtle">Codex · Gerenciador de campanhas</p>
      </div>

      {/* Coluna de autenticação */}
      <div className="flex flex-col justify-center items-center px-4 py-10 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <CodexMark />
            <span className="text-[15px] font-semibold text-fg">Codex</span>
          </div>

          <div className="mb-6">
            <h2 className="page-title">
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {mode === 'login'
                ? 'Use seu e-mail e senha para continuar.'
                : 'Uma conta serve para conduzir campanhas como Mestre e para jogar nas de outras pessoas.'}
            </p>
          </div>

          <div className="card p-6 space-y-5">
            <div className="segmented w-full grid grid-cols-2" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`segmented-item ${mode === 'login' ? 'segmented-item-active' : ''}`}
              >
                Entrar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className={`segmented-item ${
                  mode === 'register' ? 'segmented-item-active' : ''
                }`}
              >
                Criar conta
              </button>
            </div>

            {pendingInviteCode && (
              <div className="p-3 rounded-md bg-info-soft text-info flex items-start gap-2.5 text-[13px]">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Convite <strong className="font-mono font-semibold">{pendingInviteCode}</strong>{' '}
                  será vinculado após o acesso.
                </span>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-md bg-danger-soft text-danger flex items-start gap-2 text-[13px]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label htmlFor="login-name" className="label">
                    Nome de exibição
                  </label>
                  <input
                    id="login-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como você quer ser chamado"
                    className="input"
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="label">
                  E-mail
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@exemplo.com"
                  className="input"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="label">
                  Senha
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                {mode === 'register' && <p className="hint">Mínimo de 6 caracteres.</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {isLoading
                    ? 'Entrando…'
                    : mode === 'login'
                    ? 'Entrar'
                    : 'Criar conta'}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
