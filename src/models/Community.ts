export type CommunityRole = 'primary_admin' | 'secondary_admin' | 'member';

export interface SecondaryAdminPermissions {
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canManageMembers: boolean;
  canModeratePosts: boolean;
  canManageAlbums: boolean;
  canManageVendors: boolean;
}

export interface SecondaryAdminInfo {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  permissions: SecondaryAdminPermissions;
  assignedAt?: any;
}

export interface CommunityMember {
  userId: string;
  role: CommunityRole;
  permissions?: SecondaryAdminPermissions;
  joinedAt: any;
}

export type CommunityStatus = 'pending' | 'more_info_needed' | 'active' | 'rejected' | 'archived';

export type CommunityAccessType = 'open' | 'approval_required';

export interface Community {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  bannerUrl?: string;
  coverPhotoUrl?: string;
  description: string;
  instagramHandle?: string;
  websiteUrl?: string;
  region: string;
  comuna: string;
  approximateMembers?: number;
  isVerified: boolean; // Insignia de verificación de identidad externa
  creatorId?: string;
  primaryAdminId: string;
  secondaryAdmins?: SecondaryAdminInfo[];
  status: CommunityStatus;
  accessType?: CommunityAccessType; // 'open' (libre) | 'approval_required' (con aprobación)
  pendingMembers?: string[]; // IDs de usuarios esperando aprobación
  membersCount?: number;
  joinType?: string;
  members?: string[];
  eventsCount: number;
  createdAt: any;
  updatedAt?: any;
}

export type CommunityRequestStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'more_info_needed';

export interface CommunityRequest {
  id: string;
  communityName: string;
  applicantId: string;
  applicantEmail: string;
  applicantName: string;
  description: string;
  instagramHandle: string;
  verificationEvidenceUrls: string[];
  region: string;
  comuna: string;
  approximateSize: number;
  accessType?: CommunityAccessType;
  status: CommunityRequestStatus;
  reviewedBy?: string;
  feedbackNote?: string;
  createdAt: any;
}
