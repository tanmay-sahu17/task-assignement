from rest_framework.routers import DefaultRouter
from .views import SpaceViewSet, PageViewSet, SprintViewSet

router = DefaultRouter()
router.register('spaces', SpaceViewSet, basename='space')
router.register('pages', PageViewSet, basename='page')
router.register('sprints', SprintViewSet, basename='sprint')

urlpatterns = router.urls
