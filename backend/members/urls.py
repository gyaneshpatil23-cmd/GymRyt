from django.urls import path

from .views import (
    # Authentication & Admin
    LoginView,
    AdminRegisterView,
    LogoutAdminView,

    # Member Registration
    MemberRegisterView,
    RegistrationQRView,

    # Trainer Registration
    TrainerRegistrationQRView,
    TrainerApplicationCreateView,
    TrainerApplicationListView,
    TrainerApplicationActionView,

    # Dashboard
    DashboardStatsView,

    # Profile Pictures
    MemberProfilePictureView,
    AdminProfilePictureView,

    # Payments & Revenue
    PaymentListCreateView,
    PaymentDetailView,
    RevenueStatsView,

    # Trainers
    TrainerListView,
    TrainerCreateView,
    TrainerProfileView,
    TrainerAssignmentView,
    WorkoutPlanListCreateView,
    WorkoutPlanDetailView,

    # Members
    MemberListCreateView,
    MemberDetailView,

    
)


urlpatterns = [

    # ============================================================
    # AUTHENTICATION & ADMIN
    # ============================================================

    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),

    path(
        "admin/register/",
        AdminRegisterView.as_view(),
        name="admin-register",
    ),

    path(
        "admin/logout/",
        LogoutAdminView.as_view(),
        name="admin-logout",
    ),


    # ============================================================
    # MEMBER REGISTRATION
    # ============================================================

    path(
        "register/",
        MemberRegisterView.as_view(),
        name="member-register",
    ),

    path(
        "registration-qr/",
        RegistrationQRView.as_view(),
        name="registration-qr",
    ),


    # ============================================================
    # TRAINER REGISTRATION & APPLICATIONS
    # ============================================================

    path(
        "trainer-registration-qr/",
        TrainerRegistrationQRView.as_view(),
        name="trainer-registration-qr",
    ),

    path(
        "trainer-applications/",
        TrainerApplicationCreateView.as_view(),
        name="trainer-application-create",
    ),

    path(
        "trainer-applications/list/",
        TrainerApplicationListView.as_view(),
        name="trainer-application-list",
    ),

    path(
        "trainer-applications/<int:pk>/action/",
        TrainerApplicationActionView.as_view(),
        name="trainer-application-action",
    ),


    # ============================================================
    # DASHBOARD
    # ============================================================

    path(
        "dashboard-stats/",
        DashboardStatsView.as_view(),
        name="dashboard-stats",
    ),


    # ============================================================
    # PROFILE PICTURES
    # ============================================================

    path(
        "profile-picture/",
        MemberProfilePictureView.as_view(),
        name="member-profile-picture",
    ),

    path(
        "admin/profile-picture/",
        AdminProfilePictureView.as_view(),
        name="admin-profile-picture",
    ),


    # ============================================================
    # PAYMENTS & REVENUE
    # ============================================================

    path(
        "payments/",
        PaymentListCreateView.as_view(),
        name="payment-list-create",
    ),

    path(
        "payments/<int:pk>/",
        PaymentDetailView.as_view(),
        name="payment-detail",
    ),

    path(
        "revenue-stats/",
        RevenueStatsView.as_view(),
        name="revenue-stats",
    ),


    # ============================================================
    # TRAINERS
    # ============================================================

    path(
        "trainers/",
        TrainerListView.as_view(),
        name="trainer-list",
    ),

    path(
        "trainers/create/",
        TrainerCreateView.as_view(),
        name="trainer-create",
    ),

    path(
        "trainer/profile/",
        TrainerProfileView.as_view(),
        name="trainer-profile",
    ),

    path(
        "trainer/assign/",
        TrainerAssignmentView.as_view(),
        name="trainer-assignment",
    ),


    # ============================================================
    # MEMBERS
    # ============================================================

    # /api/members/
    path(
        "",
        MemberListCreateView.as_view(),
        name="member-list-create",
    ),

    # /api/members/<id>/
    path(
        "<int:pk>/",
        MemberDetailView.as_view(),
        name="member-detail",
    ),
]

