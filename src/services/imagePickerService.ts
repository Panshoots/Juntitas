import { Platform } from 'react-native';

export interface ImagePickerResult {
  success: boolean;
  uri?: string;
  cancelled?: boolean;
  error?: string;
}

// Comprime y escala imágenes en Web para no exceder los límites de Firestore (~30-50KB)
async function compressImageWeb(dataUrl: string, maxDimension = 600, quality = 0.75): Promise<string> {
  if (typeof document === 'undefined') return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Abre el selector de cámara en Web o Móvil
 */
export async function takePhoto(): Promise<ImagePickerResult> {
  try {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return new Promise<ImagePickerResult>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';

        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) {
            resolve({ success: false, cancelled: true });
            return;
          }

          const reader = new FileReader();
          reader.onload = async () => {
            const rawUri = reader.result as string;
            const compressedUri = await compressImageWeb(rawUri);
            resolve({ success: true, uri: compressedUri });
          };
          reader.onerror = () => {
            resolve({ success: false, error: 'No se pudo leer la foto' });
          };
          reader.readAsDataURL(file);
        };

        input.click();
      });
    } else {
      // Entorno nativo (iOS / Android) usando expo-image-picker dinámico
      const ImagePicker = require('expo-image-picker');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'Permiso de cámara denegado' };
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return { success: false, cancelled: true };
      }

      return { success: true, uri: result.assets[0].uri };
    }
  } catch (error: any) {
    console.error('Error al tomar foto:', error);
    return { success: false, error: error?.message || 'Error inesperado al abrir cámara' };
  }
}

/**
 * Abre el selector de galería/archivos en Web o Móvil
 */
export async function pickFromGallery(): Promise<ImagePickerResult> {
  try {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return new Promise<ImagePickerResult>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) {
            resolve({ success: false, cancelled: true });
            return;
          }

          const reader = new FileReader();
          reader.onload = async () => {
            const rawUri = reader.result as string;
            const compressedUri = await compressImageWeb(rawUri);
            resolve({ success: true, uri: compressedUri });
          };
          reader.onerror = () => {
            resolve({ success: false, error: 'No se pudo leer la imagen' });
          };
          reader.readAsDataURL(file);
        };

        input.click();
      });
    } else {
      // Entorno nativo (iOS / Android)
      const ImagePicker = require('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'Permiso de galería denegado' };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return { success: false, cancelled: true };
      }

      return { success: true, uri: result.assets[0].uri };
    }
  } catch (error: any) {
    console.error('Error al seleccionar de galería:', error);
    return { success: false, error: error?.message || 'Error inesperado al abrir galería' };
  }
}
