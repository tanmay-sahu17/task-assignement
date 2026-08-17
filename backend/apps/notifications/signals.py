from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from issues.models import Issue
from comments.models import Comment
from .helpers import send_push_notification

User = get_user_model()

@receiver(pre_save, sender=Issue)
def issue_pre_save_receiver(sender, instance, raw=False, **kwargs):
    if raw or not instance.pk:
        return
    try:
        orig = Issue.objects.get(pk=instance.pk)
        instance._original_status = orig.status
        instance._original_assignee = orig.assignee
    except Issue.DoesNotExist:
        pass


@receiver(post_save, sender=Issue)
def issue_post_save_receiver(sender, instance, created, raw=False, **kwargs):
    if raw:
        return
        
    link = f"/board/{instance.space.id}/issue/{instance.issue_no}" if instance.space else ""
    
    if created:
        # Notify Assignee of new task assignment
        if instance.assignee:
            send_push_notification(
                user=instance.assignee,
                title="New Task Assigned",
                body=f"You have been assigned: #{instance.issue_no} - {instance.title}",
                link=link,
                actor=instance.reporter
            )
    else:
        # 1. Assignee changed notification
        orig_assignee = getattr(instance, '_original_assignee', None)
        if instance.assignee and instance.assignee != orig_assignee:
            send_push_notification(
                user=instance.assignee,
                title="Task Assigned",
                body=f"You have been assigned: #{instance.issue_no} - {instance.title}",
                link=link,
                actor=instance.reporter
            )
            
        # 2. Status changed notification
        orig_status = getattr(instance, '_original_status', None)
        if instance.status != orig_status:
            status_display = instance.status
            # Map status codes to names if possible
            if instance.status == 'OP':
                status_display = 'Open'
            elif instance.status == 'IN':
                status_display = 'In Progress'
            elif instance.status == 'CL':
                status_display = 'Closed'
                
            orig_status_display = orig_status
            if orig_status == 'OP':
                orig_status_display = 'Open'
            elif orig_status == 'IN':
                orig_status_display = 'In Progress'
            elif orig_status == 'CL':
                orig_status_display = 'Closed'

            # Notify Assignee
            if instance.assignee:
                send_push_notification(
                    user=instance.assignee,
                    title="Task Status Updated",
                    body=f"Task #{instance.issue_no} status changed from '{orig_status_display}' to '{status_display}'",
                    link=link,
                    actor=None
                )
            # Notify Reporter
            if instance.reporter and instance.reporter != instance.assignee:
                send_push_notification(
                    user=instance.reporter,
                    title="Task Status Updated",
                    body=f"Task #{instance.issue_no} status changed from '{orig_status_display}' to '{status_display}'",
                    link=link,
                    actor=None
                )


@receiver(post_save, sender=Comment)
def comment_notification_receiver(sender, instance, created, raw=False, **kwargs):
    if raw or not created:
        return
        
    issue = instance.issue
    if not issue:
        return
        
    link = f"/board/{issue.space.id}/issue/{issue.issue_no}" if issue.space else ""
    comment_author = instance.user
    
    # Notify Assignee of the task
    if issue.assignee and issue.assignee != comment_author:
        send_push_notification(
            user=issue.assignee,
            title="New Comment on Task",
            body=f"{comment_author.username} commented on #{issue.issue_no}: '{instance.content[:30]}...'",
            link=link,
            actor=comment_author
        )
        
    # Notify Reporter of the task
    if issue.reporter and issue.reporter != comment_author and issue.reporter != issue.assignee:
        send_push_notification(
            user=issue.reporter,
            title="New Comment on Task",
            body=f"{comment_author.username} commented on #{issue.issue_no}: '{instance.content[:30]}...'",
            link=link,
            actor=comment_author
        )
