import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AuditLog } from '../models/AuditAndReport';

let localAuditLogs: AuditLog[] = [];

export const logAuditAction = async (
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  const logEntry: Omit<AuditLog, 'id'> = {
    actorUserId,
    action,
    entityType,
    entityId,
    reason: reason || 'Acción administrativa realizada desde el CRM.',
    metadata: metadata || {},
    timestamp: new Date()
  };

  try {
    const docRef = await addDoc(collection(db, 'auditLogs'), {
      ...logEntry,
      timestamp: serverTimestamp()
    });
    localAuditLogs.unshift({ ...logEntry, id: docRef.id });
  } catch (error) {
    console.warn('Firestore offline o no configurado aún, guardando auditoría local:', error);
    localAuditLogs.unshift({ ...logEntry, id: 'audit-' + Date.now() });
  }
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  try {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const logs: AuditLog[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        logs.push({
          id: doc.id,
          actorUserId: d.actorUserId || 'super_admin',
          action: d.action || 'SISTEMA',
          entityType: d.entityType || 'GLOBAL',
          entityId: d.entityId || 'none',
          reason: d.reason || '',
          metadata: d.metadata || {},
          timestamp: d.timestamp?.toDate ? d.timestamp.toDate() : new Date()
        });
      });
      localAuditLogs = logs;
      return logs;
    }
  } catch (error) {
    console.warn('Error leyendo auditLogs de Firestore, usando caché local:', error);
  }
  return [...localAuditLogs];
};
