from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from projects.models import Project, Space, Page
from issues.models import Issue
from comments.models import Comment

class JiraCloneAPITests(APITestCase):

    def setUp(self):
        # Create test users
        self.user1 = User.objects.create_user(username='alice', password='password123', email='alice@example.com')
        self.user2 = User.objects.create_user(username='bob', password='password123', email='bob@example.com')
        
        # Token for Alice
        self.token1 = Token.objects.create(user=self.user1)
        
        # Create a project
        self.project = Project.objects.create(
            name="Alpha Project",
            key="ALPHA",
            description="First test project",
            lead=self.user1
        )
        
        # Create an issue
        self.issue = Issue.objects.create(
            project=self.project,
            reporter=self.user1,
            assignee=self.user2,
            title="Fix bug #1",
            details="Database connection timeout",
            type="BU",
            status="OP",
            priority="HI"
        )

    # 1. Test User Login and Token Retrieval
    def test_login_and_token(self):
        url = reverse('api_login')
        data = {'username': 'alice', 'password': 'password123'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'alice')

    # 2. Test Project Creation via API (Requires Authentication)
    def test_create_project_unauthorized(self):
        url = reverse('project-list')
        data = {'name': 'Beta Project', 'key': 'BETA', 'description': 'No auth', 'lead': self.user1.id}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_project_authorized(self):
        # Make self.user1 a superuser since project creation is now restricted to superusers
        self.user1.is_superuser = True
        self.user1.save()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        url = reverse('project-list')
        data = {'name': 'Beta Project', 'key': 'BETA', 'description': 'Authorized', 'lead': self.user1.id}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Project.objects.count(), 2)

    # 3. Test Issue Creation via API linked to Project
    def test_create_issue(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        # Add user2 (Bob) to project members first so he can be assigned
        self.project.members.add(self.user2)
        url = reverse('issue-list')
        data = {
            'project': self.project.id,
            'title': 'New Story Task',
            'details': 'Story task detail',
            'type': 'ST',
            'status': 'OP',
            'priority': 'ME',
            'assignee': self.user2.id
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Issue.objects.count(), 2)
        self.assertEqual(response.data['reporter'], self.user1.id)

    # 4. Test Issue Filtering by Project and Status
    def test_issue_filtering(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        url = reverse('issue-list')
        
        # Filter by project (should match 1 issue)
        response = self.client.get(url, {'project': self.project.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Filter by status OP (should match 1 issue)
        response = self.client.get(url, {'status': 'OP'}, format='json')
        self.assertEqual(len(response.data), 1)

        # Filter by status CL (should match 0 issues)
        response = self.client.get(url, {'status': 'CL'}, format='json')
        self.assertEqual(len(response.data), 0)

    # 5. Test Comment Creation & Ownership deletion rules
    def test_comment_creation_and_deletion(self):
        # Create comment as Alice
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        url = reverse('comment-list')
        data = {
            'content': 'Test comment content',
            'issue': self.issue.issue_no
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        comment_id = response.data['id']
        self.assertEqual(Comment.objects.count(), 1)

        # Try to delete comment as Bob (Unauthorized to delete Alice's comment)
        token2 = Token.objects.create(user=self.user2)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token2.key)
        detail_url = reverse('comment-detail', kwargs={'pk': comment_id})
        response = self.client.delete(detail_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Delete comment as Alice (Authorized)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        response = self.client.delete(detail_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Comment.objects.count(), 0)

    # 6. Test Manage Members Permissions (Lead vs Non-Lead)
    def test_manage_members_permission(self):
        # Bob (user2) is not a member yet. Tries to manage members of Alice's (user1) project
        token2 = Token.objects.create(user=self.user2)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token2.key)
        url = reverse('project-manage-members', kwargs={'pk': self.project.id})
        data = {'member_ids': [self.user1.id, self.user2.id]}
        
        # 1. Non-member gets 404 (Hidden Project)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Add Bob to project members
        self.project.members.add(self.user2)

        # 2. Member but non-lead gets 403 Forbidden
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Alice (user1) who is the Lead successfully manages members
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.project.members.count(), 2)

    # 7. Test Assignee Project Membership Validation
    def test_invalid_assignee_validation(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        url = reverse('issue-list')
        
        # Bob is NOT a member of the project yet. Attempting to assign issue to Bob should fail.
        data = {
            'project': self.project.id,
            'title': 'Test bug assignment',
            'details': 'Details',
            'type': 'BU',
            'status': 'OP',
            'priority': 'ME',
            'assignee': self.user2.id
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('assignee', response.data)

        # Add Bob to project first
        self.project.members.add(self.user2)

        # Now attempting to assign to Bob should succeed
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['assignee'], self.user2.id)

    # 8. Test Workspace Governance: Restricted Project Creation
    def test_restrict_project_creation_permissions(self):
        # Alice (user1, standard user) tries to create a project
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        url = reverse('project-list')
        data = {'name': 'Unauthorized Project', 'key': 'UNAUTH', 'description': 'desc', 'lead': self.user1.id}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Superuser successfully creates a project
        superuser = User.objects.create_superuser(username='superadmin', email='super@example.com', password='password')
        super_token = Token.objects.create(user=superuser)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + super_token.key)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # 9. Test Workspace Governance: Invitation Flow
    def test_invitation_permissions_and_accept(self):
        # Bob (user2, standard user who is NOT lead of Alice's project) tries to invite Charlie
        token2 = Token.objects.create(user=self.user2)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token2.key)
        url = reverse('invitation-list')
        data = {
            'email': 'charlie@example.com',
            'project': self.project.id
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Alice (Project Lead) successfully sends invitation
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invite_id = response.data['id']

        # Charlie accepts the invitation publicly
        self.client.credentials() # Unauthenticated
        accept_url = reverse('invitation-accept')
        accept_data = {
            'token': invite_id,
            'username': 'charlie',
            'password': 'charliepassword123'
        }
        response = self.client.post(accept_url, accept_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        
        # Verify Charlie is now a member of Alice's project
        self.project.refresh_from_db()
        self.assertTrue(self.project.members.filter(username='charlie').exists())

    # 10. Test Workspace Governance: Join Requests Flow
    def test_join_request_flow(self):
        # Bob (user2) wants to request to join Alice's project
        token2 = Token.objects.create(user=self.user2)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token2.key)
        url = reverse('join-request-list')
        data = {'project': self.project.id}
        
        # Bob creates the join request
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        request_id = response.data['id']

        # Charlie (another user) tries to approve Bob's request (fails with 403)
        charlie = User.objects.create_user(username='charliedev', email='charliedev@example.com', password='password')
        charlie_token = Token.objects.create(user=charlie)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + charlie_token.key)
        approve_url = reverse('join-request-approve', kwargs={'pk': request_id})
        response = self.client.post(approve_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Alice (Project Lead) approves Bob's request
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        response = self.client.post(approve_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify Bob is now a member of the project
        self.project.refresh_from_db()
        self.assertTrue(self.project.members.filter(id=self.user2.id).exists())

    # 11. Test Confluence-style Spaces & Pages Access Controls
    def test_spaces_and_pages_membership_scope(self):
        # Alice (user1) creates a Space associated with her project
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        space_url = reverse('space-list')
        data = {
            'name': 'API Architecture Specs',
            'key': 'APIARCH',
            'project': self.project.id
        }
        response = self.client.post(space_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        space_id = response.data['id']

        # Bob (user2, non-member of Alice's project) tries to create a Space for Alice's project (fails with 403)
        token2 = Token.objects.create(user=self.user2)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token2.key)
        bob_data = {
            'name': 'Bob Architecture Specs',
            'key': 'BOBAPI',
            'project': self.project.id
        }
        response = self.client.post(space_url, bob_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Bob queries spaces list -> should NOT return Alice's project space
        response = self.client.get(space_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # Alice creates a global workspace Space (no project)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        global_data = {
            'name': 'General Team Rules',
            'key': 'RULES',
            'project': None
        }
        response = self.client.post(space_url, global_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Bob queries spaces list -> should see the global space now
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token2.key)
        response = self.client.get(space_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['key'], 'RULES')

        # Alice creates a Page in her project-linked Space
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
        page_url = reverse('page-list')
        page_data = {
            'space': space_id,
            'title': 'V1 Endpoints',
            'content': 'HTML specifications...'
        }
        response = self.client.post(page_url, page_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        page_id = response.data['id']

        # Bob tries to access the page directly or filter by it -> gets empty list (filtered out by get_queryset)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token2.key)
        response = self.client.get(f"{page_url}?space={space_id}", format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)



