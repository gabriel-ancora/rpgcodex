import React, { useEffect, useRef, useState } from 'react';
import { Cloud, Loader2, Trash2, Upload, X } from 'lucide-react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { uploadImageToCloudStorage } from '../../../services/storageService';
import type {
  CampaignMap,
  MapCanvasTheme,
  MapGridMode,
} from '../../../types/campaign';
import { CANVAS_THEMES, DEFAULT_STAGE_H, DEFAULT_STAGE_W } from './mapConstants';

export interface MapSettingsSubmitPayload {
  name: string;
  subtitle: string;
  regionType: CampaignMap['regionType'];
  customImageUrl: string;
  storageId?: Id<'_storage'>;
  clearImage?: boolean;
  isPublicToPlayers: boolean;
  canvasTheme: MapCanvasTheme;
  gridMode: MapGridMode;
  gridSize: number;
  gridOpacity: number;
  imageOpacity: number;
  stageWidth: number;
  stageHeight: number;
  scalePer100Pct: number;
}

interface MapSettingsModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialMap?: CampaignMap;
  onClose: () => void;
  onSubmit: (payload: MapSettingsSubmitPayload) => Promise<void> | void;
  onToast: (msg: string) => void;
}

const STAGE_PRESETS = [
  { label: 'Padrão (1600 × 1000)', w: 1600, h: 1000 },
  { label: 'Amplo (2400 × 1500)', w: 2400, h: 1500 },
  { label: 'Continental (3200 × 2000)', w: 3200, h: 2000 },
  { label: 'Quadrado Tático (1600 × 1600)', w: 1600, h: 1600 },
];

function defaultScaleFor(rt: CampaignMap['regionType']): number {
  if (rt === 'tactical') return 60;
  if (rt === 'city') return 1800;
  return 240;
}

export const MapSettingsModal: React.FC<MapSettingsModalProps> = ({
  isOpen,
  mode,
  initialMap,
  onClose,
  onSubmit,
  onToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [regionType, setRegionType] = useState<CampaignMap['regionType']>('regional');
  const [imageUrl, setImageUrl] = useState('');
  const [storageId, setStorageId] = useState<Id<'_storage'> | undefined>(undefined);
  const [clearImage, setClearImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublicToPlayers, setIsPublicToPlayers] = useState(true);
  const [canvasTheme, setCanvasTheme] = useState<MapCanvasTheme>('obsidian');
  const [gridMode, setGridMode] = useState<MapGridMode>('dots');
  const [gridSize, setGridSize] = useState(40);
  const [gridOpacity, setGridOpacity] = useState(0.35);
  const [imageOpacity, setImageOpacity] = useState(1);
  const [stageWidth, setStageWidth] = useState(DEFAULT_STAGE_W);
  const [stageHeight, setStageHeight] = useState(DEFAULT_STAGE_H);
  const [scalePer100Pct, setScalePer100Pct] = useState(240);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialMap) {
      setName(initialMap.name);
      setSubtitle(initialMap.subtitle || '');
      setRegionType(initialMap.regionType);
      setImageUrl(initialMap.customImageUrl || '');
      setStorageId(undefined);
      setClearImage(false);
      setIsPublicToPlayers(initialMap.isPublicToPlayers !== false);
      setCanvasTheme(initialMap.canvasTheme || 'obsidian');
      setGridMode(initialMap.gridMode || 'dots');
      setGridSize(initialMap.gridSize || 40);
      setGridOpacity(initialMap.gridOpacity ?? 0.35);
      setImageOpacity(initialMap.imageOpacity ?? 1);
      setStageWidth(initialMap.stageWidth || DEFAULT_STAGE_W);
      setStageHeight(initialMap.stageHeight || DEFAULT_STAGE_H);
      setScalePer100Pct(
        initialMap.scalePer100Pct || defaultScaleFor(initialMap.regionType)
      );
    } else {
      setName('');
      setSubtitle('');
      setRegionType('regional');
      setImageUrl('');
      setStorageId(undefined);
      setClearImage(false);
      setIsPublicToPlayers(true);
      setCanvasTheme('obsidian');
      setGridMode('dots');
      setGridSize(40);
      setGridOpacity(0.35);
      setImageOpacity(1);
      setStageWidth(DEFAULT_STAGE_W);
      setStageHeight(DEFAULT_STAGE_H);
      setScalePer100Pct(240);
    }
  }, [isOpen, mode, initialMap]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadImageToCloudStorage(file);
      setImageUrl(uploaded.url);
      setStorageId(uploaded.storageId);
      setClearImage(false);
      if (!name.trim()) {
        setName(file.name.replace(/\.[^/.]+$/, ''));
      }
      onToast('Imagem do mapa pronta.');
    } catch {
      onToast('Falha ao enviar a imagem do mapa.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isUploading) return;
    await onSubmit({
      name: name.trim(),
      subtitle: subtitle.trim() || 'Canvas cartográfico',
      regionType,
      customImageUrl: imageUrl.trim(),
      storageId,
      clearImage,
      isPublicToPlayers,
      canvasTheme,
      gridMode,
      gridSize,
      gridOpacity,
      imageOpacity,
      stageWidth: Math.max(600, Math.min(6000, stageWidth)),
      stageHeight: Math.max(600, Math.min(6000, stageHeight)),
      scalePer100Pct: Math.max(1, scalePer100Pct),
    });
    onClose();
  };

  const scaleUnit =
    regionType === 'regional' ? 'km' : regionType === 'city' ? 'm' : 'm (1,5m = 1 quad.)';

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSubmit} className="modal max-w-2xl max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <h3 className="section-title">
              {mode === 'create' ? 'Novo canvas / mapa' : 'Configurações do canvas'}
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Personalize o fundo, grade, escala, imagem base e visibilidade.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Identificação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nome do mapa / quadro</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Costa da Espada, Cripta Nv. 1…"
                className="input"
              />
            </div>
            <div>
              <label className="label">Subtítulo / Região</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ex.: Mapa regional ou quadro tático"
                className="input"
              />
            </div>
          </div>

          {/* Tema visual estilo Miro / Cartografia */}
          <div>
            <label className="label">Tema do canvas</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(CANVAS_THEMES) as MapCanvasTheme[]).map((th) => {
                const meta = CANVAS_THEMES[th];
                const active = canvasTheme === th;
                return (
                  <button
                    key={th}
                    type="button"
                    onClick={() => setCanvasTheme(th)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      active
                        ? 'border-accent ring-2 ring-accent/30 bg-surface-2'
                        : 'border-line hover:border-line-strong bg-surface'
                    }`}
                  >
                    <div
                      className="h-9 rounded-md border mb-2 flex items-center justify-center"
                      style={{
                        backgroundColor: meta.stageBg,
                        borderColor: meta.borderColor,
                        color: meta.textDefault,
                      }}
                    >
                      <span className="text-[11px] font-semibold">Aa · #Grid</span>
                    </div>
                    <div className="text-xs font-medium text-fg truncate">{meta.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grade & Dimensões */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Estilo da grade</label>
              <select
                value={gridMode}
                onChange={(e) => setGridMode(e.target.value as MapGridMode)}
                className="input"
              >
                <option value="dots">Pontilhada (estilo Miro)</option>
                <option value="square">Quadrada (tática)</option>
                <option value="hex">Hexagonal (exploração)</option>
                <option value="off">Sem grade</option>
              </select>
            </div>
            <div>
              <label className="label">Tamanho da célula ({gridSize}px)</label>
              <input
                type="range"
                min={20}
                max={96}
                step={4}
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full mt-2 accent-accent"
              />
            </div>
            <div>
              <label className="label">
                Opacidade da grade ({Math.round(gridOpacity * 100)}%)
              </label>
              <input
                type="range"
                min={5}
                max={90}
                value={Math.round(gridOpacity * 100)}
                onChange={(e) => setGridOpacity(Number(e.target.value) / 100)}
                className="w-full mt-2 accent-accent"
              />
            </div>
          </div>

          {/* Escala & Tamanho do quadro */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Tipo de escala</label>
              <select
                value={regionType}
                onChange={(e) => {
                  const next = e.target.value as CampaignMap['regionType'];
                  setRegionType(next);
                  setScalePer100Pct(defaultScaleFor(next));
                }}
                className="input"
              >
                <option value="regional">Regional / Mundo (km)</option>
                <option value="city">Cidade / Distrito (m)</option>
                <option value="tactical">Masmorra / Combate (1,5m)</option>
              </select>
            </div>
            <div>
              <label className="label">Largura total ({scaleUnit})</label>
              <input
                type="number"
                min={1}
                value={scalePer100Pct}
                onChange={(e) => setScalePer100Pct(Number(e.target.value) || 1)}
                className="input tabular-nums"
              />
            </div>
            <div>
              <label className="label">Proporção do quadro</label>
              <select
                value={`${stageWidth}x${stageHeight}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number);
                  if (w && h) {
                    setStageWidth(w);
                    setStageHeight(h);
                  }
                }}
                className="input"
              >
                {STAGE_PRESETS.map((p) => (
                  <option key={`${p.w}x${p.h}`} value={`${p.w}x${p.h}`}>
                    {p.label}
                  </option>
                ))}
                {!STAGE_PRESETS.some((p) => p.w === stageWidth && p.h === stageHeight) && (
                  <option value={`${stageWidth}x${stageHeight}`}>
                    Personalizado ({stageWidth} × {stageHeight})
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* Imagem de Fundo Opcional (para decalque ou mapa pronto) */}
          <div className="rounded-lg border border-dashed border-line-strong bg-surface-2 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-fg">
                  Imagem de fundo (opcional)
                </span>
                <p className="text-xs text-fg-muted">
                  Deixe em branco para desenhar livremente no quadro ou envie um mapa para anotar/decalcar por cima.
                </p>
              </div>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    setStorageId(undefined);
                    setClearImage(true);
                  }}
                  className="btn btn-danger-ghost btn-sm shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando…</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Enviar imagem</span>
                  </>
                )}
              </button>
              {storageId && (
                <span className="badge badge-success">
                  <Cloud className="w-3 h-3" />
                  Na nuvem
                </span>
              )}
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setStorageId(undefined);
                  setClearImage(!e.target.value.trim());
                }}
                placeholder="Ou cole a URL da imagem…"
                className="input h-8 flex-1 min-w-[180px] text-xs"
              />
            </div>

            {imageUrl && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-fg-muted">
                  <span>Opacidade da imagem de fundo</span>
                  <span className="tabular-nums">{Math.round(imageOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round(imageOpacity * 100)}
                  onChange={(e) => setImageOpacity(Number(e.target.value) / 100)}
                  className="w-full accent-accent"
                />
              </div>
            )}
          </div>

          {/* Visibilidade aos Jogadores */}
          <label className="flex items-center gap-2.5 text-sm text-fg cursor-pointer select-none">
            <input
              type="checkbox"
              className="checkbox"
              checked={isPublicToPlayers}
              onChange={(e) => setIsPublicToPlayers(e.target.checked)}
            />
            <span>Mapa visível aos jogadores na Visão da Mesa</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-line bg-surface-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isUploading} className="btn btn-primary">
            {mode === 'create' ? 'Criar canvas' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
};
