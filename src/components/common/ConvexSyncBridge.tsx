import React, { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  useCampaignStore,
  DEFAULT_CALENDAR,
  DEFAULT_PARTY_RESOURCES,
  reconcileCampaignList,
  selectIsCampaignDm,
} from '../../store/useCampaignStore';
import { draftKey, flushPendingWrites, getPendingPatch, isPendingCreation, isTempId } from '../../store/mutations';
import {
  CampaignSummary,
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
  PartyResources,
  GraphNodePosition,
} from '../../types/campaign';

/**
 * ConvexSyncBridge
 *
 * Assina as queries reativas do Convex da campanha ativa e copia os resultados para a store.
 * O servidor é a fonte da verdade, com duas exceções protegidas aqui:
 *  1. Criações pendentes: itens otimistas com id temporário continuam visíveis até o servidor
 *     devolver o id definitivo (e a seleção que aponta para eles não é trocada).
 *  2. Rascunhos: campos que o usuário está digitando (patches agendados/em voo de `mutations.ts`)
 *     são reaplicados por cima do snapshot, para que o texto não "volte" no meio da digitação.
 */

/** Ids virtuais de seleção (ex.: "__context_window__") nunca são trocados pela bridge. */
const isVirtualId = (id: string) => id.startsWith('__');

/** Mantém, ao fim da lista do servidor, os itens otimistas cuja criação ainda está pendente. */
function keepPending<T extends { id: string }>(server: T[], local: T[]): T[] {
  const pending = local.filter((x) => isTempId(x.id) && isPendingCreation(x.id));
  if (pending.length === 0) return server;
  const known = new Set(server.map((s) => s.id));
  return [...server, ...pending.filter((p) => !known.has(p.id))];
}

/** Reaplica por cima de `item` o rascunho registrado para `key`, se houver. */
function withDraft<T extends object>(item: T, key: string): T {
  const draft = getPendingPatch(key);
  return draft ? ({ ...item, ...draft } as T) : item;
}

const selectionStillValid = (selected: string, ids: string[]) =>
  selected !== '' && (ids.includes(selected) || isVirtualId(selected) || isPendingCreation(selected));

export const ConvexSyncBridge: React.FC = () => {
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const previewAsPlayer = useCampaignStore((s) => s.previewAsPlayer);
  const isCampaignDm = useCampaignStore(selectIsCampaignDm);
  const sessionToken = useCampaignStore((s) => s.sessionToken);

  const hasSession = Boolean(sessionToken);
  const hasActiveCampaign = Boolean(sessionToken && activeCampaignId);
  // O papel enviado ao servidor: o Mestre pode pedir a visão de jogador; jogadores nunca recebem a do Mestre.
  const viewerRole: 'gm' | 'player' = isCampaignDm && !previewAsPlayer ? 'gm' : 'player';

  const tenantArgs = hasActiveCampaign
    ? { campaignId: activeCampaignId, viewerRole, sessionToken: sessionToken! }
    : 'skip';
  const campaignOnlyArgs = hasActiveCampaign
    ? { campaignId: activeCampaignId, sessionToken: sessionToken! }
    : 'skip';

  const meData = useQuery(api.auth.me, sessionToken ? { sessionToken } : 'skip');
  const campaignsData = useQuery(api.campaign.list, hasSession ? { sessionToken: sessionToken! } : 'skip');
  const sheetsData = useQuery(
    api.characters.list,
    hasSession ? { sessionToken: sessionToken || undefined, campaignId: activeCampaignId || undefined } : 'skip'
  );

  const entitiesData = useQuery(api.entities.list, tenantArgs);
  const relsData = useQuery(api.relationships.list, tenantArgs);
  const mapsData = useQuery(api.maps.list, tenantArgs);
  const calendarData = useQuery(api.calendar.get, campaignOnlyArgs);
  const eventsData = useQuery(api.calendar.listEvents, tenantArgs);
  const frontsData = useQuery(api.plots.listFronts, tenantArgs);
  const scenesData = useQuery(api.plots.listScenes, tenantArgs);
  const combatantsData = useQuery(api.session.listCombatants, tenantArgs);
  const combatStateData = useQuery(api.session.getCombatState, tenantArgs);
  const diceRollsData = useQuery(api.session.listDiceRolls, campaignOnlyArgs);
  const scratchpadData = useQuery(api.session.listScratchpad, tenantArgs);
  const questsData = useQuery(api.portal.listQuests, tenantArgs);
  const journalData = useQuery(api.portal.listJournal, tenantArgs);
  const personalNotesData = useQuery(api.portal.listPersonalNotes, tenantArgs);
  const resourcesData = useQuery(api.portal.getResources, campaignOnlyArgs);

  // Grava rascunhos ao ocultar/fechar a página, para que nada digitado se perca.
  useEffect(() => {
    const flush = () => void flushPendingWrites();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Sessão: token expirado/inválido encerra tudo (inclusive o escopo da campanha).
  useEffect(() => {
    if (!sessionToken || meData === undefined) return;
    if (meData === null) {
      useCampaignStore.getState().expireSession();
      return;
    }
    const cur = useCampaignStore.getState().currentUser;
    if (
      !cur ||
      cur.id !== meData.id ||
      cur.name !== meData.name ||
      cur.email !== meData.email ||
      cur.avatarUrl !== meData.avatarUrl
    ) {
      useCampaignStore.setState({
        currentUser: { id: meData.id, name: meData.name, email: meData.email, avatarUrl: meData.avatarUrl },
      });
    }
  }, [meData, sessionToken]);

  // Lista de campanhas (autoritativa; o papel em cada uma vem de `isDm`).
  useEffect(() => {
    if (campaignsData === undefined) return;
    const st = useCampaignStore.getState();
    const list = reconcileCampaignList(campaignsData as CampaignSummary[], st.campaigns);
    useCampaignStore.setState({ campaigns: list, campaignsLoaded: true });

    // A campanha ativa deixou de existir/participar (excluída, removida pelo Mestre): sai dela.
    if (st.activeCampaignId && !list.some((c) => c.id === st.activeCampaignId)) {
      const wasInCampaign = st.currentRoute === '/campaign/session' || st.currentRoute === '/campaign/player-view';
      useCampaignStore.getState().setActiveCampaign('');
      if (wasInCampaign) {
        useCampaignStore.getState().setCurrentRoute('/campaigns');
        useCampaignStore.getState().showToast('Esta campanha não está mais disponível.', 'error');
      }
    }
  }, [campaignsData]);

  // Fichas D&D 5e
  useEffect(() => {
    if (sheetsData === undefined) return;
    useCampaignStore.setState((state) => {
      const sheets = keepPending(sheetsData as CharacterSheet[], state.characterSheets);
      const activeExists = sheets.some((s) => s.id === state.activeCharacterId);
      const inspectExists = sheets.some((s) => s.id === state.inspectingCharacterId);
      return {
        characterSheets: sheets,
        activeCharacterId: activeExists || isPendingCreation(state.activeCharacterId) ? state.activeCharacterId : sheets[0]?.id || '',
        inspectingCharacterId:
          inspectExists || isPendingCreation(state.inspectingCharacterId) ? state.inspectingCharacterId : sheets[0]?.id || null,
      };
    });
  }, [sheetsData]);

  // Códice
  useEffect(() => {
    if (entitiesData === undefined) return;
    useCampaignStore.setState((state) => {
      const server = (entitiesData as Entity[]).map((e) => {
        const withText = withDraft(e, draftKey.entity(e.id));
        return {
          ...withText,
          attributes: withText.attributes.map((a) => withDraft(a, draftKey.attribute(a.id))),
        };
      });
      const entities = keepPending(server, state.entities);
      const ids = entities.map((e) => e.id);
      return {
        entities,
        // Só troca a seleção quando o item realmente deixou de existir (nunca durante uma criação pendente).
        selectedEntityId: selectionStillValid(state.selectedEntityId, ids)
          ? state.selectedEntityId
          : entities[0]?.id || '',
      };
    });
  }, [entitiesData]);

  // Grafo
  useEffect(() => {
    if (relsData === undefined) return;
    useCampaignStore.setState((state) => {
      const withPos = <T extends { x: number; y: number }>(item: T, id: string): T => withDraft(item, draftKey.graphNode(id));
      const positions = (relsData.positions as GraphNodePosition[]).map((p) => withPos(p, p.entityId));
      const pendingPositions = state.graphPositions.filter(
        (p) => isTempId(p.entityId) && isPendingCreation(p.entityId) && !positions.some((x) => x.entityId === p.entityId)
      );
      const manual = ((relsData.manualNodes || []) as ManualGraphNode[]).map((n) => withPos(n, n.id));
      return {
        relationships: keepPending(relsData.relationships as RelationshipEdge[], state.relationships),
        graphPositions: [...positions, ...pendingPositions],
        manualGraphNodes: keepPending(manual, state.manualGraphNodes),
      };
    });
  }, [relsData]);

  // Mapas
  useEffect(() => {
    if (mapsData === undefined) return;
    useCampaignStore.setState((state) => {
      const localById = new Map(state.maps.map((m) => [m.id, m]));
      const server = (mapsData as CampaignMap[]).map((m) => {
        const local = localById.get(m.id);
        return local ? { ...m, pins: keepPending(m.pins, local.pins) } : m;
      });
      const maps = keepPending(server, state.maps);
      return {
        maps,
        selectedMapId: selectionStillValid(
          state.selectedMapId,
          maps.map((m) => m.id)
        )
          ? state.selectedMapId
          : maps[0]?.id || '',
      };
    });
  }, [mapsData]);

  // Calendário
  useEffect(() => {
    if (calendarData === undefined) return;
    const campaignId = useCampaignStore.getState().activeCampaignId;
    if (calendarData === null) {
      useCampaignStore.setState({ calendar: DEFAULT_CALENDAR });
      return;
    }
    useCampaignStore.setState((state) => {
      const base = {
        ...state.calendar,
        calendarName: calendarData.calendarName,
        epochName: calendarData.epochName,
        currentYear: calendarData.currentYear,
        currentMonthIndex: calendarData.currentMonthIndex,
        currentDay: calendarData.currentDay,
        weekdays: calendarData.weekdays,
        months: calendarData.months,
        moons: calendarData.moons,
        availableEras: calendarData.availableEras ?? state.calendar.availableEras,
      };
      return { calendar: withDraft(base, draftKey.calendar(campaignId)) };
    });
  }, [calendarData]);

  // Cronologia
  useEffect(() => {
    if (eventsData === undefined) return;
    useCampaignStore.setState((state) => ({
      timeline: keepPending(
        (eventsData as TimelineEvent[]).map((ev) => withDraft(ev, draftKey.timeline(ev.id))),
        state.timeline
      ),
    }));
  }, [eventsData]);

  // Frentes
  useEffect(() => {
    if (frontsData === undefined) return;
    useCampaignStore.setState((state) => ({ fronts: keepPending(frontsData as ThreatFront[], state.fronts) }));
  }, [frontsData]);

  // Cenas e pistas
  useEffect(() => {
    if (scenesData === undefined) return;
    useCampaignStore.setState((state) => ({
      mysteryNodes: keepPending(
        (scenesData as MysterySceneNode[]).map((n) => withDraft(n, draftKey.scene(n.id))),
        state.mysteryNodes
      ),
    }));
  }, [scenesData]);

  // Combate: lista e turno (índice/id relativos ao que este usuário enxerga)
  useEffect(() => {
    if (combatantsData === undefined) return;
    useCampaignStore.setState((state) => ({
      combatants: keepPending(combatantsData as Combatant[], state.combatants),
    }));
  }, [combatantsData]);

  useEffect(() => {
    if (!combatStateData) return;
    useCampaignStore.setState({
      activeCombatTurnIndex: combatStateData.activeCombatTurnIndex,
      activeCombatantId: combatStateData.activeCombatantId,
      combatRound: combatStateData.combatRound,
    });
  }, [combatStateData]);

  // Dados (as rolagens são do servidor; timestamps em ISO)
  useEffect(() => {
    if (diceRollsData === undefined) return;
    useCampaignStore.setState({ diceLogs: diceRollsData as DiceRollLog[] });
  }, [diceRollsData]);

  // Bloco de notas (o servidor devolve vazio para quem não é Mestre)
  useEffect(() => {
    if (scratchpadData === undefined) return;
    useCampaignStore.setState((state) => ({
      scratchpad: keepPending(
        scratchpadData.map((s) => ({
          id: s.id,
          text: s.text,
          timestamp: s.timestamp,
          convertedEntityHandle: s.convertedEntityHandle,
        })),
        state.scratchpad
      ),
    }));
  }, [scratchpadData]);

  // Missões
  useEffect(() => {
    if (questsData === undefined) return;
    useCampaignStore.setState((state) => ({ quests: keepPending(questsData as Quest[], state.quests) }));
  }, [questsData]);

  // Diário coletivo (`canEdit` vem do servidor)
  useEffect(() => {
    if (journalData === undefined) return;
    useCampaignStore.setState((state) => ({
      journal: keepPending(
        (journalData as SessionJournalEntry[]).map((j) => withDraft(j, draftKey.journal(j.id))),
        state.journal
      ),
    }));
  }, [journalData]);

  // Diário pessoal (`isOwn` vem do servidor)
  useEffect(() => {
    if (personalNotesData === undefined) return;
    useCampaignStore.setState((state) => ({
      personalJournalNotes: keepPending(
        (personalNotesData as PersonalJournalNote[]).map((n) => withDraft(n, draftKey.personalNote(n.id))),
        state.personalJournalNotes
      ),
    }));
  }, [personalNotesData]);

  // Recursos do grupo e base
  useEffect(() => {
    if (resourcesData === undefined) return;
    if (resourcesData === null) {
      useCampaignStore.setState({ partyResources: DEFAULT_PARTY_RESOURCES });
      return;
    }
    const campaignId = useCampaignStore.getState().activeCampaignId;
    useCampaignStore.setState((state) => {
      const stronghold = withDraft(
        resourcesData.stronghold as PartyResources['stronghold'],
        draftKey.stronghold(campaignId)
      );
      return {
        partyResources: {
          gold: resourcesData.gold,
          silver: resourcesData.silver,
          copper: resourcesData.copper,
          rations: resourcesData.rations,
          torches: resourcesData.torches,
          healerKits: resourcesData.healerKits,
          items: keepPending(resourcesData.items as PartyResources['items'], state.partyResources.items),
          stronghold: {
            ...stronghold,
            upgrades: keepPending(stronghold.upgrades, state.partyResources.stronghold.upgrades),
          },
        },
      };
    });
  }, [resourcesData]);

  return null;
};
