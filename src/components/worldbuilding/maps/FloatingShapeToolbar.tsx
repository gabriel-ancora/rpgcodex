import React, { useState } from 'react';
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  ArrowUpToLine,
  ArrowDownToLine,
  Link2,
  ExternalLink,
  Spline,
  MoveRight,
  MoveHorizontal,
  Minus,
  Palette,
} from 'lucide-react';
import type { Entity, MapDrawingShape } from '../../../types/campaign';
import { MAP_STAMPS, STICKY_PALETTE, STROKE_PALETTE } from './mapConstants';

interface FloatingShapeToolbarProps {
  selectedShapes: MapDrawingShape[];
  entities: Entity[];
  onUpdateSelected: (patch: Partial<MapDrawingShape>) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenEntity: (entityId: string) => void;
}

export const FloatingShapeToolbar: React.FC<FloatingShapeToolbarProps> = ({
  selectedShapes,
  entities,
  onUpdateSelected,
  onBringToFront,
  onSendToBack,
  onDuplicate,
  onDelete,
  onOpenEntity,
}) => {
  const [openPopover, setOpenPopover] = useState<
    'color' | 'fill' | 'stroke' | 'text' | 'stamp' | 'wiki' | null
  >(null);

  if (selectedShapes.length === 0) return null;

  const primary = selectedShapes[0];
  const isMulti = selectedShapes.length > 1;
  const isFog = primary.type === 'fog' || primary.type === 'fog_poly';
  const isSticky = primary.type === 'sticky';
  const isText = primary.type === 'text';
  const isStamp = primary.type === 'stamp';
  const isArrow = primary.type === 'arrow';
  const isPathOrPoly =
    primary.type === 'road' ||
    primary.type === 'river' ||
    primary.type === 'arrow' ||
    primary.type === 'polygon';
  const supportsFill =
    primary.type === 'rect' ||
    primary.type === 'circle' ||
    primary.type === 'polygon' ||
    primary.type === 'sticky' ||
    primary.type === 'frame' ||
    primary.type === 'text' ||
    primary.type === 'stamp';
  const allLocked = selectedShapes.every((s) => s.locked);

  const togglePop = (name: typeof openPopover) =>
    setOpenPopover((prev) => (prev === name ? null : name));

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-surface/95 backdrop-blur border border-line-strong shadow-elevated max-w-[calc(100%-6rem)] flex-wrap pointer-events-auto"
    >
      {/* Count badge when multi-selected */}
      {isMulti && (
        <span className="px-2 py-0.5 rounded-md bg-accent-soft text-accent text-xs font-semibold">
          {selectedShapes.length} itens
        </span>
      )}

      {/* Quick inline label edit for single item (non-sticky) */}
      {!isMulti && !isSticky && (
        <input
          type="text"
          value={primary.label}
          onChange={(e) => onUpdateSelected({ label: e.target.value })}
          placeholder={isFog ? 'Nome da névoa…' : 'Rótulo…'}
          className="input h-7 w-32 sm:w-40 text-xs px-2"
          title="Rótulo ou texto do elemento"
        />
      )}

      {/* Stroke / Primary Color */}
      {!isFog && !isSticky && (
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePop('color')}
            className="btn btn-ghost btn-icon h-7 w-7"
            title="Cor do traço / texto"
          >
            <span
              className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
              style={{ backgroundColor: primary.color }}
            />
          </button>
          {openPopover === 'color' && (
            <div className="absolute top-full left-0 mt-2 p-2.5 rounded-xl bg-surface border border-line-strong shadow-elevated w-52 z-40 space-y-2">
              <div className="text-[11px] font-medium text-fg-subtle">Cor principal</div>
              <div className="grid grid-cols-6 gap-1.5">
                {STROKE_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => onUpdateSelected({ color: c.hex })}
                    className={`w-6 h-6 rounded-full border border-black/20 ${
                      primary.color === c.hex ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface' : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>
              <label className="flex items-center justify-between gap-2 pt-1 border-t border-line text-xs text-fg-muted">
                <span>Cor personalizada</span>
                <input
                  type="color"
                  value={primary.color.startsWith('#') ? primary.color : '#d4a853'}
                  onChange={(e) => onUpdateSelected({ color: e.target.value })}
                  className="w-7 h-6 rounded cursor-pointer bg-transparent border-0"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Fill Color & Opacity */}
      {!isFog && supportsFill && (
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePop('fill')}
            className="btn btn-ghost h-7 px-1.5 text-xs gap-1"
            title="Preenchimento e opacidade"
          >
            <Palette className="w-3.5 h-3.5 text-fg-muted" />
            <span
              className="w-3.5 h-3.5 rounded border border-line-strong"
              style={{
                backgroundColor:
                  primary.fillColor || (isSticky ? primary.color : 'transparent'),
              }}
            />
          </button>
          {openPopover === 'fill' && (
            <div className="absolute top-full left-0 mt-2 p-2.5 rounded-xl bg-surface border border-line-strong shadow-elevated w-56 z-40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-fg-subtle">Preenchimento</span>
                {!isSticky && (
                  <button
                    type="button"
                    onClick={() => onUpdateSelected({ fillColor: '', opacity: 0 })}
                    className="text-[11px] text-fg-muted hover:text-fg underline"
                  >
                    Sem fundo
                  </button>
                )}
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {(isSticky ? STICKY_PALETTE : STROKE_PALETTE).map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() =>
                      onUpdateSelected(
                        isSticky
                          ? { fillColor: c.hex, color: c.hex }
                          : { fillColor: c.hex, opacity: primary.opacity === 0 ? 0.25 : primary.opacity }
                      )
                    }
                    className={`w-6 h-6 rounded-md border border-black/20 ${
                      (primary.fillColor || primary.color) === c.hex
                        ? 'ring-2 ring-accent'
                        : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>
              <label className="flex items-center justify-between gap-2 text-xs text-fg-muted">
                <span>Personalizada</span>
                <input
                  type="color"
                  value={
                    (primary.fillColor || primary.color || '#fef08a').startsWith('#')
                      ? primary.fillColor || primary.color
                      : '#fef08a'
                  }
                  onChange={(e) =>
                    onUpdateSelected(
                      isSticky
                        ? { fillColor: e.target.value, color: e.target.value }
                        : { fillColor: e.target.value }
                    )
                  }
                  className="w-7 h-6 rounded cursor-pointer bg-transparent border-0"
                />
              </label>
              <div className="space-y-1 pt-1 border-t border-line">
                <div className="flex justify-between text-[11px] text-fg-muted">
                  <span>Opacidade</span>
                  <span className="tabular-nums">
                    {Math.round((primary.opacity ?? (isSticky ? 0.97 : 0.2)) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((primary.opacity ?? (isSticky ? 0.97 : 0.2)) * 100)}
                  onChange={(e) =>
                    onUpdateSelected({ opacity: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-accent"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stroke Width & Dash Style */}
      {!isFog && !isSticky && !isText && (
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePop('stroke')}
            className="btn btn-ghost h-7 px-2 text-xs tabular-nums"
            title="Espessura e estilo da linha"
          >
            {primary.strokeWidth}px
          </button>
          {openPopover === 'stroke' && (
            <div className="absolute top-full left-0 mt-2 p-2.5 rounded-xl bg-surface border border-line-strong shadow-elevated w-52 z-40 space-y-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-fg-muted">
                  <span>Espessura</span>
                  <span className="tabular-nums">{primary.strokeWidth}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={16}
                  value={primary.strokeWidth || 3}
                  onChange={(e) =>
                    onUpdateSelected({ strokeWidth: Number(e.target.value) })
                  }
                  className="w-full accent-accent"
                />
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'solid', label: 'Contínua' },
                    { id: 'dashed', label: 'Tracejada' },
                    { id: 'dotted', label: 'Pontilhada' },
                  ] as const
                ).map((st) => {
                  const active =
                    (primary.strokeStyle || (primary.dashed ? 'dashed' : 'solid')) ===
                    st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        onUpdateSelected({
                          strokeStyle: st.id,
                          dashed: st.id === 'dashed',
                        })
                      }
                      className={`h-7 rounded text-[11px] font-medium border ${
                        active
                          ? 'bg-accent-soft text-accent border-accent/40'
                          : 'border-line text-fg-muted hover:text-fg'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Curve & Arrowhead controls for paths/connectors */}
      {isPathOrPoly && (
        <button
          type="button"
          onClick={() => onUpdateSelected({ curved: !primary.curved })}
          className={`btn btn-ghost btn-icon h-7 w-7 ${
            primary.curved ? 'bg-accent-soft text-accent' : ''
          }`}
          title={primary.curved ? 'Usar segmentos retos' : 'Suavizar curvas'}
        >
          <Spline className="w-3.5 h-3.5" />
        </button>
      )}

      {isArrow && (
        <button
          type="button"
          onClick={() => {
            if (!primary.arrowStart && (primary.arrowEnd ?? true)) {
              onUpdateSelected({ arrowStart: true, arrowEnd: true });
            } else if (primary.arrowStart && primary.arrowEnd) {
              onUpdateSelected({ arrowStart: false, arrowEnd: false });
            } else {
              onUpdateSelected({ arrowStart: false, arrowEnd: true });
            }
          }}
          className="btn btn-ghost btn-icon h-7 w-7"
          title="Alternar pontas da seta (fim / ambos / linha simples)"
        >
          {primary.arrowStart && primary.arrowEnd ? (
            <MoveHorizontal className="w-3.5 h-3.5" />
          ) : primary.arrowEnd ?? true ? (
            <MoveRight className="w-3.5 h-3.5" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Stamp Switcher */}
      {isStamp && (
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePop('stamp')}
            className="btn btn-ghost h-7 px-2 text-xs"
            title="Trocar símbolo cartográfico"
          >
            Símbolo
          </button>
          {openPopover === 'stamp' && (
            <div className="absolute top-full left-0 mt-2 p-2 rounded-xl bg-surface border border-line-strong shadow-elevated w-60 z-40 grid grid-cols-6 gap-1">
              {MAP_STAMPS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    onUpdateSelected({ stampType: st.id });
                    setOpenPopover(null);
                  }}
                  title={st.label}
                  className={`h-8 w-8 rounded-md flex items-center justify-center border ${
                    primary.stampType === st.id
                      ? 'bg-accent-soft text-accent border-accent/40'
                      : 'border-transparent hover:bg-surface-2 text-fg'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    {st.paths.map((p, idx) => (
                      <path
                        key={idx}
                        d={p}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Typography Popover */}
      {!isFog && (isText || isSticky || primary.label) && (
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePop('text')}
            className="btn btn-ghost h-7 px-2 text-xs font-serif font-semibold"
            title="Tipografia e tamanho da fonte"
          >
            Aa
          </button>
          {openPopover === 'text' && (
            <div className="absolute top-full left-0 mt-2 p-2.5 rounded-xl bg-surface border border-line-strong shadow-elevated w-56 z-40 space-y-2.5">
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'sans', label: 'Sans' },
                    { id: 'serif', label: 'Cartográfica' },
                    { id: 'mono', label: 'Mono' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onUpdateSelected({ fontFamily: f.id })}
                    className={`h-7 rounded text-[11px] border ${
                      (primary.fontFamily || 'sans') === f.id
                        ? 'bg-accent-soft text-accent border-accent/40 font-semibold'
                        : 'border-line text-fg-muted hover:text-fg'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-fg-muted">
                  <span>Tamanho</span>
                  <span className="tabular-nums">
                    {(primary.fontSize || (isText ? 2.4 : 1.6)).toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={9}
                  step={0.2}
                  value={primary.fontSize || (isText ? 2.4 : 1.6)}
                  onChange={(e) =>
                    onUpdateSelected({ fontSize: Number(e.target.value) })
                  }
                  className="w-full accent-accent"
                />
              </div>
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-line">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSelected({
                        fontWeight: primary.fontWeight === 'normal' ? 'bold' : 'normal',
                      })
                    }
                    className={`btn btn-ghost btn-icon h-7 w-7 ${
                      (primary.fontWeight || 'bold') === 'bold'
                        ? 'bg-accent-soft text-accent'
                        : ''
                    }`}
                    title="Negrito"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSelected({
                        fontStyle: primary.fontStyle === 'italic' ? 'normal' : 'italic',
                      })
                    }
                    className={`btn btn-ghost btn-icon h-7 w-7 ${
                      primary.fontStyle === 'italic' ? 'bg-accent-soft text-accent' : ''
                    }`}
                    title="Itálico"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                </div>
                {(isSticky || isText) && (
                  <div className="flex items-center gap-0.5">
                    {(
                      [
                        { id: 'left', icon: AlignLeft },
                        { id: 'center', icon: AlignCenter },
                        { id: 'right', icon: AlignRight },
                      ] as const
                    ).map((al) => {
                      const AlIcon = al.icon;
                      return (
                        <button
                          key={al.id}
                          type="button"
                          onClick={() => onUpdateSelected({ textAlign: al.id })}
                          className={`btn btn-ghost btn-icon h-7 w-7 ${
                            (primary.textAlign || (isSticky ? 'left' : 'center')) === al.id
                              ? 'bg-accent-soft text-accent'
                              : ''
                          }`}
                        >
                          <AlIcon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wiki Entity Link */}
      {!isFog && !isMulti && (
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePop('wiki')}
            className={`btn btn-ghost btn-icon h-7 w-7 ${
              primary.entityId ? 'text-accent bg-accent-soft' : ''
            }`}
            title="Vincular entrada do Códice"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          {openPopover === 'wiki' && (
            <div className="absolute top-full right-0 mt-2 p-2.5 rounded-xl bg-surface border border-line-strong shadow-elevated w-64 z-40 space-y-2">
              <div className="text-[11px] font-medium text-fg-subtle">Vínculo com o Códice</div>
              <select
                value={primary.entityId || ''}
                onChange={(e) =>
                  onUpdateSelected({ entityId: e.target.value || undefined })
                }
                className="input h-8 text-xs"
              >
                <option value="">Nenhuma entrada</option>
                {entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.mentionPrefix}
                    {ent.handle} — {ent.name}
                  </option>
                ))}
              </select>
              {primary.entityId && (
                <button
                  type="button"
                  onClick={() => onOpenEntity(primary.entityId!)}
                  className="btn btn-secondary btn-sm w-full justify-between text-xs"
                >
                  <span>Abrir página no Códice</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <span className="w-px h-4 bg-line mx-0.5" />

      {/* Fog Reveal OR Secret Toggle */}
      {isFog ? (
        <button
          type="button"
          onClick={() => onUpdateSelected({ isRevealed: !primary.isRevealed })}
          className={`btn h-7 px-2 text-xs ${
            primary.isRevealed ? 'btn-secondary' : 'btn-primary'
          }`}
          title={
            primary.isRevealed
              ? 'Cobrir novamente com névoa para os jogadores'
              : 'Revelar esta área aos jogadores'
          }
        >
          {primary.isRevealed ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Cobrir</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Revelar</span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            const currentlyHidden = primary.isSecret && !primary.isRevealed;
            onUpdateSelected(
              currentlyHidden
                ? { isSecret: false, isRevealed: true }
                : { isSecret: true, isRevealed: false }
            );
          }}
          className={`btn btn-ghost btn-icon h-7 w-7 ${
            primary.isSecret && !primary.isRevealed ? 'text-warning bg-warning-soft' : ''
          }`}
          title={
            primary.isSecret && !primary.isRevealed
              ? 'Secreto do Mestre (clique para tornar visível aos jogadores)'
              : 'Visível aos jogadores (clique para ocultar)'
          }
        >
          {primary.isSecret && !primary.isRevealed ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Z-Order */}
      <button
        type="button"
        onClick={onBringToFront}
        className="btn btn-ghost btn-icon h-7 w-7"
        title="Trazer para frente"
      >
        <ArrowUpToLine className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onSendToBack}
        className="btn btn-ghost btn-icon h-7 w-7"
        title="Enviar para trás"
      >
        <ArrowDownToLine className="w-3.5 h-3.5" />
      </button>

      {/* Lock / Unlock */}
      <button
        type="button"
        onClick={() => onUpdateSelected({ locked: !allLocked })}
        className={`btn btn-ghost btn-icon h-7 w-7 ${
          allLocked ? 'text-accent bg-accent-soft' : ''
        }`}
        title={allLocked ? 'Desbloquear elemento' : 'Travar posição no canvas'}
      >
        {allLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
      </button>

      {/* Duplicate */}
      <button
        type="button"
        onClick={onDuplicate}
        className="btn btn-ghost btn-icon h-7 w-7"
        title="Duplicar (Ctrl+D)"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="btn btn-danger-ghost btn-icon h-7 w-7"
        title="Remover (Delete)"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
