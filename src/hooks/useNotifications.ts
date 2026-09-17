import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
  read: boolean;
  dismissed?: boolean;
  isSystem?: boolean;
  targetView?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const addNotification = useCallback((title: string, message: string, type: Notification['type'] = 'info', isSystem = true, targetView?: string) => {
    const id = crypto.randomUUID();
    const newNotification: Notification = {
      id,
      title,
      message,
      type,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      read: !isSystem ? false : true, // System toasts are "read" inherently to not pollute unread count
      isSystem,
      targetView
    };
    setNotifications(prev => [newNotification, ...prev]);

    // Auto-dismiss toasts after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
    }, 4000);
  }, []);

  const addAlert = useCallback((title: string, message: string, type: Notification['type'] = 'warning', targetView?: string) => {
    // Only add if not already present recently to avoid spam
    const id = crypto.randomUUID();
    setNotifications(prev => {
      const exists = prev.some(n => n.title === title && n.message === message && !n.isSystem);
      if (exists) return prev;
      return [{
        id,
        title,
        message,
        type,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        read: false,
        isSystem: false,
        targetView
      }, ...prev];
    });

    // Auto-dismiss alert toast after 4 seconds (but it remains in the Bell list)
    setTimeout(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
    }, 4000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    setNotifications,
    showNotifications,
    setShowNotifications,
    addNotification,
    addAlert,
    dismissNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
}
