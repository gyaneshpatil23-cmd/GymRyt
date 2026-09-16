from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [

    # ============================================================
    # DJANGO ADMIN
    # ============================================================

    path(
        "admin/",
        admin.site.urls
    ),


    # ============================================================
    # MEMBERS APP / MAIN API
    # ============================================================

    path(
        "api/members/",
        include("members.urls")
    ),

]


# ============================================================
# MEDIA FILES
# ============================================================
#
# Required for:
# - Trainer profile pictures
# - Member profile pictures
# - Admin profile pictures
#
# Development only.
# ============================================================

if settings.DEBUG:

    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )