import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { configureNotificationHandler } from '../services/notifications';
import { useAuth } from '../hooks/useAuth';

function routeFromResponse(response: Notifications.NotificationResponse | null) {
  const route = response?.notification.request.content.data?.route;
  return typeof route === 'string' ? route : null;
}

export function NotificationRuntime() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user && pendingRoute) {
      router.push(pendingRoute);
      setPendingRoute(null);
    }
  }, [isLoading, pendingRoute, router, user]);

  useEffect(() => {
    configureNotificationHandler();
    const listener = Notifications.addNotificationResponseReceivedListener(response => {
      const route = routeFromResponse(response);
      if (route) setPendingRoute(route);
    });
    void Notifications.getLastNotificationResponseAsync().then(response => {
      const route = routeFromResponse(response);
      if (route) setPendingRoute(route);
    });
    return () => listener.remove();
  }, [router]);

  return null;
}
