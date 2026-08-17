from firebase_admin import messaging
from .models import Notification, FCMDevice

def send_push_notification(user, title, body, link='', actor=None):
    # 1. Create in-app notification record
    Notification.objects.create(
        recipient=user,
        actor=actor,
        title=title,
        description=body,
        link=link
    )

    # 2. Get active FCM device tokens for user
    devices = FCMDevice.objects.filter(user=user)
    tokens = [d.registration_token for d in devices]

    if not tokens:
        return

    # 3. Send via Firebase Admin SDK
    try:
        message = messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data={
                'click_action': link,
                'link': link
            },
            webpush=messaging.WebpushConfig(
                fcm_options=messaging.WebpushFCMOptions(
                    link=link
                )
            )
        )
        response = messaging.send_multicast(message)
        
        # Clean up stale/invalid tokens
        if response.failure_count > 0:
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    # Token failed, delete from db
                    FCMDevice.objects.filter(registration_token=tokens[idx]).delete()
    except Exception as e:
        print(f"Failed to send FCM push notification: {e}")
