import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { notificationAPI } from './api/api';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

let messaging = null;

try {
  messaging = getMessaging(app);
} catch (err) {
  console.warn("Firebase Messaging is not supported in this browser context:", err);
}

export { messaging };

export const requestNotificationPermission = async () => {
  if (!messaging) {
    console.warn("FCM Messaging is not initialized or supported.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      if (token) {
        // Register FCM Device Token to Django
        await notificationAPI.registerToken(token, 'register');
        return token;
      } else {
        console.warn('FCM token registration returned empty.');
      }
    } else {
      console.warn('Notifications permission denied by user.');
    }
  } catch (error) {
    console.error('An error occurred while fetching FCM device token:', error);
  }
  return null;
};
