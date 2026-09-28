import { Platform } from 'react-native';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export const APP_VERSION = '1.2.0';
export const BUILD_NUMBER = 2;
export const RELEASE_DATE = '28 Septiembre 2026';
export const RELEASE_NOTES = 'Verificación de Identidad por IA 100% Gratuita (KYC con Carnet Chileno), Insignia de Tutor Verificado y Sincronización Automática.';

export interface AppVersionInfo {
  currentVersion: string;
  buildNumber: number;
  releaseDate: string;
  releaseNotes: string;
  latestVersion?: string;
  isUpdateAvailable?: boolean;
}

/**
 * Registra o sincroniza la versión actual en Firestore para que todos los dispositivos
 * puedan detectar si hay una nueva versión disponible y forzar un refresco automático.
 */
export const syncAppVersionWithServer = async (): Promise<AppVersionInfo> => {
  try {
    const configRef = doc(db, 'app_config', 'version_control');
    const snap = await getDoc(configRef);

    if (snap.exists()) {
      const data = snap.data();
      const serverVersion = data.latestVersion || APP_VERSION;
      const serverBuild = data.buildNumber || BUILD_NUMBER;

      // Si la versión local es mayor a la del servidor, actualizamos el servidor
      if (BUILD_NUMBER > serverBuild) {
        await setDoc(configRef, {
          latestVersion: APP_VERSION,
          buildNumber: BUILD_NUMBER,
          releaseDate: RELEASE_DATE,
          releaseNotes: RELEASE_NOTES,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      return {
        currentVersion: APP_VERSION,
        buildNumber: BUILD_NUMBER,
        releaseDate: RELEASE_DATE,
        releaseNotes: RELEASE_NOTES,
        latestVersion: serverVersion,
        isUpdateAvailable: serverBuild > BUILD_NUMBER
      };
    } else {
      // Primera inicialización en Firestore
      await setDoc(configRef, {
        latestVersion: APP_VERSION,
        buildNumber: BUILD_NUMBER,
        releaseDate: RELEASE_DATE,
        releaseNotes: RELEASE_NOTES,
        updatedAt: serverTimestamp()
      });

      return {
        currentVersion: APP_VERSION,
        buildNumber: BUILD_NUMBER,
        releaseDate: RELEASE_DATE,
        releaseNotes: RELEASE_NOTES,
        latestVersion: APP_VERSION,
        isUpdateAvailable: false
      };
    }
  } catch (err) {
    console.warn('Error sincronizando versión de la app:', err);
    return {
      currentVersion: APP_VERSION,
      buildNumber: BUILD_NUMBER,
      releaseDate: RELEASE_DATE,
      releaseNotes: RELEASE_NOTES,
      latestVersion: APP_VERSION,
      isUpdateAvailable: false
    };
  }
};

/**
 * Fuerza un refresco de la aplicación para cargar las últimas modificaciones.
 */
export const triggerAppRefresh = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Limpia caché de sesión si aplica y recarga
    window.location.reload();
  }
};
