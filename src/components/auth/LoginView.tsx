import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import {
  ArrowRight,
  AlertCircle,
  Loader2,
  KeyRound,
  Shield,
  Sword,
  LogOut,
  Lock,
} from 'lucide-react';

interface LoginViewProps {
  pendingInviteCode?: string | null;
  onAuthenticated?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  pendingInviteCode,
  onAuthenticated,
}) => {
  const currentUser = useCampaignStore((s) => s.currentUser);
  const sessionToken = useCampaignStore((s) => s.sessionToken);
  const sessionRoleLocked = useCampaignStore((s) => s.sessionRoleLocked);
  const registerAccount = useCampaignStore((s) => s.registerAccount);
  const loginWithPassword = useCampaignStore((s) => s.loginWithPassword);
  const confirmSessionRole = useCampaignStore((s) => s.confirmSessionRole);
  const logoutUser = useCampaignStore((s) => s.logoutUser);

  const [mode, setMode] = useState<'login' | 'register'>(
    pendingInviteCode ? 'register' : 'login'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectingRole, setSelectingRole] = useState<'dm' | 'player' | null>(null);

  const isAwaitingRoleChoice = Boolean(
    currentUser && sessionToken && !sessionRoleLocked
  );

  const cleanConvexError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    const uncaughtMatch = raw.match(/Uncaught Error:\s*([^\n]+)/i);
    if (uncaughtMatch?.[1]) return uncaughtMatch[1].trim();
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
    } catch (err) {
      setErrorMsg(cleanConvexError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChooseRole = async (role: 'dm' | 'player') => {
    setErrorMsg(null);
    setSelectingRole(role);
    try {
      await confirmSessionRole(role);
      await onAuthenticated?.();
    } catch (err) {
      setErrorMsg(cleanConvexError(err));
    } finally {
      setSelectingRole(null);
    }
  };

  return (
    <div className="flex-1 min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#0b0b0d] text-zinc-100 overflow-y-auto">
      {/* Left Editorial Column */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-12 xl:p-16 border-r border-white/[0.06] bg-[#0e0e11] bg-obsidian-grid">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-950 flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
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
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Obsidian Codex
          </span>
        </div>

        <div className="max-w-xl space-y-5">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Estúdio para Campanhas de Mesa
          </p>
          <h1 className="font-serif text-4xl xl:text-5xl font-normal text-zinc-100 leading-[1.12] tracking-tight">
            Notas interligadas, cartografia tática e{' '}
            <span className="italic text-zinc-300">crônicas em tempo real</span>{' '}
            para sua mesa.
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
            Organize entidades, segredos com névoa de guerra, relógios de ameaça
            e fichas D&D 5e em um ambiente contínuo para Mestres e Jogadores.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-zinc-500 font-mono">
          <span>D&D 5e SRD</span>
          <span>·</span>
          <span>Sincronização em Nuvem</span>
          <span>·</span>
          <span>Exportação Markdown</span>
        </div>
      </div>

      {/* Right Authentication Column */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center items-center p-6 sm:p-10">
        <div className="w-full max-w-[380px] space-y-6">
          {/* Mobile Brand Header */}
          <div className="flex lg:hidden items-center gap-2.5 mb-2">
            <div className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-950 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1.5L14 5V11L8 14.5L2 11V5L8 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              Obsidian Codex
            </span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
              {isAwaitingRoleChoice
                ? `Olá, ${currentUser?.name}`
                : mode === 'login'
                ? 'Acessar estúdio'
                : 'Criar sua conta'}
            </h2>
            <p className="text-xs text-zinc-400">
              {isAwaitingRoleChoice
                ? 'Escolha como deseja entrar nesta sessão. Não será possível trocar após entrar.'
                : mode === 'login'
                ? 'Entre com seu e-mail e senha para escolher seu papel na mesa.'
                : 'Crie sua conta e, após entrar, escolha se irá atuar como Mestre ou Jogador.'}
            </p>
          </div>

          {pendingInviteCode && (
            <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.1] flex items-center gap-2.5 text-xs text-zinc-200">
              <KeyRound className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>
                Convite <strong className="font-mono text-white">{pendingInviteCode}</strong>{' '}
                pronto para vínculo após entrar.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-start gap-2 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isAwaitingRoleChoice ? (
            <div className="space-y-3">
              <button
                type="button"
                disabled={selectingRole !== null}
                onClick={() => handleChooseRole('player')}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-start justify-between gap-3 disabled:opacity-50 ${
                  pendingInviteCode
                    ? 'bg-emerald-500/10 border-emerald-400/40 hover:border-emerald-300'
                    : 'bg-[#121216] border-white/[0.08] hover:border-white/[0.22] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center text-emerald-300 shrink-0">
                    <Sword className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">
                      Entrar como Jogador
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      Gerencie suas fichas D&D 5.5e, entre em mesas por convite e visualize apenas o que foi revelado.
                    </p>
                  </div>
                </div>
                {selectingRole === 'player' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-300 shrink-0 mt-1" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-zinc-500 shrink-0 mt-1" />
                )}
              </button>

              <button
                type="button"
                disabled={selectingRole !== null}
                onClick={() => handleChooseRole('dm')}
                className="w-full p-4 rounded-xl border border-white/[0.08] bg-[#121216] hover:border-white/[0.22] hover:bg-white/[0.04] text-left transition-all flex items-start justify-between gap-3 disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-400/25 flex items-center justify-center text-amber-300 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">
                      Entrar como Mestre
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      Crie e gerencie suas próprias campanhas, segredos, mapas táticos, combate e sessões ao vivo.
                    </p>
                  </div>
                </div>
                {selectingRole === 'dm' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-300 shrink-0 mt-1" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-zinc-500 shrink-0 mt-1" />
                )}
              </button>

              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center gap-2 text-[11px] text-zinc-400">
                <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>
                  A escolha trava o modo até o fim da sessão. Para usar o outro modo, encerre a sessão e faça login novamente.
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  logoutUser();
                }}
                className="w-full py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair e usar outra conta</span>
              </button>
            </div>
          ) : (
            <>
              {/* Segmented Switcher */}
              <div className="grid grid-cols-2 p-1 rounded-lg bg-[#141418] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                    mode === 'login'
                      ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                  }}
                  className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                    mode === 'register'
                      ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Criar conta
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-300">
                      Nome de exibição
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome ou apelido na mesa"
                      className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@exemplo.com"
                    className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Senha {mode === 'register' && <span className="text-zinc-500">(mín. 6 caracteres)</span>}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-solid w-full py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Continuar' : 'Criar conta e escolher modo'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
