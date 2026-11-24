import React from 'react';
import { useCampaignStore, PlotSubTab } from '../../store/useCampaignStore';
import { ThreatFrontsView } from './ThreatFrontsView';
import { MysteryFlowchartView } from './MysteryFlowchartView';
import { EmergencyGeneratorsView } from './EmergencyGeneratorsView';
import { Flame, GitBranch, Compass } from 'lucide-react';

export const PlotsModule: React.FC = () => {
  const plotSubTab = useCampaignStore((s) => s.plotSubTab);
  const setPlotSubTab = useCampaignStore((s) => s.setPlotSubTab);
  const fronts = useCampaignStore((s) => s.fronts);
  const mysteryNodes = useCampaignStore((s) => s.mysteryNodes);

  const tabs: {
    id: PlotSubTab;
    label: string;
    count?: number;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'fronts', label: 'Frentes e relógios', count: fronts.length, icon: Flame },
    { id: 'flowchart', label: 'Cenas e pistas', count: mysteryNodes.length, icon: GitBranch },
    { id: 'generators', label: 'Oráculo', icon: Compass },
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="tabs shrink-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = plotSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setPlotSubTab(t.id)}
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
        {plotSubTab === 'fronts' && <ThreatFrontsView />}
        {plotSubTab === 'flowchart' && <MysteryFlowchartView />}
        {plotSubTab === 'generators' && <EmergencyGeneratorsView />}
      </div>
    </div>
  );
};
