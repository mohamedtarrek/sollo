import { useState, useEffect, useRef } from "react";

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
    type: NotificationType;
    message: string;
    description?: string;
    txid?: string;
}

type Listener = (notification: Notification) => void;

let listeners: Listener[] = [];

export const notify = (notification: Notification) => {
    listeners.forEach((listener) => listener(notification));
};

export const useNotification = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const notificationsRef = useRef<Notification[]>([]);

    useEffect(() => {
        const listener: Listener = (notification) => {
            const exists = notificationsRef.current.some((n) => n.message === notification.message);
            if (!exists) {
                notificationsRef.current = [...notificationsRef.current, notification];
                setNotifications([...notificationsRef.current]);
                setTimeout(() => {
                    notificationsRef.current = notificationsRef.current.filter((n) => n.message !== notification.message);
                    setNotifications([...notificationsRef.current]);
                }, 5000);
            }
        };
        listeners.push(listener);
        return () => {
            listeners = listeners.filter((l) => l !== listener);
        };
    }, []);

    return {
        notifications,
    };
};
