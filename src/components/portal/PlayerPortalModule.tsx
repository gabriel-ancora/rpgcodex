import React from 'react';
import { useCampaignStore, PortalSubTab } from '../../store/useCampaignStore';
import { SecretsControlView } from './SecretsControlView';
import { QuestLogView } from './QuestLogView';
import { JournalInventoryView } from './JournalInventoryView';
import { Lock, ScrollText, BookMarked } from 'lucide-react';

export const PlayerPortalModule: React.FC = () => {
  const portalSubTab = useCampaignStore((s) => s.portalSubTab);
  const setPortalSubTab = useCampaignStore((s) => s.setPortalSubTab);
  const quests = useCampaignStore((s) => s.quests);
  const journal = useCampaignStore((s) => s.journal);

  const tabs: {
    id: PortalSubTab;
    label: string;
    count?: number;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'secrets', label: 'Visibilidade', icon: Lock },
    { id: 'quests', label: 'Missões', count: quests.length, icon: ScrollText },
    { id: 'journal', label: 'Diário e inventário', count: journal.length, icon: BookMarked },
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="tabs shrink-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = portalSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setPortalSubTab(t.id)}
              className={`tab ${active ? 'tab-active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className="text-xs tabular-nums text-fg-subtle">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0">
        {portalSubTab === 'secrets' && <SecretsControlView />}
        {portalSubTab === 'quests' && <QuestLogView />}
        {portalSubTab === 'journal' && <JournalInventoryView />}
      </div>
    </div>
  );
};
