import { convexClient } from '../convexClient';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useCampaignStore } from '../store/useCampaignStore';
import { convexErrorMessage } from '../utils/sheetPayload';

export interface UploadedImageResult {
  url: string;
  storageId: Id<'_storage'>;
  /** Sempre true: não há mais alternativa local silenciosa (falhas lançam erro). */
  usedCloudStorage: true;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Envia uma imagem (mapa, capa, retrato) ao armazenamento do Convex e devolve a URL + storageId.
 * Em caso de falha lança um Error com mensagem em PT-BR; a imagem nunca é embutida como data URL.
 */
export async function uploadImageToCloudStorage(
  file: File,
  opts: { campaignId?: string } = {}
): Promise<UploadedImageResult> {
  if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem (PNG, JPG ou WebP).');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('A imagem excede o limite de 10 MB.');

  const sessionToken = useCampaignStore.getState().sessionToken ?? '';
  try {
    const postUrl = await convexClient.mutation(api.files.generateUploadUrl, {
      sessionToken,
      campaignId: opts.campaignId,
      purpose: 'image',
    });
    const uploadResponse = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!uploadResponse.ok) {
      throw new Error(`O envio falhou (HTTP ${uploadResponse.status}).`);
    }
    const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> };
    const resolved = await convexClient.mutation(api.files.resolveStorageUrl, { sessionToken, storageId });
    if (!resolved?.url) throw new Error('O servidor não devolveu a URL da imagem.');
    return { url: resolved.url, storageId, usedCloudStorage: true };
  } catch (err) {
    throw new Error(convexErrorMessage(err));
  }
}
