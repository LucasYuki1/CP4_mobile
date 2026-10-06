import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from './firebase';
import { AppError } from '../utils/errors';

/**
 * Abre a galeria depois de pedir a permissao. Retorna a uri local da imagem
 * escolhida, ou null se o usuario cancelou.
 */
export async function pickImageFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new AppError(
      'Permissao para acessar as fotos negada. Libere o acesso nas configuracoes do aparelho.',
      'picker/permission-denied',
    );
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (result.canceled) return null;
  const [asset] = result.assets;
  return asset ? asset.uri : null;
}

/**
 * fetch(uri).blob() falha em alguns Android com file://. O XMLHttpRequest com
 * responseType 'blob' e o caminho recomendado pela Expo para o Firebase Storage.
 */
function readBlob(uri: string): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onload = () => resolve(request.response as Blob);
    request.onerror = () => reject(new AppError('Nao foi possivel ler a imagem selecionada.'));
    request.responseType = 'blob';
    request.open('GET', uri, true);
    request.send(null);
  });
}

/**
 * Envia o arquivo ao Firebase Storage e devolve somente a URL publica final.
 * E essa URL (e nunca Base64) que vai para o Firestore.
 */
export async function uploadImage(localUri: string, storagePath: string): Promise<string> {
  const blob = await readBlob(localUri);
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(fileRef);
}

export function profilePhotoPath(uid: string): string {
  return `profilePhotos/${uid}/avatar-${Date.now()}.jpg`;
}

export function groupPhotoPath(groupId: string): string {
  return `groupPhotos/${groupId}/photo-${Date.now()}.jpg`;
}
