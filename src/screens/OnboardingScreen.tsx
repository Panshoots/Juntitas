import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  description: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'people',
    iconColor: '#0284C7',
    title: 'Comunidades Caninas Oficiales',
    subtitle: 'La manada ideal para tu perrito',
    description: 'Encuentra y únete a grupos organizados por raza o comuna con administradores verificados. Sin desorden de mensajes perdidos en chats informales.'
  },
  {
    id: '2',
    icon: 'calendar',
    iconColor: '#10B981',
    title: 'Juntas & Encuentros Estructurados',
    subtitle: 'Vida social segura y organizada',
    description: 'Conoce fecha, hora, mapas exactos en Google Maps y conteo transparente separado entre cantidad de tutores y cantidad de perritos asistentes.'
  },
  {
    id: '3',
    icon: 'ribbon',
    iconColor: '#F59E0B',
    title: 'Pasaporte Perruno Digital',
    subtitle: 'El carnet coleccionable de tu perro',
    description: 'Registra su trayectoria, gana medallas por asistencia a juntas, celebra aniversarios y acumula títulos de honor en su pasaporte canino.'
  },
  {
    id: '4',
    icon: 'gift',
    iconColor: '#8B5CF6',
    title: 'Huellitas & Tiendas Verificadas',
    subtitle: 'Recompensas reales en comercios',
    description: 'Gana Huellitas por participar activamente, desbloquea la Ruleta Sorpresa diaria y canjea cupones y premios en pastelerías y tiendas caninas.'
  }
];

interface OnboardingScreenProps {
  onStartRegister: () => void;
  onStartLogin: () => void;
  onQuickAdminAccess?: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onStartRegister,
  onStartLogin,
  onQuickAdminAccess
}) => {
  const insets = useSafeAreaInsets();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const currentSlide = SLIDES[currentSlideIndex];

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Cabecera / Marca */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={{ fontSize: 24 }}>🐾</Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.brandTitle}>Juntitas</Text>
            <Text style={styles.brandSubtitle}>Comunidades, Juntas & Pasaporte Canino</Text>
          </View>
        </View>

        {onQuickAdminAccess && (
          <TouchableOpacity style={styles.quickAdminBtn} onPress={onQuickAdminAccess}>
            <Ionicons name="shield-checkmark" size={14} color="#EF4444" />
            <Text style={styles.quickAdminText}>Acceso Admin</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Contenido del Slide Activo */}
      <View style={styles.slideCard}>
        <View style={[styles.iconCircle, { backgroundColor: currentSlide.iconColor + '15' }]}>
          <Ionicons name={currentSlide.icon} size={48} color={currentSlide.iconColor} />
        </View>

        <Text style={styles.slideTitle}>{currentSlide.title}</Text>
        <Text style={[styles.slideSubtitle, { color: currentSlide.iconColor }]}>{currentSlide.subtitle}</Text>
        <Text style={styles.slideDesc}>{currentSlide.description}</Text>

        {/* Indicadores de Slide */}
        <View style={styles.dotsRow}>
          {SLIDES.map((s, idx) => (
            <TouchableOpacity 
              key={s.id} 
              onPress={() => setCurrentSlideIndex(idx)}
              style={[
                styles.dot,
                idx === currentSlideIndex && [styles.dotActive, { backgroundColor: currentSlide.iconColor }]
              ]} 
            />
          ))}
        </View>
      </View>

      {/* Botones de Navegación de Diapositiva */}
      <View style={styles.navRow}>
        <TouchableOpacity 
          style={[styles.navStepBtn, currentSlideIndex === 0 && { opacity: 0.3 }]}
          disabled={currentSlideIndex === 0}
          onPress={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
        >
          <Ionicons name="chevron-back" size={20} color="#64748B" />
          <Text style={styles.navStepText}>Anterior</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navStepBtn, currentSlideIndex === SLIDES.length - 1 && { opacity: 0.3 }]}
          disabled={currentSlideIndex === SLIDES.length - 1}
          onPress={() => setCurrentSlideIndex(prev => Math.min(SLIDES.length - 1, prev + 1))}
        >
          <Text style={styles.navStepText}>Siguiente</Text>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Acciones Principales de Entrada */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={onStartRegister}>
          <Text style={styles.primaryButtonText}>🚀 Comenzar / Registrarme</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onStartLogin}>
          <Text style={styles.secondaryButtonText}>Ya tengo cuenta • Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  quickAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  quickAdminText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  slideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
    marginVertical: 10,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  slideSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  slideDesc: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  navStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  navStepText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
});
