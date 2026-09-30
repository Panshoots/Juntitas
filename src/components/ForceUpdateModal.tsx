import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UpdateCheckResult, applyAppUpdate } from '../services/appUpdateService';

interface ForceUpdateModalProps {
  visible: boolean;
  updateInfo: UpdateCheckResult | null;
  onClose?: () => void;
}

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  visible,
  updateInfo,
  onClose,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progressText, setProgressText] = useState('Preparando actualización...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!visible || !updateInfo) return null;

  const handleStartUpdate = async () => {
    setIsUpdating(true);
    setErrorMessage(null);

    try {
      if (updateInfo.source === 'ota') {
        setProgressText('Descargando la última versión...');
        await applyAppUpdate((status) => setProgressText(status));
      } else if (updateInfo.source === 'apk' && updateInfo.apkUrl) {
        setProgressText('Abriendo enlace de descarga...');
        await Linking.openURL(updateInfo.apkUrl);
      } else {
        // Fallback para web o recarga manual
        await applyAppUpdate();
      }
    } catch (err: any) {
      console.error('Error durante la actualización:', err);
      setIsUpdating(false);
      setErrorMessage(
        err?.message || 'Ocurrió un error al descargar la actualización. Intenta nuevamente.'
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Bloqueante si es obligatoria: no se cierra con botón atrás
        if (!updateInfo.isMandatory && onClose) {
          onClose();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {isUpdating ? (
            <View style={styles.loadingContainer}>
              <View style={styles.iconCircleUpdating}>
                <ActivityIndicator size="large" color="#4F46E5" />
              </View>

              <Text style={styles.updatingTitle}>Actualizando Juntitas 🐾</Text>
              <Text style={styles.updatingSubtitle}>{progressText}</Text>

              <View style={styles.tipBox}>
                <MaterialCommunityIcons name="information-outline" size={18} color="#2563EB" />
                <Text style={styles.tipText}>
                  La aplicación se reiniciará automáticamente al terminar para cargar las últimas mejoras.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.contentContainer}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="rocket-launch" size={38} color="#4F46E5" />
              </View>

              <Text style={styles.badge}>Nueva Versión Lista</Text>
              <Text style={styles.title}>¡Actualización Disponible!</Text>

              <Text style={styles.description}>
                Hemos preparado mejoras de seguridad, nuevas funciones y correcciones para que tengas la mejor experiencia.
              </Text>

              {updateInfo.releaseNotes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesTitle}>Novedades:</Text>
                  <Text style={styles.notesContent}>{updateInfo.releaseNotes}</Text>
                </View>
              ) : null}

              {errorMessage && (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={handleStartUpdate}
              >
                <MaterialCommunityIcons name="download" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>
                  {updateInfo.source === 'apk' ? 'Descargar Nuevo APK 📱' : 'Actualizar y Reiniciar Ahora ⚡'}
                </Text>
              </TouchableOpacity>

              {!updateInfo.isMandatory && onClose && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onClose}
                >
                  <Text style={styles.secondaryButtonText}>Recordármelo más tarde</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircleUpdating: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  notesBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  updatingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  updatingSubtitle: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    width: '100%',
  },
  tipText: {
    fontSize: 12,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});
