import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dog } from '../models/Dog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export const DogPassportScreen: React.FC<{ route?: { params?: { dog?: Dog } } }> = ({ route }) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { currentDogs } = useAuth();
  
  const dog = route?.params?.dog || currentDogs[0] || {
    id: 'demo-dog',
    ownerId: 'user-1',
    name: 'Mi Perrito',
    breed: 'Mestizo / Otro',
    isMixed: false,
    birthDate: new Date(2022, 5, 15),
    gender: 'macho',
    size: 'grande',
    description: 'Amante de las pelotas de tenis y nadar en la laguna.',
    personalityTraits: ['Sociable', 'Juguetón', 'Enérgico'],
    photoUrls: ['https://images.unsplash.com/photo-1552053831-71594a27632d?w=600'],
    passport: {
      attendedEventsCount: 5,
      badges: ['explorador_parque', 'primer_aniversario', 'amigo_fiel'],
      highlightPhotos: ['https://images.unsplash.com/photo-1552053831-71594a27632d?w=600'],
      seniorityDate: new Date(2024, 0, 10),
      communitiesCount: 2,
      honorTitle: 'Veterano de Juntas'
    },
    createdAt: new Date()
  } as Dog;

  const calculateAge = (birthDate: any) => {
    if (!birthDate) return 'Desconocida';
    const birth = birthDate.toDate ? birthDate.toDate() : new Date(birthDate);
    const diff = Date.now() - birth.getTime();
    const ageDate = new Date(diff);
    const years = Math.abs(ageDate.getUTCFullYear() - 1970);
    const months = ageDate.getUTCMonth();
    return years > 0 ? `${years} año(s)` : `${months} mes(es)`;
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
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
});
