import { API_ENDPOINTS } from '../config/apiConfig';
import { request } from './apiRequest';

export interface PortalNotification {
  id: string;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  dueAt: string | null;
  readAt: string | null;
}
export interface NotificationFeed { items: PortalNotification[]; unreadCount: number }
export const getNotifications = async (token: string, signal?: AbortSignal) =>
  (await request<NotificationFeed>(API_ENDPOINTS.NOTIFICATIONS.LIST, token, {}, signal)).data;
export const markNotificationsRead = async (token: string, ids: string[]) =>
  (await request<{ ids: string[]; readAt: string }>(API_ENDPOINTS.NOTIFICATIONS.READ, token, {
    method: 'POST', body: JSON.stringify({ ids }),
  })).data;
