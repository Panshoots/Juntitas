import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { RewardItem, RewardRedemption, RewardType } from '../models/Gamification';
import { logAuditAction } from './auditService';
import { cleanUndefined } from './userService';

/**
 * 🧮 FÓRMULA OFICIAL DE PRECIOS EN HUELLITAS
 * Regla de economía comunitaria: 
 * Para que el canje requiera esfuerzo real y perseverancia de los tutores en juntas y comunidad:
 * 1 Huellita = $15 CLP de valor comercial.
 *
 * Ejemplos:
 * - Producto $3.000 CLP  -> 200 Huellitas (aprox. 1 semana activa o 2 juntas)
 * - Producto $6.000 CLP  -> 400 Huellitas (aprox. 2 semanas activas o 4 juntas)
 * - Producto $12.000 CLP -> 800 Huellitas (aprox. 1 mes de fidelidad y asistencia)
 * - Producto $25.000 CLP -> 1.667 Huellitas (premio mayor / gran aniversario)
 */
export const CLP_PER_PAW = 15;

export const calculatePawsFromCLP = (priceCLP: number): number => {
  if (!priceCLP || priceCLP <= 0) return 50;
  const calculated = Math.round(priceCLP / CLP_PER_PAW);
  return Math.max(50, calculated); // Mínimo 50 Huellitas
};

let localRewards: RewardItem[] = [];

/**
 * 🎁 Publicar un producto o beneficio en la Tienda de Huellitas desde un Comercio
 */
export const publishBusinessReward = async (params: {
  businessId: string;
  businessName: string;
  title: string;
  description: string;
  priceCLP: number;
  stock: number;
  imageUrl?: string;
}): Promise<{ success: boolean; reward?: RewardItem; message: string }> => {
  try {
    const pawsCost = calculatePawsFromCLP(params.priceCLP);
    const rewardId = 'rew-' + Date.now();

    const newReward: RewardItem = {
      id: rewardId,
      title: params.title,
      description: params.description,
      type: 'comercial',
      pawsCost,
      originalPriceCLP: params.priceCLP,
      imageUrl: params.imageUrl || 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=400',
      businessId: params.businessId,
      businessName: params.businessName,
      stockAvailable: params.stock,
      status: 'active',
      createdAt: new Date()
    };

    const docRef = doc(db, 'rewards', rewardId);
    await setDoc(docRef, cleanUndefined({
      ...newReward,
      createdAt: serverTimestamp()
    }));

    localRewards.unshift(newReward);

    await logAuditAction(
      params.businessId,
      'REWARD_PUBLISH',
      'rewards',
      rewardId,
      `Tienda "${params.businessName}" publicó producto "${params.title}" ($${params.priceCLP} CLP = ${pawsCost} 🐾)`
    );

    return { 
      success: true, 
      reward: newReward, 
      message: `¡Producto publicado con éxito en la Tienda de Huellitas por ${pawsCost} 🐾!` 
    };
  } catch (err: any) {
    return { success: false, message: 'Error al publicar recompensa: ' + err.message };
  }
};

/**
 * 📦 Obtener Recompensas de la Base de Datos
 * Si Firestore está vacío, retorna una lista vacía (sin datos falsos o mock)
 */
export const getRewardsFromDb = async (type?: RewardType): Promise<RewardItem[]> => {
  try {
    const snap = await getDocs(collection(db, 'rewards'));
    const list: RewardItem[] = [];

    if (!snap.empty) {
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || '',
          description: data.description || '',
          type: data.type || 'comercial',
          pawsCost: data.pawsCost || 100,
          originalPriceCLP: data.originalPriceCLP,
          imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=400',
          businessId: data.businessId,
          businessName: data.businessName,
          stockAvailable: data.stockAvailable !== undefined ? data.stockAvailable : 10,
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        });
      });
    }

    localRewards = list;
    if (type) {
      return list.filter(r => r.type === type);
    }
    return list;
  } catch (err) {
    console.warn('Error leyendo recompensas de Firestore:', err);
    if (type) {
      return localRewards.filter(r => r.type === type);
    }
    return [...localRewards];
  }
};

/**
 * 🎟️ Canjear Recompensa con Huellitas
 */
export const redeemRewardInDb = async (
  userId: string,
  reward: RewardItem,
  userName: string
): Promise<{ success: boolean; redemptionCode?: string; message: string }> => {
  try {
    // 1. Validar stock en Firestore si aplica
    const rewDoc = await getDoc(doc(db, 'rewards', reward.id));
    if (rewDoc.exists()) {
      const rewData = rewDoc.data();
      if (rewData.stockAvailable !== undefined && rewData.stockAvailable <= 0) {
        return { success: false, message: 'Lo sentimos, este producto se encuentra agotado temporalmente.' };
      }
    }

    // 2. Generar código único no predecible de 6 caracteres alfanuméricos
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let uniqueCode = '';
    for (let i = 0; i < 6; i++) {
      uniqueCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const redemptionId = 'red-' + Date.now();

    const redemptionDoc: RewardRedemption = {
      id: redemptionId,
      rewardId: reward.id,
      rewardTitle: reward.title,
      rewardType: reward.type,
      userId,
      userName,
      businessId: reward.businessId,
      uniqueCode,
      qrPayload: `JUNTITAS:REDEEM:${uniqueCode}`,
      status: 'active',
      pawsSpent: reward.pawsCost,
      createdAt: new Date()
    };

    // 3. Guardar canje en Firestore
    await setDoc(doc(db, 'redemptions', redemptionId), cleanUndefined({
      ...redemptionDoc,
      createdAt: serverTimestamp()
    }));

    // 4. Descontar stock del producto en la tienda
    if (reward.id) {
      try {
        await updateDoc(doc(db, 'rewards', reward.id), {
          stockAvailable: increment(-1)
        });
      } catch (e) {
        console.warn('No se pudo decrementar stock en Firestore:', e);
      }
    }

    // 5. Registrar transacción inmutable en el libro mayor de Huellitas
    const txId = 'tx-' + Date.now();
    await setDoc(doc(db, 'pawTransactions', txId), cleanUndefined({
      id: txId,
      userId,
      action: 'redeem_coupon',
      amount: -reward.pawsCost,
      referenceId: redemptionId,
      description: `Canje de beneficio: ${reward.title}`,
      createdAt: serverTimestamp()
    }));

    // 6. Actualizar balance de usuario
    try {
      await updateDoc(doc(db, 'users', userId), {
        pawBalance: increment(-reward.pawsCost)
      });
    } catch (e) {
      console.warn('No se pudo actualizar balance de usuario:', e);
    }

    await logAuditAction(
      userId,
      'REWARD_REDEEM',
      'redemptions',
      redemptionId,
      `Usuario ${userName} canjeó "${reward.title}" por ${reward.pawsCost} 🐾. Código generado: ${uniqueCode}`
    );

    return {
      success: true,
      redemptionCode: uniqueCode,
      message: `¡Canje exitoso! Presenta tu código ${uniqueCode} en la tienda.`
    };
  } catch (err: any) {
    return { success: false, message: 'Error al procesar el canje: ' + err.message };
  }
};

/**
 * 🔍 Validar y quemar código QR de canje en la tienda física
 */
export const validateBusinessCouponInDb = async (
  code: string,
  businessUserId: string
): Promise<{ success: boolean; redemption?: RewardRedemption; message: string }> => {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: 'Por favor ingresa un código de 6 caracteres.' };
  }

  try {
    const q = query(collection(db, 'redemptions'), where('uniqueCode', '==', cleanCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false, message: 'Código no encontrado o inexistente.' };
    }

    const d = snap.docs[0];
    const data = d.data() as RewardRedemption;

    if (data.status === 'used') {
      return { 
        success: false, 
        message: `⚠️ Este cupón ya fue utilizado previamente el ${data.usedAt?.toDate ? data.usedAt.toDate().toLocaleString() : 'anteriormente'}.` 
      };
    }

    if (data.status === 'expired') {
      return { success: false, message: '⚠️ Este cupón ha expirado.' };
    }

    // Quemar el cupón (Regla REW-004)
    await updateDoc(doc(db, 'redemptions', d.id), {
      status: 'used',
      usedAt: serverTimestamp(),
      validatedByBusinessUserId: businessUserId
    });

    await logAuditAction(
      businessUserId,
      'COUPON_VALIDATE',
      'redemptions',
      d.id,
      `Cupón ${cleanCode} validado exitosamente para "${data.rewardTitle}"`
    );

    return {
      success: true,
      redemption: { ...data, status: 'used' },
      message: `✅ ¡Cupón válido! Beneficio: "${data.rewardTitle}" para ${data.userName}.`
    };
  } catch (err: any) {
    return { success: false, message: 'Error validando cupón: ' + err.message };
  }
};

/**
 * Obtener todos los canjes y cupones de un usuario
 */
export const getUserRedemptions = async (userId: string): Promise<RewardRedemption[]> => {
  try {
    const q = query(collection(db, 'redemptions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const list: RewardRedemption[] = [];
    if (!snap.empty) {
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          rewardId: data.rewardId,
          rewardTitle: data.rewardTitle,
          rewardType: data.rewardType,
          userId: data.userId,
          userName: data.userName,
          businessId: data.businessId,
          uniqueCode: data.uniqueCode,
          qrPayload: data.qrPayload,
          status: data.status,
          pawsSpent: data.pawsSpent,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          usedAt: data.usedAt?.toDate ? data.usedAt.toDate() : undefined
        });
      });
      return list;
    }
  } catch (err) {
    console.warn('Error obteniendo canjes del usuario:', err);
  }
  return [];
};
