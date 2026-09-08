from django.urls import path

from .views import (
    LoginView,
    AdminRegisterView,
    RegistrationQRView,
    TrainerRegistrationQRView,
    MemberRegisterView,
    LogoutAdminView,
    DashboardStatsView,
    MemberListCreateView,
    MemberDetailView,
    PaymentListCreateView,
    PaymentDetailView,
    RevenueStatsView,
    MemberProfilePictureView,
    AdminProfilePictureView,
    TrainerListView,
    TrainerCreateView,

    # ========================================================
    # TRAINER APPLICATIONS
    # ========================================================

    TrainerApplicationCreateView,
    TrainerApplicationListView,
    TrainerApplicationActionView,
)


urlpatterns = [

    # ========================================================
    # AUTHENTICATION
    # ========================================================

    path(
        "login/",
        LoginView.as_view(),
        name="login"
    ),

    path(
        "admin/register/",
        AdminRegisterView.as_view(),
        name="admin-register"
    ),

    path(
        "admin/logout/",
        LogoutAdminView.as_view(),
        name="admin-logout"
    ),


    # ========================================================
    # MEMBER REGISTRATION
    # ========================================================

    path(
        "register/",
        MemberRegisterView.as_view(),
        name="member-register"
    ),

    path(
        "registration-qr/",
        RegistrationQRView.as_view(),
        name="registration-qr"
    ),


    # ========================================================
    # TRAINER REGISTRATION QR
    # ========================================================

    path(
        "trainer-registration-qr/",
        TrainerRegistrationQRView.as_view(),
        name="trainer-registration-qr"
    ),


    # ========================================================
    # TRAINER APPLICATIONS
    # ========================================================

    # Trainer submits application after scanning QR
    path(
        "trainer-applications/",
        TrainerApplicationCreateView.as_view(),
        name="trainer-application-create"
    ),

    # Owner gets all trainer applications
    path(
        "trainer-applications/list/",
        TrainerApplicationListView.as_view(),
        name="trainer-application-list"
    ),

    # Owner approves or rejects application
    path(
        "trainer-applications/<int:pk>/action/",
        TrainerApplicationActionView.as_view(),
        name="trainer-application-action"
    ),


    # ========================================================
    # DASHBOARD
    # ========================================================

    path(
        "dashboard-stats/",
        DashboardStatsView.as_view(),
        name="dashboard-stats"
    ),


    # ========================================================
    # PROFILE PICTURES
    # ========================================================

    path(
        "profile-picture/",
        MemberProfilePictureView.as_view(),
        name="member-profile-picture"
    ),

    path(
        "admin/profile-picture/",
        AdminProfilePictureView.as_view(),
        name="admin-profile-picture"
    ),


    # ========================================================
    # PAYMENTS
    # ========================================================

    path(
        "payments/",
        PaymentListCreateView.as_view(),
        name="payment-list-create"
    ),

    path(
        "payments/<int:pk>/",
        PaymentDetailView.as_view(),
        name="payment-detail"
    ),

    path(
        "revenue-stats/",
        RevenueStatsView.as_view(),
        name="revenue-stats"
    ),


    # ========================================================
    # OWNER - TRAINERS
    # ========================================================

    path(
        "trainers/",
        TrainerListView.as_view(),
        name="trainer-list"
    ),

    path(
        "trainers/create/",
        TrainerCreateView.as_view(),
        name="trainer-create"
    ),


    # ========================================================
    # MEMBERS
    # ========================================================

    path(
        "",
        MemberListCreateView.as_view(),
        name="member-list-create"
    ),

    path(
        "<int:pk>/",
        MemberDetailView.as_view(),
        name="member-detail"
    ),
]