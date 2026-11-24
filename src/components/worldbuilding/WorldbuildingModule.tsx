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
    { id: 'wiki', label: 'Códice', count: entities.length, icon: BookOpen },
    { id: 'graph', label: 'Relações', count: relationships.length, icon: Network },
    { id: 'maps', label: 'Mapas', count: maps.length, icon: Map },
    { id: 'timeline', label: 'Cronologia', count: timeline.length, icon: Calendar },
  ];

  return (
    <div className="gap-4 h-full flex flex-col">
      <div className="tabs shrink-0" role="tablist" aria-label="Mundo">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = worldSubTab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setWorldSubTab(t.id)}
              className={`tab shrink-0 ${active ? 'tab-active' : ''}`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-fg' : 'text-fg-subtle'}`} />
              <span>{t.label}</span>
              <span className="text-xs tabular-nums text-fg-subtle">{t.count}</span>
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
