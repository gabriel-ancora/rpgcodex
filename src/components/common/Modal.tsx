import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Componentes de diálogo compartilhados.
 * - <Modal>: Esc fecha, foco preso dentro do diálogo, foco devolvido ao fechar,
 *   role="dialog" + aria-modal, rolagem do corpo bloqueada.
 * - useConfirm(): confirmação assíncrona padronizada para ações destrutivas.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogBehavior(open: boolean, onClose: () => void, ref: React.RefObject<HTMLElement>) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') || node?.querySelector<HTMLElement>(FOCUSABLE);
    (first || node)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Só o diálogo mais recente (topo da pilha) reage.
        const dialogs = document.querySelectorAll('[data-dialog-root]');
        if (dialogs[dialogs.length - 1] !== node) return;
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, ref]);
}

const SIZE: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl h-full sm:h-[92vh]',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof SIZE;
  /** fechar ao clicar fora (padrão: true). Desative em formulários longos. */
  dismissOnBackdrop?: boolean;
  /** sem padding no corpo (para layouts próprios) */
  bare?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissOnBackdrop = true,
  bare = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useDialogBehavior(open, onClose, ref);
  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop p-0 sm:p-4"
      onMouseDown={(e) => {
        if (dismissOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        data-dialog-root
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`modal ${SIZE[size]} max-h-full sm:max-h-[92vh] rounded-none sm:rounded-xl focus:outline-none`}
      >
        <header className="px-5 py-4 border-b border-line flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[15px] font-semibold text-fg">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-[13px] text-fg-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon -mr-1.5 -mt-1" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className={`flex-1 min-h-0 overflow-y-auto ${bare ? '' : 'px-5 py-4'}`}>{children}</div>
        {footer && (
          <footer className="px-5 py-3 border-t border-line flex flex-wrap items-center justify-end gap-2 shrink-0">{footer}</footer>
        )}
      </div>
    </div>,
    document.body
  );
};

// ---------------------------------------------------------------------------
// Confirmação
// ---------------------------------------------------------------------------

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** estilo destrutivo (botão vermelho) — padrão: true */
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise<boolean>((resolve) => setState({ ...opts, resolve })),
    []
  );

  const close = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(state)}
        onClose={() => close(false)}
        title={state?.title || ''}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => close(false)}>
              {state?.cancelLabel || 'Cancelar'}
            </button>
            <button
              type="button"
              data-autofocus
              className={`btn ${state?.danger === false ? 'btn-primary' : 'btn-danger'}`}
              onClick={() => close(true)}
            >
              {state?.confirmLabel || 'Excluir'}
            </button>
          </>
        }
      >
        {state?.message && <div className="text-sm text-fg-muted leading-relaxed">{state.message}</div>}
      </Modal>
    </ConfirmContext.Provider>
  );
};

/** Retorna uma função assíncrona: `if (await confirm({...})) apagar()` */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback seguro caso o provider não esteja montado.
    return async (opts) => window.confirm(opts.title);
  }
  return ctx;
}
