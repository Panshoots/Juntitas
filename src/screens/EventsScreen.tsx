import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ScrollView,
  Image, 
  TouchableOpacity, 
  Modal,
  TextInput, 
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DogEvent, DogAttendeeSummary, EventStatus } from '../models/Event';
import { 
  getEvents, 
  registerForEvent, 
  updateEventAttendance, 
  cancelEventAttendance, 
  getUserAttendances, 
  openGoogleMapsUrl, 
  createEvent 
} from '../services/eventService';
import { awardPaws } from '../services/gamificationService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const EventsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { activeProfile, currentUser, currentDogs, isSuperAdmin, canCreateEventFor } = useAuth();
  const { showToast } = useToast();
  const [events, setEvents] = useState<DogEvent[]>([]);
  const [attendancesMap, setAttendancesMap] = useState<Record<string, DogAttendeeSummary[]>>({});
  const [selectedEvent, setSelectedEvent] = useState<DogEvent | null>(null);
  const [modalMode, setModalMode] = useState<'register' | 'edit'>('register');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);

  // Modal de Visualización Separada de Tutores, Perritos y Comercios
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [attendeesModalTab, setAttendeesModalTab] = useState<'tutors' | 'dogs' | 'businesses'>('tutors');
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<DogEvent | null>(null);

  const handleOpenAttendeesModal = (event: DogEvent, initialTab: 'tutors' | 'dogs' | 'businesses' = 'tutors') => {
    setSelectedEventForAttendees(event);
    setAttendeesModalTab(initialTab);
    setShowAttendeesModal(true);
  };

  // Perros seleccionados del perfil activo
  const [selectedDogIds, setSelectedDogIds] = useState<Record<string, boolean>>({});

  // Campos para crear junta
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPlace, setNewPlace] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newComuna, setNewComuna] = useState('Providencia');
  const [newAcceptsBusinesses, setNewAcceptsBusinesses] = useState(true);

  // ¿Puede crear eventos en la comunidad activa?
  const canPublishJunta = isSuperAdmin || canCreateEventFor('comm-1') || activeProfile.roleType === 'primary_admin' || activeProfile.roleType === 'secondary_admin';

  useEffect(() => {
    loadEvents();
  }, [currentUser?.id]);

  useEffect(() => {
    // Inicializar primer perro seleccionado si existe
    if (currentDogs.length > 0) {
      setSelectedDogIds({ [currentDogs[0].id]: true });
    } else {
      setSelectedDogIds({});
    }
  }, [currentDogs]);

  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = async () => {
    const data = await getEvents();
    setEvents(data);
    if (currentUser?.id) {
      const atts = await getUserAttendances(currentUser.id);
      setAttendancesMap(atts);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const toggleDogSelection = (id: string) => {
    setSelectedDogIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAttendanceModal = (event: DogEvent, mode: 'register' | 'edit') => {
    setSelectedEvent(event);
    setModalMode(mode);

    if (mode === 'edit') {
      const currentAttDogs = attendancesMap[event.id] || [];
      const map: Record<string, boolean> = {};
      if (currentAttDogs.length > 0) {
        currentAttDogs.forEach(d => { map[d.dogId] = true; });
      } else if (currentDogs.length > 0) {
        map[currentDogs[0].id] = true;
      }
      setSelectedDogIds(map);
    } else {
      if (currentDogs.length > 0) {
        setSelectedDogIds({ [currentDogs[0].id]: true });
      }
    }
    setShowRegisterModal(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedEvent || !currentUser?.id) return;
    const selected = currentDogs
      .filter(d => selectedDogIds[d.id])
      .map(d => ({
        dogId: d.id,
        name: d.name,
        breed: d.breed,
        photoUrl: d.photoUrls?.[0]
      }));

    if (selected.length === 0) {
      showToast('Debes seleccionar al menos un perrito que asistirá a la junta.', 'warning');
      return;
    }

    if (modalMode === 'register') {
      const res = await registerForEvent(
        selectedEvent.id,
        currentUser.id,
        currentUser.displayName,
        currentUser.photoURL || undefined,
        true,
        selected
      );

      showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) {
        await awardPaws(currentUser.id, 'event_attended', selectedEvent.id);
        setShowRegisterModal(false);
        loadEvents();
      }
    } else {
      const res = await updateEventAttendance(
        selectedEvent.id,
        currentUser.id,
        selected
      );

      showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) {
        setShowRegisterModal(false);
        loadEvents();
      }
    }
  };

  const handleCancelAttendance = async () => {
    if (!selectedEvent || !currentUser?.id) return;
    const confirmCancel = confirm('¿Estás seguro de que deseas cancelar tu asistencia a esta junta?');
    if (!confirmCancel) return;

    const res = await cancelEventAttendance(selectedEvent.id, currentUser.id);
    showToast(res.message, res.success ? 'success' : 'info');
    if (res.success) {
      setShowRegisterModal(false);
      loadEvents();
    }
  };

  const handleCreateNewEvent = async () => {
    if (!newTitle || !newPlace || !newAddress) {
      showToast('Por favor completa el título, lugar y dirección.', 'warning');
      return;
    }

    const res = await createEvent({
      communityId: activeProfile.communityIdManaged || 'comm-1',
      communityName: activeProfile.communityNameManaged || 'Golden Retrievers Chile',
      communityLogoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200',
      title: newTitle,
      description: newDesc || 'Junta oficial para socializar y jugar.',
      startDate: new Date(Date.now() + 86400000 * 7),
      endDate: new Date(Date.now() + 86400000 * 7 + 7200000),
      location: {
        placeName: newPlace,
        address: newAddress,
        comuna: newComuna,
        region: 'Metropolitana',
        googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(newPlace + ', ' + newAddress)}`
      },
      coverPhotoUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
      creatorUserId: currentUser.id,
      acceptsBusinesses: newAcceptsBusinesses,
    });

    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      setShowCreateEventModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewPlace('');
      setNewAddress('');
      loadEvents();
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'confirmada':
      case 'confirmed':
        return { text: 'Confirmada', bg: '#DCFCE7', color: '#15803D' };
      case 'en_curso':
      case 'in_progress':
        return { text: '¡En curso ahora!', bg: '#FEF3C7', color: '#B45309' };
      case 'finalizada':
      case 'completed':
        return { text: 'Finalizada', bg: '#F1F5F9', color: '#64748B' };
      case 'cancelada':
      case 'cancelled':
        return { text: 'Cancelada', bg: '#FEE2E2', color: '#B91C1C' };
      default:
        return { text: 'Programada', bg: '#E0F2FE', color: '#0369A1' };
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.title}>📅 Juntas & Encuentros</Text>
          <Text style={styles.subtitle}>Actividades oficiales y vida social para tu perrito</Text>
        </View>

        {/* Botón visible solo para Administradores de la Comunidad (Sección 8 y 30 Plan Maestro) */}
        {canPublishJunta && (
          <TouchableOpacity 
            style={styles.publishButton}
            onPress={() => setShowCreateEventModal(true)}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.publishButtonText}>Publicar Junta</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0284C7']} tintColor="#0284C7" />
        }
        renderItem={({ item }) => {
          const badge = getStatusBadge(item.status);
          return (
            <View style={styles.eventCard}>
              <Image source={{ uri: item.coverPhotoUrl }} style={styles.eventImage} />
              <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.communityRow}>
                    <Image source={{ uri: item.communityLogoUrl }} style={styles.smallCommLogo} />
                    <Text style={styles.communityName}>{item.communityName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
                  </View>
                </View>

                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>

                {/* Ubicación con botón directo a Google Maps (Sección 11 Plan Maestro) */}
                <View style={styles.locationContainer}>
                  <View style={styles.locationInfo}>
                    <Ionicons name="location" size={18} color="#EF4444" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {item.location.placeName} ({item.location.address})
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.mapsButton}
                    onPress={() => openGoogleMapsUrl(item.location.googleMapsUrl)}
                  >
                    <Ionicons name="navigate" size={14} color="#0284C7" />
                    <Text style={styles.mapsButtonText}>Abrir en Maps</Text>
                  </TouchableOpacity>
                </View>

                {/* Conteo interactivo: Toca para ver quiénes van (Tutores, Perritos y Comercios) */}
                <View style={styles.countsRow}>
                  <TouchableOpacity 
                    style={styles.countBadge}
                    onPress={() => handleOpenAttendeesModal(item, 'tutors')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person" size={13} color="#475569" />
                    <Text style={styles.countText}>{item.tutorsCount} Tutores</Text>
                    <Ionicons name="eye-outline" size={11} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.countBadge, { backgroundColor: '#FEF3C7' }]}
                    onPress={() => handleOpenAttendeesModal(item, 'dogs')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="paw" size={13} color="#D97706" />
                    <Text style={[styles.countText, { color: '#B45309' }]}>
                      {item.dogsCount} Perritos
                    </Text>
                    <Ionicons name="eye-outline" size={11} color="#D97706" />
                  </TouchableOpacity>

                  {item.acceptsBusinesses && (
                    <TouchableOpacity 
                      style={[styles.countBadge, { backgroundColor: '#F3E8FF' }]}
                      onPress={() => handleOpenAttendeesModal(item, 'businesses')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="storefront" size={13} color="#7E22CE" />
                      <Text style={[styles.countText, { color: '#7E22CE' }]}>Comercios</Text>
                      <Ionicons name="eye-outline" size={11} color="#7E22CE" />
                    </TouchableOpacity>
                  )}
                </View>

                {(() => {
                  const userAttendance = attendancesMap[item.id];
                  const isAttending = !!userAttendance || item.attendeeUserIds?.includes(currentUser?.id);

                  if (isAttending) {
                    const dogsCountText = userAttendance && userAttendance.length > 0 
                      ? `${userAttendance.length} perrito${userAttendance.length > 1 ? 's' : ''}`
                      : 'registrado';
                    return (
                      <View style={styles.attendingRow}>
                        <View style={styles.attendingBadge}>
                          <Ionicons name="checkmark-circle" size={20} color="#15803D" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.attendingBadgeText}>¡Ya estás inscrito!</Text>
                            <Text style={styles.attendingSubText}>🐾 Asistirás con {dogsCountText}</Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={styles.editAttendanceBtn}
                          onPress={() => handleOpenAttendanceModal(item, 'edit')}
                        >
                          <Ionicons name="create-outline" size={15} color="#0284C7" />
                          <Text style={styles.editAttendanceBtnText}>
                            {currentDogs.length > 1 ? 'Modificar' : 'Ver'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity 
                      style={styles.attendButton}
                      onPress={() => handleOpenAttendanceModal(item, 'register')}
                    >
                      <Text style={styles.attendButtonText}>🐾 Confirmar Asistencia (+100 🐾)</Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
            </View>
          );
        }}
      />

      {/* Modal de Inscripción y Modificación de Asistencia con Selección de Perritos */}
      <Modal visible={showRegisterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'register' ? '🐾 Inscribirse a la Junta' : '✏️ Modificar Perrito(s)'}
              </Text>
              <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {modalMode === 'register' 
                ? `¿Qué perrito o perritos te acompañarán a ${selectedEvent?.title}?`
                : `Selecciona con cuál(es) de tus perritos asistirás a ${selectedEvent?.title}:`
              }
            </Text>

            {currentDogs.length === 0 ? (
              <View style={styles.noDogsBox}>
                <Ionicons name="alert-circle" size={24} color="#F59E0B" />
                <Text style={styles.noDogsText}>
                  No tienes perritos registrados en tu cuenta. Agrega uno desde tu perfil para inscribirte.
                </Text>
              </View>
            ) : (
              <View style={styles.dogsSelectList}>
                {currentDogs.map(dog => {
                  const isSelected = !!selectedDogIds[dog.id];
                  return (
                    <TouchableOpacity 
                      key={dog.id} 
                      style={[styles.dogSelectOption, isSelected && styles.dogSelectOptionActive]}
                      onPress={() => toggleDogSelection(dog.id)}
                    >
                      <View style={styles.dogOptionInfo}>
                        <Ionicons 
                          name={isSelected ? "checkbox" : "square-outline"} 
                          size={22} 
                          color={isSelected ? "#0284C7" : "#94A3B8"} 
                        />
                        <Text style={styles.dogOptionName}>{dog.name}</Text>
                        <Text style={styles.dogOptionBreed}>({dog.breed})</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.infoCallout}>
              <Ionicons name="shield-checkmark" size={18} color="#0284C7" />
              <Text style={styles.infoCalloutText}>
                {modalMode === 'register' 
                  ? 'Regla R-1203: La plataforma cuenta por separado tutores y perros para planificar hidratación, espacio y seguridad.'
                  : 'Puedes ajustar tus perritos acompañantes en cualquier momento antes de la junta.'
                }
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.confirmButton, currentDogs.length === 0 && { opacity: 0.5 }]} 
              onPress={handleSaveAttendance}
              disabled={currentDogs.length === 0}
            >
              <Text style={styles.confirmButtonText}>
                {modalMode === 'register' ? '¡Confirmar Asistencia (+100 🐾)!' : 'Guardar Cambios'}
              </Text>
            </TouchableOpacity>

            {modalMode === 'edit' && (
              <TouchableOpacity 
                style={styles.cancelAttendanceBtn}
                onPress={handleCancelAttendance}
              >
                <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.cancelAttendanceBtnText}>Cancelar mi asistencia a esta junta</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para Crear/Publicar Junta (Exclusivo para Administradores con EVENT_CREATE) */}
      <Modal visible={showCreateEventModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>➕ Publicar Junta Oficial</Text>
              <TouchableOpacity onPress={() => setShowCreateEventModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Comunidad: {activeProfile.communityNameManaged || 'Golden Retrievers Chile'} (Permiso: EVENT_CREATE)
            </Text>

            <TextInput
              placeholder="Título de la junta (ej: Gran Junta Primavera Golden)"
              value={newTitle}
              onChangeText={setNewTitle}
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Nombre del lugar (ej: Parque Inés de Suárez)"
              value={newPlace}
              onChangeText={setNewPlace}
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Dirección exacta (ej: Antonio Varas 1510)"
              value={newAddress}
              onChangeText={setNewAddress}
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Descripción y recomendaciones (agua, correa, etc.)"
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { height: 60 }]}
            />

            <TouchableOpacity 
              style={styles.toggleBizRow}
              onPress={() => setNewAcceptsBusinesses(!newAcceptsBusinesses)}
            >
              <Ionicons 
                name={newAcceptsBusinesses ? "checkbox" : "square-outline"} 
                size={22} 
                color={newAcceptsBusinesses ? "#7E22CE" : "#94A3B8"} 
              />
              <Text style={styles.toggleBizText}>Permitir que tiendas y stands postulen a esta junta</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmButton} onPress={handleCreateNewEvent}>
              <Text style={styles.confirmButtonText}>Publicar Junta Oficial</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Asistentes y Comercios (Visualizar quiénes van a la junta) */}
      <Modal visible={showAttendeesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>🐾 Participantes de la Junta</Text>
                <Text style={[styles.modalSubtitle, { marginBottom: 0 }]} numberOfLines={1}>
                  {selectedEventForAttendees?.title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAttendeesModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Subtabs de Navegación del Modal */}
            <View style={styles.attendeesTabRow}>
              <TouchableOpacity 
                style={[styles.attendeesTabBtn, attendeesModalTab === 'tutors' && styles.attendeesTabBtnActive]}
                onPress={() => setAttendeesModalTab('tutors')}
              >
                <Ionicons name="person" size={14} color={attendeesModalTab === 'tutors' ? '#0284C7' : '#64748B'} />
                <Text style={[styles.attendeesTabBtnText, attendeesModalTab === 'tutors' && styles.attendeesTabBtnTextActive]}>
                  Tutores ({selectedEventForAttendees?.tutorsCount || 6})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.attendeesTabBtn, attendeesModalTab === 'dogs' && { backgroundColor: '#FEF3C7' }]}
                onPress={() => setAttendeesModalTab('dogs')}
              >
                <Ionicons name="paw" size={14} color={attendeesModalTab === 'dogs' ? '#D97706' : '#64748B'} />
                <Text style={[styles.attendeesTabBtnText, attendeesModalTab === 'dogs' && styles.attendeesTabDogBtnTextActive]}>
                  Perritos ({selectedEventForAttendees?.dogsCount || 7})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.attendeesTabBtn, attendeesModalTab === 'businesses' && { backgroundColor: '#F3E8FF' }]}
                onPress={() => setAttendeesModalTab('businesses')}
              >
                <Ionicons name="storefront" size={14} color={attendeesModalTab === 'businesses' ? '#7E22CE' : '#64748B'} />
                <Text style={[styles.attendeesTabBtnText, attendeesModalTab === 'businesses' && styles.attendeesTabBizBtnTextActive]}>
                  Comercios
                </Text>
              </TouchableOpacity>
            </View>

            {/* Contenido Pestaña 1: Tutores */}
            {attendeesModalTab === 'tutors' && (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Si el usuario actual está inscrito como tutor */}
                {(() => {
                  if (!selectedEventForAttendees) return null;
                  const myAtt = attendancesMap[selectedEventForAttendees.id];
                  const isEnrolled = !!myAtt || selectedEventForAttendees.attendeeUserIds?.includes(currentUser?.id);

                  if (!isEnrolled) return null;

                  return (
                    <View style={styles.myAttendanceBannerCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Image 
                          source={{ uri: currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }} 
                          style={styles.attendeeAvatar} 
                        />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.attendeeName}>{currentUser.displayName} (Tú)</Text>
                            <View style={styles.myStatusBadge}>
                              <Text style={styles.myStatusBadgeText}>Confirmado ✅</Text>
                            </View>
                          </View>
                          <Text style={styles.attendeeSubtitle}>
                            👤 Tutor Oficial • Asistes con {myAtt ? myAtt.map(d => d.name).join(' y ') : 'tu perrito'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}

                <Text style={styles.attendeesSectionHeader}>
                  Tutores confirmados para esta junta:
                </Text>

                {/* Lista de Tutores */}
                {[
                  {
                    id: 'att-1',
                    name: 'Camila Valenzuela',
                    comuna: 'Providencia',
                    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
                    dogs: [
                      { name: 'Milo', breed: 'Golden Retriever', photo: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200', role: 'Socializador y Juguetón' }
                    ]
                  },
                  {
                    id: 'att-2',
                    name: 'Diego Silva',
                    comuna: 'Ñuñoa',
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                    dogs: [
                      { name: 'Bruno', breed: 'Beagle', photo: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=200', role: 'Explorador Curioso' }
                    ]
                  },
                  {
                    id: 'att-3',
                    name: 'Macarena Fuenzalida',
                    comuna: 'Las Condes',
                    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
                    dogs: [
                      { name: 'Simba', breed: 'Pug', photo: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200', role: 'Tranquilo y Regalón' },
                      { name: 'Kira', breed: 'Shih Tzu', photo: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=200', role: 'Cariñosa y Tímida' }
                    ]
                  },
                  {
                    id: 'att-4',
                    name: 'Jorge Alarcón',
                    comuna: 'Santiago Centro',
                    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
                    dogs: [
                      { name: 'Thor', breed: 'Pastor Alemán', photo: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5455?w=200', role: 'Protector Noble' }
                    ]
                  },
                  {
                    id: 'att-5',
                    name: 'Ignacia Morales',
                    comuna: 'La Reina',
                    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
                    dogs: [
                      { name: 'Bella', breed: 'Border Collie', photo: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=200', role: 'Ágil y Juguetona' }
                    ]
                  },
                  {
                    id: 'att-6',
                    name: 'Felipe Navarro',
                    comuna: 'Vitacura',
                    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
                    dogs: [
                      { name: 'Toby', breed: 'Jack Russell Terrier', photo: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200', role: 'Veloz Corredor' }
                    ]
                  }
                ].map(att => (
                  <View key={att.id} style={styles.attendeeCard}>
                    <View style={styles.attendeeHeaderRow}>
                      <Image source={{ uri: att.avatar }} style={styles.attendeeAvatar} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.attendeeName}>{att.name}</Text>
                          <Ionicons name="checkmark-circle" size={14} color="#0284C7" style={{ marginLeft: 4 }} />
                        </View>
                        <Text style={styles.attendeeSubtitle}>Tutor Oficial • Comuna: {att.comuna}</Text>
                      </View>
                    </View>

                    {/* Perritos a cargo de este Tutor */}
                    <View style={styles.attendeeDogsRow}>
                      <Text style={styles.tutorDogsLead}>🐾 Acompañado por:</Text>
                      {att.dogs.map((dog, dIdx) => (
                        <View key={dIdx} style={styles.attendeeDogChip}>
                          <Image source={{ uri: dog.photo }} style={styles.attendeeDogThumb} />
                          <View>
                            <Text style={styles.attendeeDogName}>{dog.name}</Text>
                            <Text style={styles.attendeeDogBreed}>{dog.breed} • {dog.role}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Contenido Pestaña 2: Perritos */}
            {attendeesModalTab === 'dogs' && (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Si el usuario actual tiene perrito(s) inscritos */}
                {(() => {
                  if (!selectedEventForAttendees) return null;
                  const myAtt = attendancesMap[selectedEventForAttendees.id];
                  const isEnrolled = !!myAtt || selectedEventForAttendees.attendeeUserIds?.includes(currentUser?.id);

                  if (!isEnrolled) return null;

                  const enrolledDogs: Array<{ name: string; breed?: string; photo?: string }> = (myAtt && myAtt.length > 0)
                    ? myAtt.map(d => ({ name: d.name, breed: d.breed, photo: d.photoUrl }))
                    : currentDogs.slice(0, 1).map(d => ({ name: d.name, breed: d.breed, photo: d.photoUrls?.[0] }));

                  return (
                    <View style={styles.myDogBannerCard}>
                      <Text style={styles.myDogBannerTitle}>🐾 ¡Tu(s) Perrito(s) en esta Junta!</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {enrolledDogs.map((d, i) => (
                          <View key={i} style={styles.myDogChip}>
                            <Image 
                              source={{ uri: d.photo || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200' }} 
                              style={styles.myDogThumb} 
                            />
                            <View>
                              <Text style={styles.myDogChipName}>{d.name}</Text>
                              <Text style={styles.myDogChipBreed}>{d.breed || 'Perrito Inscrito'} • Confirmado ✅</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })()}

                <Text style={styles.attendeesSectionHeader}>
                  Perritos que estarán jugando y socializando:
                </Text>

                {/* Lista individual de perritos */}
                {[
                  {
                    id: 'dog-1',
                    name: 'Milo',
                    breed: 'Golden Retriever',
                    age: '2 años',
                    role: 'Socializador y Juguetón',
                    photo: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200',
                    tutorName: 'Camila Valenzuela',
                    tutorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
                    comuna: 'Providencia',
                    medal: '🏅 Pasaporte de Oro'
                  },
                  {
                    id: 'dog-2',
                    name: 'Bruno',
                    breed: 'Beagle',
                    age: '3 años',
                    role: 'Explorador Curioso',
                    photo: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=200',
                    tutorName: 'Diego Silva',
                    tutorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                    comuna: 'Ñuñoa',
                    medal: '⭐ Socializador Frecuente'
                  },
                  {
                    id: 'dog-3',
                    name: 'Simba',
                    breed: 'Pug',
                    age: '4 años',
                    role: 'Tranquilo y Regalón',
                    photo: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200',
                    tutorName: 'Macarena Fuenzalida',
                    tutorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
                    comuna: 'Las Condes',
                    medal: '🏅 Pasaporte de Plata'
                  },
                  {
                    id: 'dog-4',
                    name: 'Kira',
                    breed: 'Shih Tzu',
                    age: '1 año',
                    role: 'Cariñosa y Tímida',
                    photo: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=200',
                    tutorName: 'Macarena Fuenzalida',
                    tutorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
                    comuna: 'Las Condes',
                    medal: '✨ Debutante Canino'
                  },
                  {
                    id: 'dog-5',
                    name: 'Thor',
                    breed: 'Pastor Alemán',
                    age: '5 años',
                    role: 'Protector Noble',
                    photo: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5455?w=200',
                    tutorName: 'Jorge Alarcón',
                    tutorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
                    comuna: 'Santiago Centro',
                    medal: '🏅 Pasaporte de Oro'
                  },
                  {
                    id: 'dog-6',
                    name: 'Bella',
                    breed: 'Border Collie',
                    age: '2 años',
                    role: 'Ágil y Super Activa',
                    photo: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=200',
                    tutorName: 'Ignacia Morales',
                    tutorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
                    comuna: 'La Reina',
                    medal: '⭐ Estrella de la Junta'
                  },
                  {
                    id: 'dog-7',
                    name: 'Toby',
                    breed: 'Jack Russell Terrier',
                    age: '3 años',
                    role: 'Veloz Corredor',
                    photo: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200',
                    tutorName: 'Felipe Navarro',
                    tutorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
                    comuna: 'Vitacura',
                    medal: '🏅 Pasaporte de Plata'
                  }
                ].map((dog, dIdx) => (
                  <View key={dog.id || dIdx} style={styles.dogAttendeeCard}>
                    <Image source={{ uri: dog.photo }} style={styles.dogAttendeePhoto} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.dogAttendeeName}>🐾 {dog.name}</Text>
                        <View style={styles.dogPassportBadge}>
                          <Ionicons name="ribbon" size={11} color="#B45309" />
                          <Text style={styles.dogPassportBadgeText}>{dog.medal}</Text>
                        </View>
                      </View>
                      <Text style={styles.dogAttendeeBreed}>{dog.breed} • {dog.age} • {dog.role}</Text>
                      
                      <View style={styles.dogAttendeeTutorRow}>
                        <Image source={{ uri: dog.tutorAvatar }} style={styles.dogAttendeeTutorAvatar} />
                        <Text style={styles.dogAttendeeTutorText}>
                          Tutor: <Text style={{ fontWeight: '700', color: '#334155' }}>{dog.tutorName}</Text> ({dog.comuna})
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Contenido Pestaña 2: Comercios y Stands */}
            {attendeesModalTab === 'businesses' && (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.attendeesSectionHeader}>
                  Stands y marcas oficiales que estarán en la junta:
                </Text>

                {[
                  {
                    id: 'biz-1',
                    name: 'Bark Bakery Chile',
                    category: '🧁 Pastelería & Snacks Naturales',
                    desc: 'Galletas de avena, quequitos caninos sin azúcar y helados de caldo de hueso para hidratación.',
                    standNumber: 'Stand #1',
                    benefit: '10% dcto para miembros con pasaporte',
                    logo: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=200'
                  },
                  {
                    id: 'biz-2',
                    name: 'K9 Adventure Gear',
                    category: '🦮 Accesorios & Paseo',
                    desc: 'Arneses ergonómicos antitirones, correas reflectantes de biothane y bebederos plegables de silicona.',
                    standNumber: 'Stand #2',
                    benefit: 'Regalo sorpresa por compras superiores a $15.000',
                    logo: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=200'
                  },
                  {
                    id: 'biz-3',
                    name: 'Clínica Veterinaria San Roque',
                    category: '🩺 Salud & Bienestar Preventivo',
                    desc: 'Punto de hidratación asistida, control de peso gratuito y evaluación dental exprés en la junta.',
                    standNumber: 'Stand #3',
                    benefit: 'Revisión preventiva gratis en el evento',
                    logo: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=200'
                  },
                  {
                    id: 'biz-4',
                    name: 'Patitas SPA Móvil',
                    category: '✂️ Grooming & Estética Exprés',
                    desc: 'Limpieza de almohadillas, cepillado deslanado y perfume hipoalergénico.',
                    standNumber: 'Stand #4',
                    benefit: 'Corte de uñas gratis presentando la app',
                    logo: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=200'
                  }
                ].map(biz => (
                  <View key={biz.id} style={styles.businessStandCard}>
                    <View style={styles.businessStandHeader}>
                      <Image source={{ uri: biz.logo }} style={styles.businessStandLogo} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.businessStandName}>{biz.name}</Text>
                          <View style={styles.standBadge}>
                            <Text style={styles.standBadgeText}>{biz.standNumber}</Text>
                          </View>
                        </View>
                        <Text style={styles.businessStandCategory}>{biz.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.businessStandDesc}>{biz.desc}</Text>
                    <View style={styles.businessBenefitBadge}>
                      <Ionicons name="gift" size={13} color="#7E22CE" />
                      <Text style={styles.businessBenefitText}>Beneficio: {biz.benefit}</Text>
                    </View>
                  </View>
                ))}

                <View style={styles.businessCalloutBox}>
                  <Ionicons name="storefront-outline" size={20} color="#0284C7" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.businessCalloutTitle}>¿Tienes un emprendimiento para mascotas?</Text>
                    <Text style={styles.businessCalloutSub}>
                      Accede al Portal de Comercios en tu menú para solicitar autorización de stand en futuras juntas.
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity 
              style={[styles.confirmButton, { marginTop: 14 }]} 
              onPress={() => setShowAttendeesModal(false)}
            >
              <Text style={styles.confirmButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#E2E8F0',
  },
  cardContent: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallCommLogo: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginRight: 6,
  },
  communityName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  eventDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#334155',
    marginLeft: 4,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mapsButtonText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '700',
    marginLeft: 4,
  },
  countsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  attendButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  attendButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  dogsSelectList: {
    gap: 10,
    marginBottom: 16,
  },
  dogSelectOption: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 14,
  },
  dogSelectOptionActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  dogOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dogOptionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  dogOptionBreed: {
    fontSize: 13,
    color: '#64748B',
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  infoCalloutText: {
    fontSize: 12,
    color: '#0369A1',
    flex: 1,
    lineHeight: 16,
  },
  confirmButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  noDogsBox: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noDogsText: {
    color: '#92400E',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  toggleBizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    backgroundColor: '#FAF5FF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  toggleBizText: {
    fontSize: 13,
    color: '#6B21A8',
    fontWeight: '600',
    flex: 1,
  },
  attendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    gap: 8,
  },
  attendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  attendingBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  attendingSubText: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
    fontWeight: '600',
  },
  editAttendanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  editAttendanceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  cancelAttendanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelAttendanceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  attendeesTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  attendeesTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  attendeesTabBtnActive: {
    backgroundColor: '#E0F2FE',
  },
  attendeesTabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  attendeesTabBtnTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  attendeesTabDogBtnTextActive: {
    color: '#B45309',
    fontWeight: '800',
  },
  attendeesTabBizBtnTextActive: {
    color: '#7E22CE',
    fontWeight: '800',
  },
  myAttendanceBannerCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  attendeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  myStatusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  myStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  attendeeSubtitle: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
    fontWeight: '600',
  },
  attendeesSectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
  },
  attendeeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  attendeeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeDogsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  attendeeDogChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 6,
    paddingRight: 10,
  },
  attendeeDogThumb: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  attendeeDogName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  attendeeDogBreed: {
    fontSize: 10,
    color: '#64748B',
  },
  tutorDogsLead: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    width: '100%',
    marginBottom: 2,
  },
  myDogBannerCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  myDogBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  myDogChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 6,
    paddingRight: 10,
  },
  myDogThumb: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  myDogChipName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350F',
  },
  myDogChipBreed: {
    fontSize: 10,
    color: '#B45309',
  },
  dogAttendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  dogAttendeePhoto: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  dogAttendeeName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  dogPassportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dogPassportBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  dogAttendeeBreed: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dogAttendeeTutorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dogAttendeeTutorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CBD5E1',
  },
  dogAttendeeTutorText: {
    fontSize: 11,
    color: '#64748B',
  },
  businessStandCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  businessStandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessStandLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  businessStandName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  standBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  standBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7E22CE',
  },
  businessStandCategory: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  businessStandDesc: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    marginVertical: 8,
  },
  businessBenefitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  businessBenefitText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7E22CE',
  },
  businessCalloutBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  businessCalloutTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
  },
  businessCalloutSub: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
    lineHeight: 15,
  },
});
