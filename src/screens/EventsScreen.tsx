import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Modal,
  TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DogEvent, EventStatus } from '../models/Event';
import { getEvents, registerForEvent, openGoogleMapsUrl, createEvent } from '../services/eventService';
import { useAuth } from '../context/AuthContext';

export const EventsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { activeProfile, currentUser, currentDogs, isSuperAdmin, canCreateEventFor } = useAuth();
  const [events, setEvents] = useState<DogEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DogEvent | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);

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
  }, []);

  useEffect(() => {
    // Inicializar primer perro seleccionado si existe
    if (currentDogs.length > 0) {
      setSelectedDogIds({ [currentDogs[0].id]: true });
    } else {
      setSelectedDogIds({});
    }
  }, [currentDogs]);

  const loadEvents = async () => {
    const data = await getEvents();
    setEvents(data);
  };

  const toggleDogSelection = (id: string) => {
    setSelectedDogIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirmAttendance = async () => {
    if (!selectedEvent) return;
    const selected = currentDogs
      .filter(d => selectedDogIds[d.id])
      .map(d => ({
        dogId: d.id,
        name: d.name,
        breed: d.breed
      }));

    if (selected.length === 0) {
      alert('Debes seleccionar al menos un perrito que asistirá a la junta.');
      return;
    }

    const res = await registerForEvent(
      selectedEvent.id,
      currentUser.id,
      currentUser.displayName,
      currentUser.photoURL || undefined,
      true,
      selected
    );

    alert(res.message);
    if (res.success) {
      setShowRegisterModal(false);
      loadEvents();
    }
  };

  const handleCreateNewEvent = async () => {
    if (!newTitle || !newPlace || !newAddress) {
      alert('Por favor completa el título, lugar y dirección.');
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

    alert(res.message);
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

                {/* Conteo transparente diferenciado: Tutores vs Perritos (Sección 12 Plan Maestro) */}
                <View style={styles.countsRow}>
                  <View style={styles.countBadge}>
                    <Ionicons name="person" size={14} color="#475569" />
                    <Text style={styles.countText}>{item.tutorsCount} Tutores</Text>
                  </View>
                  <View style={[styles.countBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="paw" size={14} color="#D97706" />
                    <Text style={[styles.countText, { color: '#B45309' }]}>
                      {item.dogsCount} Perritos
                    </Text>
                  </View>
                  {item.acceptsBusinesses && (
                    <View style={[styles.countBadge, { backgroundColor: '#F3E8FF' }]}>
                      <Ionicons name="storefront" size={14} color="#7E22CE" />
                      <Text style={[styles.countText, { color: '#7E22CE' }]}>Comercios</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.attendButton}
                  onPress={() => {
                    setSelectedEvent(item);
                    setShowRegisterModal(true);
                  }}
                >
                  <Text style={styles.attendButtonText}>🐾 Confirmar Asistencia (+100 🐾)</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Modal de Inscripción con Selección de Perritos (Sección 12 Plan Maestro) */}
      <Modal visible={showRegisterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inscribirse a la Junta</Text>
              <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              ¿Qué perrito o perritos te acompañarán a {selectedEvent?.title}?
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
                Regla R-1203: La plataforma cuenta por separado tutores y perros para planificar hidratación, espacio y seguridad.
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.confirmButton, currentDogs.length === 0 && { opacity: 0.5 }]} 
              onPress={handleConfirmAttendance}
              disabled={currentDogs.length === 0}
            >
              <Text style={styles.confirmButtonText}>¡Confirmar Asistencia!</Text>
            </TouchableOpacity>
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
});
