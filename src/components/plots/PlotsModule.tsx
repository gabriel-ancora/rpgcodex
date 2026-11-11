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
    { id: 'fronts', label: 'Frentes & relógios', count: fronts.length, icon: Flame },
    { id: 'flowchart', label: 'Cenas & pistas', count: mysteryNodes.length, icon: GitBranch },
    { id: 'generators', label: 'Oráculo contextual', icon: Compass },
  ];

  return (
    <div className="space-y-3.5 h-full flex flex-col">
      <div className="flex items-center gap-1 border-b border-white/[0.06] shrink-0 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = plotSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setPlotSubTab(t.id)}
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
        {plotSubTab === 'fronts' && <ThreatFrontsView />}
        {plotSubTab === 'flowchart' && <MysteryFlowchartView />}
        {plotSubTab === 'generators' && <EmergencyGeneratorsView />}
      </div>
    </div>
  );
};
