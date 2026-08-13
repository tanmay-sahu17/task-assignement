from django.db import models
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from django.contrib.auth import get_user_model
from projects.models import Project, Space, Sprint

User = get_user_model()

class Issue(models.Model):
    project = models.ForeignKey(Project, related_name='issues', on_delete=models.CASCADE, null=True, blank=True)
    space = models.ForeignKey(Space, related_name='issues', on_delete=models.CASCADE, null=True, blank=True)
    reporter = models.ForeignKey(User, related_name='reported_issues', on_delete=models.CASCADE)
    assignee = models.ForeignKey(User, related_name='assigned_issues', on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(blank=False, max_length=250)
    issue_no = models.AutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now=True)
    details = models.TextField(blank=False)
    label = models.CharField(max_length=100, blank=True, default='')

    class TypeOfIssue(models.TextChoices):
        STORY = 'ST', _('Story')
        BUG = 'BU', _('Bug')
        TASK = 'TA', _('Task')
        EPIC = 'EP', _('Epic')

    class Status(models.TextChoices):
        OPEN = 'OP', _('Open')
        IN_PROGRESS = 'IN', _('In Progress')
        CLOSED = 'CL', _('Closed')

    class Priority(models.TextChoices):
        LOW = 'LO', _('Low')
        MEDIUM = 'ME', _('Medium')
        HIGH = 'HI', _('High')
        CRITICAL = 'CR', _('Critical')

    type = models.CharField(
        max_length=2,
        choices=TypeOfIssue.choices,
        default=TypeOfIssue.BUG,
    )

    status = models.CharField(
        max_length=20,
        default=Status.OPEN,
    )

    priority = models.CharField(
        max_length=2,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )

    epic = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_issues'
    )
    sprint = models.ForeignKey(Sprint, on_delete=models.SET_NULL, null=True, blank=True, related_name='issues')
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)


    def get_absolute_url(self):
        return reverse('issues:detail', kwargs={'pk': self.pk})

    def __str__(self):
        returnString = f"#{self.issue_no} {self.title}"
        return returnString
