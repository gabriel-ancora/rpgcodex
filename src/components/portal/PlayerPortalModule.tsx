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
    { id: 'secrets', label: 'Segredos & névoa', icon: Lock },
    { id: 'quests', label: 'Missões', count: quests.length, icon: ScrollText },
    { id: 'journal', label: 'Crônicas & espólio', count: journal.length, icon: BookMarked },
  ];

  return (
    <div className="space-y-3.5 h-full flex flex-col">
      <div className="flex items-center gap-1 border-b border-white/[0.06] shrink-0 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = portalSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setPortalSubTab(t.id)}
              className={`relative inline-flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors shrink-0 ${
                active ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5 opacity-80" />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className="text-[11px] font-mono text-zinc-500">
                  {t.count}
                </span>
              )}
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-zinc-100 rounded-full" />
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
