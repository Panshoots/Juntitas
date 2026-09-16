import { 
  Business, 
  EventBusinessParticipation 
} from '../models/Business';
import { RewardRedemption } from '../models/Gamification';
import { mockBusinesses } from '../mock/mockData';

let businessesState = [...mockBusinesses];

export const registerBusiness = async (
  businessData: Omit<Business, 'id' | 'isVerified' | 'plan' | 'staffUserIds' | 'createdAt'>
): Promise<{ success: boolean; id?: string; message: string }> => {
  const newBiz: Business = {
    ...businessData,
    id: 'biz-' + Date.now(),
    isVerified: false,
    plan: 'free',
    staffUserIds: [businessData.ownerUserId],
    createdAt: new Date()
  };
  businessesState.push(newBiz);
  return { success: true, id: newBiz.id, message: 'Perfil de comercio creado exitosamente.' };
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
  return { 
    success: true, 
    message: '¡Cupón ' + code.toUpperCase() + ' validado exitosamente en el stand!' 
  };
};
