import { Platform, AppState, AppStateStatus, Linking } from 'react-native';
import * as Updates from 'expo-updates';
import { syncAppVersionWithServer, APP_VERSION, BUILD_NUMBER } from './appVersionService';

export interface UpdateCheckResult {
  isAvailable: boolean;
  source: 'ota' | 'apk' | 'none';
  version?: string;
  releaseNotes?: string;
  apkUrl?: string;
  isMandatory?: boolean;
}

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';

/**
 * Comprueba si existe una actualización disponible en Expo Updates (OTA)
 * o en el control de versiones de Firestore (nuevo APK).
 */
export const checkAppUpdates = async (): Promise<UpdateCheckResult> => {
  // 1. En entornos donde expo-updates esté habilitado (APKs de producción/preview)
  if (!__DEV__ && Updates.isEnabled) {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        return {
          isAvailable: true,
          source: 'ota',
          version: APP_VERSION,
          releaseNotes: 'Nueva actualización de mejoras, rendimiento y diseño.',
          isMandatory: true,
        };
      }
    } catch (otaErr) {
      console.warn('Verificación OTA no disponible o error de red:', otaErr);
    }
  }

  // 2. Comprobar contra Firestore (control de versión y enlace de APK)
  try {
    const versionInfo = await syncAppVersionWithServer();
    if (versionInfo.isUpdateAvailable) {
      return {
        isAvailable: true,
        source: 'apk',
        version: versionInfo.latestVersion || 'Nueva versión',
        releaseNotes: versionInfo.releaseNotes || 'Hay una nueva versión obligatoria disponible.',
        isMandatory: true,
      };
    }
  } catch (serverErr) {
    console.warn('Error verificando versión en servidor:', serverErr);
  }

  return {
    isAvailable: false,
    source: 'none',
  };
};

/**
 * Descarga y aplica la actualización.
 * Si es OTA, descarga el bundle y reinicia forzosamente la app con Updates.reloadAsync().
 * Si es APK, abre el navegador con la URL de descarga directa.
 */
export const applyAppUpdate = async (
  onProgress?: (statusText: string) => void
): Promise<void> => {
  if (!__DEV__ && Updates.isEnabled) {
    try {
      onProgress?.('Descargando las últimas mejoras...');
      const fetchResult = await Updates.fetchUpdateAsync();
      
      if (fetchResult.isNew) {
        onProgress?.('¡Actualización lista! Reiniciando la app...');
        // Pequeña pausa para que el usuario visualice la confirmación
        await new Promise((resolve) => setTimeout(resolve, 800));
        await Updates.reloadAsync();
        return;
      }
    } catch (err) {
      console.error('Error aplicando actualización OTA:', err);
      throw err;
    }
  }

  // Si no está habilitado expo-updates o estamos en web/desarrollo
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    onProgress?.('Refrescando aplicación...');
    window.location.reload();
  }
};

/**
 * Registra un detector de ciclo de vida (AppState).
 * Cada vez que la app pase de segundo plano (background) a primer plano (active),
 * se ejecuta el callback para actualizar datos y comprobar nuevas versiones.
 */
export const subscribeToAppForeground = (onForeground: () => void): (() => void) => {
  let currentAppState = AppState.currentState;

  const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (
      currentAppState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('📱 App volvió a primer plano. Ejecutando refresco automático...');
      onForeground();
    }
    currentAppState = nextAppState;
  });

  return () => {
    subscription.remove();
  };
};
