import React from 'react';
import { X } from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';

/**
 * Aviso temporário. Erros ficam mais tempo na tela e usam a cor de perigo;
 * clicar no aviso (ou no X) o dispensa. A fila e o tempo de exibição são da store.
 */
export const Toaster: React.FC = () => {
  const toast = useCampaignStore((s) => s.toast);
  const dismissToast = useCampaignStore((s) => s.dismissToast);

  if (!toast) return null;
  const isError = toast.variant === 'error';

  return (
    <div
      key={toast.id}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      onClick={dismissToast}
      className={`fixed bottom-5 right-5 left-5 sm:left-auto z-[60] sm:max-w-sm pl-4 pr-2 py-2.5 rounded-lg text-sm shadow-elevated cursor-pointer flex items-start gap-2 ${
        isError ? 'bg-danger text-white' : 'bg-fg text-canvas'
      }`}
    >
      <span className="flex-1 min-w-0 break-words py-0.5">{toast.message}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismissToast();
        }}
        className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-white/10"
        aria-label="Dispensar aviso"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
