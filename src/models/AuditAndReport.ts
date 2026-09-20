export type ReportTargetType = 'user' | 'dog' | 'post' | 'photo' | 'community' | 'event' | 'business';
export type ReportReason = 'spam' | 'offensive_content' | 'animal_abuse' | 'scam' | 'impersonation' | 'inappropriate_behavior' | 'other';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporterUserId: string;
  targetType: ReportTargetType;
  targetId: string;
  targetSummary: string;
  reason: ReportReason;
  comment?: string;
  evidenceUrls?: string[];
  status: ReportStatus;
  resolutionNote?: string;
  resolvedByAdminId?: string;
  createdAt: any;
  resolvedAt?: any;
}

export type AuditActionType = 
  | 'community_approved'
  | 'community_rejected'
  | 'community_ownership_transferred'
  | 'secondary_admin_promoted'
  | 'secondary_admin_revoked'
  | 'business_verified'
  | 'business_revoked'
  | 'user_suspended'
  | 'user_banned'
  | 'content_moderated'
  | 'event_force_cancelled'
  | (string & {});

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorName?: string;
  actorRole?: 'super_admin' | 'primary_admin' | string;
  action: AuditActionType;
  targetEntityType?: string;
  targetEntityId?: string;
  entityType?: string;
  entityId?: string;
  reason?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: any;
}
