import React, { useMemo, useState } from 'react';
import {
  BookPlus,
  Check,
  Coins,
  CornerDownRight,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  MapPin as MapPinLucide,
  Plus,
  Save,
  Swords,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CampaignMap,
  Entity,
  MapLayer,
  MapPin,
  MapPinIcon,
} from '../../../types/campaign';
import { MentionText, MentionTextarea } from '../../common/MentionText';
import { LAYER_CONFIG, PIN_ICON_META } from './mapConstants';

// ============================================================================
// MEMOIZED PIN MARKER ON CANVAS
// ============================================================================

interface MapPinMarkerProps {
  pin: MapPin;
  displayX: number;
  displayY: number;
  isSelected: boolean;
  counterScale: number;
  linkedCount: number;
  hasSubMap: boolean;
  canDrag: boolean;
  viewRole: 'gm' | 'player';
  onSelect: (pinId: string) => void;
  onStartDrag: (e: React.PointerEvent<HTMLButtonElement>, pin: MapPin) => void;
}

export const MapPinMarker: React.FC<MapPinMarkerProps> = React.memo(
  ({
    pin,
    displayX,
    displayY,
    isSelected,
    counterScale,
    linkedCount,
    hasSubMap,
    canDrag,
    viewRole,
    onSelect,
    onStartDrag,
  }) => {
    const layerStyle = LAYER_CONFIG[pin.layer] || LAYER_CONFIG.locations;
    const iconMeta = PIN_ICON_META[pin.iconType] || PIN_ICON_META.castle;
    const IconComp = iconMeta.icon || MapPinLucide;
    const isHiddenFromPlayers = pin.isSecret && !pin.isRevealed;

    return (
      <button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect(pin.id);
          if (canDrag && e.button === 0) {
            onStartDrag(e, pin);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(pin.id);
        }}
        style={{
          left: `${displayX}%`,
          top: `${displayY}%`,
          transform: `translate(-50%, -50%) scale(${
            isSelected ? counterScale * 1.14 : counterScale
          })`,
        }}
        className={`absolute group ${
          isSelected ? 'z-30' : 'z-20 hover:z-30'
        } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${
          viewRole === 'gm' && isHiddenFromPlayers ? 'opacity-75' : ''
        }`}
      >
        <div className="relative mx-auto w-fit">
          <div
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mx-auto shadow-[0_2px_6px_rgba(0,0,0,0.5)] transition-transform ${
              isSelected
                ? 'bg-white border-[#18181b] ring-2 ring-accent'
                : 'bg-[#18181b] border-white'
            }`}
            style={{ color: layerStyle.color }}
          >
            <IconComp className="w-4 h-4" />
          </div>

          {(linkedCount > 0 || hasSubMap) && (
            <span
              title={`${linkedCount} vínculo(s) no códice${hasSubMap ? ' e submapa' : ''}`}
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#18181b] border border-[#18181b]/20 text-[11px] leading-none font-semibold flex items-center justify-center tabular-nums shadow"
            >
              {hasSubMap ? '↳' : linkedCount}
            </span>
          )}

          {viewRole === 'gm' && isHiddenFromPlayers && (
            <span
              title="Oculto dos jogadores"
              className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center shadow"
            >
              <EyeOff className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        <div
          className={`mt-1 px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.45)] ${
            isSelected
              ? 'bg-white text-[#18181b] font-semibold'
              : 'bg-[#18181b]/90 text-white'
          }`}
        >
          {pin.label}
        </div>
      </button>
    );
  }
);

// ============================================================================
// RIGHT-SIDE PIN INSPECTOR DRAWER
// ============================================================================

interface MapPinInspectorProps {
  activePin: MapPin;
  currentMap: CampaignMap;
  maps: CampaignMap[];
  entities: Entity[];
  entitiesMap: Map<string, Entity>;
  viewRole: 'gm' | 'player';
  onClose: () => void;
  onSelectMap: (mapId: string, firstPinId: string | null) => void;
  onOpenEntity: (entityId: string) => void;
  onUpdatePin: (mapId: string, pinId: string, updates: Partial<MapPin>) => void;
  onDeletePin: (mapId: string, pinId: string) => void;
  onToggleRevealPin: (mapId: string, pinId: string) => void;
  onCreateWikiFromPin: () => void;
  onAddMonsterToCombat: (monsterLabel: string, pinLabel: string) => void;
  onToast: (msg: string) => void;
}

export const MapPinInspector: React.FC<MapPinInspectorProps> = ({
  activePin,
  currentMap,
  maps,
  entities,
  entitiesMap,
  viewRole,
  onClose,
  onSelectMap,
  onOpenEntity,
  onUpdatePin,
  onDeletePin,
  onToggleRevealPin,
  onCreateWikiFromPin,
  onAddMonsterToCombat,
  onToast,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [wikiSearch, setWikiSearch] = useState('');
  const [draft, setDraft] = useState<{
    label: string;
    subtitle: string;
    layer: MapLayer;
    iconType: MapPinIcon;
    description: string;
    monsters: string;
    treasures: string;
    entityId: string;
    linkedMapId: string;
  } | null>(null);

  React.useEffect(() => {
    setIsEditing(false);
    setDraft(null);
    setWikiSearch('');
  }, [activePin.id, currentMap.id]);

  const startEdit = () => {
    setDraft({
      label: activePin.label,
      subtitle: activePin.subtitle,
      layer: activePin.layer,
      iconType: activePin.iconType,
      description: activePin.description,
      monsters: activePin.monsters.join(', '),
      treasures: activePin.treasures.join(', '),
      entityId: activePin.entityId || '',
      linkedMapId: activePin.linkedMapId || '',
    });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !draft.label.trim()) return;
    onUpdatePin(currentMap.id, activePin.id, {
      label: draft.label.trim(),
      subtitle: draft.subtitle.trim() || 'Local mapeado',
      layer: draft.layer,
      iconType: draft.iconType,
      description: draft.description.trim(),
      entityId: draft.entityId || undefined,
      linkedMapId: draft.linkedMapId || undefined,
      monsters: draft.monsters
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      treasures: draft.treasures
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setIsEditing(false);
    onToast('Marcador atualizado.');
  };

  const primaryEntity = activePin.entityId ? entitiesMap.get(activePin.entityId) : undefined;
  const secondaryEntities = useMemo(() => {
    if (!activePin.linkedEntityIds) return [];
    return activePin.linkedEntityIds
      .map((id) => entitiesMap.get(id))
      .filter((e): e is Entity => Boolean(e))
      .filter((e) => viewRole === 'gm' || e.isPublicToPlayers);
  }, [activePin.linkedEntityIds, entitiesMap, viewRole]);

  const linkedSubMap = useMemo(() => {
    if (!activePin.linkedMapId) return undefined;
    return maps.find((m) => m.id === activePin.linkedMapId);
  }, [activePin.linkedMapId, maps]);

  const filteredEntities = useMemo(() => {
    const q = wikiSearch.trim().toLowerCase();
    return entities
      .filter((e) => e.id !== activePin.entityId)
      .filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          e.handle.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [entities, activePin.entityId, wikiSearch]);

  const toggleSecondaryEntity = (entityId: string) => {
    const current = activePin.linkedEntityIds || [];
    const next = current.includes(entityId)
      ? current.filter((id) => id !== entityId)
      : [...current, entityId];
    onUpdatePin(currentMap.id, activePin.id, { linkedEntityIds: next });
  };

  return (
    <aside
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full md:w-80 lg:w-96 shrink-0 max-h-[55%] md:max-h-none bg-surface border-t md:border-t-0 md:border-l border-line flex flex-col overflow-y-auto z-30 shadow-elevated"
    >
      {isEditing && draft && viewRole === 'gm' ? (
        <form onSubmit={handleSave} className="flex flex-col min-h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="section-title">Editar marcador</span>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="btn btn-ghost btn-icon"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3.5 flex-1">
            <div>
              <label className="label">Nome</label>
              <input
                type="text"
                required
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Subtítulo</label>
              <input
                type="text"
                value={draft.subtitle}
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                className="input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Camada</label>
                <select
                  value={draft.layer}
                  onChange={(e) =>
                    setDraft({ ...draft, layer: e.target.value as MapLayer })
                  }
                  className="input"
                >
                  <option value="locations">Locais</option>
                  <option value="dangers">Perigos</option>
                  <option value="quests">Missões</option>
                  <option value="secrets">Segredos</option>
                </select>
              </div>
              <div>
                <label className="label">Ícone</label>
                <select
                  value={draft.iconType}
                  onChange={(e) =>
                    setDraft({ ...draft, iconType: e.target.value as MapPinIcon })
                  }
                  className="input"
                >
                  {(Object.keys(PIN_ICON_META) as MapPinIcon[]).map((k) => (
                    <option key={k} value={k}>
                      {PIN_ICON_META[k].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Página principal no Códice</label>
              <select
                value={draft.entityId}
                onChange={(e) => setDraft({ ...draft, entityId: e.target.value })}
                className="input"
              >
                <option value="">Nenhuma</option>
                {entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.mentionPrefix}
                    {ent.handle} — {ent.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Submapa vinculado</label>
              <select
                value={draft.linkedMapId}
                onChange={(e) => setDraft({ ...draft, linkedMapId: e.target.value })}
                className="input"
              >
                <option value="">Nenhum</option>
                {maps
                  .filter((m) => m.id !== currentMap.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.regionType})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="label">Descrição</label>
              <MentionTextarea
                value={draft.description}
                onChange={(val) => setDraft({ ...draft, description: val })}
                rows={4}
              />
            </div>

            <div>
              <label className="label">Ameaças (separadas por vírgula)</label>
              <input
                type="text"
                value={draft.monsters}
                onChange={(e) => setDraft({ ...draft, monsters: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Espólios (separados por vírgula)</label>
              <input
                type="text"
                value={draft.treasures}
                onChange={(e) => setDraft({ ...draft, treasures: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-2 px-4 py-3 border-t border-line bg-surface">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save className="w-4 h-4" />
              <span>Salvar</span>
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-line">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: LAYER_CONFIG[activePin.layer].color }}
                  />
                  {LAYER_CONFIG[activePin.layer].label}
                </span>
                <span className="font-mono text-fg-subtle tabular-nums">
                  {activePin.x.toFixed(1)}%, {activePin.y.toFixed(1)}%
                </span>
              </div>
              <h3 className="text-base font-semibold text-fg break-words">
                {activePin.label}
              </h3>
              <p className="text-[13px] text-fg-muted">{activePin.subtitle}</p>
            </div>

            <div className="flex items-center shrink-0">
              {viewRole === 'gm' && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="btn btn-ghost btn-icon"
                  title="Editar marcador"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost btn-icon"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-5 flex-1">
            {linkedSubMap && (
              <button
                type="button"
                onClick={() =>
                  onSelectMap(linkedSubMap.id, linkedSubMap.pins[0]?.id || null)
                }
                className="btn btn-secondary w-full justify-between"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <CornerDownRight className="w-4 h-4 text-fg-subtle shrink-0" />
                  <span className="truncate">Abrir submapa: {linkedSubMap.name}</span>
                </span>
                <ExternalLink className="w-4 h-4 text-fg-subtle shrink-0" />
              </button>
            )}

            <div className="text-sm text-fg leading-relaxed">
              <MentionText text={activePin.description} />
            </div>

            {/* Códice */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[13px] font-semibold text-fg flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-fg-subtle" />
                  Códice
                </h4>
                {viewRole === 'gm' && !primaryEntity && (
                  <button
                    type="button"
                    onClick={onCreateWikiFromPin}
                    className="btn btn-ghost btn-sm"
                  >
                    <BookPlus className="w-4 h-4" />
                    <span>Criar página</span>
                  </button>
                )}
              </div>

              {primaryEntity && (
                <button
                  type="button"
                  onClick={() => onOpenEntity(primaryEntity.id)}
                  className="w-full px-3 py-2 rounded-md border border-line bg-surface hover:bg-surface-2 hover:border-line-strong flex items-center justify-between gap-2 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-fg-subtle">
                      Página principal ·{' '}
                      <span className="font-mono">
                        {primaryEntity.mentionPrefix}
                        {primaryEntity.handle}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-fg truncate">
                      {primaryEntity.name}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-fg-subtle shrink-0" />
                </button>
              )}

              {secondaryEntities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {secondaryEntities.map((ent) => (
                    <div
                      key={ent.id}
                      className="inline-flex items-center gap-1 h-7 pl-2 pr-1 rounded-md bg-surface-2 border border-line text-[13px] text-fg"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenEntity(ent.id)}
                        className="hover:text-accent truncate max-w-[180px]"
                      >
                        {ent.name}{' '}
                        <span className="font-mono text-xs text-fg-subtle">
                          {ent.mentionPrefix}
                          {ent.handle}
                        </span>
                      </button>
                      {viewRole === 'gm' && (
                        <button
                          type="button"
                          onClick={() => toggleSecondaryEntity(ent.id)}
                          className="p-0.5 rounded text-fg-subtle hover:text-danger"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!primaryEntity && secondaryEntities.length === 0 && (
                <p className="text-[13px] text-fg-subtle">Nenhuma entrada vinculada.</p>
              )}

              {viewRole === 'gm' && entities.length > 0 && (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={wikiSearch}
                    onChange={(e) => setWikiSearch(e.target.value)}
                    placeholder="Vincular entrada do códice…"
                    className="input h-8 text-xs"
                  />
                  {wikiSearch.trim().length > 0 && (
                    <div className="max-h-40 overflow-y-auto p-1 rounded-md border border-line bg-surface shadow-card">
                      {filteredEntities.length === 0 ? (
                        <div className="text-xs text-fg-subtle px-2 py-1.5">
                          Nenhuma entrada encontrada.
                        </div>
                      ) : (
                        filteredEntities.map((ent) => {
                          const already = Boolean(
                            activePin.linkedEntityIds?.includes(ent.id)
                          );
                          return (
                            <button
                              key={ent.id}
                              type="button"
                              onClick={() => {
                                toggleSecondaryEntity(ent.id);
                                setWikiSearch('');
                              }}
                              className="w-full px-2 py-1.5 rounded text-left text-xs hover:bg-surface-2 flex items-center justify-between gap-2"
                            >
                              <span className="truncate text-fg">
                                {ent.name}{' '}
                                <span className="font-mono text-fg-subtle">
                                  {ent.mentionPrefix}
                                  {ent.handle}
                                </span>
                              </span>
                              <span className="text-fg-muted shrink-0">
                                {already ? 'Remover' : 'Vincular'}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Ameaças */}
            <section className="space-y-2">
              <h4 className="text-[13px] font-semibold text-fg flex items-center gap-2">
                <Swords className="w-4 h-4 text-fg-subtle" />
                Ameaças
              </h4>
              {activePin.monsters.length === 0 ? (
                <p className="text-[13px] text-fg-subtle">Nenhuma ameaça registrada.</p>
              ) : (
                <div className="rounded-md border border-line divide-y divide-line">
                  {activePin.monsters.map((m, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 flex items-center justify-between gap-2 text-sm"
                    >
                      <div className="text-fg min-w-0">
                        <MentionText text={m} />
                      </div>
                      {viewRole === 'gm' && (
                        <button
                          type="button"
                          onClick={() => onAddMonsterToCombat(m, activePin.label)}
                          className="btn btn-secondary btn-sm shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Combate</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Espólios */}
            <section className="space-y-2">
              <h4 className="text-[13px] font-semibold text-fg flex items-center gap-2">
                <Coins className="w-4 h-4 text-fg-subtle" />
                Espólios
              </h4>
              {activePin.treasures.length === 0 ? (
                <p className="text-[13px] text-fg-subtle">Nenhum item listado.</p>
              ) : (
                <div className="rounded-md border border-line divide-y divide-line">
                  {activePin.treasures.map((tr, idx) => (
                    <div key={idx} className="px-3 py-2 text-sm text-fg">
                      <MentionText text={tr} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {viewRole === 'gm' && (
            <div className="sticky bottom-0 px-4 py-3 border-t border-line bg-surface flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleRevealPin(currentMap.id, activePin.id)}
                className={`btn flex-1 ${
                  activePin.isSecret && !activePin.isRevealed
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                {activePin.isSecret && !activePin.isRevealed ? (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Revelar aos jogadores</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span>Ocultar dos jogadores</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeletePin(currentMap.id, activePin.id);
                  onClose();
                }}
                className="btn btn-danger-ghost btn-icon h-9 w-9"
                title="Remover marcador"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
};

// ============================================================================
// CREATE NEW PIN MODAL
// ============================================================================

export interface CreatePinSubmitData {
  label: string;
  subtitle: string;
  layer: MapLayer;
  iconType: MapPinIcon;
  entityId?: string;
  autoCreateWiki: boolean;
  linkedEntityIds: string[];
  linkedMapId?: string;
  description: string;
  monsters: string[];
  treasures: string[];
  isSecret: boolean;
}

interface CreatePinModalProps {
  coords: { x: number; y: number } | null;
  defaultIcon: MapPinIcon;
  defaultLayer: MapLayer;
  currentMap: CampaignMap;
  maps: CampaignMap[];
  entities: Entity[];
  entitiesMap: Map<string, Entity>;
  onClose: () => void;
  onSubmit: (data: CreatePinSubmitData) => Promise<void> | void;
}

export const CreatePinModal: React.FC<CreatePinModalProps> = ({
  coords,
  defaultIcon,
  defaultLayer,
  currentMap,
  maps,
  entities,
  entitiesMap,
  onClose,
  onSubmit,
}) => {
  const [label, setLabel] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [layer, setLayer] = useState<MapLayer>(defaultLayer);
  const [iconType, setIconType] = useState<MapPinIcon>(defaultIcon);
  const [entityId, setEntityId] = useState('');
  const [autoCreateWiki, setAutoCreateWiki] = useState(false);
  const [linkedEntityIds, setLinkedEntityIds] = useState<string[]>([]);
  const [linkedMapId, setLinkedMapId] = useState('');
  const [description, setDescription] = useState('');
  const [monsters, setMonsters] = useState('');
  const [treasures, setTreasures] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [wikiSearch, setWikiSearch] = useState('');

  React.useEffect(() => {
    if (coords) {
      setLabel('');
      setSubtitle('');
      setLayer(defaultLayer);
      setIconType(defaultIcon);
      setEntityId('');
      setAutoCreateWiki(false);
      setLinkedEntityIds([]);
      setLinkedMapId('');
      setDescription('');
      setMonsters('');
      setTreasures('');
      setIsSecret(false);
      setWikiSearch('');
    }
  }, [coords, defaultIcon, defaultLayer]);

  if (!coords) return null;

  const filteredEntities = entities
    .filter((e) => e.id !== entityId)
    .filter((e) => {
      const q = wikiSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) || e.handle.toLowerCase().includes(q)
      );
    })
    .slice(0, 15);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    await onSubmit({
      label: label.trim(),
      subtitle: subtitle.trim() || PIN_ICON_META[iconType].label,
      layer,
      iconType,
      entityId: entityId || undefined,
      autoCreateWiki,
      linkedEntityIds,
      linkedMapId: linkedMapId || undefined,
      description: description.trim() || `Ponto de interesse em ${currentMap.name}.`,
      monsters: monsters
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      treasures: treasures
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      isSecret,
    });
  };

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSubmit} className="modal max-w-lg max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="section-title">
            Novo marcador{' '}
            <span className="font-mono text-xs text-fg-subtle font-normal tabular-nums">
              {coords.x.toFixed(1)}%, {coords.y.toFixed(1)}%
            </span>
          </h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nome</label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex.: Fortaleza Cinza"
                className="input"
              />
            </div>
            <div>
              <label className="label">Subtítulo</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ex.: Posto da guarda norte"
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Camada</label>
              <select
                value={layer}
                onChange={(e) => setLayer(e.target.value as MapLayer)}
                className="input"
              >
                <option value="locations">Locais e assentamentos</option>
                <option value="dangers">Perigos e masmorras</option>
                <option value="quests">Ganchos e missões</option>
                <option value="secrets">Segredos do mestre</option>
              </select>
            </div>
            <div>
              <label className="label">Ícone</label>
              <select
                value={iconType}
                onChange={(e) => setIconType(e.target.value as MapPinIcon)}
                className="input"
              >
                {(Object.keys(PIN_ICON_META) as MapPinIcon[]).map((k) => (
                  <option key={k} value={k}>
                    {PIN_ICON_META[k].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card-muted p-3 space-y-3">
            <div>
              <label className="label">Página principal no Códice</label>
              <select
                value={entityId}
                onChange={(e) => {
                  setEntityId(e.target.value);
                  if (e.target.value) setAutoCreateWiki(false);
                }}
                className="input"
              >
                <option value="">Nenhuma</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.mentionPrefix}
                    {e.handle} — {e.name}
                  </option>
                ))}
              </select>
              {!entityId && (
                <label className="mt-2 inline-flex items-center gap-2 text-[13px] text-fg-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={autoCreateWiki}
                    onChange={(e) => setAutoCreateWiki(e.target.checked)}
                  />
                  <span>Criar entrada de local automaticamente no Códice</span>
                </label>
              )}
            </div>

            {entities.length > 0 && (
              <div className="space-y-1.5">
                <label className="label mb-0">Outras entradas presentes aqui</label>
                {linkedEntityIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {linkedEntityIds.map((id) => {
                      const ent = entitiesMap.get(id);
                      if (!ent) return null;
                      return (
                        <span key={id} className="badge bg-surface font-mono">
                          {ent.mentionPrefix}
                          {ent.handle}
                          <button
                            type="button"
                            onClick={() =>
                              setLinkedEntityIds((prev) => prev.filter((x) => x !== id))
                            }
                            className="text-fg-subtle hover:text-danger"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <input
                  type="text"
                  value={wikiSearch}
                  onChange={(e) => setWikiSearch(e.target.value)}
                  placeholder="Buscar NPCs, facções, itens…"
                  className="input h-8"
                />
                {wikiSearch.trim().length > 0 && (
                  <div className="max-h-32 overflow-y-auto p-1 rounded-md border border-line bg-surface">
                    {filteredEntities.map((ent) => {
                      const checked = linkedEntityIds.includes(ent.id);
                      return (
                        <button
                          key={ent.id}
                          type="button"
                          onClick={() =>
                            setLinkedEntityIds((prev) =>
                              checked
                                ? prev.filter((x) => x !== ent.id)
                                : [...prev, ent.id]
                            )
                          }
                          className="w-full px-2 py-1.5 rounded text-left text-[13px] hover:bg-surface-2 flex items-center justify-between gap-2"
                        >
                          <span className="truncate text-fg">
                            {ent.name}{' '}
                            <span className="font-mono text-xs text-fg-subtle">
                              {ent.mentionPrefix}
                              {ent.handle}
                            </span>
                          </span>
                          <span
                            className={`text-xs shrink-0 inline-flex items-center gap-1 ${
                              checked ? 'text-accent' : 'text-fg-muted'
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5" />}
                            {checked ? 'Vinculado' : 'Vincular'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {maps.length > 1 && (
            <div>
              <label className="label">Submapa</label>
              <select
                value={linkedMapId}
                onChange={(e) => setLinkedMapId(e.target.value)}
                className="input"
              >
                <option value="">Nenhum</option>
                {maps
                  .filter((m) => m.id !== currentMap.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Descrição</label>
            <MentionTextarea
              value={description}
              onChange={setDescription}
              rows={3}
              placeholder="Área, atmosfera e ganchos (@NPC, #Local)…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Ameaças</label>
              <input
                type="text"
                value={monsters}
                onChange={(e) => setMonsters(e.target.value)}
                placeholder="Ex.: 3 Carniçais, @Chefe"
                className="input"
              />
            </div>
            <div>
              <label className="label">Espólios</label>
              <input
                type="text"
                value={treasures}
                onChange={(e) => setTreasures(e.target.value)}
                placeholder="Ex.: 120 PO, #ChaveAntiga"
                className="input"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer select-none">
            <input
              type="checkbox"
              className="checkbox"
              checked={isSecret}
              onChange={(e) => setIsSecret(e.target.checked)}
            />
            <span>Ocultar dos jogadores até revelar</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-line bg-surface-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            Salvar marcador
          </button>
        </div>
      </form>
    </div>
  );
};
