import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AppNotification } from '../models/Notification';
import { getCommunities } from './communityService';

let localNotifications: AppNotification[] = [];

const sanitizeForFirestore = (obj: Record<string, any>): Record<string, any> => {
  const clean: Record<string, any> = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  });
  return clean;
};

/**
 * Enviar una notificación a un usuario específico
 */
export const sendNotificationToUser = async (
  userId: string,
  data: {
    title: string;
    message: string;
    type: AppNotification['type'];
    eventId?: string;
    communityId?: string;
    communityName?: string;
    eventTitle?: string;
    cancellationReason?: string;
    metadata?: Record<string, any>;
  }
): Promise<{ success: boolean; id: string }> => {
  const notifId = 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const newNotif: AppNotification = {
    id: notifId,
    userId,
    title: data.title,
    message: data.message,
    type: data.type,
    read: false,
    createdAt: new Date(),
    eventId: data.eventId,
    communityId: data.communityId,
    communityName: data.communityName,
    eventTitle: data.eventTitle,
    cancellationReason: data.cancellationReason,
    metadata: data.metadata
  };

  try {
    const payload = sanitizeForFirestore({
      ...newNotif,
      createdAt: serverTimestamp()
    });
    const docRef = await addDoc(collection(db, 'notifications'), payload);
    newNotif.id = docRef.id;
  } catch (err) {
    console.warn('Guardando notificación en memoria local:', err);
  }

  localNotifications.unshift(newNotif);
  return { success: true, id: newNotif.id };
};

/**
 * Notificar a todos los asistentes confirmados que la junta se ha cancelado con el motivo exacto
 */
export const notifyAttendeesOfCancellation = async (
  eventId: string,
  eventTitle: string,
  reason: string,
  attendeeUserIds: string[]
): Promise<number> => {
  if (!attendeeUserIds || attendeeUserIds.length === 0) return 0;

  const uniqueUsers = Array.from(new Set(attendeeUserIds));
  let sentCount = 0;

  for (const uid of uniqueUsers) {
    if (!uid) continue;
    await sendNotificationToUser(uid, {
      title: `❌ Junta Cancelada: "${eventTitle}"`,
      message: `La junta a la que confirmaste asistencia ha sido cancelada. Motivo: ${reason}`,
      type: 'event_cancelled',
      eventId,
      eventTitle,
      cancellationReason: reason
    });
    sentCount++;
  }

  return sentCount;
};

/**
 * Notificar a todos los asistentes confirmados que la junta ha sido eliminada
 */
export const notifyAttendeesOfDeletion = async (
  eventId: string,
  eventTitle: string,
  reason: string,
  attendeeUserIds: string[]
): Promise<number> => {
  if (!attendeeUserIds || attendeeUserIds.length === 0) return 0;

  const uniqueUsers = Array.from(new Set(attendeeUserIds));
  let sentCount = 0;

  for (const uid of uniqueUsers) {
    if (!uid) continue;
    await sendNotificationToUser(uid, {
      title: `⚠️ Junta Retirada: "${eventTitle}"`,
      message: `La junta fue eliminada de la plataforma. Motivo: ${reason || 'Moderación administrativa'}`,
      type: 'event_deleted',
      eventId,
      eventTitle,
      cancellationReason: reason
    });
    sentCount++;
  }

  return sentCount;
};

/**
 * Notificar a un tutor que ha sido expulsado de la comunidad con el motivo
 */
export const notifyMemberOfExpulsion = async (
  userId: string,
  communityId: string,
  communityName: string,
  reason: string
): Promise<void> => {
  await sendNotificationToUser(userId, {
    title: `🚨 Expulsión de la comunidad "${communityName}"`,
    message: `Has sido expulsado de la comunidad "${communityName}". Motivo: ${reason}`,
    type: 'community_expelled',
    communityId,
    communityName,
    cancellationReason: reason
  });
};

/**
 * Notificar a un aspirante que su solicitud de ingreso fue aprobada
 */
export const notifyMemberOfApproval = async (
  userId: string,
  communityId: string,
  communityName: string
): Promise<void> => {
  await sendNotificationToUser(userId, {
    title: `🎉 ¡Solicitud Aprobada en ${communityName}!`,
    message: `¡Felicidades! Has sido aceptado como miembro oficial de ${communityName}. Ganaste +10 🐾 Huellitas de bienvenida.`,
    type: 'community',
    communityId,
    communityName
  });
};

/**
 * Notificar a un aspirante que su solicitud no fue aceptada
 */
export const notifyMemberOfRejection = async (
  userId: string,
  communityId: string,
  communityName: string,
  reason?: string
): Promise<void> => {
  await sendNotificationToUser(userId, {
    title: `📩 Solicitud en ${communityName}`,
    message: `Tu solicitud para unirte a ${communityName} no fue aprobada en esta ocasión. ${reason ? 'Motivo: ' + reason : ''}`,
    type: 'community',
    communityId,
    communityName
  });
};

/**
 * Notificar al Administrador de una comunidad que un tutor ha solicitado unirse
 */
export const notifyAdminOfJoinRequest = async (
  adminUserId: string,
  communityId: string,
  communityName: string,
  applicantName: string,
  applicantUserId: string
): Promise<void> => {
  await sendNotificationToUser(adminUserId, {
    title: `🐾 Solicitud de ingreso: ${communityName}`,
    message: `${applicantName} ha solicitado unirse a "${communityName}". Revisa su perfil y autoriza su acceso en Gestión de Comunidad.`,
    type: 'community_join_request',
    communityId,
    communityName,
    metadata: {
      action: 'join_request',
      applicantUserId,
      communityId
    }
  });
};

/**
 * Notificar al Super Administrador que se ha solicitado validar una nueva comunidad
 */
export const notifySuperAdminOfCommunityRequest = async (
  requestId: string,
  communityName: string,
  applicantName: string,
  applicantEmail?: string
): Promise<void> => {
  // Enviar al Super Administrador Supremo
  await sendNotificationToUser('zjnYSghe7oMOd3FPCnMFfpE2Yrb2', {
    title: `🏛️ Solicitud de Comunidad: ${communityName}`,
    message: `${applicantName} (${applicantEmail || 'Tutor'}) ha enviado una solicitud para fundar la comunidad "${communityName}". Revisa los antecedentes en el CRM.`,
    type: 'community_request',
    metadata: {
      action: 'community_request',
      requestId,
      communityName
    }
  });
};

/**
 * Notificar al Super Administrador cuando un nuevo usuario se registra solicitando rol de Administrador
 */
export const notifySuperAdminOfNewAdminRegistration = async (
  userId: string,
  displayName: string,
  email: string,
  requestedCommunityName?: string
): Promise<void> => {
  await sendNotificationToUser('zjnYSghe7oMOd3FPCnMFfpE2Yrb2', {
    title: `🛡️ Nuevo Administrador por validar`,
    message: `${displayName} (${email}) se ha registrado como Administrador de Comunidad solicitando "${requestedCommunityName || 'Comunidad'}". Revisa y valida su cuenta en el CRM.`,
    type: 'community_request',
    metadata: {
      action: 'admin_registration',
      userId,
      requestedCommunityName
    }
  });
};

/**
 * Notificar a todos los miembros de una comunidad cuando se crea una nueva junta oficial
 */
export const notifyCommunityMembersOfNewEvent = async (
  communityId: string,
  communityName: string,
  eventId: string,
  eventTitle: string,
  eventDateFormatted: string,
  creatorUserId?: string
): Promise<number> => {
  try {
    const comms = await getCommunities();
    const comm = comms.find(c => c.id === communityId);
    if (!comm) return 0;

    const members: string[] = comm.members || (comm.primaryAdminId ? [comm.primaryAdminId] : []);
    const uniqueMembers = Array.from(new Set(members)).filter(uid => uid && uid !== creatorUserId);

    let sent = 0;
    for (const uid of uniqueMembers) {
      await sendNotificationToUser(uid, {
        title: `🎉 ¡Nueva Junta en ${communityName}!`,
        message: `Se ha publicado "${eventTitle}" para el ${eventDateFormatted}. ¡Inscríbete con tus perritos!`,
        type: 'event_created',
        eventId,
        communityId,
        communityName,
        eventTitle
      });
      sent++;
    }
    return sent;
  } catch (err) {
    console.warn('Error enviando notificaciones de nueva junta a miembros:', err);
    return 0;
  }
};

/**
 * Obtener las notificaciones de un usuario
 */
export const getUserNotifications = async (userId: string): Promise<AppNotification[]> => {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      limit(50)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list: AppNotification[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          userId: data.userId,
          title: data.title || 'Notificación',
          message: data.message || '',
          type: data.type || 'system',
          read: !!data.read,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          eventId: data.eventId,
          communityId: data.communityId,
          communityName: data.communityName,
          eventTitle: data.eventTitle,
          cancellationReason: data.cancellationReason,
          metadata: data.metadata
        });
      });
      // Ordenar por fecha descendente
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      localNotifications = list;
      return list;
    }
  } catch (err) {
    console.warn('Leyendo notificaciones de Firestore:', err);
  }

  return localNotifications
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * Marcar una notificación individual como leída
 */
export const markNotificationAsRead = async (notifId: string): Promise<void> => {
  const notif = localNotifications.find(n => n.id === notifId);
  if (notif) notif.read = true;

  try {
    await updateDoc(doc(db, 'notifications', notifId), {
      read: true,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Actualizando lectura de notificación en Firestore:', err);
  }
};

/**
 * Marcar todas las notificaciones del usuario como leídas
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  localNotifications
    .filter(n => n.userId === userId)
    .forEach(n => { n.read = true; });

  try {
    const list = await getUserNotifications(userId);
    const unread = list.filter(n => !n.read);
    for (const n of unread) {
      await updateDoc(doc(db, 'notifications', n.id), {
        read: true,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn('Error marcando todas como leídas:', err);
  }
};

/**
 * Obtener conteo de notificaciones no leídas
 */
export const getUnreadNotificationCount = (userId: string, notifs?: AppNotification[]): number => {
  const source = notifs || localNotifications;
  return source.filter(n => n.userId === userId && !n.read).length;
};
