import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_DOG_PHOTOS, MAX_DOGS_STANDARD_PLAN } from '../services/dogService';
import { getUserRedemptions } from '../services/rewardService';
import { RewardRedemption } from '../models/Gamification';
import { getDogBreeds, DogBreed, MASTER_DOG_BREEDS } from '../services/breedService';
import { takePhoto, pickFromGallery } from '../services/imagePickerService';
import { useToast } from '../context/ToastContext';

interface OfficialBadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  pawsReward: number;
  requirement: string;
}

const ALL_OFFICIAL_BADGES: OfficialBadgeInfo[] = [
  {
    id: 'primer_registro',
    name: '🐶 Primer Registro',
    description: 'Registra a tu primer perrito en la plataforma Juntitas.',
    icon: 'paw',
    color: '#0284C7',
    pawsReward: 50,
    requirement: 'Registrar 1 perrito'
  },
  {
    id: 'explorador_parque',
    name: '🐾 Explorador del Parque',
    description: 'Asiste a tu primera junta canina comunitaria confirmada.',
    icon: 'compass',
    color: '#10B981',
    pawsReward: 100,
    requirement: 'Asistir a 1 junta oficial'
  },
  {
    id: 'lider_manada',
    name: '👑 Líder de Manada',
    description: 'Participa activamente en 5 o más juntas oficiales con tu perrito.',
    icon: 'trophy',
    color: '#F59E0B',
    pawsReward: 250,
    requirement: 'Asistir a 5 juntas oficiales'
  },
  {
    id: 'racha_fiel',
    name: '🔥 Racha Fiel',
    description: 'Ingresa a la aplicación durante 7 días seguidos sin interrumpir tu racha.',
    icon: 'flame',
    color: '#EF4444',
    pawsReward: 100,
    requirement: 'Racha de 7 días consecutivos'
  },
  {
    id: 'espiritu_canino',
    name: '🤝 Espíritu Canino',
    description: 'Únete formalmente a una comunidad de raza o sector.',
    icon: 'people',
    color: '#8B5CF6',
    pawsReward: 10,
    requirement: 'Unirse a 1 comunidad oficial'
  },
  {
    id: 'cazador_premios',
    name: '🎁 Cazador de Premios',
    description: 'Canjea tu primera recompensa o cupón en la Tienda de Huellitas.',
    icon: 'gift',
    color: '#EC4899',
    pawsReward: 50,
    requirement: 'Canjear 1 premio en la Tienda'
  },
  {
    id: 'huella_legendaria',
    name: '🌟 Huella Legendaria',
    description: 'Encuentra la mitológica Huella Legendaria en la Ruleta Sorpresa.',
    icon: 'sparkles',
    color: '#9333EA',
    pawsReward: 500,
    requirement: 'Obtener Huella Legendaria (1% prob)'
  }
];

export const UserProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { activeProfile, currentUser, currentDogs, addDogToUser, updateUserPhoto, updateUserProfile, isSuperAdmin, isBusinessOwner, logout } = useAuth();
  const { showToast } = useToast();

  const [showDogsPublic, setShowDogsPublic] = useState(true);
  const [showCommunitiesPublic, setShowCommunitiesPublic] = useState(true);
  const [showAttendancePublic, setShowAttendancePublic] = useState(true);

  // Estados para Edición de Datos Personales
  const [showEditPersonalModal, setShowEditPersonalModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(currentUser.displayName || '');
  const [editPhone, setEditPhone] = useState(currentUser.contact?.phone || '');
  const [editInstagram, setEditInstagram] = useState(currentUser.contact?.instagram || '');
  const [editComuna, setEditComuna] = useState(currentUser.location?.comuna || '');
  const [editRegion, setEditRegion] = useState(currentUser.location?.region || '');
  const [editBio, setEditBio] = useState(currentUser.bio || '');
  const [savingPersonal, setSavingPersonal] = useState(false);

  const handleOpenEditPersonal = () => {
    setEditDisplayName(currentUser.displayName || '');
    setEditPhone(currentUser.contact?.phone || '');
    setEditInstagram(currentUser.contact?.instagram || '');
    setEditComuna(currentUser.location?.comuna || 'Santiago');
    setEditRegion(currentUser.location?.region || 'Metropolitana');
    setEditBio(currentUser.bio || '');
    setShowEditPersonalModal(true);
  };

  const handleSavePersonalData = async () => {
    if (!editDisplayName.trim()) {
      Alert.alert('Campo obligatorio', 'Por favor ingresa tu nombre y apellido.');
      return;
    }
    setSavingPersonal(true);
    const res = await updateUserProfile({
      displayName: editDisplayName,
      phone: editPhone,
      instagram: editInstagram,
      comuna: editComuna,
      region: editRegion,
      bio: editBio
    });
    setSavingPersonal(false);
    if (res.success) {
      showToast(res.message, 'success');
      setShowEditPersonalModal(false);
    } else {
      Alert.alert('Error', res.message || 'No se pudieron guardar los datos.');
    }
  };

  // Estados para foto de perfil de usuario
  const [showAvatarPickerModal, setShowAvatarPickerModal] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  // Estados para razas estandarizadas de perros
  const [availableBreeds, setAvailableBreeds] = useState<DogBreed[]>(MASTER_DOG_BREEDS);
  const [breedSearchQuery, setBreedSearchQuery] = useState('');
  const [showBreedPickerModal, setShowBreedPickerModal] = useState(false);

  // Modal para registrar nuevo perrito
  const [showAddDogModal, setShowAddDogModal] = useState(false);
  const [newDogName, setNewDogName] = useState('');
  const [newDogBreed, setNewDogBreed] = useState('');
  const [newDogSize, setNewDogSize] = useState<'toy' | 'pequeño' | 'mediano' | 'grande' | 'gigante'>('mediano');
  const [newDogGender, setNewDogGender] = useState<'macho' | 'hembra'>('macho');
  const [newDogInstagram, setNewDogInstagram] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [customDogPhoto, setCustomDogPhoto] = useState<string | null>(null);
  const [savingDog, setSavingDog] = useState(false);

  // Canjes de usuario
  const [userRedemptions, setUserRedemptions] = useState<RewardRedemption[]>([]);

  useEffect(() => {
    if (currentUser?.id) {
      loadRedemptions();
    }
  }, [currentUser?.id]);

  useEffect(() => {
    // Cargar razas de la base de datos Firestore / catálogo local
    getDogBreeds().then(breeds => {
      if (breeds && breeds.length > 0) {
        setAvailableBreeds(breeds);
      }
    }).catch(err => console.warn('Error cargando razas:', err));
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const loadRedemptions = async () => {
    const list = await getUserRedemptions(currentUser.id);
    setUserRedemptions(list);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (currentUser?.id) {
      await loadRedemptions();
      try {
        const breeds = await getDogBreeds();
        if (breeds && breeds.length > 0) setAvailableBreeds(breeds);
      } catch (e) {
        console.warn('Error refreshing breeds:', e);
      }
    }
    setRefreshing(false);
  };

  // Manejadores de foto de perfil de usuario
  const handleTakeAvatarPhoto = async () => {
    setShowAvatarPickerModal(false);
    setUpdatingAvatar(true);
    const res = await takePhoto();
    if (res.success && res.uri) {
      const updateRes = await updateUserPhoto(res.uri);
      showToast(updateRes.message, 'success');
    } else if (res.error) {
      showToast(res.error, 'error');
    }
    setUpdatingAvatar(false);
  };

  const handlePickAvatarGallery = async () => {
    setShowAvatarPickerModal(false);
    setUpdatingAvatar(true);
    const res = await pickFromGallery();
    if (res.success && res.uri) {
      const updateRes = await updateUserPhoto(res.uri);
      showToast(updateRes.message, 'success');
    } else if (res.error) {
      showToast(res.error, 'error');
    }
    setUpdatingAvatar(false);
  };

  // Manejadores de fotos del perrito
  const handleTakeDogPhoto = async () => {
    const res = await takePhoto();
    if (res.success && res.uri) {
      setCustomDogPhoto(res.uri);
      showToast('¡Foto del perrito capturada!', 'success');
    } else if (res.error) {
      showToast(res.error, 'error');
    }
  };

  const handlePickDogPhotoGallery = async () => {
    const res = await pickFromGallery();
    if (res.success && res.uri) {
      setCustomDogPhoto(res.uri);
      showToast('¡Foto seleccionada de tu galería!', 'success');
    } else if (res.error) {
      showToast(res.error, 'error');
    }
  };

  // Selección de raza predefinida
  const handleSelectBreed = (b: DogBreed) => {
    setNewDogBreed(b.name);
    setNewDogSize(b.size);
    setShowBreedPickerModal(false);
    setBreedSearchQuery('');
  };

  const filteredBreeds = availableBreeds.filter(b => 
    b.name.toLowerCase().includes(breedSearchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(breedSearchQuery.toLowerCase())
  );

  const handleRegisterDog = async () => {
    if (!newDogName.trim() || !newDogBreed.trim()) {
      showToast('Por favor ingresa el nombre y selecciona la raza de tu perrito.', 'warning');
      return;
    }

    setSavingDog(true);
    const photoToSave = customDogPhoto || DEFAULT_DOG_PHOTOS[selectedPhotoIndex];
    const res = await addDogToUser({
      name: newDogName.trim(),
      breed: newDogBreed.trim(),
      size: newDogSize,
      gender: newDogGender,
      instagramHandle: newDogInstagram.trim() || undefined,
      photoUrl: photoToSave
    });
    setSavingDog(false);

    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      setShowAddDogModal(false);
      setNewDogName('');
      setNewDogBreed('');
      setNewDogInstagram('');
      setCustomDogPhoto(null);
    }
  };

  // Determinar medallas desbloqueadas por el usuario
  const userDogBadges = new Set<string>();
  currentDogs.forEach(d => {
    if (d.passport?.badges) {
      d.passport.badges.forEach(b => userDogBadges.add(b));
    }
  });

  // Si tiene al menos 1 perrito, desbloquea 'primer_registro'
  if (currentDogs.length > 0) userDogBadges.add('primer_registro');
  // Si ha canjeado algún premio
  if (userRedemptions.length > 0) userDogBadges.add('cazador_premios');
  // Si es super admin, tiene desbloqueadas varias por demostración
  if (isSuperAdmin) {
    userDogBadges.add('primer_registro');
    userDogBadges.add('explorador_parque');
    userDogBadges.add('espiritu_canino');
  }

  const unlockedBadges = ALL_OFFICIAL_BADGES.filter(b => userDogBadges.has(b.id));
  const lockedBadges = ALL_OFFICIAL_BADGES.filter(b => !userDogBadges.has(b.id));

  const reachedDogLimit = currentDogs.length >= MAX_DOGS_STANDARD_PLAN;

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0284C7']} tintColor="#0284C7" />
      }
    >
      {/* Cabecera de Perfil */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300' }} 
            style={styles.avatar} 
          />
          <TouchableOpacity 
            style={styles.avatarEditBadge}
            onPress={() => setShowAvatarPickerModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{currentUser.displayName}</Text>
        <Text style={styles.userLocation}>📍 {currentUser.location?.comuna || 'Santiago'}, {currentUser.location?.region || 'Metropolitana'}</Text>
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
              <Text style={styles.adminActionTitle}>Panel de Control Global (CRM)</Text>
              <Text style={styles.adminActionSub}>Revisa solicitudes de comunidades, tiendas y auditoría</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
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
              <Text style={styles.adminActionSub}>Valida cupones de juntas y publica recompensas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Zona de Datos Personales y Contacto */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>👤 Datos Personales & Contacto</Text>
            <Text style={styles.sectionSubtitle}>Información visible para juntas y tutores</Text>
          </View>
          <TouchableOpacity 
            style={styles.editPersonalBtn} 
            onPress={handleOpenEditPersonal}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={14} color="#0284C7" />
            <Text style={styles.editPersonalBtnText}>Editar Datos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.personalInfoCard}>
          <View style={styles.personalInfoRow}>
            <View style={styles.personalInfoIconWrap}>
              <Ionicons name="person-outline" size={16} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personalInfoLabel}>Nombre Completo</Text>
              <Text style={styles.personalInfoValue}>{currentUser.displayName || 'No especificado'}</Text>
            </View>
          </View>

          <View style={styles.personalInfoDivider} />

          <View style={styles.personalInfoRow}>
            <View style={styles.personalInfoIconWrap}>
              <Ionicons name="mail-outline" size={16} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personalInfoLabel}>Correo Electrónico (Cuenta)</Text>
              <Text style={styles.personalInfoValue}>{currentUser.email}</Text>
            </View>
          </View>

          <View style={styles.personalInfoDivider} />

          <View style={styles.personalInfoRow}>
            <View style={styles.personalInfoIconWrap}>
              <Ionicons name="call-outline" size={16} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personalInfoLabel}>Teléfono / WhatsApp</Text>
              <Text style={styles.personalInfoValue}>{currentUser.contact?.phone || 'Sin registrar'}</Text>
            </View>
          </View>

          <View style={styles.personalInfoDivider} />

          <View style={styles.personalInfoRow}>
            <View style={styles.personalInfoIconWrap}>
              <Ionicons name="location-outline" size={16} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personalInfoLabel}>Comuna & Región</Text>
              <Text style={styles.personalInfoValue}>
                {currentUser.location?.comuna || 'Santiago'}, {currentUser.location?.region || 'Metropolitana'}
              </Text>
            </View>
          </View>

          <View style={styles.personalInfoDivider} />

          <View style={styles.personalInfoRow}>
            <View style={styles.personalInfoIconWrap}>
              <Ionicons name="logo-instagram" size={16} color="#E1306C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personalInfoLabel}>Instagram</Text>
              <Text style={styles.personalInfoValue}>{currentUser.contact?.instagram || 'Sin registrar'}</Text>
            </View>
          </View>

          <View style={styles.personalInfoDivider} />

          <View style={styles.personalInfoRow}>
            <View style={styles.personalInfoIconWrap}>
              <Ionicons name="chatbox-ellipses-outline" size={16} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personalInfoLabel}>Biografía / Presentación</Text>
              <Text style={styles.personalInfoValue}>
                {currentUser.bio || '¡Hola! Soy tutor perruno y me encanta asistir a juntas con mi manada.'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Mis Perritos Registrados (Plan Estándar: Máximo 2) */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              🐶 Mis Perritos Registrados ({currentDogs.length}/{MAX_DOGS_STANDARD_PLAN})
            </Text>
            <Text style={styles.sectionSubtitle}>Plan Estándar: Hasta 2 perritos</Text>
          </View>

          {!reachedDogLimit && (
            <TouchableOpacity 
              style={styles.addDogButton}
              onPress={() => setShowAddDogModal(true)}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addDogButtonText}>Agregar Perrito</Text>
            </TouchableOpacity>
          )}
        </View>

        {currentDogs.length === 0 ? (
          <View style={styles.emptyDogsCard}>
            <Ionicons name="paw" size={32} color="#94A3B8" />
            <Text style={styles.emptyDogsTitle}>Aún no registras ningún perrito</Text>
            <Text style={styles.emptyDogsText}>
              Agrega a tu perrito para participar en juntas y acceder a su pasaporte digital canino.
            </Text>
            <TouchableOpacity 
              style={styles.registerFirstDogBtn}
              onPress={() => setShowAddDogModal(true)}
            >
              <Text style={styles.registerFirstDogBtnText}>+ Registrar mi Primer Perrito</Text>
            </TouchableOpacity>
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
                source={{ uri: dog.photoUrls?.[0] || DEFAULT_DOG_PHOTOS[0] }} 
                style={styles.petAvatar} 
              />
              <View style={styles.petInfo}>
                <Text style={styles.petName}>{dog.name}</Text>
                <Text style={styles.petBreed}>{dog.breed} • {dog.gender === 'macho' ? '♂ Macho' : '♀ Hembra'}</Text>
                <Text style={styles.petMeta}>
                  {dog.passport?.attendedEventsCount || 0} Juntas asistidas • {dog.passport?.badges?.length || 1} Medallas
                </Text>
              </View>
              <View style={styles.passportTag}>
                <Text style={styles.passportTagText}>Ver Pasaporte ➔</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Gamificación: Medallas y Logros */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>🏆 Logros & Medallas ({unlockedBadges.length}/{ALL_OFFICIAL_BADGES.length})</Text>
            <Text style={styles.sectionSubtitle}>Desbloquea medallas oficiales y gana Huellitas</Text>
          </View>
        </View>

        {/* Medallas Desbloqueadas */}
        <Text style={styles.badgeCategoryTitle}>✨ Medallas Obtenidas ({unlockedBadges.length})</Text>
        {unlockedBadges.length === 0 ? (
          <Text style={styles.emptyBadgeText}>Aún no has obtenido medallas. ¡Comienza asistiendo a juntas y participando!</Text>
        ) : (
          <View style={styles.badgesGrid}>
            {unlockedBadges.map(b => (
              <View key={b.id} style={styles.badgeCardUnlocked}>
                <View style={styles.badgeCardHeader}>
                  <View style={[styles.badgeIconCircle, { backgroundColor: b.color + '20' }]}>
                    <Ionicons name={b.icon} size={22} color={b.color} />
                  </View>
                  <View style={styles.unlockedStatusChip}>
                    <Ionicons name="checkmark-circle" size={11} color="#059669" />
                    <Text style={styles.unlockedStatusText}>Lograda</Text>
                  </View>
                </View>

                <View style={styles.badgeCardBody}>
                  <Text style={styles.badgeName} numberOfLines={1}>{b.name}</Text>
                  <Text style={styles.badgeDesc} numberOfLines={3}>{b.description}</Text>
                </View>

                <View style={styles.badgeRewardTag}>
                  <Ionicons name="paw" size={11} color="#0284C7" />
                  <Text style={styles.badgeRewardText}>+{b.pawsReward} Ganadas</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Medallas por Desbloquear */}
        <Text style={[styles.badgeCategoryTitle, { marginTop: 20 }]}>
          🔒 Medallas Faltantes por Desbloquear ({lockedBadges.length})
        </Text>
        <View style={styles.badgesGrid}>
          {lockedBadges.map(b => (
            <View key={b.id} style={styles.badgeCardLocked}>
              <View style={styles.badgeCardHeader}>
                <View style={[styles.badgeIconCircle, { backgroundColor: '#F1F5F9' }]}>
                  <Ionicons name={b.icon} size={22} color="#94A3B8" />
                </View>
                <View style={styles.lockedStatusChip}>
                  <Ionicons name="lock-closed" size={11} color="#64748B" />
                  <Text style={styles.lockedStatusText}>Bloqueada</Text>
                </View>
              </View>

              <View style={styles.badgeCardBody}>
                <Text style={styles.badgeNameLocked} numberOfLines={1}>{b.name}</Text>
                <Text style={styles.badgeReqText} numberOfLines={3}>Requisito: {b.requirement}</Text>
              </View>

              <View style={styles.badgeRewardTagLocked}>
                <Ionicons name="paw" size={11} color="#64748B" />
                <Text style={styles.badgeRewardTextLocked}>Premio: +{b.pawsReward}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Mis Cupones & Premios Canjeados */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎟️ Mis Cupones & Premios ({userRedemptions.length})</Text>
        {userRedemptions.length === 0 ? (
          <View style={styles.emptyRedemptionsCard}>
            <Ionicons name="ticket-outline" size={30} color="#94A3B8" />
            <Text style={styles.emptyRedemptionsText}>
              Aún no has canjeado cupones en la Tienda. ¡Acumula Huellitas y canjea premios en pastelerías y stands!
            </Text>
          </View>
        ) : (
          userRedemptions.map(r => (
            <View key={r.id} style={styles.redemptionCard}>
              <View style={styles.redemptionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.redemptionTitle}>{r.rewardTitle}</Text>
                  <Text style={styles.redemptionDate}>
                    Canjeado el {r.createdAt instanceof Date ? r.createdAt.toLocaleDateString('es-CL') : 'recientemente'}
                  </Text>
                </View>
                <View style={[
                  styles.redemptionStatusBadge, 
                  r.status === 'used' ? styles.redemptionStatusUsed : styles.redemptionStatusActive
                ]}>
                  <Text style={[
                    styles.redemptionStatusText,
                    r.status === 'used' ? { color: '#64748B' } : { color: '#0369A1' }
                  ]}>
                    {r.status === 'used' ? 'Utilizado' : 'Listo para Usar'}
                  </Text>
                </View>
              </View>

              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Código Único para el Stand / Tienda:</Text>
                <Text style={styles.codeValue}>{r.uniqueCode}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Privacidad & Transparencia */}
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
          <Text style={styles.settingLabel}>Mostrar mi asistencia en juntas</Text>
          <Switch value={showAttendancePublic} onValueChange={setShowAttendancePublic} trackColor={{ true: '#0284C7' }} />
        </View>
      </View>

      {/* Botón Cerrar Sesión */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out" size={18} color="#EF4444" />
          <Text style={styles.logoutBtnText}>Cerrar Sesión de la Cuenta</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />

      {/* Modal para Agregar Perrito (Máximo 2) */}
      <Modal visible={showAddDogModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🐶 Registrar a tu Perrito</Text>
              <TouchableOpacity onPress={() => setShowAddDogModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Crea su Pasaporte Canino Oficial. Podrás registrar un máximo de 2 perritos en el Plan Estándar.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <Text style={styles.modalInputLabel}>Nombre del perrito: *</Text>
              <TextInput
                placeholder="ej: Firulais, Max, Luna"
                value={newDogName}
                onChangeText={setNewDogName}
                style={styles.modalInput}
              />

              <Text style={styles.modalInputLabel}>Instagram de tu perrito (opcional):</Text>
              <TextInput
                placeholder="ej: @luna.golden o cuenta de la mascota"
                value={newDogInstagram}
                onChangeText={setNewDogInstagram}
                style={styles.modalInput}
                autoCapitalize="none"
              />

              <Text style={styles.modalInputLabel}>Raza (Estandarizada en BD): *</Text>
              <TouchableOpacity 
                style={styles.breedSelectorBtn}
                onPress={() => setShowBreedPickerModal(true)}
              >
                <Ionicons name="search" size={18} color="#0284C7" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={newDogBreed ? styles.breedSelectorTextSelected : styles.breedSelectorTextPlaceholder} numberOfLines={1}>
                    {newDogBreed ? `${newDogBreed}` : 'Buscar o seleccionar del catálogo...'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
              <Text style={styles.breedAutoNotice}>💡 Al elegir una raza se sugiere automáticamente su tamaño típico.</Text>

              <Text style={styles.modalInputLabel}>Género:</Text>
              <View style={styles.choiceRow}>
                {(['macho', 'hembra'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.choiceBtn, newDogGender === g && styles.choiceBtnActive]}
                    onPress={() => setNewDogGender(g)}
                  >
                    <Text style={[styles.choiceBtnText, newDogGender === g && styles.choiceBtnTextActive]}>
                      {g === 'macho' ? '♂ Macho' : '♀ Hembra'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalInputLabel}>Tamaño:</Text>
              <View style={styles.choiceRow}>
                {(['toy', 'pequeño', 'mediano', 'grande', 'gigante'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.choiceBtn, newDogSize === s && styles.choiceBtnActive]}
                    onPress={() => setNewDogSize(s)}
                  >
                    <Text style={[styles.choiceBtnText, newDogSize === s && styles.choiceBtnTextActive]}>
                      {s.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalInputLabel}>Foto de perfil del perrito:</Text>
              <View style={styles.photoActionRow}>
                <TouchableOpacity style={styles.photoActionButton} onPress={handleTakeDogPhoto}>
                  <Ionicons name="camera" size={18} color="#0284C7" />
                  <Text style={styles.photoActionText}>Tomar Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoActionButton} onPress={handlePickDogPhotoGallery}>
                  <Ionicons name="images" size={18} color="#0284C7" />
                  <Text style={styles.photoActionText}>De Galería</Text>
                </TouchableOpacity>
              </View>

              {customDogPhoto ? (
                <View style={styles.customPhotoPreviewCard}>
                  <Image source={{ uri: customDogPhoto }} style={styles.customPhotoThumb} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.customPhotoSuccessText}>✓ Foto seleccionada con éxito</Text>
                    <TouchableOpacity onPress={() => setCustomDogPhoto(null)} style={{ marginTop: 4 }}>
                      <Text style={styles.removePhotoText}>Cambiar / Usar plantilla</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.avatarChoiceLabel}>O elige una plantilla ilustrada:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoPickerRow}>
                    {DEFAULT_DOG_PHOTOS.map((url, idx) => (
                      <TouchableOpacity 
                        key={idx}
                        onPress={() => setSelectedPhotoIndex(idx)}
                        style={[styles.photoOption, selectedPhotoIndex === idx && styles.photoOptionActive]}
                      >
                        <Image source={{ uri: url }} style={styles.photoThumb} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveDogBtn, savingDog && { opacity: 0.6 }]}
              onPress={handleRegisterDog}
              disabled={savingDog}
            >
              <Text style={styles.saveDogBtnText}>
                {savingDog ? 'Guardando en Firebase...' : 'Guardar y Obtener Pasaporte (+50 🐾)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para Editar Foto de Perfil de Usuario */}
      <Modal visible={showAvatarPickerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalCard}>
            <Text style={styles.actionModalTitle}>📸 Cambiar Foto de Perfil</Text>
            <Text style={styles.actionModalSub}>Selecciona cómo deseas actualizar tu avatar:</Text>

            <TouchableOpacity 
              style={styles.actionOptionBtn} 
              onPress={handleTakeAvatarPhoto}
              disabled={updatingAvatar}
            >
              <View style={[styles.actionOptionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="camera" size={22} color="#0284C7" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionOptionText}>Tomar Foto con Cámara</Text>
                <Text style={styles.actionOptionSub}>Abre la cámara de tu dispositivo</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionOptionBtn} 
              onPress={handlePickAvatarGallery}
              disabled={updatingAvatar}
            >
              <View style={[styles.actionOptionIcon, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="images" size={22} color="#7C3AED" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionOptionText}>Seleccionar de Galería / Archivos</Text>
                <Text style={styles.actionOptionSub}>Sube una imagen desde tu dispositivo</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCancelBtn} 
              onPress={() => setShowAvatarPickerModal(false)}
            >
              <Text style={styles.actionCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Buscador de Razas Estandarizadas */}
      <Modal visible={showBreedPickerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>🐶 Catálogo Oficial de Razas</Text>
                <Text style={styles.modalSub}>Estandarizado en BD sin consumir APIs externas</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBreedPickerModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Barra de búsqueda de razas */}
            <View style={styles.breedSearchBar}>
              <Ionicons name="search" size={18} color="#64748B" />
              <TextInput
                placeholder="Escribe raza (ej: Golden, Quiltro, Pug)..."
                value={breedSearchQuery}
                onChangeText={setBreedSearchQuery}
                style={styles.breedSearchInput}
                autoFocus
              />
              {breedSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setBreedSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Lista deslizable de razas */}
            <ScrollView style={styles.breedsListScroll} showsVerticalScrollIndicator={true}>
              {filteredBreeds.length === 0 ? (
                <View style={styles.emptyBreedsContainer}>
                  <Text style={styles.emptyBreedsText}>No encontramos una coincidencia exacta.</Text>
                  <TouchableOpacity 
                    style={styles.customBreedUseBtn}
                    onPress={() => {
                      setNewDogBreed(breedSearchQuery);
                      setShowBreedPickerModal(false);
                    }}
                  >
                    <Text style={styles.customBreedUseBtnText}>
                      Usar "{breedSearchQuery}" como raza personalizada
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredBreeds.map((item) => (
                  <TouchableOpacity 
                    key={item.id}
                    style={[
                      styles.breedItemRow,
                      newDogBreed === item.name && styles.breedItemRowActive
                    ]}
                    onPress={() => handleSelectBreed(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.breedItemName}>{item.name}</Text>
                        {item.popular && (
                          <View style={styles.popularTag}>
                            <Text style={styles.popularTagText}>Popular</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.breedItemMeta}>{item.category} • Tamaño típico: {item.size}</Text>
                    </View>
                    <View style={styles.sizePill}>
                      <Text style={styles.sizePillText}>{item.size.toUpperCase()}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: EDITAR DATOS PERSONALES */}
      <Modal visible={showEditPersonalModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="person" size={20} color="#0284C7" />
                <Text style={styles.modalTitle}>Editar Datos Personales</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditPersonalModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.fieldLabel}>Nombre y Apellido *</Text>
              <TextInput
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                style={styles.modalInput}
                placeholder="Ej: Juan Pérez"
              />

              <Text style={styles.fieldLabel}>Teléfono / WhatsApp</Text>
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                style={styles.modalInput}
                placeholder="+56 9 1234 5678"
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Comuna</Text>
              <TextInput
                value={editComuna}
                onChangeText={setEditComuna}
                style={styles.modalInput}
                placeholder="Ej: Providencia"
              />

              <Text style={styles.fieldLabel}>Región</Text>
              <TextInput
                value={editRegion}
                onChangeText={setEditRegion}
                style={styles.modalInput}
                placeholder="Ej: Metropolitana"
              />

              <Text style={styles.fieldLabel}>Instagram</Text>
              <TextInput
                value={editInstagram}
                onChangeText={setEditInstagram}
                style={styles.modalInput}
                placeholder="@usuario"
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>Biografía / Presentación</Text>
              <TextInput
                value={editBio}
                onChangeText={setEditBio}
                style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Cuéntanos un poco sobre ti y tus perritos..."
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <TouchableOpacity 
              style={[styles.submitReqButton, savingPersonal && { opacity: 0.6 }]}
              onPress={handleSavePersonalData}
              disabled={savingPersonal}
            >
              <Text style={styles.submitReqBtnText}>
                {savingPersonal ? 'Guardando cambios...' : 'Guardar Información'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E2E8F0',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0284C7',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addDogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  addDogButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vipNoticeCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  vipNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  vipNoticeText: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
  },
  emptyDogsCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyDogsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyDogsText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  registerFirstDogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  registerFirstDogBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
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
    backgroundColor: '#E2E8F0',
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
  editPersonalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
  },
  editPersonalBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  personalInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  personalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  personalInfoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personalInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  personalInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  personalInfoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  badgeCategoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  emptyBadgeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  badgeCardUnlocked: {
    width: '48%',
    minHeight: 195,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeCardLocked: {
    width: '48%',
    minHeight: 195,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  badgeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeCardBody: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 8,
  },
  unlockedStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  unlockedStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  lockedStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  lockedStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  badgeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  badgeNameLocked: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  badgeReqText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  badgeRewardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  badgeRewardText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  badgeRewardTagLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeRewardTextLocked: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyRedemptionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 6,
  },
  emptyRedemptionsText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  redemptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  redemptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  redemptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  redemptionDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  redemptionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  redemptionStatusActive: {
    backgroundColor: '#E0F2FE',
  },
  redemptionStatusUsed: {
    backgroundColor: '#F1F5F9',
  },
  redemptionStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  codeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 3,
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
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 16,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 6,
  },
  submitReqButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitReqBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  choiceBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  choiceBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  choiceBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  choiceBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  photoPickerRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  photoOption: {
    marginRight: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  photoOptionActive: {
    borderColor: '#0284C7',
  },
  photoThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  saveDogBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveDogBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  breedSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 4,
  },
  breedSelectorTextSelected: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
  },
  breedSelectorTextPlaceholder: {
    fontSize: 13,
    color: '#64748B',
  },
  breedAutoNotice: {
    fontSize: 11,
    color: '#0369A1',
    marginBottom: 8,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  customPhotoPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  customPhotoThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  customPhotoSuccessText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  removePhotoText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  avatarChoiceLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  actionModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  actionModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  actionModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  actionOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  actionOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  actionCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  actionCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  breedSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  breedSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  breedsListScroll: {
    maxHeight: 320,
  },
  breedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  breedItemRowActive: {
    backgroundColor: '#F0F9FF',
  },
  breedItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  breedItemMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  popularTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  sizePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sizePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  emptyBreedsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyBreedsText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
  },
  customBreedUseBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  customBreedUseBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
