import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Project(models.Model):
    name = models.CharField(max_length=255)
    key = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True)
    lead = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='led_projects')
    members = models.ManyToManyField(User, related_name='assigned_projects', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and self.lead:
            self.members.add(self.lead)

    def __str__(self):
        return f"{self.name} ({self.key})"


class Invitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, related_name='invitations')
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invite to {self.email} for {self.project.name if self.project else 'Workspace'}"


class JoinRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PE', 'Pending'
        APPROVED = 'AP', 'Approved'
        REJECTED = 'RE', 'Rejected'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='join_requests')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='join_requests')
    status = models.CharField(max_length=2, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'user')

    def __str__(self):
        return f"{self.user.username} request for {self.project.name} ({self.get_status_display()})"


class Space(models.Model):
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=10, unique=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, related_name='spaces')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_spaces')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.key})"


class Page(models.Model):
    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name='pages')
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_pages')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.space.name}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    job_title = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    avatar_color = models.CharField(max_length=7, default='#4f46e5')
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"


from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
    else:
        UserProfile.objects.create(user=instance)


class ProjectStatus(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='columns', null=True, blank=True)
    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name='columns', null=True, blank=True)
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        unique_together = ('space', 'code')

    def __str__(self):
        space_name = self.space.name if self.space else (self.project.name if self.project else "No Space/Project")
        return f"{space_name} - {self.name} ({self.code})"


@receiver(post_save, sender=Project)
def create_default_project_statuses(sender, instance, created, **kwargs):
    if created:
        ProjectStatus.objects.create(project=instance, name="To Do / Open", code="OP", order=0)
        ProjectStatus.objects.create(project=instance, name="In Progress", code="IN", order=1)
        ProjectStatus.objects.create(project=instance, name="Done / Closed", code="CL", order=2)


@receiver(post_save, sender=Space)
def create_default_space_statuses(sender, instance, created, **kwargs):
    if created:
        ProjectStatus.objects.create(space=instance, project=instance.project, name="To Do", code="OP", order=0)
        ProjectStatus.objects.create(space=instance, project=instance.project, name="In Progress", code="IN", order=1)
        ProjectStatus.objects.create(space=instance, project=instance.project, name="Done", code="CL", order=2)

