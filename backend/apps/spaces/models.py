from django.db import models
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver
from projects.models import Project

User = get_user_model()

class Space(models.Model):
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True, default='')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, related_name='spaces')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_spaces')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projects_space'

    def __str__(self):
        return f"{self.name} ({self.key})"


class Page(models.Model):
    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name='pages')
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_pages')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects_page'

    def __str__(self):
        return f"{self.title} - {self.space.name}"


class ProjectStatus(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='columns', null=True, blank=True)
    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name='columns', null=True, blank=True)
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        unique_together = ('space', 'code')
        db_table = 'projects_projectstatus'

    def __str__(self):
        space_name = self.space.name if self.space else (self.project.name if self.project else "No Space/Project")
        return f"{space_name} - {self.name} ({self.code})"


@receiver(post_save, sender=Project)
def create_default_project_statuses(sender, instance, created, raw=False, **kwargs):
    if raw:
        return
    if created:
        ProjectStatus.objects.create(project=instance, name="To Do / Open", code="OP", order=0)
        ProjectStatus.objects.create(project=instance, name="In Progress", code="IN", order=1)
        ProjectStatus.objects.create(project=instance, name="Done / Closed", code="CL", order=2)


@receiver(post_save, sender=Space)
def create_default_space_statuses(sender, instance, created, raw=False, **kwargs):
    if raw:
        return
    if created:
        ProjectStatus.objects.create(space=instance, project=instance.project, name="To Do", code="OP", order=0)
        ProjectStatus.objects.create(space=instance, project=instance.project, name="In Progress", code="IN", order=1)
        ProjectStatus.objects.create(space=instance, project=instance.project, name="Done", code="CL", order=2)


class Sprint(models.Model):
    class Status(models.TextChoices):
        PLANNING = 'PL', 'Planning'
        ACTIVE   = 'AC', 'Active'
        COMPLETED = 'CO', 'Completed'

    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name='sprints')
    name = models.CharField(max_length=100)
    goal = models.TextField(blank=True, default='')
    status = models.CharField(max_length=2, choices=Status.choices, default=Status.PLANNING)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'projects_sprint'

    def __str__(self):
        return f"{self.name} - {self.space.name} ({self.get_status_display()})"
