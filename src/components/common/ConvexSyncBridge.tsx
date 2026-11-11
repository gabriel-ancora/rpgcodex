import React, { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  useCampaignStore,
  DEFAULT_CALENDAR,
  DEFAULT_PARTY_RESOURCES,
} from '../../store/useCampaignStore';
import {
  Entity,
  RelationshipEdge,
  ManualGraphNode,
  CampaignMap,
  ThreatFront,
  MysterySceneNode,
  Quest,
  SessionJournalEntry,
  CharacterSheet,
  DiceRollLog,
  PersonalJournalNote,
  TimelineEvent,
  Combatant,
} from '../../types/campaign';

/**
 * ConvexSyncBridge
 * Escuta todas as queries reativas do Convex com isolamento Multi-Tenancy (campaignId)
 * e Névoa de Guerra no servidor (viewerRole + sessionToken), sincronizando fichas 5e,
 * combate, dados em tempo real, mapas, tramas e diários entre múltiplos navegadores.
 */
export const ConvexSyncBridge: React.FC = () => {
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const workspaceMode = useCampaignStore((s) => s.workspaceMode);
  const currentRoute = useCampaignStore((s) => s.currentRoute);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const sessionToken = useCampaignStore((s) => s.sessionToken);
  const currentUser = useCampaignStore((s) => s.currentUser);

  const hasSession = Boolean(sessionToken);
  const hasActiveCampaign = Boolean(sessionToken && activeCampaignId);
  const activeCamp = campaigns.find((c) => c.id === activeCampaignId);
  const serverViewerRole = activeCamp?.isDm === false ? 'player' : viewRole;

  const tenantArgs = hasActiveCampaign
    ? {
        campaignId: activeCampaignId,
        viewerRole: serverViewerRole,
        sessionToken: sessionToken || undefined,
      }
    : 'skip';

  const campaignOnlyArgs = hasActiveCampaign
    ? {
        campaignId: activeCampaignId,
      }
    : 'skip';

  // Validação reativa de sessão autenticada
  const meData = useQuery(
    api.auth.me,
    sessionToken ? { sessionToken } : 'skip'
  );

  // Lista de campanhas do usuário autenticado
  const campaignsData = useQuery(
    api.campaign.list,
    hasSession ? { sessionToken: sessionToken || undefined } : 'skip'
  );

  // Fichas D&D 5e (do usuário logado ou da campanha ativa)
  const shouldIncludeOwnSheets =
    workspaceMode === 'player' ||
    currentRoute === '/player-dashboard' ||
    !activeCampaignId;

  const sheetsData = useQuery(
    api.characters.list,
    hasSession && (shouldIncludeOwnSheets || Boolean(activeCampaignId))
      ? {
          campaignId: activeCampaignId || undefined,
          playerId: currentUser?.id,
          includeAllPlayerSheets: shouldIncludeOwnSheets,
        }
      : 'skip'
  );

  const entitiesData = useQuery(api.entities.list, tenantArgs);
  const relsData = useQuery(api.relationships.list, tenantArgs);
  const mapsData = useQuery(api.maps.list, tenantArgs);
  const calendarData = useQuery(api.calendar.get, campaignOnlyArgs);
  const eventsData = useQuery(api.calendar.listEvents, tenantArgs);
  const frontsData = useQuery(api.plots.listFronts, tenantArgs);
  const scenesData = useQuery(api.plots.listScenes, tenantArgs);
  const combatantsData = useQuery(api.session.listCombatants, tenantArgs);
  const combatStateData = useQuery(api.session.getCombatState, campaignOnlyArgs);
  const diceRollsData = useQuery(api.session.listDiceRolls, campaignOnlyArgs);
  const scratchpadData = useQuery(api.session.listScratchpad, tenantArgs);
  const questsData = useQuery(api.portal.listQuests, tenantArgs);
  const journalData = useQuery(api.portal.listJournal, tenantArgs);
  const personalNotesData = useQuery(
    api.portal.listPersonalNotes,
    hasActiveCampaign
      ? {
          campaignId: activeCampaignId,
          playerId: currentUser?.id,
          viewerRole: serverViewerRole,
          sessionToken: sessionToken || undefined,
        }
      : 'skip'
  );
  const resourcesData = useQuery(api.portal.getResources, campaignOnlyArgs);

  // Sincronização de autenticação / expiração de token
  useEffect(() => {
    if (!sessionToken || meData === undefined) return;
    if (meData === null) {
      useCampaignStore.setState({
        sessionToken: null,
        currentUser: null,
        currentRoute: '/login',
        campaigns: [],
        activeCampaignId: '',
        campaignName: '',
        characterSheets: [],
        activeCharacterId: '',
      });
    } else {
      useCampaignStore.setState({
        currentUser: {
          id: meData.id,
          name: meData.name,
          email: meData.email,
          role: meData.role,
          avatarUrl: meData.avatarUrl,
        },
      });
    }
  }, [meData, sessionToken]);

  // Lista de campanhas na nuvem (100% autoritativa)
  useEffect(() => {
    if (campaignsData === undefined) return;
    useCampaignStore.setState((state) => {
      if (campaignsData.length === 0) {
        return {
          campaigns: [],
          activeCampaignId: '',
          campaignName: '',
          entities: [],
          relationships: [],
          graphPositions: [],
          manualGraphNodes: [],
          maps: [],
          timeline: [],
          fronts: [],
          mysteryNodes: [],
          combatants: [],
          diceLogs: [],
          scratchpad: [],
          quests: [],
          journal: [],
          personalJournalNotes: [],
          calendar: DEFAULT_CALENDAR,
          partyResources: DEFAULT_PARTY_RESOURCES,
        };
      }

      const activeFound =
        campaignsData.find((c) => c.id === state.activeCampaignId) ||
        (state.workspaceMode === 'dm'
          ? campaignsData.find((c) => c.isDm) || campaignsData[0]
          : campaignsData[0]);

      const mustFallbackToPlayerView =
        state.currentRoute === '/campaign/session' && activeFound?.isDm === false;

      return {
        campaigns: campaignsData,
        activeCampaignId: activeFound.id,
        campaignName: activeFound.title,
        ...(mustFallbackToPlayerView
          ? { currentRoute: '/campaign/player-view', viewRole: 'player' as const }
          : {}),
      };
    });
  }, [campaignsData]);

  // Fichas D&D 5e sincronizadas em tempo real
  useEffect(() => {
    if (sheetsData === undefined) return;
    useCampaignStore.setState((state) => {
      const sheets = sheetsData as CharacterSheet[];
      const activeExists = sheets.some((s) => s.id === state.activeCharacterId);
      const inspectExists = sheets.some(
        (s) => s.id === state.inspectingCharacterId
      );
      return {
        characterSheets: sheets,
        activeCharacterId: activeExists
          ? state.activeCharacterId
          : sheets[0]?.id || '',
        inspectingCharacterId: inspectExists
          ? state.inspectingCharacterId
          : sheets[0]?.id || null,
      };
    });
  }, [sheetsData]);

  // Wiki Viva (Entidades + Névoa de Guerra)
  useEffect(() => {
    if (entitiesData === undefined) return;
    useCampaignStore.setState((state) => {
      const selectedExists = entitiesData.some(
        (e) => e.id === state.selectedEntityId
      );
      return {
        entities: entitiesData as Entity[],
        selectedEntityId: selectedExists
          ? state.selectedEntityId
          : entitiesData[0]?.id || '',
      };
    });
  }, [entitiesData]);

  // Grafo de Relacionamentos + Posições + Nós Manuais
  useEffect(() => {
    if (relsData === undefined) return;
    useCampaignStore.setState({
      relationships: relsData.relationships as RelationshipEdge[],
      graphPositions: relsData.positions,
      manualGraphNodes: (relsData.manualNodes || []) as ManualGraphNode[],
    });
  }, [relsData]);

  // Mapas Interativos + Shapes Vetoriais + URLs de Cloud Storage
  useEffect(() => {
    if (mapsData === undefined) return;
    useCampaignStore.setState((state) => {
      const cloudMaps = mapsData as CampaignMap[];
      const selectedExists = cloudMaps.some((m) => m.id === state.selectedMapId);
      return {
        maps: cloudMaps,
        selectedMapId: selectedExists
          ? state.selectedMapId
          : cloudMaps[0]?.id || '',
      };
    });
  }, [mapsData]);

  // Calendário Fantástico
  useEffect(() => {
    if (calendarData === undefined) return;
    if (calendarData === null) {
      useCampaignStore.setState({ calendar: DEFAULT_CALENDAR });
      return;
    }
    useCampaignStore.setState((state) => ({
      calendar: {
        ...state.calendar,
        calendarName: calendarData.calendarName,
        epochName: calendarData.epochName,
        currentYear: calendarData.currentYear,
        currentMonthIndex: calendarData.currentMonthIndex,
        currentDay: calendarData.currentDay,
        weekdays: calendarData.weekdays,
        months: calendarData.months,
        moons: calendarData.moons,
        availableEras:
          calendarData.availableEras ?? state.calendar.availableEras,
      },
    }));
  }, [calendarData]);

  // Linha do Tempo
  useEffect(() => {
    if (eventsData === undefined) return;
    useCampaignStore.setState({
      timeline: eventsData as TimelineEvent[],
    });
  }, [eventsData]);

  // Frentes de Ameaça
  useEffect(() => {
    if (frontsData === undefined) return;
    useCampaignStore.setState({
      fronts: frontsData as ThreatFront[],
    });
  }, [frontsData]);

  // Fluxograma de Cenas & Pistas
  useEffect(() => {
    if (scenesData === undefined) return;
    useCampaignStore.setState({
      mysteryNodes: scenesData as MysterySceneNode[],
    });
  }, [scenesData]);

  // Rastreador de Combate & Estado de Turno/Rodada
  useEffect(() => {
    if (combatantsData === undefined) return;
    useCampaignStore.setState({
      combatants: combatantsData as Combatant[],
    });
  }, [combatantsData]);

  useEffect(() => {
    if (!combatStateData) return;
    useCampaignStore.setState({
      activeCombatTurnIndex: combatStateData.activeCombatTurnIndex,
      combatRound: combatStateData.combatRound,
    });
  }, [combatStateData]);

  // Rolagens de Dados Multijogador em Tempo Real
  useEffect(() => {
    if (diceRollsData === undefined) return;
    useCampaignStore.setState({
      diceLogs: diceRollsData as DiceRollLog[],
    });
  }, [diceRollsData]);

  // Scratchpad (Oculto automaticamente para jogadores)
  useEffect(() => {
    if (viewRole === 'player') {
      useCampaignStore.setState({ scratchpad: [] });
      return;
    }
    if (scratchpadData === undefined) return;
    useCampaignStore.setState({
      scratchpad: scratchpadData.map((s) => ({
        id: s.id,
        text: s.text,
        timestamp: s.timestamp,
        convertedEntityHandle: s.convertedEntityHandle,
      })),
    });
  }, [scratchpadData, viewRole]);

  // Missões (Quests)
  useEffect(() => {
    if (questsData === undefined) return;
    useCampaignStore.setState({
      quests: questsData as Quest[],
    });
  }, [questsData]);

  // Diário Coletivo
  useEffect(() => {
    if (journalData === undefined) return;
    useCampaignStore.setState({
      journal: journalData as SessionJournalEntry[],
    });
  }, [journalData]);

  // Diário Pessoal dos Jogadores (com privacidade respeitada pelo servidor)
  useEffect(() => {
    if (personalNotesData === undefined) return;
    useCampaignStore.setState({
      personalJournalNotes: personalNotesData as PersonalJournalNote[],
    });
  }, [personalNotesData]);

  // Recursos Compartilhados & Base
  useEffect(() => {
    if (resourcesData === undefined) return;
    if (resourcesData === null) {
      useCampaignStore.setState({ partyResources: DEFAULT_PARTY_RESOURCES });
      return;
    }
    useCampaignStore.setState({
      partyResources: {
        gold: resourcesData.gold,
        silver: resourcesData.silver,
        copper: resourcesData.copper,
        rations: resourcesData.rations,
        torches: resourcesData.torches,
        healerKits: resourcesData.healerKits,
        items: resourcesData.items as PartyResourcesItem[],
        stronghold: resourcesData.stronghold as any,
      },
    });
  }, [resourcesData]);

  return null;
};

type PartyResourcesItem = import('../../types/campaign').PartyResources['items'][number];
