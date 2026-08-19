import { useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '../api/api';
import { requestNotificationPermission } from '../firebase';
import useAuth from './useAuth';

export default function useNotifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const data = await notificationAPI.getAll();
      setNotifications(data);
      const unread = data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [token]);

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    try {
      await notificationAPI.markAsRead(unreadIds);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  const markSingleAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead([id]);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark single notification as read:", err);
    }
  };

  // Setup notification polling and FCM listeners
  useEffect(() => {
    if (!token) return;

    fetchNotifications();
    requestNotificationPermission().catch(err => console.warn(err));

    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    const setupFCMListener = async () => {
      const { messaging } = await import('../firebase');
      if (messaging) {
        const { onMessage } = await import('firebase/messaging');
        const unsubscribe = onMessage(messaging, (payload) => {
          console.log("Foreground message received:", payload);
          fetchNotifications();
          if (Notification.permission === 'granted') {
            new Notification(payload.notification.title, {
              body: payload.notification.body,
              icon: '/favicon.svg'
            });
          }
        });
        return unsubscribe;
      }
    };

    let fcmUnsubscribePromise = setupFCMListener();

    return () => {
      clearInterval(pollInterval);
      fcmUnsubscribePromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      }).catch(err => console.warn(err));
    };
  }, [token, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    fetchNotifications,
    markAllAsRead,
    markSingleAsRead
  };
}
