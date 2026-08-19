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
    project = instance.project
    
    if created:
        # Notify all members of the project about the new task
        if project:
            for member in project.members.all():
                # Notify assignee with customized assignment text, others with creation text
                if instance.assignee and member == instance.assignee:
                    title = "New Task Assigned"
                    body = f"You have been assigned: #{instance.issue_no} - {instance.title}"
                else:
                    title = "New Task Created"
                    body = f"#{instance.issue_no} was created: {instance.title}"
                    
                # Exclude the reporter from receiving "New Task Created"
                if member == instance.reporter and not (instance.assignee and member == instance.assignee):
                    continue
                    
                send_push_notification(
                    user=member,
                    title=title,
                    body=body,
                    link=link,
                    actor=instance.reporter
                )
    else:
        # 1. Assignee changed notification
        orig_assignee = getattr(instance, '_original_assignee', None)
        if instance.assignee and instance.assignee != orig_assignee:
            if project:
                for member in project.members.all():
                    if member == instance.assignee:
                        title = "Task Assigned"
                        body = f"You have been assigned: #{instance.issue_no} - {instance.title}"
                    else:
                        title = "Task Assignment Updated"
                        body = f"#{instance.issue_no} was assigned to {instance.assignee.username}"
                        
                    send_push_notification(
                        user=member,
                        title=title,
                        body=body,
                        link=link,
                        actor=instance.reporter
                    )
            
        # 2. Status changed notification
        orig_status = getattr(instance, '_original_status', None)
        if instance.status != orig_status:
            status_display = instance.status
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
                
            if project:
                for member in project.members.all():
                    send_push_notification(
                        user=member,
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
    project = issue.project
    
    if project:
        for member in project.members.all():
            if member == comment_author:
                continue
            send_push_notification(
                user=member,
                title="New Comment on Task",
                body=f"{comment_author.username} commented on #{issue.issue_no}: '{instance.content[:30]}...'",
                link=link,
                actor=comment_author
            )
