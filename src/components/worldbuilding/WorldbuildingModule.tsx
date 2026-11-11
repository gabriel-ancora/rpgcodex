import React from 'react';
import { useCampaignStore, WorldSubTab } from '../../store/useCampaignStore';
import { EntityWikiView } from './EntityWikiView';
import { RelationshipGraphView } from './RelationshipGraphView';
import { InteractiveMapsView } from './InteractiveMapsView';
import { TimelineCalendarView } from './TimelineCalendarView';
import { BookOpen, Network, Map, Calendar } from 'lucide-react';

export const WorldbuildingModule: React.FC = () => {
  const worldSubTab = useCampaignStore((s) => s.worldSubTab);
  const setWorldSubTab = useCampaignStore((s) => s.setWorldSubTab);
  const entities = useCampaignStore((s) => s.entities);
  const relationships = useCampaignStore((s) => s.relationships);
  const maps = useCampaignStore((s) => s.maps);
  const timeline = useCampaignStore((s) => s.timeline);

  const tabs: {
    id: WorldSubTab;
    label: string;
    count: number;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'wiki', label: 'Códice & Wiki', count: entities.length, icon: BookOpen },
    { id: 'graph', label: 'Grafo de relações', count: relationships.length, icon: Network },
    { id: 'maps', label: 'Cartografia', count: maps.length, icon: Map },
    { id: 'timeline', label: 'Cronologia & calendário', count: timeline.length, icon: Calendar },
  ];

  return (
    <div className="space-y-3.5 h-full flex flex-col">
      {/* Clean Underline Tab Bar */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] shrink-0 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = worldSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setWorldSubTab(t.id)}
              className={`relative inline-flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors shrink-0 ${
                active
                  ? 'text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5 opacity-80" />
              <span>{t.label}</span>
              <span className="text-[11px] font-mono text-zinc-500">
                {t.count}
              </span>
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-zinc-100 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-view content */}
      <div className="flex-1 min-h-0">
        {worldSubTab === 'wiki' && <EntityWikiView />}
        {worldSubTab === 'graph' && <RelationshipGraphView />}
        {worldSubTab === 'maps' && <InteractiveMapsView />}
        {worldSubTab === 'timeline' && <TimelineCalendarView />}
      </div>
    </div>
  );
};
