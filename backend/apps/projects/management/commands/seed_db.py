import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import UserProfile
from projects.models import Project, Invitation, JoinRequest
from spaces.models import Space, Page, Sprint, ProjectStatus
from issues.models import Issue
from comments.models import Comment

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with realistic sample projects, spaces, sprints, issues, and comments'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Starting database seeding..."))

        # 1. Create Users & Profiles
        self.stdout.write("Creating sample users...")
        
        users_data = [
            {'username': 'alice_lead', 'email': 'alice@example.com', 'first_name': 'Alice', 'last_name': 'Smith', 'job_title': 'Project Lead', 'department': 'Engineering', 'avatar_color': '#8b5cf6'},
            {'username': 'bob_dev', 'email': 'bob@example.com', 'first_name': 'Bob', 'last_name': 'Johnson', 'job_title': 'Frontend Developer', 'department': 'Frontend', 'avatar_color': '#f43f5e'},
            {'username': 'charlie_dev', 'email': 'charlie@example.com', 'first_name': 'Charlie', 'last_name': 'Brown', 'job_title': 'Backend Developer', 'department': 'Platform', 'avatar_color': '#10b981'},
            {'username': 'diana_qa', 'email': 'diana@example.com', 'first_name': 'Diana', 'last_name': 'Prince', 'job_title': 'QA Engineer', 'department': 'Quality', 'avatar_color': '#f59e0b'},
        ]

        users = []
        for u_data in users_data:
            user, created = User.objects.get_or_create(
                username=u_data['username'],
                defaults={'email': u_data['email']}
            )
            if created:
                user.set_password('password123')
                user.save()
            
            # Update user profile
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.first_name = u_data['first_name']
            profile.last_name = u_data['last_name']
            profile.job_title = u_data['job_title']
            profile.department = u_data['department']
            profile.avatar_color = u_data['avatar_color']
            profile.save()
            
            users.append(user)

        # Get or create admin user for lead references
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user, _ = User.objects.get_or_create(
                username='admin',
                defaults={'email': 'admin@example.com', 'is_superuser': True, 'is_staff': True}
            )
            admin_user.set_password('password123')
            admin_user.save()
        
        lead_user = users[0]
        dev_users = users[1:]

        # 2. Create Projects
        self.stdout.write("Creating projects...")
        
        proj1, created = Project.objects.get_or_create(
            key='APX',
            defaults={
                'name': 'Apex Cloud Platform',
                'description': 'Building next-generation distributed container clustering and microservices api gateway.',
                'lead': admin_user
            }
        )
        proj1.members.set([admin_user, lead_user] + dev_users)

        proj2, created = Project.objects.get_or_create(
            key='MTX',
            defaults={
                'name': 'Matrix Mobile Portal',
                'description': 'React Native application delivering matrix collaborative features and real-time alerts.',
                'lead': lead_user
            }
        )
        proj2.members.set([lead_user] + dev_users)

        # 3. Create Spaces
        self.stdout.write("Creating project spaces...")
        
        space1, _ = Space.objects.get_or_create(
            key='APX-CORE',
            defaults={
                'name': 'Apex Core Architecture',
                'description': 'Documentation and tracking for core container clustering engines and service mesh integrations.',
                'project': proj1,
                'created_by': admin_user
            }
        )
        
        space2, _ = Space.objects.get_or_create(
            key='MTX-APP',
            defaults={
                'name': 'Matrix Mobile UI',
                'description': 'Design files, user stories, and UX tasks for the iOS & Android collaborative portal.',
                'project': proj2,
                'created_by': lead_user
            }
        )

        # 4. Create Project Statuses (Columns)
        self.stdout.write("Creating columns...")
        
        for space in [space1, space2]:
            ProjectStatus.objects.get_or_create(space=space, code='OP', defaults={'name': 'To Do', 'order': 0})
            ProjectStatus.objects.get_or_create(space=space, code='IN', defaults={'name': 'In Progress', 'order': 1})
            ProjectStatus.objects.get_or_create(space=space, code='RV', defaults={'name': 'In Review', 'order': 2, 'project': space.project})
            ProjectStatus.objects.get_or_create(space=space, code='CL', defaults={'name': 'Done', 'order': 3})

        # 5. Create Sprints
        self.stdout.write("Creating sprints...")
        
        sprint1, _ = Sprint.objects.get_or_create(
            space=space1,
            name='ACM Sprint 1: Foundational API Gateway',
            defaults={
                'goal': 'Configure base API routes, oauth2 server flows, and initial postgres clustering tables.',
                'status': Sprint.Status.ACTIVE,
                'start_date': date.today() - timedelta(days=5),
                'end_date': date.today() + timedelta(days=9),
                'order': 1
            }
        )

        sprint2, _ = Sprint.objects.get_or_create(
            space=space2,
            name='Matrix Sprint 4: Real-time Boards UI',
            defaults={
                'goal': 'Polishing real-time updates using WebSockets, and completing mobile push notification widgets.',
                'status': Sprint.Status.ACTIVE,
                'start_date': date.today() - timedelta(days=2),
                'end_date': date.today() + timedelta(days=12),
                'order': 1
            }
        )

        # 6. Create Pages (Documentation Docs)
        self.stdout.write("Creating wiki pages...")
        Page.objects.get_or_create(
            space=space1,
            title='Core Architecture Specification',
            defaults={
                'content': '## Overview\nThis page outlines the core gateway routing algorithms and proxy timeout specifications.\n\n### Deployment\nRun inside Kubernetes using `./scripts/deploy-gateway.sh`.',
                'created_by': admin_user
            }
        )
        Page.objects.get_or_create(
            space=space2,
            title='Mobile Theme and Styling System',
            defaults={
                'content': '## Design Tokens\nWe are using glowing glassmorphic panels. All borders must be `#202024` with background backdrop filter blur set to `12px`.',
                'created_by': lead_user
            }
        )

        # 7. Create Issues
        self.stdout.write("Creating issues and tasks...")
        
        issues_data = [
            # Space 1 (APX-CORE)
            {
                'project': proj1, 'space': space1, 'sprint': sprint1, 'reporter': admin_user, 'assignee': dev_users[1],
                'title': 'Design OAuth2 token generation schemas and caching', 'details': 'We need to store JWT authorization tokens inside Redis cache cluster to limit Postgres hits.',
                'type': 'ST', 'priority': 'HI', 'status': 'IN', 'label': 'Security'
            },
            {
                'project': proj1, 'space': space1, 'sprint': sprint1, 'reporter': lead_user, 'assignee': dev_users[0],
                'title': 'API Gateway routing rules fail under high load', 'details': 'Load testing shows proxy timeout exceeding 5000ms. We should check load-balancing policies.',
                'type': 'BU', 'priority': 'CR', 'status': 'OP', 'label': 'Bug'
            },
            {
                'project': proj1, 'space': space1, 'sprint': sprint1, 'reporter': admin_user, 'assignee': None,
                'title': 'Database Migration script for cluster partitions', 'details': 'Create PostgreSQL partition scripts to handle task records exceeding 5 million rows.',
                'type': 'TA', 'priority': 'MD', 'status': 'RV', 'label': 'Database'
            },
            
            # Space 2 (MTX-APP)
            {
                'project': proj2, 'space': space2, 'sprint': sprint2, 'reporter': lead_user, 'assignee': dev_users[0],
                'title': 'Implement Glassmorphic Kanban Board Card UI component', 'details': 'Cards must render transparent with glowing indigo border shadows on hover.',
                'type': 'ST', 'priority': 'HI', 'status': 'IN', 'label': 'Frontend'
            },
            {
                'project': proj2, 'space': space2, 'sprint': sprint2, 'reporter': dev_users[2], 'assignee': dev_users[2],
                'title': 'Push notifications crash on iOS devices with empty payload', 'details': 'A null title inside notifications payload results in a blank crash screen. We must validate.',
                'type': 'BU', 'priority': 'CR', 'status': 'OP', 'label': 'iOS-Crash'
            },
            {
                'project': proj2, 'space': space2, 'sprint': sprint2, 'reporter': lead_user, 'assignee': dev_users[1],
                'title': 'Write UI integration tests for sprint boards', 'details': 'Write automation tests for starting, ending, and rollover of unfinished tasks in sprint boards.',
                'type': 'TA', 'priority': 'LO', 'status': 'CL', 'label': 'Tests'
            },
        ]

        created_issues = []
        for i_data in issues_data:
            issue, created = Issue.objects.get_or_create(
                project=i_data['project'],
                space=i_data['space'],
                title=i_data['title'],
                defaults={
                    'sprint': i_data['sprint'],
                    'reporter': i_data['reporter'],
                    'assignee': i_data['assignee'],
                    'details': i_data['details'],
                    'type': i_data['type'],
                    'priority': i_data['priority'],
                    'status': i_data['status'],
                    'label': i_data['label']
                }
            )
            created_issues.append(issue)

        # 8. Create Comments
        self.stdout.write("Creating sample comments...")
        
        comments_data = [
            {'issue': created_issues[0], 'user': dev_users[1], 'content': 'I have created the Redis connections class, will push it by tonight!'},
            {'issue': created_issues[0], 'user': lead_user, 'content': 'Awesome work. Make sure to implement proper failovers if Redis goes down.'},
            {'issue': created_issues[1], 'user': dev_users[0], 'content': 'I am looking into the Nginx load balancer parameters. I think client timeouts need to be adjusted.'},
            {'issue': created_issues[3], 'user': dev_users[0], 'content': 'Designing the glassmorphism borders now. Should the opacity of the glow be 0.1 or 0.2?'},
            {'issue': created_issues[3], 'user': lead_user, 'content': 'Go with 0.15 for dark mode cards. It looks more professional and readable.'},
        ]

        for c_data in comments_data:
            Comment.objects.get_or_create(
                issue=c_data['issue'],
                user=c_data['user'],
                content=c_data['content']
            )

        self.stdout.write(self.style.SUCCESS("Database seeded successfully with beautiful sample workspaces!"))
