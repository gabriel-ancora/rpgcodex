import { convexClient } from '../convexClient';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export interface UploadedImageResult {
  url: string;
  storageId?: Id<'_storage'>;
  usedCloudStorage: boolean;
}

/**
 * Comprime uma imagem via Canvas HTML5 caso o usuário esteja sem conexão com a nuvem,
 * impedindo que arquivos grandes estourem o limite de 5MB do LocalStorage.
 */
async function compressImageLocally(file: File, maxDimension = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Imagem inválida.'));
      };
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.78));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Faz upload de imagens de mapas, capas ou retratos diretamente para o Convex File Storage,
 * retornando a URL pública da CDN da Convex + storageId.
 */
export async function uploadImageToCloudStorage(file: File): Promise<UploadedImageResult> {
  try {
    const postUrl = await convexClient.mutation(api.files.generateUploadUrl, {});
    const uploadResponse = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload falhou com status ${uploadResponse.status}`);
    }

    const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> };
    const resolved = await convexClient.mutation(api.files.resolveStorageUrl, {
      storageId,
    });

    if (resolved?.url) {
      return {
        url: resolved.url,
        storageId,
        usedCloudStorage: true,
      };
    }
  } catch (err) {
    console.warn('Upload Convex Storage indisponível; aplicando compressão segura local:', err);
  }

  const compressedDataUrl = await compressImageLocally(file);
  return {
    url: compressedDataUrl,
    usedCloudStorage: false,
  };
}

