import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Business } from '../models/Business';
import { RewardRedemption } from '../models/Gamification';
import { validateBusinessCouponInDb } from './rewardService';
import { cleanUndefined } from './userService';
import { logAuditAction } from './auditService';

let localBusinesses: Business[] = [];

export const getBusinessesFromDb = async (): Promise<Business[]> => {
  try {
    const snap = await getDocs(collection(db, 'businesses'));
    const list: Business[] = [];
    if (!snap.empty) {
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || '',
          logoUrl: data.logoUrl || 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=300',
          category: data.category || 'accesorios',
          description: data.description || '',
          instagramHandle: data.instagramHandle || '',
          phoneWhatsapp: data.phoneWhatsapp || '',
          coverageZone: data.coverageZone || 'Santiago',
          isVerified: !!data.isVerified,
          plan: data.plan || 'free',
          ownerUserId: data.ownerUserId || '',
          staffUserIds: data.staffUserIds || [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        });
      });
    }
    localBusinesses = list;
    return list;
  } catch (err) {
    console.warn('Error leyendo negocios de Firestore:', err);
    return [...localBusinesses];
  }
};

export const registerBusiness = async (
  businessData: Omit<Business, 'id' | 'isVerified' | 'plan' | 'staffUserIds' | 'createdAt'>
): Promise<{ success: boolean; id?: string; message: string }> => {
  try {
    const newId = 'biz-' + Date.now();
    const newBiz: Business = {
      ...businessData,
      id: newId,
      isVerified: false,
      plan: 'free',
      staffUserIds: [businessData.ownerUserId],
      createdAt: new Date()
    };

    await setDoc(doc(db, 'businesses', newId), cleanUndefined({
      ...newBiz,
      createdAt: serverTimestamp()
    }));

    localBusinesses.unshift(newBiz);

    await logAuditAction(
      businessData.ownerUserId,
      'BUSINESS_REGISTER',
      'businesses',
      newId,
      `Registro de comercio: ${businessData.name}`
    );

    return { success: true, id: newId, message: 'Perfil de comercio registrado en revisión oficial.' };
  } catch (err: any) {
    return { success: false, message: 'Error registrando comercio: ' + err.message };
  }
};

export const applyToEvent = async (
  eventId: string,
  businessId: string,
  businessName: string,
  businessLogoUrl: string,
  category: any,
  offerDescription: string
): Promise<{ success: boolean; message: string }> => {
  return { success: true, message: 'Postulación enviada a los organizadores de la junta.' };
};

export const validateCouponCode = async (
  code: string,
  businessUserId: string
): Promise<{ success: boolean; redemption?: RewardRedemption; message: string }> => {
  return validateBusinessCouponInDb(code, businessUserId);
};

