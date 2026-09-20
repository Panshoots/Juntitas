import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dog } from '../models/Dog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getUserByIdFromDb } from '../services/userService';

export const DogPassportScreen: React.FC<{ route?: { params?: { dog?: Dog } } }> = ({ route }) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { currentDogs, currentUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [ownerData, setOwnerData] = useState<any>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };
  
  const dog = route?.params?.dog || currentDogs[0] || {
    id: 'demo-dog',
    ownerId: 'user-1',
    name: 'Mi Perrito',
    breed: 'Mestizo / Otro',
    size: 'mediano',
    birthDate: new Date(2023, 5, 15),
    gender: 'macho',
    isMixed: false,
    photoUrls: ['https://images.unsplash.com/photo-1552053831-71594a27632d?w=400'],
    passport: {
      qrCode: 'PUPPY-PASS-DEMO',
      attendedEventsCount: 3,
      honorTitle: 'Perrito Aventurero',
      badges: []
    }
  };

  useEffect(() => {
    if (dog?.ownerId) {
      getUserByIdFromDb(dog.ownerId).then(u => {
        if (u) setOwnerData(u);
      }).catch(e => console.warn('Error cargando tutor del perrito:', e));
    }
  }, [dog?.ownerId]);

  const rawInstagram = dog.instagramHandle || dog.passport?.instagramHandle || (dog.ownerId === currentUser?.id ? currentUser?.contact?.instagram : ownerData?.contact?.instagram);
  const isCustomInstagram = !!rawInstagram;
  const displayHandle = rawInstagram 
    ? (rawInstagram.startsWith('@') ? rawInstagram : `@${rawInstagram}`)
    : `@${dog.name.toLowerCase().replace(/[^a-z0-9_]/gi, '')}.juntitas`;

  const handleOpenInstagram = async () => {
    const cleanHandle = displayHandle.replace(/^@/, '').trim();
    const instagramUrl = `https://instagram.com/${cleanHandle}`;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(instagramUrl, '_blank');
      } else {
        await Linking.openURL(instagramUrl);
      }
    } catch (e) {
      Alert.alert('Instagram', `Visita el perfil de ${dog.name} en Instagram:\n${instagramUrl}`);
    }
  };

  const handleCopyHandle = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(displayHandle);
      }
    } catch (e) {}
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
    Alert.alert('¡Handle Copiado!', `${displayHandle} ha sido copiado al portapapeles.`);
  };

  const calculateAge = (date: Date | any) => {
    if (!date) return 'Desconocida';
    const bDate = date.toDate ? date.toDate() : new Date(date);
    const diffMs = Date.now() - bDate.getTime();
    const ageDate = new Date(diffMs);
    const years = Math.abs(ageDate.getUTCFullYear() - 1970);
    const months = ageDate.getUTCMonth();
    return years > 0 ? `${years} año(s)` : `${months} mes(es)`;
  };

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0284C7']} tintColor="#0284C7" />
      }
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pasaporte Perruno Oficial</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.passportCard}>
        <View style={styles.passportHeader}>
          <Ionicons name="paw" size={28} color="#F59E0B" />
          <Text style={styles.passportHeaderText}>REPÚBLICA PERRUNA • PASAPORTE</Text>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
        </View>

        <View style={styles.mainInfoRow}>
          <Image 
            source={{ uri: dog.photoUrls?.[0] || 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400' }} 
            style={styles.dogAvatar} 
          />
          <View style={styles.identityDetails}>
            <Text style={styles.dogName}>{dog.name}</Text>
            <Text style={styles.dogBreed}>
              {dog.isMixed ? 'Mestizo / Criollo' : dog.breed}
            </Text>
            {dog.passport?.honorTitle && (
              <View style={styles.honorBadge}>
                <Ionicons name="ribbon" size={14} color="#D97706" />
                <Text style={styles.honorTitleText}>{dog.passport.honorTitle}</Text>
              </View>
            )}
            <Text style={styles.infoMeta}>Edad: {calculateAge(dog.birthDate)}</Text>
            <Text style={styles.infoMeta}>Sexo: {dog.gender} • Tamaño: {dog.size}</Text>
          </View>
        </View>

        <View style={styles.traitsRow}>
          {dog.personalityTraits?.map((trait, idx) => (
            <View key={idx} style={styles.traitChip}>
              <Text style={styles.traitText}>✨ {trait}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statsDivider} />
        <View style={styles.passportStats}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{dog.passport?.attendedEventsCount || 0}</Text>
            <Text style={styles.statLabel}>Juntas Asistidas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{dog.passport?.badges?.length || 0}</Text>
            <Text style={styles.statLabel}>Medallas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{dog.passport?.communitiesCount || 1}</Text>
            <Text style={styles.statLabel}>Comunidades</Text>
          </View>
        </View>
      </View>

      {/* TARJETA DE INSTAGRAM OFICIAL DEL PERRITO */}
      <View style={styles.instagramCard}>
        <View style={styles.instagramHeaderRow}>
          <View style={styles.instagramBadge}>
            <Ionicons name="logo-instagram" size={18} color="#BE185D" />
            <Text style={styles.instagramBadgeText}>Instagram Canino</Text>
          </View>
          <View style={styles.verifiedTag}>
            <Ionicons name="sparkles" size={13} color="#0284C7" />
            <Text style={styles.verifiedTagText}>
              {isCustomInstagram ? 'Cuenta Vinculada' : 'Perfil Comunitario'}
            </Text>
          </View>
        </View>

        <View style={styles.instagramBodyRow}>
          <View style={styles.instagramIconContainer}>
            <Ionicons name="logo-instagram" size={30} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.instagramHandleText}>{displayHandle}</Text>
            <Text style={styles.instagramDescText}>
              {isCustomInstagram 
                ? `¡Sigue las aventuras de ${dog.name}, sus fotos en juntitas y momentos especiales!` 
                : `Sigue el perfil comunitario de ${dog.name} para enterarte de sus próximas juntitas y paseos.`}
            </Text>
          </View>
        </View>

        <View style={styles.instagramActionRow}>
          <TouchableOpacity 
            style={styles.instagramFollowBtn}
            onPress={handleOpenInstagram}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-instagram" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.instagramFollowBtnText}>Seguir en Instagram</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.instagramCopyBtn, copiedSuccess && { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}
            onPress={handleCopyHandle}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={copiedSuccess ? "checkmark" : "copy-outline"} 
              size={18} 
              color={copiedSuccess ? "#059669" : "#475569"} 
            />
            <Text style={[styles.instagramCopyBtnText, copiedSuccess && { color: '#059669' }]}>
              {copiedSuccess ? '¡Copiado!' : 'Copiar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Medallas & Reconocimientos</Text>
        <View style={styles.badgesContainer}>
          <View style={styles.badgeItem}>
            <View style={[styles.badgeIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="trophy" size={28} color="#D97706" />
            </View>
            <Text style={styles.badgeLabel}>Explorador</Text>
          </View>

          <View style={styles.badgeItem}>
            <View style={[styles.badgeIcon, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="heart" size={28} color="#4F46E5" />
            </View>
            <Text style={styles.badgeLabel}>Amigo Fiel</Text>
          </View>

          <View style={styles.badgeItem}>
            <View style={[styles.badgeIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="sparkles" size={28} color="#059669" />
            </View>
            <Text style={styles.badgeLabel}>1er Año</Text>
          </View>
        </View>
      </View>

      {dog.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Sobre {dog.name}</Text>
          <View style={styles.bioBox}>
            <Text style={styles.bioText}>{dog.description}</Text>
          </View>
        </View>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  passportCard: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  passportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 16,
  },
  passportHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.5,
  },
  mainInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dogAvatar: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  identityDetails: {
    marginLeft: 16,
    flex: 1,
  },
  dogName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  dogBreed: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 6,
  },
  honorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  honorTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    marginLeft: 4,
  },
  infoMeta: {
    fontSize: 12,
    color: '#94A3B8',
  },
  traitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  traitChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  traitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  statsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  passportStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0284C7',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeItem: {
    alignItems: 'center',
  },
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  bioBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bioText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  // ESTILOS INSTAGRAM CARD
  instagramCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FBCFE8',
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  instagramHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  instagramBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  instagramBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BE185D',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  instagramBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  instagramIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E1306C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  instagramHandleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  instagramDescText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  instagramActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  instagramFollowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1306C',
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  instagramFollowBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  instagramCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  instagramCopyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
});
