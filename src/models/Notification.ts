export type NotificationType = 
  | 'event_cancelled' 
  | 'event_created' 
  | 'event_deleted' 
  | 'community' 
  | 'community_expelled'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string; // ID del usuario destinatario
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: any;
  eventId?: string;
  communityId?: string;
  communityName?: string;
  eventTitle?: string;
  cancellationReason?: string;
  metadata?: Record<string, any>;
}
