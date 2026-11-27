import React, { useEffect, useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import type { BuildStep } from '../../rules/engine';
import { CharacterBuilder } from './CharacterBuilder';
import { CharacterSheetView } from './CharacterSheetView';

interface CharacterSheetModalProps {
  /** null = criar personagem novo */
  sheetId: string | null;
  defaultCampaignId?: string;
  initialEditStep?: BuildStep;
  isOpen: boolean;
  onClose: () => void;
  /** mantido por compatibilidade; a permissão é calculada pela campanha */
  isDmContext?: boolean;
}

/**
 * Ponto de entrada da ficha: abre o criador (personagem novo ou edição)
 * ou a ficha em modo de jogo.
 */
export const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({
  sheetId,
  defaultCampaignId,
  initialEditStep,
  isOpen,
  onClose,
}) => {
  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const currentUser = useCampaignStore((s) => s.currentUser);
  const [currentId, setCurrentId] = useState<string | null>(sheetId);
  const [editing, setEditing] = useState<{ step: BuildStep } | null>(
    initialEditStep ? { step: initialEditStep } : null
  );

  useEffect(() => {
    if (isOpen) {
      setCurrentId(sheetId);
      setEditing(initialEditStep ? { step: initialEditStep } : null);
    }
  }, [isOpen, sheetId, initialEditStep]);

  if (!isOpen) return null;

  const sheet = currentId ? characterSheets.find((s) => s.id === currentId) : undefined;

  // Criação de personagem novo
  if (!currentId) {
    return <CharacterBuilder defaultCampaignId={defaultCampaignId} onClose={onClose} />;
  }

  if (!sheet) {
    return (
      <div className="modal-backdrop">
        <div className="modal max-w-sm p-6 space-y-3">
          <p className="text-sm text-fg">Esta ficha não está mais disponível.</p>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const camp = campaigns.find((c) => c.id === sheet.campaignId);
  const canEdit = sheet.playerId === currentUser?.id || camp?.isDm === true;

  if (editing) {
    return (
      <CharacterBuilder
        sheet={sheet}
        initialStep={editing.step}
        onClose={() => setEditing(null)}
        onSaved={(id) => setCurrentId(id)}
      />
    );
  }

  return (
    <CharacterSheetView
      sheet={sheet}
      canEdit={canEdit}
      onClose={onClose}
      onEdit={(step) => setEditing({ step: step || 'class' })}
    />
  );
};
