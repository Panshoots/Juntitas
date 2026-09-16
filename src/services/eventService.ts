import { Linking } from 'react-native';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { DogEvent, DogAttendeeSummary, EventStatus } from '../models/Event';
import { logAuditAction } from './auditService';

let localEvents: DogEvent[] = [];

export const getEvents = async (communityId?: string): Promise<DogEvent[]> => {
  try {
    const snap = await getDocs(collection(db, 'events'));
    if (!snap.empty) {
      const list: DogEvent[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          communityId: data.communityId || '',
          communityName: data.communityName || 'Comunidad',
          communityLogoUrl: data.communityLogoUrl || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=200',
          title: data.title || '',
          description: data.description || '',
          startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(),
          endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(),
          location: data.location || {
            placeName: 'Parque',
            address: 'Santiago',
            comuna: 'Santiago',
            region: 'Metropolitana',
            googleMapsUrl: 'https://maps.google.com'
          },
          coverPhotoUrl: data.coverPhotoUrl || 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
          status: data.status || 'programada',
          tutorsCount: data.tutorsCount || 0,
          dogsCount: data.dogsCount || 0,
          acceptsBusinesses: !!data.acceptsBusinesses,
          creatorUserId: data.creatorUserId || '',
          changeLogs: [],
          photosAlbum: [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        });
      });
      localEvents = list;
    }
  } catch (err) {
    console.warn('Leyendo eventos de caché local:', err);
  }

  if (communityId) {
    return localEvents.filter(e => e.communityId === communityId);
  }
  return [...localEvents];
};

export const createEvent = async (
  eventData: Omit<DogEvent, 'id' | 'tutorsCount' | 'dogsCount' | 'changeLogs' | 'photosAlbum' | 'createdAt'>
): Promise<{ success: boolean; id?: string; message: string }> => {
  const newEvent: DogEvent = {
    ...eventData,
    id: 'event-' + Date.now(),
    tutorsCount: 0,
    dogsCount: 0,
    changeLogs: [],
    photosAlbum: [],
    createdAt: new Date()
  };

  try {
    const docRef = await addDoc(collection(db, 'events'), {
      ...eventData,
      tutorsCount: 0,
      dogsCount: 0,
      createdAt: serverTimestamp()
    });
    newEvent.id = docRef.id;
  } catch (err) {
    console.warn('Creando evento localmente:', err);
  }

  localEvents.unshift(newEvent);
  await logAuditAction(
    eventData.creatorUserId,
    'EVENT_CREATE',
    'events',
    newEvent.id,
    `Nueva junta oficial publicada: "${newEvent.title}" para ${newEvent.communityName}`
  );

  return { success: true, id: newEvent.id, message: '¡Junta oficial publicada exitosamente!' };
};

export const updateEventStatusInDb = async (
  eventId: string,
  newStatus: EventStatus,
  adminUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    await updateDoc(doc(db, 'events', eventId), {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Actualizando evento localmente:', err);
  }

  const ev = localEvents.find(e => e.id === eventId);
  if (ev) ev.status = newStatus;

  await logAuditAction(
    adminUserId,
    'EVENT_STATUS_CHANGE',
    'events',
    eventId,
    `Estado de junta cambiado a: ${newStatus}`
  );

  return { success: true, message: `Estado de junta actualizado a ${newStatus}.` };
};

export const registerForEvent = async (
  eventId: string,
  userId: string,
  userName: string,
  userPhotoUrl: string | undefined,
  isPublic: boolean,
  selectedDogs: DogAttendeeSummary[]
): Promise<{ success: boolean; message: string }> => {
  if (!selectedDogs || selectedDogs.length === 0) {
    return { success: false, message: 'Debes seleccionar al menos un perrito para asistir a la junta.' };
  }

  const ev = localEvents.find(e => e.id === eventId);
  if (!ev) return { success: false, message: 'Junta no encontrada.' };

  ev.tutorsCount += 1;
  ev.dogsCount += selectedDogs.length;

  try {
    await updateDoc(doc(db, 'events', eventId), {
      tutorsCount: ev.tutorsCount,
      dogsCount: ev.dogsCount,
      updatedAt: serverTimestamp()
    });
    await addDoc(collection(db, 'eventAttendances'), {
      eventId,
      userId,
      userName,
      selectedDogs,
      status: 'CONFIRMADO',
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn('Registrando asistencia localmente:', err);
  }

  return { 
    success: true, 
    message: '¡Asistencia confirmada para ti y ' + selectedDogs.length + ' perrito(s)!' 
  };
};

export const openGoogleMapsUrl = async (googleMapsUrl: string) => {
  try {
    const supported = await Linking.canOpenURL(googleMapsUrl);
    if (supported) {
      await Linking.openURL(googleMapsUrl);
    } else {
      window.open(googleMapsUrl, '_blank');
    }
  } catch (err) {
    window.open(googleMapsUrl, '_blank');
  }
};
