import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  ActivityIndicator, 
  Platform 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

export const SplashScreen: React.FC = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  const loadingMessages = [
    'Verificando tu sesión...',
    'Cargando la manada...',
    'Preparando tus comunidades...',
    '¡Casi listos para pasear!'
  ];

  useEffect(() => {
    // Animación de entrada suave
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Animación de pulso continuo para la patita
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Rotación suave de mensajes de carga
    const interval = setInterval(() => {
      setLoadingTextIndex(prev => (prev + 1) % loadingMessages.length);
    }, 900);

    return () => {
      pulse.stop();
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Logo animado con efecto pulso */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.pawEmoji}>🐾</Text>
        </Animated.View>

        {/* Marca y Subtítulo */}
        <Text style={styles.brandTitle}>Juntitas</Text>
        <Text style={styles.brandTagline}>Comunidades, Juntas & Pasaporte Perruno</Text>

        {/* Indicador de carga activo */}
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingStatusText}>{loadingMessages[loadingTextIndex]}</Text>
        </View>
      </Animated.View>

      {/* Pie de pantalla */}
      <View style={styles.footer}>
        <View style={styles.footerBadge}>
          <Text style={styles.footerBadgeIcon}>🐶</Text>
          <Text style={styles.footerBadgeText}>Vida social canina segura y organizada</Text>
        </View>
        <Text style={styles.versionText}>Juntitas v1.0 • Hecho con cariño para la manada</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
    height: (Platform.OS === 'web' ? '100vh' : '100%') as any,
    width: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#E0F2FE',
    borderWidth: 3,
    borderColor: '#BAE6FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  pawEmoji: {
    fontSize: 52,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 36,
  },
  loaderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    minWidth: 240,
  },
  loadingStatusText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    width: '100%',
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 10,
  },
  footerBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  footerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  versionText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
