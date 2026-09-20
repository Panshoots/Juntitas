import { Linking } from 'react-native';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  where,
  arrayUnion,
  arrayRemove,
  increment 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { DogEvent, DogAttendeeSummary, EventStatus } from '../models/Event';
import { logAuditAction } from './auditService';
import { 
  notifyAttendeesOfCancellation, 
  notifyAttendeesOfDeletion, 
  notifyCommunityMembersOfNewEvent 
} from './notificationService';

export interface UserAttendanceRecord {
  id?: string;
  eventId: string;
  userId: string;
  userName: string;
  selectedDogs: DogAttendeeSummary[];
  status: 'CONFIRMADO' | 'CANCELADO';
  timestamp: any;
}

let localEvents: DogEvent[] = [];
let localAttendances: UserAttendanceRecord[] = [];

export const getEvents = async (communityId?: string): Promise<DogEvent[]> => {
  try {
    const snap = await getDocs(collection(db, 'events'));
    const list: DogEvent[] = [];
    if (!snap.empty) {
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
          attendeeUserIds: data.attendeeUserIds || [],
          acceptsBusinesses: !!data.acceptsBusinesses,
          creatorUserId: data.creatorUserId || '',
          changeLogs: [],
          photosAlbum: [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        } as unknown as DogEvent);
      });
    }
    localEvents = list;
    if (communityId) {
      return list.filter(e => e.communityId === communityId);
    }
    return list;
  } catch (err) {
    console.warn('Leyendo eventos de caché local:', err);
    if (communityId) {
      return localEvents.filter(e => e.communityId === communityId);
    }
    return [...localEvents];
  }
};

export const getUserAttendances = async (userId: string): Promise<Record<string, DogAttendeeSummary[]>> => {
  const result: Record<string, DogAttendeeSummary[]> = {};
  try {
    const q = query(
      collection(db, 'eventAttendances'),
      where('userId', '==', userId),
      where('status', '==', 'CONFIRMADO')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      snap.forEach(d => {
        const data = d.data();
        result[data.eventId] = data.selectedDogs || [];
      });
      return result;
    }
  } catch (err) {
    console.warn('Leyendo asistencias de Firestore:', err);
  }

  // Fallback memoria local
  localAttendances
    .filter(a => a.userId === userId && a.status === 'CONFIRMADO')
    .forEach(a => {
      result[a.eventId] = a.selectedDogs;
    });

  return result;
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
    eventData.creatorUserId || 'system',
    'EVENT_CREATE',
    'events',
    newEvent.id,
    `Nueva junta oficial publicada: "${newEvent.title}" para ${newEvent.communityName}`
  );

  // Notificar a todos los miembros de la comunidad sobre la nueva junta oficial
  const dateFormatted = newEvent.startDate 
    ? (newEvent.startDate.toLocaleDateString 
        ? newEvent.startDate.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) 
        : 'próximamente')
    : 'próximamente';
  notifyCommunityMembersOfNewEvent(
    newEvent.communityId,
    newEvent.communityName,
    newEvent.id,
    newEvent.title,
    dateFormatted,
    eventData.creatorUserId
  ).catch(e => console.warn('Error notificando nueva junta:', e));

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

export const cancelEventByAdmin = async (
  eventId: string,
  reason: string,
  adminUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    await updateDoc(doc(db, 'events', eventId), {
      status: 'cancelada',
      cancellationReason: reason,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Cancelando evento localmente:', err);
  }

  const ev = localEvents.find(e => e.id === eventId);
  if (ev) ev.status = 'cancelada';

  // Notificar a todos los tutores confirmados con el motivo obligatorio
  if (ev && ev.attendeeUserIds && ev.attendeeUserIds.length > 0) {
    notifyAttendeesOfCancellation(
      eventId,
      ev.title,
      reason,
      ev.attendeeUserIds
    ).catch(e => console.warn('Error notificando cancelación a tutores:', e));
  }

  await logAuditAction(
    adminUserId,
    'EVENT_CANCEL_BY_ADMIN',
    'events',
    eventId,
    `Junta cancelada por el Super Admin. Motivo: ${reason}`
  );

  return { success: true, message: 'Junta cancelada correctamente y tutores notificados.' };
};

export const deleteEventInDb = async (
  eventId: string,
  reason: string,
  adminUserId: string
): Promise<{ success: boolean; message: string }> => {
  const ev = localEvents.find(e => e.id === eventId);
  if (ev && ev.attendeeUserIds && ev.attendeeUserIds.length > 0) {
    notifyAttendeesOfDeletion(
      eventId,
      ev.title,
      reason,
      ev.attendeeUserIds
    ).catch(e => console.warn('Error notificando eliminación a tutores:', e));
  }

  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (err) {
    console.warn('Eliminando evento localmente:', err);
  }

  localEvents = localEvents.filter(e => e.id !== eventId);

  await logAuditAction(
    adminUserId,
    'EVENT_DELETE_BY_ADMIN',
    'events',
    eventId,
    `Junta eliminada definitivamente por el Super Admin. Motivo: ${reason || 'Eliminación administrativa'}`
  );

  return { success: true, message: 'Junta eliminada definitivamente de la plataforma.' };
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

  const existingLocal = localAttendances.find(a => a.eventId === eventId && a.userId === userId && a.status === 'CONFIRMADO');
  if (existingLocal) {
    return { success: false, message: '¡Ya estás inscrito en esta junta! Puedes editar tus perritos acompañantes.' };
  }

  const ev = localEvents.find(e => e.id === eventId);
  if (ev) {
    if (ev.attendeeUserIds?.includes(userId)) {
      return { success: false, message: '¡Ya confirmaste tu asistencia a esta junta!' };
    }
    ev.tutorsCount += 1;
    ev.dogsCount += selectedDogs.length;
    if (!ev.attendeeUserIds) ev.attendeeUserIds = [];
    ev.attendeeUserIds.push(userId);
  }

  const attendanceObj: UserAttendanceRecord = {
    id: 'att-' + Date.now(),
    eventId,
    userId,
    userName,
    selectedDogs,
    status: 'CONFIRMADO',
    timestamp: new Date()
  };
  localAttendances.push(attendanceObj);

  try {
    await updateDoc(doc(db, 'events', eventId), {
      tutorsCount: ev ? ev.tutorsCount : increment(1),
      dogsCount: ev ? ev.dogsCount : increment(selectedDogs.length),
      attendeeUserIds: arrayUnion(userId),
      updatedAt: serverTimestamp()
    });
    const docRef = await addDoc(collection(db, 'eventAttendances'), {
      eventId,
      userId,
      userName,
      selectedDogs,
      status: 'CONFIRMADO',
      timestamp: serverTimestamp()
    });
    attendanceObj.id = docRef.id;
  } catch (err) {
    console.warn('Registrando asistencia localmente:', err);
  }

  return { 
    success: true, 
    message: '¡Asistencia confirmada para ti y ' + selectedDogs.length + ' perrito(s)!' 
  };
};

export const updateEventAttendance = async (
  eventId: string,
  userId: string,
  selectedDogs: DogAttendeeSummary[]
): Promise<{ success: boolean; message: string }> => {
  if (!selectedDogs || selectedDogs.length === 0) {
    return { success: false, message: 'Debes seleccionar al menos un perrito acompañante.' };
  }

  const existing = localAttendances.find(a => a.eventId === eventId && a.userId === userId && a.status === 'CONFIRMADO');
  const prevCount = existing ? existing.selectedDogs.length : 1;
  const diff = selectedDogs.length - prevCount;

  if (existing) {
    existing.selectedDogs = selectedDogs;
  }

  const ev = localEvents.find(e => e.id === eventId);
  if (ev) {
    ev.dogsCount = Math.max(0, ev.dogsCount + diff);
  }

  try {
    const q = query(
      collection(db, 'eventAttendances'),
      where('eventId', '==', eventId),
      where('userId', '==', userId),
      where('status', '==', 'CONFIRMADO')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const attDoc = snap.docs[0];
      await updateDoc(attDoc.ref, {
        selectedDogs,
        updatedAt: serverTimestamp()
      });
    }

    if (ev) {
      await updateDoc(doc(db, 'events', eventId), {
        dogsCount: ev.dogsCount,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn('Actualizando perritos de asistencia en Firestore:', err);
  }

  return { 
    success: true, 
    message: '¡Perritos acompañantes actualizados exitosamente (' + selectedDogs.length + ' perrito(s))!' 
  };
};

export const cancelEventAttendance = async (
  eventId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  const existing = localAttendances.find(a => a.eventId === eventId && a.userId === userId && a.status === 'CONFIRMADO');
  const dogsRemoved = existing ? existing.selectedDogs.length : 1;
  if (existing) {
    existing.status = 'CANCELADO';
  }

  const ev = localEvents.find(e => e.id === eventId);
  if (ev) {
    ev.tutorsCount = Math.max(0, ev.tutorsCount - 1);
    ev.dogsCount = Math.max(0, ev.dogsCount - dogsRemoved);
    if (ev.attendeeUserIds) {
      ev.attendeeUserIds = ev.attendeeUserIds.filter(id => id !== userId);
    }
  }

  try {
    const q = query(
      collection(db, 'eventAttendances'),
      where('eventId', '==', eventId),
      where('userId', '==', userId),
      where('status', '==', 'CONFIRMADO')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, {
        status: 'CANCELADO',
        cancelledAt: serverTimestamp()
      });
    }

    await updateDoc(doc(db, 'events', eventId), {
      tutorsCount: ev ? ev.tutorsCount : increment(-1),
      dogsCount: ev ? ev.dogsCount : increment(-dogsRemoved),
      attendeeUserIds: arrayRemove(userId),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Cancelando asistencia localmente:', err);
  }

  return { success: true, message: 'Has cancelado tu asistencia a la junta.' };
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
