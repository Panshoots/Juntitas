export type BusinessCategory = 
  | 'alimentos' 
  | 'accesorios' 
  | 'salud_veterinaria' 
  | 'adiestramiento' 
  | 'pasteleria' 
  | 'paseo_guarderia' 
  | 'otro';

export type BusinessPlan = 'free' | 'pro';

export interface BusinessCollaboration {
  userId: string;
  role: 'owner' | 'staff';
  assignedAt: any;
}

export interface Business {
  id: string;
  name: string;
  logoUrl: string;
  bannerUrl?: string;
  category: BusinessCategory;
  description: string;
  instagramHandle: string;
  phoneWhatsapp: string;
  coverageZone: string;
  websiteUrl?: string;
  isVerified: boolean; // Identidad comprobada
  plan: BusinessPlan;
  ownerUserId: string;
  staffUserIds: string[];
  createdAt: any;
  updatedAt?: any;
}

export type EventBusinessStatus = 'invited' | 'applied' | 'confirmed' | 'rejected' | 'cancelled';

export interface EventBusinessParticipation {
  id: string;
  eventId: string;
  businessId: string;
  businessName: string;
  businessLogoUrl: string;
  category: BusinessCategory;
  status: EventBusinessStatus;
  offerDescription?: string; // Ej: 'Degustación gratis de galletas y 15% dcto en accesorios'
  confirmedAt?: any;
  notes?: string;
}
