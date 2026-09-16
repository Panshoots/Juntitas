import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  Switch 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export const UserProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { activeProfile, currentUser, currentDogs, isSuperAdmin, isBusinessOwner } = useAuth();

  const [showDogsPublic, setShowDogsPublic] = useState(true);
  const [showCommunitiesPublic, setShowCommunitiesPublic] = useState(true);
  const [showAttendancePublic, setShowAttendancePublic] = useState(true);

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Cabecera de Perfil */}
      <View style={styles.header}>
        <Image 
          source={{ uri: currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300' }} 
          style={styles.avatar} 
        />
        <Text style={styles.userName}>{currentUser.displayName}</Text>
        <Text style={styles.userLocation}>📍 {currentUser.location?.comuna}, {currentUser.location?.region}</Text>
        <Text style={styles.userEmail}>{currentUser.email}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.roleBadge, { backgroundColor: activeProfile.roleColor }]}>
            <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
            <Text style={styles.roleBadgeText}>{activeProfile.roleLabel}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="paw" size={14} color="#D97706" />
            <Text style={[styles.roleBadgeText, { color: '#B45309' }]}>{currentUser.pawBalance} Huellitas</Text>
          </View>
        </View>
      </View>

      {/* Atajos de Rol Especiales */}
      {isSuperAdmin && (
        <View style={styles.specialSection}>
          <TouchableOpacity 
            style={styles.adminActionCard}
            onPress={() => navigation.navigate('SuperAdminPanel')}
          >
            <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.adminActionTitle}>Panel de Control Global</Text>
              <Text style={styles.adminActionSub}>Revisa solicitudes de comunidades, tiendas y auditoría</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {activeProfile.roleType === 'primary_admin' && (
        <View style={styles.specialSection}>
          <View style={[styles.adminActionCard, { backgroundColor: '#D97706' }]}>
            <Ionicons name="ribbon" size={24} color="#FFFFFF" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.adminActionTitle}>👑 Administrador Principal</Text>
              <Text style={styles.adminActionSub}>Titular de {activeProfile.communityNameManaged} • Tienes control exclusivo para nombrar secundarios y transferir titularidad.</Text>
            </View>
          </View>
        </View>
      )}

      {activeProfile.roleType === 'secondary_admin' && (
        <View style={styles.specialSection}>
          <View style={[styles.adminActionCard, { backgroundColor: '#0284C7' }]}>
            <Ionicons name="shield-half" size={24} color="#FFFFFF" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.adminActionTitle}>🛡️ Administrador Secundario (Delegado)</Text>
              <Text style={styles.adminActionSub}>Asignado en {activeProfile.communityNameManaged} • Permisos: Crear/Editar Juntas, Moderar Contenido. (Protegido por regla R-0802: no puedes degradar al titular).</Text>
            </View>
          </View>
        </View>
      )}

      {isBusinessOwner && (
        <View style={styles.specialSection}>
          <TouchableOpacity 
            style={[styles.adminActionCard, { backgroundColor: '#7E22CE' }]}
            onPress={() => navigation.navigate('BusinessPortal')}
          >
            <Ionicons name="storefront" size={24} color="#FFFFFF" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.adminActionTitle}>Portal de Tienda & Stands</Text>
              <Text style={styles.adminActionSub}>Valida cupones de juntas y gestiona tus postulaciones a eventos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Mis Perritos Registrados (Pasaporte Perruno) */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>🐶 Mis Perritos Registrados ({currentDogs.length})</Text>
        </View>

        {currentDogs.length === 0 ? (
          <View style={styles.emptyDogsCard}>
            <Text style={styles.emptyDogsText}>Este perfil de prueba no tiene perritos asignados.</Text>
          </View>
        ) : (
          currentDogs.map((dog) => (
            <TouchableOpacity 
              key={dog.id}
              style={styles.petCard}
              onPress={() => navigation.navigate('DogPassport', { dog })}
              activeOpacity={0.85}
            >
              <Image 
                source={{ uri: dog.photoUrls?.[0] || 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200' }} 
                style={styles.petAvatar} 
              />
              <View style={styles.petInfo}>
                <Text style={styles.petName}>{dog.name}</Text>
                <Text style={styles.petBreed}>{dog.breed} • {dog.gender}</Text>
                <Text style={styles.petMeta}>
                  {dog.passport.attendedEventsCount} Juntas asistidas • {dog.passport.badges.length} Medallas
                </Text>
              </View>
              <View style={styles.passportTag}>
                <Text style={styles.passportTagText}>Ver Pasaporte ➔</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Privacidad & Transparencia (Sección 3 & 22 Plan Maestro) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 Privacidad & Visibilidad</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Mostrar mis perritos públicamente</Text>
          <Switch value={showDogsPublic} onValueChange={setShowDogsPublic} trackColor={{ true: '#0284C7' }} />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Mostrar mis comunidades en mi perfil</Text>
          <Switch value={showCommunitiesPublic} onValueChange={setShowCommunitiesPublic} trackColor={{ true: '#0284C7' }} />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Mostrar mi asistencia en la lista de juntas</Text>
          <Switch value={showAttendancePublic} onValueChange={setShowAttendancePublic} trackColor={{ true: '#0284C7' }} />
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    marginBottom: 10,
    backgroundColor: '#E2E8F0',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  userLocation: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  specialSection: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  adminActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 18,
  },
  adminActionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  adminActionSub: {
    color: '#FEE2E2',
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  emptyDogsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyDogsText: {
    fontSize: 13,
    color: '#64748B',
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  petAvatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
  },
  petInfo: {
    flex: 1,
    marginLeft: 12,
  },
  petName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  petBreed: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  petMeta: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
    fontWeight: '600',
  },
  passportTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  passportTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    marginRight: 10,
  },
});
