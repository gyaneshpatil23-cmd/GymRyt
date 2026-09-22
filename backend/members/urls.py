from django.urls import path

from .views import (
    # ========================================================
    # AUTHENTICATION
    # ========================================================
    LoginView,
    AdminRegisterView,
    LogoutAdminView,

    # ========================================================
    # MEMBER REGISTRATION
    # ========================================================
    MemberRegisterView,
    RegistrationQRView,

    # ========================================================
    # TRAINER REGISTRATION
    # ========================================================
    TrainerRegistrationQRView,
    TrainerApplicationCreateView,
    TrainerApplicationListView,
    TrainerApplicationActionView,

    # ========================================================
    # DASHBOARD
    # ========================================================
    DashboardStatsView,

    # ========================================================
    # PROFILE PICTURES
    # ========================================================
    MemberProfilePictureView,
    AdminProfilePictureView,

    # ========================================================
    # PAYMENTS / REVENUE
    # ========================================================
    PaymentListCreateView,
    PaymentDetailView,
    RevenueStatsView,

    # ========================================================
    # TRAINERS
    # ========================================================
    TrainerListView,
    TrainerCreateView,
    TrainerDetailView,
    TrainerProfileView,
    TrainerAssignmentView,

    # ========================================================
    # TRAINER WORKOUTS
    # ========================================================
    WorkoutPlanListCreateView,
    WorkoutPlanDetailView,

    # ========================================================
    # EXERCISE LIBRARY
    # ========================================================
    ExerciseListView,
    ExerciseDetailView,

    # ========================================================
    # ATTENDANCE
    # ========================================================
    AttendanceListCreateView,
    AttendanceDetailView,
    MemberAttendanceView,

    # ========================================================
    # MEMBERS
    # ========================================================
    MemberListCreateView,
    MemberDetailView,

    # ========================================================
    # OWNER / TRAINER NOTIFICATIONS
    # ========================================================
    NotificationListView,
    NotificationUnreadCountView,
    NotificationReadView,
    NotificationMarkAllReadView,

    # ========================================================
    # MEMBER NOTIFICATIONS
    # ========================================================
    MemberNotificationListView,
    MemberNotificationUnreadCountView,
    MemberNotificationReadView,
    MemberNotificationMarkAllReadView,
)


urlpatterns = [

    # ============================================================
    # AUTHENTICATION
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
    # TRAINER REGISTRATION
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

    # Member profile picture
    path(
        "profile-picture/",
        MemberProfilePictureView.as_view(),
        name="member-profile-picture",
    ),

    # Admin / owner profile picture
    path(
        "admin/profile-picture/",
        AdminProfilePictureView.as_view(),
        name="admin-profile-picture",
    ),


    # ============================================================
    # PAYMENTS
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


    # ============================================================
    # REVENUE
    # ============================================================

    path(
        "revenue-stats/",
        RevenueStatsView.as_view(),
        name="revenue-stats",
    ),


    # ============================================================
    # TRAINERS
    # ============================================================

    # ------------------------------------------------------------
    # List all trainers
    #
    # GET:
    # /api/members/trainers/
    # ------------------------------------------------------------

    path(
        "trainers/",
        TrainerListView.as_view(),
        name="trainer-list",
    ),

    # ------------------------------------------------------------
    # Create trainer
    #
    # POST:
    # /api/members/trainers/create/
    # ------------------------------------------------------------

    path(
        "trainers/create/",
        TrainerCreateView.as_view(),
        name="trainer-create",
    ),

    # ------------------------------------------------------------
    # Trainer details / edit / delete
    #
    # GET:
    #     /api/members/trainers/<id>/
    #
    # PATCH:
    #     /api/members/trainers/<id>/
    #
    # DELETE:
    #     /api/members/trainers/<id>/
    #
    # Owner only.
    # ------------------------------------------------------------

    path(
        "trainers/<int:pk>/",
        TrainerDetailView.as_view(),
        name="trainer-detail",
    ),


    # ============================================================
    # TRAINER PROFILE
    # ============================================================

    # ------------------------------------------------------------
    # GET:
    #     /api/members/trainer/profile/
    #
    # PATCH:
    #     /api/members/trainer/profile/
    #
    # DELETE:
    #     /api/members/trainer/profile/
    #
    # Used by the logged-in trainer for their own profile picture.
    # ------------------------------------------------------------

    path(
        "trainer/profile/",
        TrainerProfileView.as_view(),
        name="trainer-profile",
    ),


    # ============================================================
    # TRAINER ASSIGNMENT
    # ============================================================

    # Owner can assign/change/unassign trainer
    path(
        "trainer/assign/",
        TrainerAssignmentView.as_view(),
        name="trainer-assignment",
    ),


    # ============================================================
    # TRAINER WORKOUTS
    # ============================================================

    # ------------------------------------------------------------
    # GET:
    #     List trainer's workout plans
    #
    # POST:
    #     Create workout plan
    # ------------------------------------------------------------

    path(
        "trainer/workouts/",
        WorkoutPlanListCreateView.as_view(),
        name="trainer-workout-list-create",
    ),

    # ------------------------------------------------------------
    # GET:
    #     Get one workout
    #
    # PATCH:
    #     Update workout
    #
    # DELETE:
    #     Delete workout
    # ------------------------------------------------------------

    path(
        "trainer/workouts/<int:pk>/",
        WorkoutPlanDetailView.as_view(),
        name="trainer-workout-detail",
    ),

    # ============================================================
    # EXERCISE LIBRARY
    # ============================================================

    path(
        "exercises/",
        ExerciseListView.as_view(),
        name="exercise-list",
        ),


    path(
        "exercises/<int:pk>/",
        ExerciseDetailView.as_view(),
        name="exercise-detail",
        ),


    # ============================================================
    # MEMBERS
    # ============================================================

    # ------------------------------------------------------------
    # GET:
    #     List members
    #
    # POST:
    #     Create member
    # ------------------------------------------------------------

    path(
        "",
        MemberListCreateView.as_view(),
        name="member-list-create",
    ),

    # ------------------------------------------------------------
    # GET:
    #     Get member details
    #
    # PATCH:
    #     Update member
    #
    # DELETE:
    #     Delete member
    # ------------------------------------------------------------

    path(
        "<int:pk>/",
        MemberDetailView.as_view(),
        name="member-detail",
    ),


    # ============================================================
    # OWNER / TRAINER NOTIFICATIONS
    # ============================================================

    path(
        "notifications/",
        NotificationListView.as_view(),
        name="notification-list",
    ),

    path(
        "notifications/unread-count/",
        NotificationUnreadCountView.as_view(),
        name="notification-unread-count",
    ),

    path(
        "notifications/<int:pk>/read/",
        NotificationReadView.as_view(),
        name="notification-read",
    ),

    path(
        "notifications/mark-all-read/",
        NotificationMarkAllReadView.as_view(),
        name="notification-mark-all-read",
    ),


    # ============================================================
    # MEMBER NOTIFICATIONS
    # ============================================================

    path(
        "member-notifications/",
        MemberNotificationListView.as_view(),
        name="member-notification-list",
    ),

    path(
        "member-notifications/unread-count/",
        MemberNotificationUnreadCountView.as_view(),
        name="member-notification-unread-count",
    ),

    path(
        "member-notifications/<int:pk>/read/",
        MemberNotificationReadView.as_view(),
        name="member-notification-read",
    ),

    path(
        "member-notifications/mark-all-read/",
        MemberNotificationMarkAllReadView.as_view(),
        name="member-notification-mark-all-read",
    ),

    path(
    "attendance/",
    AttendanceListCreateView.as_view(),
    name="attendance-list-create",
    ),

    path(
    "attendance/<int:pk>/",
    AttendanceDetailView.as_view(),
    name="attendance-detail",
    ),

    path(
    "member-attendance/",
    MemberAttendanceView.as_view(),
    name="member-attendance",
    ),


]