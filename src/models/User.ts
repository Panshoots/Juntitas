export interface UserLocation {
  region: string;
  comuna: string;
}

export interface UserContact {
  phone?: string;
  instagram?: string;
  isPublic: boolean;
}

export interface UserPrivacySettings {
  showDogsPublicly: boolean;
  showCommunitiesPublicly: boolean;
  showAttendancePublicly: boolean;
}

export type UserStatus = 
  | 'ACTIVO' 
  | 'PENDIENTE_APROBACION' 
  | 'SUSPENDIDO' 
  | 'ELIMINADO'
  | 'active' 
  | 'suspended' 
  | 'banned';

export type UserRole = 
  | 'super_admin' 
  | 'primary_admin' 
  | 'secondary_admin' 
  | 'business_owner' 
  | 'member';

export interface AppUser {
  id: string; // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL: string | null;
  bio?: string;
  roleType?: UserRole;
  filterProfileType?: 'tutor' | 'community_admin' | 'business';
  requestedCommunityName?: string;
  requestedBusinessName?: string;
  location?: UserLocation;
  contact?: UserContact;
  privacy: UserPrivacySettings;
  pawBalance: number;
  isSuperAdmin?: boolean;
  status: UserStatus;
  suspendedReason?: string;
  createdAt: any;
  updatedAt?: any;
}
