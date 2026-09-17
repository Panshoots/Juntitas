import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { 
  rollSurprisePawWithCooldown, 
  getRemainingCooldown, 
  formatCooldown 
} from '../services/gamificationService';
import { checkAndClaimDailyStreak, DailyStreakResult } from '../services/streakService';
import { SurprisePawModal } from '../components/SurprisePawModal';
import { SurprisePawReward } from '../models/Gamification';
import { useAuth } from '../context/AuthContext';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { currentUser, currentDogs, isSuperAdmin } = useAuth();

  const [pawBalance, setPawBalance] = useState(currentUser.pawBalance || 100);
  const [surpriseReward, setSurpriseReward] = useState<SurprisePawReward | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [showSurpriseModal, setShowSurpriseModal] = useState(false);

  // Racha Diaria (Daily Streak)
  const [streakReward, setStreakReward] = useState<DailyStreakResult | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);

  // Reclamar racha diaria al iniciar sesión o abrir HomeScreen
  useEffect(() => {
    const claimStreak = async () => {
      if (currentUser?.id) {
        const result = await checkAndClaimDailyStreak(currentUser.id);
        if (result.success && !result.alreadyClaimed && result.pawsAwarded > 0) {
          setStreakReward(result);
          setShowStreakModal(true);
          setPawBalance(prev => prev + result.pawsAwarded);
        }
      }
    };
    claimStreak();
  }, [currentUser?.id]);

  // Comprobar cooldown cada segundo
  useEffect(() => {
    const updateCd = () => {
      const remaining = getRemainingCooldown(currentUser.id);
      setCooldownRemaining(remaining);
    };
    updateCd();
    const interval = setInterval(updateCd, 1000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const handleTestSurprisePaw = () => {
    const res = rollSurprisePawWithCooldown(currentUser.id);
    if (res.success && res.reward) {
      setSurpriseReward(res.reward);
      setCooldownRemaining(0);
    } else {
      setSurpriseReward(null);
      setCooldownRemaining(res.remainingMs || 1000);
    }
    setShowSurpriseModal(true);
  };

  const handleClaimReward = () => {
    if (surpriseReward) {
      setPawBalance(prev => prev + surpriseReward.pawsAmount);
    }
    setShowSurpriseModal(false);
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
      {/* Header Principal con balance de Huellitas */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.appName}>🐶 Juntitas</Text>
          <Text style={styles.tagline}>Vida social & experiencias para perritos</Text>
        </View>

        <TouchableOpacity 
          style={styles.pawsBadge}
          onPress={() => navigation.navigate('Rewards')}
          activeOpacity={0.8}
        >
          <Ionicons name="paw" size={18} color="#F59E0B" />
          <Text style={styles.pawsCount}>{pawBalance} 🐾</Text>
        </TouchableOpacity>
      </View>

      {/* Banner de Super Admin para Acceso Inmediato al CRM */}
      {isSuperAdmin && (
        <TouchableOpacity 
          style={styles.adminBanner} 
          onPress={() => navigation.navigate('AdminOrStore')}
          activeOpacity={0.88}
        >
          <View style={styles.adminBannerLeft}>
            <View style={styles.adminShieldCircle}>
              <Ionicons name="shield-checkmark" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <Text style={styles.adminBannerTitle} numberOfLines={1}>Super Admin: Francisco Juillet</Text>
              <Text style={styles.adminBannerSubtitle} numberOfLines={1}>Toca aquí para abrir el Panel CRM Global</Text>
            </View>
          </View>
          <View style={styles.adminOpenButton}>
            <Text style={styles.adminOpenText}>Abrir CRM</Text>
            <Ionicons name="chevron-forward" size={14} color="#EF4444" />
          </View>
        </TouchableOpacity>
      )}

      {/* Banner Principal / Pasaporte Perruno */}
      {currentDogs && currentDogs.length > 0 ? (
        <TouchableOpacity 
          style={styles.passportBanner}
          onPress={() => navigation.navigate('DogPassport', { dog: currentDogs[0] })}
          activeOpacity={0.9}
        >
          <View style={styles.passportBannerContent}>
            <View style={styles.passportHeaderTag}>
              <Ionicons name="sparkles" size={14} color="#F59E0B" />
              <Text style={styles.passportTagText}>PASAPORTE OFICIAL</Text>
            </View>
            <Text style={styles.passportBannerTitle}>Pasaporte de {currentDogs[0].name}</Text>
            <Text style={styles.passportBannerSubtitle}>
              {currentDogs[0].breed} • {currentDogs[0].passport?.attendedEventsCount || 0} Juntas • {currentDogs[0].passport?.badges?.length || 1} Medallas
            </Text>
            <View style={styles.viewPassportButton}>
              <Text style={styles.viewPassportText}>Abrir Carnet</Text>
              <Ionicons name="arrow-forward" size={14} color="#0284C7" />
            </View>
          </View>
          <Image 
            source={{ uri: currentDogs[0].photoUrls?.[0] || 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300' }} 
            style={styles.bannerDogAvatar}
          />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[styles.passportBanner, { backgroundColor: '#0369A1' }]}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.9}
        >
          <View style={styles.passportBannerContent}>
            <View style={[styles.passportHeaderTag, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="paw" size={14} color="#D97706" />
              <Text style={[styles.passportTagText, { color: '#B45309' }]}>NUEVO PASAPORTE</Text>
            </View>
            <Text style={styles.passportBannerTitle}>+ Registra a tu Perrito</Text>
            <Text style={styles.passportBannerSubtitle}>
              Crea su carnet oficial y gana +50 Huellitas de bienvenida
            </Text>
            <View style={styles.viewPassportButton}>
              <Text style={styles.viewPassportText}>Registrar Ahora</Text>
              <Ionicons name="add-circle" size={14} color="#0284C7" />
            </View>
          </View>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300' }} 
            style={styles.bannerDogAvatar}
          />
        </TouchableOpacity>
      )}

      {/* Acciones Rápidas del Plan Maestro */}
      <Text style={styles.sectionHeader}>Explora Juntitas</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Events')}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="calendar" size={26} color="#0284C7" />
          </View>
          <Text style={styles.actionTitle}>Juntas & Eventos</Text>
          <Text style={styles.actionSub}>Próximas salidas caninas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Communities')}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="people" size={26} color="#D97706" />
          </View>
          <Text style={styles.actionTitle}>Comunidades</Text>
          <Text style={styles.actionSub}>Grupos oficiales por raza</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Rewards')}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="gift" size={26} color="#15803D" />
          </View>
          <Text style={styles.actionTitle}>Tienda Huellitas</Text>
          <Text style={styles.actionSub}>Canje de premios & QR</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, cooldownRemaining > 0 && { borderColor: '#FCD34D' }]}
          onPress={handleTestSurprisePaw}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: cooldownRemaining > 0 ? '#FEF3C7' : '#F3E8FF' }]}>
            <Ionicons 
              name={cooldownRemaining > 0 ? "hourglass" : "help-buoy"} 
              size={26} 
              color={cooldownRemaining > 0 ? "#D97706" : "#7E22CE"} 
            />
          </View>
          <Text style={styles.actionTitle}>Huella Sorpresa</Text>
          <Text style={[styles.actionSub, cooldownRemaining > 0 && { color: '#B45309', fontWeight: 'bold' }]}>
            {cooldownRemaining > 0 ? formatCooldown(cooldownRemaining) : '¡Tirada disponible!'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Próxima Junta Destacada */}
      <View style={styles.featuredSection}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionHeader}>Próxima Junta Oficial</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Events')}>
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.eventCard}
          onPress={() => navigation.navigate('Events')}
          activeOpacity={0.9}
        >
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600' }} 
            style={styles.eventCardImage} 
          />
          <View style={styles.eventCardBody}>
            <View style={styles.eventStatusRow}>
              <Text style={styles.communityTag}>Golden Retrievers Chile</Text>
              <View style={styles.confirmedBadge}>
                <Text style={styles.confirmedBadgeText}>Confirmada</Text>
              </View>
            </View>
            <Text style={styles.eventTitle}>Gran Junta Dorada de Primavera</Text>
            <Text style={styles.eventLocationText}>📍 Parque Inés de Suárez, Providencia</Text>
            
            <View style={styles.eventFooter}>
              <Text style={styles.eventCounts}>👥 28 Tutores • 🐾 34 Perritos</Text>
              <Text style={styles.eventDate}>Dom 20 Oct, 15:30</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />

      <SurprisePawModal 
        visible={showSurpriseModal}
        reward={surpriseReward}
        cooldownMs={cooldownRemaining}
        onClose={handleClaimReward}
      />

      {/* Modal de Racha Diaria (Daily Streak Reward) */}
      <Modal visible={showStreakModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.streakModalCard}>
            <View style={styles.streakIconCircle}>
              <Text style={{ fontSize: 38 }}>🔥</Text>
            </View>
            <Text style={styles.streakTitle}>¡Racha Diaria Activa!</Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>DÍA {streakReward?.streak} CONSECUTIVO</Text>
            </View>
            <Text style={styles.streakPawsAmount}>+{streakReward?.pawsAwarded} 🐾 Huellitas</Text>
            <Text style={styles.streakMessage}>
              {streakReward?.message}
            </Text>
            <Text style={styles.streakNextNote}>
              ¡Sigue ingresando a diario! Cada día consecutivo acumularás más Huellitas para canjear en la Tienda.
            </Text>
            <TouchableOpacity 
              style={styles.streakClaimBtn}
              onPress={() => setShowStreakModal(false)}
            >
              <Text style={styles.streakClaimBtnText}>¡Genial, gracias! 🐾</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  tagline: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  pawsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  pawsCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
  passportBanner: {
    backgroundColor: '#0284C7',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  passportBannerContent: {
    flex: 1,
    marginRight: 12,
  },
  passportHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
    gap: 4,
  },
  passportTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  passportBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  passportBannerSubtitle: {
    fontSize: 12,
    color: '#E0F2FE',
    marginBottom: 12,
  },
  viewPassportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  viewPassportText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  bannerDogAvatar: {
    width: 84,
    height: 84,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 11,
    color: '#64748B',
  },
  featuredSection: {
    marginBottom: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '700',
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eventCardImage: {
    width: '100%',
    height: 140,
  },
  eventCardBody: {
    padding: 16,
  },
  eventStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  communityTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confirmedBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  eventLocationText: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 10,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  eventCounts: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  eventDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  adminBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  adminBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  adminShieldCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  adminBannerSubtitle: {
    fontSize: 11,
    color: '#B91C1C',
  },
  adminOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 2,
  },
  adminOpenText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  streakModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  streakIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  streakTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  streakBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 1,
  },
  streakPawsAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#D97706',
    marginBottom: 8,
  },
  streakMessage: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  streakNextNote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 18,
  },
  streakClaimBtn: {
    backgroundColor: '#0284C7',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  streakClaimBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});

