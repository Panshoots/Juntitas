import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  FlatList, 
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppNotification } from '../models/Notification';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectEvent?: (eventId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectEvent
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  const renderIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'event_cancelled':
        return <View style={[styles.iconBadge, { backgroundColor: '#FEE2E2' }]}><Ionicons name="alert-circle" size={20} color="#DC2626" /></View>;
      case 'event_deleted':
        return <View style={[styles.iconBadge, { backgroundColor: '#FEF2F2' }]}><Ionicons name="trash-bin" size={20} color="#EF4444" /></View>;
      case 'event_created':
        return <View style={[styles.iconBadge, { backgroundColor: '#DCFCE7' }]}><Ionicons name="calendar" size={20} color="#15803D" /></View>;
      case 'community':
        return <View style={[styles.iconBadge, { backgroundColor: '#E0F2FE' }]}><Ionicons name="paw" size={20} color="#0284C7" /></View>;
      default:
        return <View style={[styles.iconBadge, { backgroundColor: '#F1F5F9' }]}><Ionicons name="notifications" size={20} color="#475569" /></View>;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Hoy';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-CL', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="notifications" size={22} color="#0F172A" />
              <Text style={styles.headerTitle}>Notificaciones & Avisos</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Botón Marcar Todas como leídas */}
          {unreadCount > 0 && (
            <View style={styles.markAllBar}>
              <Text style={styles.unreadInfoText}>Tienes {unreadCount} aviso(s) sin leer</Text>
              <TouchableOpacity onPress={onMarkAllAsRead} style={styles.markAllBtn}>
                <Ionicons name="checkmark-done" size={14} color="#0284C7" />
                <Text style={styles.markAllText}>Marcar leídas</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Listado de Notificaciones */}
          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={44} color="#94A3B8" />
                <Text style={styles.emptyTitle}>¡Todo al día!</Text>
                <Text style={styles.emptySubtitle}>No tienes notificaciones pendientes en este momento.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.itemCard, !item.read && styles.itemCardUnread]}
                onPress={() => {
                  if (!item.read) onMarkAsRead(item.id);
                  if (item.eventId && onSelectEvent) onSelectEvent(item.eventId);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.itemHeader}>
                  {renderIcon(item.type)}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.itemMessage}>{item.message}</Text>
                  </View>
                </View>

                {/* Recuadro destacado para motivo de cancelación */}
                {item.cancellationReason ? (
                  <View style={styles.reasonCard}>
                    <View style={styles.reasonHeader}>
                      <Ionicons name="information-circle" size={15} color="#DC2626" />
                      <Text style={styles.reasonHeaderTitle}>Motivo informado por la administración:</Text>
                    </View>
                    <Text style={styles.reasonContent}>"{item.cancellationReason}"</Text>
                  </View>
                ) : null}

                {/* Indicador de No Leída */}
                {!item.read && (
                  <View style={styles.unreadDotRow}>
                    <View style={styles.unreadDot} />
                    <Text style={styles.unreadLabel}>No leída</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  markAllBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  unreadInfoText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  itemCardUnread: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  itemTitleUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },
  itemDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 6,
  },
  itemMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginTop: 4,
  },
  reasonCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reasonHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
  },
  reasonContent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    fontStyle: 'italic',
  },
  unreadDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0284C7',
  },
  unreadLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
});
