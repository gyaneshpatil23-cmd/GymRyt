import secrets
from datetime import date

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import (
    check_password,
    identify_hasher,
    make_password,
)
from django.contrib.auth.models import User
from django.core import signing
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import (
    MultiPartParser,
    FormParser,
    JSONParser,
)

from .models import (
    Member,
    Notification,
    Payment,
    RegistrationQR,
    UserProfile,
    Workspace,
    TrainerProfile,
    TrainerApplication,
    WorkoutPlan,
    Exercise,
    Attendance,
)

from .serializers import (
    MemberSerializer,
    PaymentSerializer,
    WorkspaceSerializer,
    TrainerSerializer,
    WorkoutPlanSerializer,
    ExerciseSerializer,
    NotificationSerializer,
    AttendanceSerializer,
)


# ============================================================
# HELPER
# ============================================================

def add_months(original_date, months):
    """
    Add months to a date while handling different month lengths.
    """

    month = original_date.month - 1 + months
    year = original_date.year + month // 12
    month = month % 12 + 1

    # Find last valid day of target month
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)

    last_day = (
        next_month - timezone.timedelta(days=1)
    ).day

    day = min(
        original_date.day,
        last_day
    )

    return date(
        year,
        month,
        day
    )


# ============================================================
# HELPER - USER PROFILE
# ============================================================

def get_or_create_profile(user):
    """
    Get the UserProfile for a user and keep the role flags
    synchronized.

    Roles:
        OWNER
        OWNER_TRAINER
        TRAINER

    Important:
        OWNER and OWNER_TRAINER must have is_owner=True.
        TRAINER must NOT be converted into an owner.
    """

    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "role": "OWNER" if user.is_staff else "MEMBER",
            "is_owner": user.is_staff,
            "is_trainer": False,
        },
    )

    # ========================================================
    # SYNCHRONIZE ROLE FLAGS
    # ========================================================

    role = str(
        getattr(profile, "role", "") or ""
    ).strip().upper()

    new_is_owner = profile.is_owner
    new_is_trainer = profile.is_trainer

    # --------------------------------------------------------
    # OWNER
    # --------------------------------------------------------

    if role == "OWNER":
        new_is_owner = True
        new_is_trainer = False

    # --------------------------------------------------------
    # OWNER + TRAINER
    # --------------------------------------------------------

    elif role == "OWNER_TRAINER":
        new_is_owner = True
        new_is_trainer = True

    # --------------------------------------------------------
    # TRAINER
    # --------------------------------------------------------

    elif role == "TRAINER":
        new_is_owner = False
        new_is_trainer = True

    # --------------------------------------------------------
    # MEMBER / OTHER
    # --------------------------------------------------------

    elif role == "MEMBER":
        new_is_owner = False
        new_is_trainer = False

    # --------------------------------------------------------
    # LEGACY STAFF ACCOUNTS
    # --------------------------------------------------------

    elif user.is_staff:
        new_is_owner = True

        # Do not automatically make staff a trainer.
        new_is_trainer = False

    # ========================================================
    # UPDATE ONLY WHEN NECESSARY
    # ========================================================

    if (
        profile.is_owner != new_is_owner
        or profile.is_trainer != new_is_trainer
    ):

        profile.is_owner = new_is_owner
        profile.is_trainer = new_is_trainer

        profile.save(
            update_fields=[
                "is_owner",
                "is_trainer",
                "updated_at",
            ]
        )

    return profile

# ============================================================
# NOTIFICATIONS
# ============================================================


class NotificationListView(APIView):
    """
    Return notifications belonging only to the authenticated
    owner/trainer in their active workspace.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        workspace = get_user_workspace(request.user)

        if not workspace:
            return Response(
                {
                    "success": False,
                    "message": "Active workspace not found.",
                    "notifications": [],
                    "unread_count": 0,
                },
                status=status.HTTP_200_OK,
            )

        notifications = (
            Notification.objects
            .filter(
                recipient=request.user,
                workspace=workspace,
            )
            .order_by("-created_at")
        )

        unread_count = notifications.filter(
            is_read=False
        ).count()

        serializer = NotificationSerializer(
            notifications,
            many=True,
        )

        return Response(
            {
                "success": True,
                "count": notifications.count(),
                "unread_count": unread_count,
                "notifications": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# NOTIFICATION UNREAD COUNT
# ============================================================


class NotificationUnreadCountView(APIView):
    """
    Return only the unread notification count.

    This endpoint will be called by dashboard headers
    to display the red/blue unread badge on the bell.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        workspace = get_user_workspace(request.user)

        if not workspace:
            return Response(
                {
                    "success": True,
                    "unread_count": 0,
                },
                status=status.HTTP_200_OK,
            )

        unread_count = (
            Notification.objects
            .filter(
                recipient=request.user,
                workspace=workspace,
                is_read=False,
            )
            .count()
        )

        return Response(
            {
                "success": True,
                "unread_count": unread_count,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# MARK SINGLE NOTIFICATION AS READ
# ============================================================


class NotificationReadView(APIView):
    """
    Mark one notification as read.

    Users can only modify notifications belonging to
    themselves and their active workspace.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):

        workspace = get_user_workspace(request.user)

        if not workspace:
            return Response(
                {
                    "success": False,
                    "message": "Active workspace not found.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            notification = (
                Notification.objects
                .get(
                    pk=pk,
                    recipient=request.user,
                    workspace=workspace,
                )
            )

        except Notification.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message": "Notification not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not notification.is_read:

            notification.is_read = True

            notification.save(
                update_fields=[
                    "is_read",
                ]
            )

        return Response(
            {
                "success": True,
                "message": "Notification marked as read.",
                "notification": NotificationSerializer(
                    notification
                ).data,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# MARK ALL NOTIFICATIONS AS READ
# ============================================================


class NotificationMarkAllReadView(APIView):
    """
    Mark all unread notifications for the authenticated
    user/workspace as read.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request):

        workspace = get_user_workspace(request.user)

        if not workspace:
            return Response(
                {
                    "success": False,
                    "message": "Active workspace not found.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated_count = (
            Notification.objects
            .filter(
                recipient=request.user,
                workspace=workspace,
                is_read=False,
            )
            .update(
                is_read=True,
            )
        )

        return Response(
            {
                "success": True,
                "message": "All notifications marked as read.",
                "updated_count": updated_count,
                "unread_count": 0,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# HELPER - GET USER WORKSPACE
# ============================================================

def get_user_workspace(user):
    """
    Return the active workspace associated with the user.

    Owner:
        Finds the workspace owned by the user.

    Trainer:
        Finds the workspace through TrainerProfile.

    Returns:
        Workspace object or None.
    """

    profile = UserProfile.objects.filter(
        user=user
    ).first()

    # OWNER
    if profile and profile.is_owner:

        workspace = Workspace.objects.filter(
            owner=user,
            is_active=True
        ).first()

        if workspace:
            return workspace

    # TRAINER
    trainer_profile = (
        TrainerProfile.objects
        .filter(
            user=user,
            is_active=True,
            workspace__is_active=True
        )
        .select_related("workspace")
        .first()
    )

    if trainer_profile:
        return trainer_profile.workspace

    return None



# ============================================================
# HELPER - MEMBERSHIP EXPIRING NOTIFICATION
# ============================================================

def create_membership_expiring_notifications(member):
    """Create one expiring notification per membership expiry date."""
    if (
        not member
        or member.is_deleted
        or not member.membership_end
        or not member.workspace
    ):
        return

    today = timezone.localdate()
    days_remaining = (member.membership_end - today).days

    if days_remaining < 0 or days_remaining > 7:
        return

    workspace = member.workspace
    expiry_marker = f"member_expiring_{member.membership_end.isoformat()}"

    if days_remaining == 0:
        message = f"{member.name}'s membership expires today."
    elif days_remaining == 1:
        message = f"{member.name}'s membership expires tomorrow."
    else:
        message = (
            f"{member.name}'s membership expires in "
            f"{days_remaining} days."
        )

    recipients = []
    if workspace.owner:
        recipients.append(("user", workspace.owner))
    if member.trainer and member.trainer != workspace.owner:
        recipients.append(("user", member.trainer))
    recipients.append(("member", member))

    for recipient_type, recipient in recipients:
        filters = {
            "workspace": workspace,
            "notification_type": "MEMBERSHIP_EXPIRING",
            "related_id": member.id,
            "related_type": expiry_marker,
        }
        if recipient_type == "user":
            filters["recipient"] = recipient
        else:
            filters["recipient_member"] = recipient

        if Notification.objects.filter(**filters).exists():
            continue

        create_kwargs = dict(
            workspace=workspace,
            notification_type="MEMBERSHIP_EXPIRING",
            title="Membership Expiring",
            message=message,
            related_id=member.id,
            related_type=expiry_marker,
        )
        if recipient_type == "user":
            create_kwargs["recipient"] = recipient
        else:
            create_kwargs["recipient_member"] = recipient
        Notification.objects.create(**create_kwargs)


def create_membership_expired_notifications(member):
    """Create one expired notification per membership expiry date."""
    if (
        not member
        or member.is_deleted
        or not member.membership_end
        or not member.workspace
    ):
        return

    today = timezone.localdate()
    days_remaining = (member.membership_end - today).days

    if days_remaining >= 0:
        return

    workspace = member.workspace
    expiry_marker = f"member_expired_{member.membership_end.isoformat()}"
    message = (
        f"{member.name}'s membership expired on "
        f"{member.membership_end.strftime('%d %b %Y')}."
    )

    recipients = []
    if workspace.owner:
        recipients.append(("user", workspace.owner))
    if member.trainer and member.trainer != workspace.owner:
        recipients.append(("user", member.trainer))
    recipients.append(("member", member))

    for recipient_type, recipient in recipients:
        filters = {
            "workspace": workspace,
            "notification_type": "MEMBERSHIP_EXPIRED",
            "related_id": member.id,
            "related_type": expiry_marker,
        }
        if recipient_type == "user":
            filters["recipient"] = recipient
        else:
            filters["recipient_member"] = recipient

        if Notification.objects.filter(**filters).exists():
            continue

        create_kwargs = dict(
            workspace=workspace,
            notification_type="MEMBERSHIP_EXPIRED",
            title="Membership Expired",
            message=message,
            related_id=member.id,
            related_type=expiry_marker,
        )
        if recipient_type == "user":
            create_kwargs["recipient"] = recipient
        else:
            create_kwargs["recipient_member"] = recipient
        Notification.objects.create(**create_kwargs)


# ============================================================
# MEMBER AUTHENTICATION HELPERS
# ============================================================

MEMBER_TOKEN_SALT = "gymryt-member-auth"
MEMBER_TOKEN_MAX_AGE = 60 * 60 * 24 * 30
TRAINER_QR_PREFIX = "GYMRYT:TRAINER:"


def build_trainer_qr_payload(token):
    """Return the only QR payload emitted for trainer applications."""
    return f"{TRAINER_QR_PREFIX}{token}"


def normalize_trainer_qr_payload(raw_payload):
    """
    Extract a RegistrationQR token from a trainer QR payload.

    Canonical payloads must use ``GYMRYT:TRAINER:<token>``.  The raw-token
    branch exists solely so already-issued database-backed trainer QRs remain
    usable after this deployment; it must be removed after those QRs expire.
    """
    payload = str(raw_payload or "").strip()

    if payload.startswith(TRAINER_QR_PREFIX):
        token = payload[len(TRAINER_QR_PREFIX):].strip()
        return token or None, None

    if payload.startswith("GYMRYT:MEMBER:") or payload.startswith("GYMRYT_"):
        # ``GYMRYT_TRAINER_`` is the old database-backed trainer token format.
        if payload.startswith("GYMRYT_TRAINER_"):
            return payload, None
        return None, "wrong_type"

    # Legacy Django signing payloads were issued before trainer QR records
    # existed. They are accepted only after cryptographic verification below.
    try:
        legacy_payload = signing.loads(payload)
        if legacy_payload.get("type") == "TRAINER":
            return payload, "legacy_signed"
    except (signing.BadSignature, AttributeError, TypeError, ValueError):
        pass

    return None, "invalid"


def ensure_hashed_application_password(password):
    """Preserve current hashes and safely upgrade historical plaintext rows."""
    try:
        identify_hasher(password)
        return password
    except (ValueError, TypeError):
        return make_password(password)


def resolve_legacy_signed_trainer_qr(payload):
    """Safely migrate a valid pre-RegistrationQR trainer QR on first use."""
    try:
        data = signing.loads(payload)
        if data.get("type") != "TRAINER":
            return None

        admin_id = int(data["admin_id"])
        workspace_id = int(data["workspace_id"])
    except (KeyError, TypeError, ValueError, signing.BadSignature):
        return None

    workspace = Workspace.objects.filter(
        id=workspace_id,
        owner_id=admin_id,
    ).first()
    if not workspace:
        return None

    qr, _ = RegistrationQR.objects.get_or_create(
        admin_id=admin_id,
        workspace=workspace,
        registration_type="TRAINER",
        defaults={
            "token": "GYMRYT_TRAINER_" + secrets.token_urlsafe(32),
            "is_active": True,
        },
    )
    return qr


def create_member_token(member):
    """Create a signed member session token."""
    return signing.dumps(
        {"member_id": member.id},
        salt=MEMBER_TOKEN_SALT,
        compress=True,
    )


def get_authenticated_member(request):
    """Resolve the member from the signed member session header."""
    token = request.headers.get("X-Member-Token", "").strip()
    if not token:
        return None

    try:
        payload = signing.loads(
            token,
            salt=MEMBER_TOKEN_SALT,
            max_age=MEMBER_TOKEN_MAX_AGE,
        )
    except signing.BadSignature:
        return None

    member_id = payload.get("member_id")
    if not member_id:
        return None

    return (
        Member.objects
        .select_related("workspace", "trainer")
        .filter(id=member_id, is_deleted=False)
        .first()
    )


# ============================================================
# MEMBER NOTIFICATIONS
# ============================================================

class MemberNotificationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        member = get_authenticated_member(request)

        if not member:
            return Response(
                {
                    "success": False,
                    "message": "Invalid or expired member session.",
                    "notifications": [],
                    "unread_count": 0,
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        notifications = Notification.objects.filter(
            recipient_member=member,
            workspace=member.workspace,
        ).order_by("-created_at")

        unread_count = notifications.filter(is_read=False).count()

        return Response(
            {
                "success": True,
                "count": notifications.count(),
                "unread_count": unread_count,
                "notifications": NotificationSerializer(
                    notifications,
                    many=True,
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class MemberNotificationReadView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        member = get_authenticated_member(request)

        if not member:
            return Response(
                {"success": False, "message": "Invalid or expired member session."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        notification = Notification.objects.filter(
            pk=pk,
            recipient_member=member,
            workspace=member.workspace,
        ).first()

        if not notification:
            return Response(
                {"success": False, "message": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        notification.is_read = True
        notification.save(update_fields=["is_read"])

        return Response(
            {"success": True, "message": "Notification marked as read."},
            status=status.HTTP_200_OK,
        )


class MemberNotificationMarkAllReadView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request):
        member = get_authenticated_member(request)

        if not member:
            return Response(
                {"success": False, "message": "Invalid or expired member session."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        updated_count = Notification.objects.filter(
            recipient_member=member,
            workspace=member.workspace,
            is_read=False,
        ).update(is_read=True)

        return Response(
            {
                "success": True,
                "message": "All notifications marked as read.",
                "updated_count": updated_count,
                "unread_count": 0,
            },
            status=status.HTTP_200_OK,
        )


class MemberNotificationUnreadCountView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        member = get_authenticated_member(request)

        if not member:
            return Response(
                {"success": False, "message": "Invalid or expired member session.", "unread_count": 0},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        unread_count = Notification.objects.filter(
            recipient_member=member,
            workspace=member.workspace,
            is_read=False,
        ).count()

        return Response(
            {"success": True, "unread_count": unread_count},
            status=status.HTTP_200_OK,
        )


# ============================================================
# ADMIN REGISTRATION
# ============================================================

class AdminRegisterView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        full_name = str(
            request.data.get(
                "full_name",
                ""
            )
        ).strip()

        email = str(
            request.data.get(
                "email",
                ""
            )
        ).strip()

        username = str(
            request.data.get(
                "username",
                ""
            )
        ).strip()

        password = request.data.get(
            "password",
            ""
        )

        confirm_password = request.data.get(
            "confirm_password",
            ""
        )

        role_param = str(
            request.data.get(
                "role",
                "OWNER"
            )
        ).strip().upper()

        if role_param in ["OWNER", "OWNER_TRAINER"]:
            role = role_param
        else:
            role = "OWNER"

        # ====================================================
        # VALIDATION
        # ====================================================

        if not full_name:

            return Response(
                {
                    "success": False,
                    "message": "Full name is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not email:

            return Response(
                {
                    "success": False,
                    "message": "Email is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not username:

            return Response(
                {
                    "success": False,
                    "message": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not password:

            return Response(
                {
                    "success": False,
                    "message": "Password is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(password) < 6:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Password must be at least "
                        "6 characters."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if password != confirm_password:

            return Response(
                {
                    "success": False,
                    "message": "Passwords do not match."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # DUPLICATE USERNAME
        # ====================================================

        if User.objects.filter(
            username__iexact=username
        ).exists():

            return Response(
                {
                    "success": False,
                    "message": "Username already exists."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # DUPLICATE EMAIL
        # ====================================================

        if User.objects.filter(
            email__iexact=email
        ).exists():

            return Response(
                {
                    "success": False,
                    "message": "Email already exists."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # SPLIT NAME
        # ====================================================

        name_parts = full_name.split()

        first_name = name_parts[0]

        last_name = " ".join(
            name_parts[1:]
        )

        # ====================================================
        # CREATE USER
        # ====================================================

        try:

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )

            user.first_name = first_name
            user.last_name = last_name

            user.is_staff = True
            user.is_active = True

            user.save()

            # ------------------------------------------------
            # CREATE USER PROFILE
            # ------------------------------------------------

            is_trainer = (role == "OWNER_TRAINER")

            profile = UserProfile.objects.create(
                user=user,
                role=role,
                is_owner=True,
                is_trainer=is_trainer
            )

            # ------------------------------------------------
            # CREATE WORKSPACE
            # ------------------------------------------------

            workspace = Workspace.objects.create(
                name=f"{full_name}'s Gym",
                owner=user,
                is_active=True
            )

            if is_trainer:
                TrainerProfile.objects.get_or_create(
                    user=user,
                    workspace=workspace,
                    defaults={"is_active": True}
                )

            return Response(
                {
                    "success": True,
                    "message": (
                        "Account created "
                        "successfully."
                    ),
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": role,

                    "is_owner": profile.is_owner,
                    "is_trainer": profile.is_trainer,

                    "workspace_id": workspace.id,
                    "workspace_name": workspace.name,
                },
                status=status.HTTP_201_CREATED
            )

        except Exception as e:

            print(
                "Admin registration error:",
                str(e)
            )

            # ----------------------------------------------
            # Cleanup if something failed
            # ----------------------------------------------

            if "user" in locals():

                user.delete()

            return Response(
                {
                    "success": False,
                    "message": (
                        "Unable to create admin account."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================
# ADMIN REGISTRATION QR
# ============================================================

class AdminRegistrationQRView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        if not request.user.is_staff:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Only admin accounts can "
                        "generate a registration QR."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        token = signing.dumps(
            {
                "admin_id": request.user.id
            }
        )

        return Response(
            {
                "success": True,
                "token": token,
                "admin_id": request.user.id,
                "admin_username": request.user.username,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# LOGIN
# ============================================================

class LoginView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        username = str(
            request.data.get(
                "username",
                ""
            )
        ).strip()

        password = request.data.get(
            "password",
            ""
        )

        if not username or not password:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Username and password "
                        "are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )


        # ========================================================
        # MEMBER LOGIN FIRST
        # ========================================================
        #
        # IMPORTANT:
        # Members are stored in the Member model.
        #
        # We check Member BEFORE Django User authentication.
        # This prevents a Member account from accidentally being
        # treated as an OWNER/TRAINER when the same username
        # exists in the Django User table.
        # ========================================================

        try:

            member = Member.objects.select_related(
                "workspace",
                "trainer"
            ).get(
                username=username,
                is_deleted=False
            )

        except Member.DoesNotExist:

            member = None


        # ========================================================
        # MEMBER FOUND
        # ========================================================

        if member is not None:

            # ----------------------------------------------------
            # Check member password
            # ----------------------------------------------------

            if not check_password(
                password,
                member.password
            ):

                return Response(
                    {
                        "success": False,
                        "message": (
                            "Invalid username or "
                            "password."
                        )
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )


            # ----------------------------------------------------
            # Trainer information
            # ----------------------------------------------------

            trainer_name = None
            trainer_username = None

            if member.trainer:

                trainer_username = (
                    member.trainer.username
                )

                trainer_name = (
                    f"{member.trainer.first_name} "
                    f"{member.trainer.last_name}"
                ).strip()

                if not trainer_name:

                    trainer_name = (
                        member.trainer.username
                    )


            # ----------------------------------------------------
            # MEMBER LOGIN SUCCESS
            # ----------------------------------------------------

            return Response(
                {
                    "success": True,

                    "message": (
                        "Member login successful."
                    ),

                    "role": "MEMBER",

                    "member_token": (
                        create_member_token(member)
                    ),

                    "id": member.id,

                    "username": member.username,

                    "name": member.name,

                    "phone": member.phone,

                    "email": member.email,

                    "profile_picture": (
                        request.build_absolute_uri(
                            member.profile_picture.url
                        )
                        if member.profile_picture
                        else None
                    ),

                    "membership_start": (
                        member.membership_start
                    ),

                    "membership_end": (
                        member.membership_end
                    ),

                    "status": member.status,

                    "workspace_id": (
                        member.workspace.id
                        if member.workspace
                        else None
                    ),

                    "workspace_name": (
                        member.workspace.name
                        if member.workspace
                        else None
                    ),

                    "trainer_id": (
                        member.trainer.id
                        if member.trainer
                        else None
                    ),

                    "trainer_username": (
                        trainer_username
                    ),

                    "trainer_name": (
                        trainer_name
                    ),
                },
                status=status.HTTP_200_OK
            )


        # ========================================================
        # OWNER / TRAINER LOGIN
        # ========================================================

        user = authenticate(
            username=username,
            password=password
        )


        if user is not None:

            # ----------------------------------------------------
            # Account active check
            # ----------------------------------------------------

            if not user.is_active:

                return Response(
                    {
                        "success": False,
                        "message": (
                            "This account is inactive."
                        )
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )


            # ----------------------------------------------------
            # Get/create profile
            # ----------------------------------------------------

            profile = get_or_create_profile(
                user
            )


            # ----------------------------------------------------
            # Capabilities
            # ----------------------------------------------------

            is_owner = profile.is_owner
            is_trainer = profile.is_trainer


            # ----------------------------------------------------
            # Existing staff accounts
            # ----------------------------------------------------

            if user.is_staff and not is_owner:

                profile.is_owner = True

                profile.save(
                    update_fields=[
                        "is_owner",
                        "updated_at"
                    ]
                )

                is_owner = True


            # ----------------------------------------------------
            # Determine role
            # ----------------------------------------------------

            if (
                profile.is_owner
                and profile.is_trainer
            ):

                role = "OWNER_TRAINER"

            elif profile.is_owner:

                role = "OWNER"

            elif profile.is_trainer:

                role = "TRAINER"

            else:

                role = (
                    getattr(
                        profile,
                        "role",
                        "OWNER"
                    )
                    or "OWNER"
                )


            # ----------------------------------------------------
            # Token
            # ----------------------------------------------------

            token, created = (
                Token.objects.get_or_create(
                    user=user
                )
            )


            # ----------------------------------------------------
            # Workspace
            # ----------------------------------------------------

            workspace = get_user_workspace(
                user
            )


            # ----------------------------------------------------
            # STAFF LOGIN SUCCESS
            # ----------------------------------------------------

            return Response(
                {
                    "success": True,

                    "message":
                        "Login successful.",

                    "role":
                        role,

                    "token":
                        token.key,

                    "id":
                        user.id,

                    "username":
                        user.username,

                    "email":
                        user.email,

                    "first_name":
                        user.first_name,

                    "last_name":
                        user.last_name,

                    "is_owner":
                        is_owner,

                    "is_trainer":
                        is_trainer,

                    "workspace_id": (
                        workspace.id
                        if workspace
                        else None
                    ),

                    "workspace_name": (
                        workspace.name
                        if workspace
                        else None
                    ),
                },
                status=status.HTTP_200_OK
            )


        # ========================================================
        # INVALID LOGIN
        # ========================================================

        return Response(
            {
                "success": False,
                "message": (
                    "Invalid username or "
                    "password."
                )
            },
            status=status.HTTP_401_UNAUTHORIZED
        )


# ============================================================
# LOGOUT
# ============================================================

class LogoutAdminView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        Token.objects.filter(
            user=request.user
        ).delete()

        return Response(
            {
                "success": True,
                "message": (
                    "Logged out successfully."
                )
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# WORKSPACE
# ============================================================

class WorkspaceView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        workspace = get_user_workspace(
            request.user
        )

        if not workspace:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Workspace not found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = WorkspaceSerializer(
            workspace
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


# ============================================================
# MEMBER LIST + CREATE
# ============================================================

class MemberListCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        profile = get_or_create_profile(
            request.user
        )

        workspace = get_user_workspace(
            request.user
        )

        if not workspace:

            return Response(
                [],
                status=status.HTTP_200_OK
            )

        # ----------------------------------------------------
        # OWNER
        # ----------------------------------------------------

        if profile.is_owner:

            members = Member.objects.filter(
                workspace=workspace,
                is_deleted=False
            ).select_related(
                "trainer"
            ).order_by(
                "-created_at"
            )

        # ----------------------------------------------------
        # TRAINER
        # ----------------------------------------------------

        elif profile.is_trainer:

            members = Member.objects.filter(
                workspace=workspace,
                trainer=request.user,
                is_deleted=False
            ).select_related(
                "trainer"
            ).order_by(
                "-created_at"
            )

        # ----------------------------------------------------
        # NO CAPABILITY
        # ----------------------------------------------------

        else:

            return Response(
                {
                    "success": False,
                    "message": (
                        "You do not have permission "
                        "to view members."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # ----------------------------------------------------
        # Update membership statuses
        # ----------------------------------------------------

        for member in members:

            calculated_status = (
                member.calculate_status()
            )

            if member.status != calculated_status:

                Member.objects.filter(
                    pk=member.pk
                ).update(
                    status=calculated_status
                )

                member.status = calculated_status

            # ------------------------------------------------
            # MEMBERSHIP EXPIRING NOTIFICATION
            # ------------------------------------------------

            create_membership_expiring_notifications(
                member
            )

            # ------------------------------------------------
            # MEMBERSHIP EXPIRED NOTIFICATION
            # ------------------------------------------------

            create_membership_expired_notifications(
                member
            )

        serializer = MemberSerializer(
            members,
            many=True,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    # ========================================================
    # CREATE MEMBER
    # ========================================================

    def post(self, request):

        profile = get_or_create_profile(
            request.user
        )

        workspace = get_user_workspace(
            request.user
        )

        if not workspace:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Workspace not found."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # Only owners/trainers can create members
        # ----------------------------------------------------

        if not profile.is_owner and not profile.is_trainer:

            return Response(
                {
                    "success": False,
                    "message": (
                        "You do not have permission "
                        "to create members."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = MemberSerializer(
            data=request.data
        )

        if not serializer.is_valid():

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # Determine trainer
        # ----------------------------------------------------

        trainer = None

        trainer_id = request.data.get(
            "trainer"
        )

        if profile.is_trainer and not profile.is_owner:

            # Trainer can only assign themselves.
            trainer = request.user

        elif trainer_id:

            try:

                trainer_profile = (
                    TrainerProfile.objects
                    .select_related("user")
                    .get(
                        id=trainer_id,
                        workspace=workspace,
                        is_active=True
                    )
                )

                trainer = trainer_profile.user

            except TrainerProfile.DoesNotExist:

                return Response(
                    {
                        "success": False,
                        "message": (
                            "Invalid trainer."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # ----------------------------------------------------
        # Create
        # ----------------------------------------------------

        member = serializer.save(
            admin=request.user,
            workspace=workspace,
            trainer=trainer
        )

        # ----------------------------------------------------
        # TRAINER ASSIGNED NOTIFICATION
        # ----------------------------------------------------
        if (
            trainer is not None
            and trainer != request.user
        ):
            Notification.objects.create(
                recipient=trainer,
                workspace=workspace,
                notification_type="TRAINER_ASSIGNED",
                title="New Member Assigned",
                message=(
                    f"{member.name} has been assigned to you."
                ),
                related_id=member.id,
                related_type="member",
            )

        # ----------------------------------------------------
        # NEW MEMBER NOTIFICATION - OWNER
        # ----------------------------------------------------
        if workspace.owner:
            Notification.objects.create(
                recipient=workspace.owner,
                workspace=workspace,
                notification_type="NEW_MEMBER",
                title="New Member Added",
                message=f"{member.name} has joined the gym.",
                related_id=member.id,
                related_type="member",
            )

        # ----------------------------------------------------
        # WELCOME NOTIFICATION - MEMBER
        # ----------------------------------------------------
        Notification.objects.create(
            recipient_member=member,
            workspace=workspace,
            notification_type="WELCOME",
            title="Welcome to GymRyt",
            message=(
                f"Welcome to {workspace.name}, {member.name}! "
                "Your member account is ready."
            ),
            related_id=member.id,
            related_type="member",
        )

        # ----------------------------------------------------
        # TRAINER ASSIGNED NOTIFICATION - MEMBER
        # ----------------------------------------------------
        if trainer is not None:
            Notification.objects.create(
                recipient_member=member,
                workspace=workspace,
                notification_type="TRAINER_ASSIGNED",
                title="Trainer Assigned",
                message=(
                    f"{trainer.get_full_name() or trainer.username} "
                    "has been assigned as your trainer."
                ),
                related_id=member.id,
                related_type="member",
            )

        return Response(
            MemberSerializer(member).data,
            status=status.HTTP_201_CREATED
        )


# ============================================================
# MEMBER DETAIL
# ============================================================

class MemberDetailView(APIView):

    permission_classes = [IsAuthenticated]

    def get_member(self, request, pk):

        profile = get_or_create_profile(
            request.user
        )

        workspace = get_user_workspace(
            request.user
        )

        if not workspace:

            return None

        # ----------------------------------------------------
        # OWNER
        # ----------------------------------------------------

        if profile.is_owner:

            try:

                return Member.objects.get(
                    pk=pk,
                    workspace=workspace,
                    is_deleted=False
                )

            except Member.DoesNotExist:

                return None

        # ----------------------------------------------------
        # TRAINER
        # ----------------------------------------------------

        if profile.is_trainer:

            try:

                return Member.objects.get(
                    pk=pk,
                    workspace=workspace,
                    trainer=request.user,
                    is_deleted=False
                )

            except Member.DoesNotExist:

                return None

        return None

    # ========================================================
    # GET
    # ========================================================

    def get(self, request, pk):

        member = self.get_member(
            request,
            pk
        )

        if member is None:

            return Response(
                {
                    "success": False,
                    "message": "Member not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        calculated_status = (
            member.calculate_status()
        )

        if member.status != calculated_status:

            member.status = calculated_status

            member.save(
                update_fields=[
                    "status",
                    "updated_at"
                ]
            )

        serializer = MemberSerializer(
            member,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    # ========================================================
    # PUT
    # ========================================================

    def put(self, request, pk):

        member = self.get_member(
            request,
            pk
        )

        if member is None:

            return Response(
                {
                    "success": False,
                    "message": "Member not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        profile = get_or_create_profile(
            request.user
        )

        workspace = member.workspace

        data = request.data.copy()

        # ----------------------------------------------------
        # Trainer assignment
        # ----------------------------------------------------

        if "trainer" in data:

            trainer_id = data.get(
                "trainer"
            )

            if profile.is_owner:

                if trainer_id:

                    try:

                        trainer_profile = (
                            TrainerProfile.objects
                            .get(
                                id=trainer_id,
                                workspace=workspace,
                                is_active=True
                            )
                        )

                        data["trainer"] = (
                            trainer_profile.user.id
                        )

                    except TrainerProfile.DoesNotExist:

                        return Response(
                            {
                                "success": False,
                                "message": (
                                    "Invalid trainer."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )

                else:

                    data["trainer"] = None

            elif profile.is_trainer:

                # Trainer cannot assign someone else.
                data["trainer"] = request.user.id

        # ----------------------------------------------------
        # Track trainer before update
        # ----------------------------------------------------
        previous_trainer = member.trainer

        serializer = MemberSerializer(
            member,
            data=data
        )

        if serializer.is_valid():

            serializer.save()

            # ----------------------------------------------------
            # TRAINER ASSIGNED NOTIFICATION
            # ----------------------------------------------------
            current_trainer = member.trainer

            if (
                current_trainer is not None
                and current_trainer != previous_trainer
                and current_trainer != request.user
            ):
                Notification.objects.create(
                    recipient=current_trainer,
                    workspace=workspace,
                    notification_type="TRAINER_ASSIGNED",
                    title="New Member Assigned",
                    message=(
                        f"{member.name} has been assigned to you."
                    ),
                    related_id=member.id,
                    related_type="member",
                )

            return Response(
                MemberSerializer(member).data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # ========================================================
    # PATCH
    # ========================================================

    def patch(self, request, pk):

        member = self.get_member(
            request,
            pk
        )

        if member is None:

            return Response(
                {
                    "success": False,
                    "message": "Member not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        profile = get_or_create_profile(
            request.user
        )

        data = request.data.copy()

        # ----------------------------------------------------
        # Trainer assignment
        # ----------------------------------------------------

        if "trainer" in data:

            trainer_id = data.get(
                "trainer"
            )

            if profile.is_owner:

                if trainer_id:

                    try:

                        trainer_profile = (
                            TrainerProfile.objects
                            .get(
                                id=trainer_id,
                                workspace=member.workspace,
                                is_active=True
                            )
                        )

                        data["trainer"] = (
                            trainer_profile.user.id
                        )

                    except TrainerProfile.DoesNotExist:

                        return Response(
                            {
                                "success": False,
                                "message": (
                                    "Invalid trainer."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )

                else:

                    data["trainer"] = None

            elif profile.is_trainer:

                data["trainer"] = request.user.id

        # ----------------------------------------------------
        # Track trainer before update
        # ----------------------------------------------------
        previous_trainer = member.trainer

        serializer = MemberSerializer(
            member,
            data=data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            # ----------------------------------------------------
            # TRAINER ASSIGNED NOTIFICATION
            # ----------------------------------------------------
            current_trainer = member.trainer

            if (
                current_trainer is not None
                and current_trainer != previous_trainer
                and current_trainer != request.user
            ):
                Notification.objects.create(
                    recipient=current_trainer,
                    workspace=member.workspace,
                    notification_type="TRAINER_ASSIGNED",
                    title="New Member Assigned",
                    message=(
                        f"{member.name} has been assigned to you."
                    ),
                    related_id=member.id,
                    related_type="member",
                )

                Notification.objects.create(
                    recipient_member=member,
                    workspace=member.workspace,
                    notification_type="TRAINER_ASSIGNED",
                    title="Trainer Assigned",
                    message=(
                        f"{current_trainer.get_full_name() or current_trainer.username} has been assigned as your trainer."
                    ),
                    related_id=member.id,
                    related_type="member",
                )

            return Response(
                MemberSerializer(member).data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # ========================================================
    # DELETE
    # ========================================================

    def delete(self, request, pk):

        member = self.get_member(
            request,
            pk
        )

        if member is None:

            return Response(
                {
                    "success": False,
                    "message": "Member not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if member.trainer:
            Notification.objects.create(
                recipient=member.trainer,
                workspace=member.workspace,
                notification_type="MEMBER_REMOVED",
                title="Member Removed",
                message=f"{member.name} has been removed from your assigned members.",
                related_id=member.id,
                related_type="member",
            )

        member.is_deleted = True

        member.save(
            update_fields=[
                "is_deleted",
                "updated_at"
            ]
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Member deleted successfully."
                )
            },
            status=status.HTTP_200_OK
        )

    def destroy(self, request, pk):

        return self.delete(
            request,
            pk
        )


# ============================================================
# ATTENDANCE
# ============================================================


class AttendanceListCreateView(APIView):
    """
    Attendance management for OWNER, OWNER_TRAINER and TRAINER.

    OWNER:
        Can view attendance for the workspace only.
        Cannot create attendance.

    OWNER_TRAINER:
        Can view and manage attendance for workspace members.

    TRAINER:
        Can view and manage attendance for assigned members only.
    """

    permission_classes = [IsAuthenticated]

    def _get_allowed_members(self, request, profile, workspace):
        if not workspace:
            return Member.objects.none()

        if profile.is_owner:
            return Member.objects.filter(
                workspace=workspace,
                is_deleted=False,
            )

        if profile.is_trainer:
            return Member.objects.filter(
                workspace=workspace,
                trainer=request.user,
                is_deleted=False,
            )

        return Member.objects.none()

    def get(self, request):
        profile = get_or_create_profile(request.user)
        workspace = get_user_workspace(request.user)

        if not workspace or not (profile.is_owner or profile.is_trainer):
            return Response(
                {
                    "success": False,
                    "message": "You do not have permission to view attendance.",
                    "attendance": [],
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        allowed_members = self._get_allowed_members(
            request,
            profile,
            workspace,
        )

        attendance = Attendance.objects.filter(
            workspace=workspace,
            member__in=allowed_members,
        ).select_related("member", "workspace")

        member_id = str(request.query_params.get("member", "")).strip()
        date_value = str(request.query_params.get("date", "")).strip()
        month_value = str(request.query_params.get("month", "")).strip()
        status_value = str(request.query_params.get("status", "")).strip().upper()

        if member_id:
            try:
                attendance = attendance.filter(member_id=int(member_id))
            except (TypeError, ValueError):
                return Response(
                    {
                        "success": False,
                        "message": "Invalid member parameter.",
                        "attendance": [],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if date_value:
            try:
                attendance_date = date.fromisoformat(date_value)
            except ValueError:
                return Response(
                    {
                        "success": False,
                        "message": "Invalid date. Use YYYY-MM-DD.",
                        "attendance": [],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            attendance = attendance.filter(date=attendance_date)

        if month_value:
            try:
                month_start = date.fromisoformat(f"{month_value}-01")
            except ValueError:
                return Response(
                    {
                        "success": False,
                        "message": "Invalid month. Use YYYY-MM.",
                        "attendance": [],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if month_start.month == 12:
                month_end = date(month_start.year + 1, 1, 1)
            else:
                month_end = date(month_start.year, month_start.month + 1, 1)

            attendance = attendance.filter(
                date__gte=month_start,
                date__lt=month_end,
            )

        if status_value:
            if status_value not in {"PRESENT", "ABSENT", "LATE"}:
                return Response(
                    {
                        "success": False,
                        "message": "Invalid attendance status.",
                        "attendance": [],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            attendance = attendance.filter(status=status_value)

        attendance = attendance.order_by("-date", "-created_at")

        present_count = attendance.filter(status="PRESENT").count()
        absent_count = attendance.filter(status="ABSENT").count()
        late_count = attendance.filter(status="LATE").count()
        total_count = attendance.count()

        attendance_percentage = 0
        if total_count:
            attendance_percentage = round(
                ((present_count + late_count) / total_count) * 100,
                2,
            )

        return Response(
            {
                "success": True,
                "count": total_count,
                "present_count": present_count,
                "absent_count": absent_count,
                "late_count": late_count,
                "attendance_percentage": attendance_percentage,
                "attendance": AttendanceSerializer(
                    attendance,
                    many=True,
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        profile = get_or_create_profile(request.user)

        # OWNER is read-only. Only TRAINER and OWNER_TRAINER
        # can actually mark attendance.
        if not profile.is_trainer:
            return Response(
                {
                    "success": False,
                    "message": "Only trainers can mark attendance.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        workspace = get_user_workspace(request.user)

        if not workspace:
            return Response(
                {
                    "success": False,
                    "message": "No active workspace found.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_members = self._get_allowed_members(
            request,
            profile,
            workspace,
        )

        member_id = request.data.get("member")
        if not member_id:
            return Response(
                {
                    "success": False,
                    "message": "Member is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            member_id = int(member_id)
        except (TypeError, ValueError):
            return Response(
                {
                    "success": False,
                    "message": "Invalid member.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        member = allowed_members.filter(id=member_id).first()
        if not member:
            return Response(
                {
                    "success": False,
                    "message": "Member not found or not assigned to you.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        date_value = request.data.get("date")
        if date_value:
            try:
                attendance_date = date.fromisoformat(str(date_value))
            except ValueError:
                return Response(
                    {
                        "success": False,
                        "message": "Invalid date. Use YYYY-MM-DD.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            attendance_date = timezone.localdate()

        attendance_status = str(
            request.data.get("status", "PRESENT")
        ).strip().upper()

        if attendance_status not in {"PRESENT", "ABSENT", "LATE"}:
            return Response(
                {
                    "success": False,
                    "message": "Invalid attendance status.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        attendance, created = Attendance.objects.update_or_create(
            member=member,
            date=attendance_date,
            defaults={
                "workspace": workspace,
                "status": attendance_status,
                "check_in": request.data.get("check_in"),
                "check_out": request.data.get("check_out"),
                "notes": request.data.get("notes"),
            },
        )

        return Response(
            {
                "success": True,
                "created": created,
                "message": (
                    "Attendance created successfully."
                    if created
                    else "Attendance updated successfully."
                ),
                "attendance": AttendanceSerializer(
                    attendance
                ).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AttendanceDetailView(APIView):
    """
    View/update/delete a single attendance record.

    OWNER can view through GET but cannot modify attendance.
    TRAINER and OWNER_TRAINER can modify records they are allowed to manage.
    """

    permission_classes = [IsAuthenticated]

    def _get_attendance(self, request, pk):
        profile = get_or_create_profile(request.user)
        workspace = get_user_workspace(request.user)

        if not workspace or not (profile.is_owner or profile.is_trainer):
            return None

        attendance = (
            Attendance.objects
            .select_related("member", "workspace")
            .filter(
                pk=pk,
                workspace=workspace,
                member__is_deleted=False,
            )
            .first()
        )

        if not attendance:
            return None

        if profile.is_owner:
            return attendance

        if profile.is_trainer and attendance.member.trainer_id == request.user.id:
            return attendance

        return None

    def get(self, request, pk):
        attendance = self._get_attendance(request, pk)

        if not attendance:
            return Response(
                {
                    "success": False,
                    "message": "Attendance record not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "attendance": AttendanceSerializer(attendance).data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk):
        profile = get_or_create_profile(request.user)

        if not profile.is_trainer:
            return Response(
                {
                    "success": False,
                    "message": "Only trainers can modify attendance.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        attendance = self._get_attendance(request, pk)

        if not attendance:
            return Response(
                {
                    "success": False,
                    "message": "Attendance record not found or not assigned to you.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if "status" in request.data:
            attendance_status = str(
                request.data.get("status")
            ).strip().upper()
            if attendance_status not in {"PRESENT", "ABSENT", "LATE"}:
                return Response(
                    {
                        "success": False,
                        "message": "Invalid attendance status.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            attendance.status = attendance_status

        if "date" in request.data:
            try:
                new_date = date.fromisoformat(
                    str(request.data.get("date"))
                )
            except ValueError:
                return Response(
                    {
                        "success": False,
                        "message": "Invalid date. Use YYYY-MM-DD.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if Attendance.objects.filter(
                member=attendance.member,
                date=new_date,
            ).exclude(pk=attendance.pk).exists():
                return Response(
                    {
                        "success": False,
                        "message": "Attendance already exists for this member on that date.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            attendance.date = new_date

        if "check_in" in request.data:
            attendance.check_in = request.data.get("check_in")

        if "check_out" in request.data:
            attendance.check_out = request.data.get("check_out")

        if "notes" in request.data:
            attendance.notes = request.data.get("notes")

        attendance.save()

        return Response(
            {
                "success": True,
                "message": "Attendance updated successfully.",
                "attendance": AttendanceSerializer(attendance).data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        profile = get_or_create_profile(request.user)

        if not profile.is_trainer:
            return Response(
                {
                    "success": False,
                    "message": "Only trainers can delete attendance.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        attendance = self._get_attendance(request, pk)

        if not attendance:
            return Response(
                {
                    "success": False,
                    "message": "Attendance record not found or not assigned to you.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        attendance.delete()

        return Response(
            {
                "success": True,
                "message": "Attendance deleted successfully.",
            },
            status=status.HTTP_200_OK,
        )


class MemberAttendanceView(APIView):
    """
    Member-facing attendance endpoint.

    Members can only see their own attendance records.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        member = get_authenticated_member(request)

        if not member:
            return Response(
                {
                    "success": False,
                    "message": "Invalid or expired member session.",
                    "attendance": [],
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        attendance = Attendance.objects.filter(
            member=member,
            workspace=member.workspace,
        ).select_related("member", "workspace")

        month_value = str(request.query_params.get("month", "")).strip()

        if month_value:
            try:
                month_start = date.fromisoformat(f"{month_value}-01")
            except ValueError:
                return Response(
                    {
                        "success": False,
                        "message": "Invalid month. Use YYYY-MM.",
                        "attendance": [],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if month_start.month == 12:
                month_end = date(month_start.year + 1, 1, 1)
            else:
                month_end = date(month_start.year, month_start.month + 1, 1)

            attendance = attendance.filter(
                date__gte=month_start,
                date__lt=month_end,
            )

        attendance = attendance.order_by("-date", "-created_at")

        present_count = attendance.filter(status="PRESENT").count()
        absent_count = attendance.filter(status="ABSENT").count()
        late_count = attendance.filter(status="LATE").count()
        total_count = attendance.count()

        attendance_percentage = 0
        if total_count:
            attendance_percentage = round(
                ((present_count + late_count) / total_count) * 100,
                2,
            )

        return Response(
            {
                "success": True,
                "member": {
                    "id": member.id,
                    "name": member.name,
                    "username": member.username,
                },
                "count": total_count,
                "present_count": present_count,
                "absent_count": absent_count,
                "late_count": late_count,
                "attendance_percentage": attendance_percentage,
                "attendance": AttendanceSerializer(
                    attendance,
                    many=True,
                ).data,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# DASHBOARD STATS
# ============================================================

class DashboardStatsView(APIView):
    """
    Role-aware dashboard statistics.

    OWNER / OWNER_TRAINER:
        - Sees all members in their own workspace.
        - Sees trainer count and assigned/unassigned member counts.
        - Does not see data from another workspace.

    TRAINER:
        - Sees only members assigned to themselves.
        - Does not see owner-wide member statistics.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        workspace = get_user_workspace(request.user)

        if not workspace:
            return Response(
                {
                    "success": False,
                    "message": "No active workspace found for this account.",
                    "total_members": 0,
                    "active_members": 0,
                    "expired_members": 0,
                    "expiring_members": 0,
                    "attendance_today": 0,
                    "total_trainers": 0,
                    "assigned_members": 0,
                    "unassigned_members": 0,
                },
                status=status.HTTP_200_OK,
            )

        # --------------------------------------------------------
        # ROLE-AWARE MEMBER QUERY
        # --------------------------------------------------------
        if profile.is_owner:
            # OWNER + OWNER_TRAINER both have owner-level access.
            members = Member.objects.filter(
                workspace=workspace,
                is_deleted=False,
            )

        elif profile.is_trainer:
            # A trainer can only see their own assigned members.
            members = Member.objects.filter(
                workspace=workspace,
                trainer=request.user,
                is_deleted=False,
            )

        else:
            return Response(
                {
                    "success": False,
                    "message": (
                        "You do not have permission "
                        "to view dashboard statistics."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # --------------------------------------------------------
        # KEEP MEMBERSHIP STATUS FRESH
        # --------------------------------------------------------
        # calculate_status() also handles members whose dates are
        # missing, so PENDING members remain PENDING.
        for member in members:

            calculated_status = (
                member.calculate_status()
            )

            if member.status != calculated_status:

                Member.objects.filter(
                    pk=member.pk
                ).update(
                    status=calculated_status
                )

                member.status = calculated_status

            # ------------------------------------------------
            # MEMBERSHIP EXPIRING NOTIFICATION
            # ------------------------------------------------

            create_membership_expiring_notifications(
                member
            )

            # ------------------------------------------------
            # MEMBERSHIP EXPIRED NOTIFICATION
            # ------------------------------------------------

            create_membership_expired_notifications(
                member
            )

        # --------------------------------------------------------
        # MEMBER STATISTICS
        # --------------------------------------------------------
        total_members = members.count()
        active_members = members.filter(status="ACTIVE").count()
        expired_members = members.filter(status="EXPIRED").count()
        expiring_members = members.filter(status="EXPIRING").count()

        # --------------------------------------------------------
        # TRAINER / ASSIGNMENT STATISTICS
        # --------------------------------------------------------
        total_trainers = TrainerProfile.objects.filter(
            workspace=workspace,
            is_active=True,
        ).count()

        if profile.is_owner:
            workspace_members = Member.objects.filter(
                workspace=workspace,
                is_deleted=False,
            )

            assigned_members = workspace_members.filter(
                trainer__isnull=False,
            ).count()

            unassigned_members = workspace_members.filter(
                trainer__isnull=True,
            ).count()
        else:
            # For a trainer, assigned_members means their own clients.
            assigned_members = total_members
            unassigned_members = 0

        # --------------------------------------------------------
        # ATTENDANCE
        # --------------------------------------------------------
        # Attendance model is not implemented yet.
        attendance_today = 0

        # --------------------------------------------------------
        # ROLE RESPONSE
        # --------------------------------------------------------
        if profile.is_owner and profile.is_trainer:
            role = "OWNER_TRAINER"
        elif profile.is_owner:
            role = "OWNER"
        else:
            role = "TRAINER"

        return Response(
            {
                "success": True,
                "role": role,
                "is_owner": profile.is_owner,
                "is_trainer": profile.is_trainer,
                "workspace_id": workspace.id,
                "workspace_name": workspace.name,
                "total_members": total_members,
                "active_members": active_members,
                "expired_members": expired_members,
                "expiring_members": expiring_members,
                "attendance_today": attendance_today,
                "total_trainers": total_trainers,
                "assigned_members": assigned_members,
                "unassigned_members": unassigned_members,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# PAYMENTS LIST + CREATE
# ============================================================

class PaymentListCreateView(APIView):

    permission_classes = [IsAuthenticated]

    # ========================================================
    # GET PAYMENTS
    # ========================================================

    def get(self, request):

        profile = get_or_create_profile(
            request.user
        )

        workspace = get_user_workspace(
            request.user
        )

        if not workspace:

            return Response(
                [],
                status=status.HTTP_200_OK
            )

        # ----------------------------------------------------
        # OWNER
        # ----------------------------------------------------

        if profile.is_owner:

            payments = Payment.objects.filter(
                workspace=workspace
            )

        # ----------------------------------------------------
        # TRAINER
        # ----------------------------------------------------

        elif profile.is_trainer:

            payments = Payment.objects.filter(
                workspace=workspace,
                member__trainer=request.user
            )

        else:

            return Response(
                {
                    "success": False,
                    "message": (
                        "You do not have permission "
                        "to view payments."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        payments = payments.select_related(
            "member",
            "workspace",
            "admin"
        ).order_by(
            "-date"
        )

        serializer = PaymentSerializer(
            payments,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    # ========================================================
    # CREATE PAYMENT
    # ========================================================

    @transaction.atomic
    def post(self, request):

        profile = get_or_create_profile(
            request.user
        )

        workspace = get_user_workspace(
            request.user
        )

        if not workspace:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Workspace not found."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # Owner or trainer
        # ----------------------------------------------------

        if not profile.is_owner and not profile.is_trainer:

            return Response(
                {
                    "success": False,
                    "message": (
                        "You do not have permission "
                        "to record payments."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        member_id = request.data.get(
            "member"
        )

        if not member_id:

            return Response(
                {
                    "success": False,
                    "message": "Member is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # Find member
        # ----------------------------------------------------

        try:

            if profile.is_owner:

                member = Member.objects.get(
                    id=member_id,
                    workspace=workspace,
                    is_deleted=False
                )

            else:

                member = Member.objects.get(
                    id=member_id,
                    workspace=workspace,
                    trainer=request.user,
                    is_deleted=False
                )

        except Member.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message": "Member not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # ----------------------------------------------------
        # Plan
        # ----------------------------------------------------

        plan = str(
            request.data.get(
                "plan",
                ""
            )
        ).strip()

        allowed_plans = [
            "Monthly",
            "Quarterly",
            "Annually"
        ]

        if plan not in allowed_plans:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Invalid membership plan."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # Payment serializer
        # ----------------------------------------------------

        serializer = PaymentSerializer(
            data=request.data
        )

        if not serializer.is_valid():

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # Payment status
        # ----------------------------------------------------
        # The Payment model supports PAID, PENDING and FAILED.
        # A FAILED payment must never extend the member's
        # membership.

        payment_status = str(
            request.data.get(
                "status",
                "PAID"
            )
        ).strip().upper()

        allowed_payment_statuses = [
            "PAID",
            "PENDING",
            "FAILED"
        ]

        if payment_status not in allowed_payment_statuses:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Invalid payment status."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # Extend membership only for successful payments
        # ----------------------------------------------------

        if payment_status == "PAID":

            today = timezone.localdate()

            if (
                member.membership_end is None
                or member.membership_end < today
            ):

                base_date = today

            else:

                base_date = member.membership_end

            if plan == "Monthly":

                new_end_date = add_months(
                    base_date,
                    1
                )

            elif plan == "Quarterly":

                new_end_date = add_months(
                    base_date,
                    3
                )

            else:

                new_end_date = add_months(
                    base_date,
                    12
                )

            # ------------------------------------------------
            # Membership start
            # ------------------------------------------------

            if member.membership_start is None:

                member.membership_start = today

            member.membership_end = new_end_date
            member.status = member.calculate_status()

            member.save()

        # ----------------------------------------------------
        # Create payment
        # ----------------------------------------------------

        payment = serializer.save(
            member=member,
            admin=request.user,
            workspace=workspace
        )

        # ====================================================
        # PAYMENT RECEIVED NOTIFICATION
        # ====================================================

        if payment.status == "PAID":

            Notification.objects.create(
                recipient=workspace.owner,
                workspace=workspace,
                notification_type="PAYMENT_RECEIVED",
                title="Payment Received",
                message=(
                    f"Payment received from {member.name}."
                ),
                related_id=payment.id,
                related_type="payment",
            )

            Notification.objects.create(
                recipient_member=member,
                workspace=workspace,
                notification_type="PAYMENT_RECEIVED",
                title="Payment Successful",
                message=(
                    f"Your payment of ₹{payment.amount} was received successfully."
                ),
                related_id=payment.id,
                related_type="payment",
            )

        # ====================================================
        # PAYMENT FAILED NOTIFICATION
        # ====================================================

        elif payment.status == "FAILED":

            Notification.objects.create(
                recipient=workspace.owner,
                workspace=workspace,
                notification_type="PAYMENT_FAILED",
                title="Payment Failed",
                message=(
                    f"Payment failed for {member.name}."
                ),
                related_id=payment.id,
                related_type="payment",
            )

            Notification.objects.create(
                recipient_member=member,
                workspace=workspace,
                notification_type="PAYMENT_FAILED",
                title="Payment Failed",
                message=(
                    f"Your payment of ₹{payment.amount} could not be completed."
                ),
                related_id=payment.id,
                related_type="payment",
            )

        return Response(
            PaymentSerializer(payment).data,
            status=status.HTTP_201_CREATED
        )


# ============================================================
# PAYMENT DETAIL
# ============================================================

class PaymentDetailView(APIView):

    permission_classes = [IsAuthenticated]

    def get_payment(self, request, pk):

        profile = get_or_create_profile(
            request.user
        )

        workspace = get_user_workspace(
            request.user
        )

        if not workspace:

            return None

        # ----------------------------------------------------
        # OWNER
        # ----------------------------------------------------

        if profile.is_owner:

            try:

                return Payment.objects.get(
                    pk=pk,
                    workspace=workspace
                )

            except Payment.DoesNotExist:

                return None

        # ----------------------------------------------------
        # TRAINER
        # ----------------------------------------------------

        if profile.is_trainer:

            try:

                return Payment.objects.get(
                    pk=pk,
                    workspace=workspace,
                    member__trainer=request.user
                )

            except Payment.DoesNotExist:

                return None

        return None

    # ========================================================
    # GET
    # ========================================================

    def get(self, request, pk):

        payment = self.get_payment(
            request,
            pk
        )

        if payment is None:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Payment not found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PaymentSerializer(
            payment
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    # ========================================================
    # DELETE
    # ========================================================

    def delete(self, request, pk):

        payment = self.get_payment(
            request,
            pk
        )

        if payment is None:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Payment not found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND
            )

        payment.delete()

        return Response(
            {
                "success": True,
                "message": (
                    "Payment deleted successfully."
                )
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# REVENUE STATS
# ============================================================

class RevenueStatsView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        # ========================================================
        # GET USER PROFILE
        # ========================================================

        profile = get_or_create_profile(
            request.user
        )

        # ========================================================
        # DETERMINE ROLE
        # ========================================================

        role = str(
            getattr(profile, "role", "") or ""
        ).strip().upper()

        is_owner_account = (
            role in ["OWNER", "OWNER_TRAINER"]
            or profile.is_owner is True
        )

        print(
            "========================================"
        )
        print(
            "REVENUE STATS DEBUG"
        )
        print(
            "USERNAME:",
            request.user.username
        )
        print(
            "PROFILE ROLE:",
            profile.role
        )
        print(
            "PROFILE is_owner:",
            profile.is_owner
        )
        print(
            "PROFILE is_trainer:",
            profile.is_trainer
        )
        print(
            "USER is_staff:",
            request.user.is_staff
        )
        print(
            "OWNER ACCOUNT:",
            is_owner_account
        )
        print(
            "========================================"
        )

        # ========================================================
        # OWNER / OWNER + TRAINER ONLY
        # ========================================================

        if not is_owner_account:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Only workspace owners "
                        "can view revenue."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # ========================================================
        # GET WORKSPACE
        # ========================================================

        workspace = get_user_workspace(
            request.user
        )

        if not workspace:

            return Response(
                {
                    "success": True,
                    "total_revenue": 0,
                    "total_payments": 0,
                },
                status=status.HTTP_200_OK
            )

        # ========================================================
        # GET PAID PAYMENTS
        # ========================================================

        paid_payments = Payment.objects.filter(
            workspace=workspace,
            status="PAID"
        )

        # ========================================================
        # TOTAL REVENUE
        # ========================================================

        total_revenue = (
            paid_payments.aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )

        # ========================================================
        # TOTAL PAYMENTS
        # ========================================================

        total_payments = (
            paid_payments.count()
        )

        # ========================================================
        # RESPONSE
        # ========================================================

        return Response(
            {
                "success": True,
                "total_revenue": total_revenue,
                "total_payments": total_payments,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# REGISTRATION QR
# ============================================================

class RegistrationQRView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        profile = get_or_create_profile(
            request.user
        )

        # ----------------------------------------------------
        # Owner only
        # ----------------------------------------------------

        if not profile.is_owner:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Only workspace owners "
                        "can generate registration QR."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        admin = request.user

        workspace = get_user_workspace(
            admin
        )

        if not workspace:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Workspace not found."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            # ------------------------------------------------
            # Existing QR
            # ------------------------------------------------

            qr = RegistrationQR.objects.filter(
                workspace=workspace,
                registration_type="MEMBER",
                is_active=True
            ).first()

            # ------------------------------------------------
            # Backward compatibility
            # ------------------------------------------------

            if not qr:

                qr = RegistrationQR.objects.filter(
                    admin=admin,
                    registration_type="MEMBER",
                    is_active=True
                ).first()

                if qr:

                    qr.workspace = workspace

                    qr.save(
                        update_fields=[
                            "workspace"
                        ]
                    )

            # ------------------------------------------------
            # Create QR
            # ------------------------------------------------

            if not qr:

                qr = RegistrationQR.objects.create(
                    admin=admin,
                    workspace=workspace,
                    token=(
                        "GYMRYT_"
                        f"{secrets.token_urlsafe(32)}"
                    ),
                    registration_type="MEMBER",
                )

            return Response(
                {
                    "success": True,

                    "token": qr.token,

                    "admin_id": admin.id,

                    "admin_username": (
                        admin.username
                    ),

                    "workspace_id": workspace.id,

                    "workspace_name": (
                        workspace.name
                    ),
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:

            print(
                "Registration QR error:",
                str(e)
            )

            return Response(
                {
                    "success": False,
                    "message": (
                        "Unable to generate "
                        "registration QR code."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



# ============================================================
# TRAINER REGISTRATION QR
# ============================================================

class TrainerRegistrationQRView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        profile = get_or_create_profile(request.user)

        if not profile.is_owner:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only workspace owners can generate "
                        "trainer registration QR."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        workspace = get_user_workspace(request.user)

        if not workspace:
            return Response(
                {
                    "success": False,
                    "message": "Workspace not found.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            qr = RegistrationQR.objects.filter(
                admin=request.user,
                workspace=workspace,
                registration_type="TRAINER",
                is_active=True,
            ).first()

            if not qr:
                qr = RegistrationQR.objects.create(
                    admin=request.user,
                    workspace=workspace,
                    registration_type="TRAINER",
                    token="GYMRYT_TRAINER_" + secrets.token_urlsafe(32),
                )

            return Response(
                {
                    "success": True,
                    "qr_payload": build_trainer_qr_payload(qr.token),
                    "token": qr.token,
                    "registration_type": "TRAINER",
                    "admin_id": request.user.id,
                    "admin_username": request.user.username,
                    "workspace_id": workspace.id,
                    "workspace_name": workspace.name,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            print("Trainer Registration QR error:", str(e))
            return Response(
                {
                    "success": False,
                    "message": (
                        "Unable to generate trainer registration "
                        "QR code."
                    ),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ============================================================
# TRAINER APPLICATION - PUBLIC CREATE
# ============================================================

class TrainerApplicationCreateView(APIView):
    permission_classes = [AllowAny]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def post(self, request):

        # ========================================================
        # READ + NORMALIZE QR PAYLOAD
        # ========================================================

        raw_qr_payload = request.data.get(
            "qr_payload",
            request.data.get("token", "")
        )

        qr_token, payload_error = normalize_trainer_qr_payload(
            raw_qr_payload
        )

        # Diagnostics intentionally exclude all form fields
        # and passwords.
        print(
            "TRAINER QR RAW REQUEST TOKEN:",
            raw_qr_payload
        )

        print(
            "TRAINER QR TOKEN AFTER NORMALIZATION:",
            qr_token
        )

        # ========================================================
        # READ FORM DATA
        # ========================================================

        name = str(
            request.data.get("name", "")
        ).strip()

        email = str(
            request.data.get("email", "")
        ).strip()

        phone = str(
            request.data.get("phone", "")
        ).strip()

        username = str(
            request.data.get("username", "")
        ).strip()

        password = request.data.get(
            "password",
            ""
        )

        confirm_password = request.data.get(
            "confirm_password",
            ""
        )

        specialization = str(
            request.data.get(
                "specialization",
                ""
            )
        ).strip()

        experience_years = request.data.get(
            "experience_years",
            0
        )

        # ========================================================
        # EXPERIENCE VALIDATION
        # ========================================================

        try:

            experience_years = max(
                0,
                int(
                    experience_years or 0
                )
            )

        except (
            TypeError,
            ValueError
        ):

            return Response(
                {
                    "success": False,
                    "message":
                        "Experience must be a valid number of years.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ========================================================
        # QR VALIDATION
        # ========================================================

        if payload_error == "wrong_type":

            return Response(
                {
                    "success": False,
                    "message":
                        "This QR code is not a trainer registration QR.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not qr_token:

            return Response(
                {
                    "success": False,
                    "message":
                        "Trainer registration QR code is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ========================================================
        # BASIC FORM VALIDATION
        # ========================================================

        if not name:

            return Response(
                {
                    "success": False,
                    "message":
                        "Full name is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not phone:

            return Response(
                {
                    "success": False,
                    "message":
                        "Phone number is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not username:

            return Response(
                {
                    "success": False,
                    "message":
                        "Username is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not password:

            return Response(
                {
                    "success": False,
                    "message":
                        "Password is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not confirm_password:

            return Response(
                {
                    "success": False,
                    "message":
                        "Confirm password is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != confirm_password:

            return Response(
                {
                    "success": False,
                    "message":
                        "Passwords do not match.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 6:

            return Response(
                {
                    "success": False,
                    "message":
                        "Password must contain at least 6 characters.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(phone) < 10:

            return Response(
                {
                    "success": False,
                    "message":
                        "Please enter a valid phone number.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ========================================================
        # RESOLVE TRAINER QR
        # ========================================================

        if payload_error == "legacy_signed":

            qr = resolve_legacy_signed_trainer_qr(
                raw_qr_payload
            )

        else:

            qr = (
                RegistrationQR.objects
                .filter(
                    token=qr_token
                )
                .select_related(
                    "admin",
                    "workspace"
                )
                .first()
            )

        # ========================================================
        # LEGACY SIGNED QR
        # ========================================================

        if (
            qr
            and
            payload_error == "legacy_signed"
        ):

            qr = (
                RegistrationQR.objects
                .select_related(
                    "admin",
                    "workspace"
                )
                .get(
                    pk=qr.pk
                )
            )

        # ========================================================
        # QR DIAGNOSTICS
        # ========================================================

        print(
            "TRAINER QR DATABASE MATCH:",
            bool(qr)
        )

        print(
            "TRAINER QR DATABASE ID:",
            qr.id if qr else None
        )

        print(
            "TRAINER QR DATABASE TYPE:",
            qr.registration_type
            if qr else None
        )

        print(
            "TRAINER QR DATABASE ACTIVE:",
            qr.is_active
            if qr else None
        )

        print(
            "TRAINER QR DATABASE ADMIN:",
            qr.admin_id
            if qr else None
        )

        print(
            "TRAINER QR DATABASE WORKSPACE:",
            qr.workspace_id
            if qr else None
        )

        # ========================================================
        # QR NOT FOUND
        # ========================================================

        if not qr:

            return Response(
                {
                    "success": False,
                    "message":
                        "This trainer registration QR code is invalid or inactive.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ========================================================
        # QR TYPE
        # ========================================================

        if qr.registration_type != "TRAINER":

            return Response(
                {
                    "success": False,
                    "message":
                        "This QR code is not a trainer registration QR.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ========================================================
        # QR ACTIVE
        # ========================================================

        if not qr.is_active:

            return Response(
                {
                    "success": False,
                    "message":
                        "This trainer registration QR code is invalid or inactive.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ========================================================
        # WORKSPACE
        # ========================================================

        workspace = qr.workspace

        if (
            not workspace
            or
            not workspace.is_active
        ):

            return Response(
                {
                    "success": False,
                    "message":
                        "This QR code is not connected to an active workspace.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ========================================================
        # ADMIN
        # ========================================================

        if not qr.admin.is_active:

            return Response(
                {
                    "success": False,
                    "message":
                        "The gym administrator account is currently inactive.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ========================================================
        # USERNAME - CURRENT USER ACCOUNT CHECK
        # ========================================================
        #
        # This checks whether the username is already being used
        # by an actual Django user account.
        #
        # If a trainer was previously deleted, their User record
        # should also be deleted, so the username becomes available.
        #
        # ========================================================

        existing_user = (
            User.objects
            .filter(
                username__iexact=username
            )
            .first()
        )

        if existing_user:

            return Response(
                {
                    "success": False,
                    "message":
                        "This username is already registered.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ========================================================
        # PENDING TRAINER APPLICATION - USERNAME
        # ========================================================
        #
        # IMPORTANT:
        #
        # Previously this checked ANY application:
        #
        # TrainerApplication.objects.filter(...).exists()
        #
        # That meant a REJECTED application permanently blocked
        # the username.
        #
        # Now ONLY PENDING applications block a new application.
        #
        # ========================================================

        pending_username_application = (
            TrainerApplication.objects
            .filter(
                workspace=workspace,
                username__iexact=username,
                status="PENDING",
            )
            .first()
        )

        if pending_username_application:

            return Response(
                {
                    "success": False,
                    "message":
                        "A trainer application with this username is already pending for this gym.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ========================================================
        # PENDING TRAINER APPLICATION - EMAIL
        # ========================================================
        #
        # Same rule for email:
        #
        # REJECTED email → available again
        # PENDING email → blocked
        #
        # ========================================================

        if email:

            pending_email_application = (
                TrainerApplication.objects
                .filter(
                    workspace=workspace,
                    email__iexact=email,
                    status="PENDING",
                )
                .first()
            )

            if pending_email_application:

                return Response(
                    {
                        "success": False,
                        "message":
                            "A trainer application with this email is already pending for this gym.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ========================================================
        # CREATE TRAINER APPLICATION
        # ========================================================

        try:

            data = {
                "admin": qr.admin,

                "workspace": workspace,

                "registration_qr": qr,

                "name": name,

                "email": email or None,

                "phone": phone,

                "username": username,

                "password":
                    make_password(
                        password
                    ),

                "specialization":
                    specialization or None,

                "experience_years":
                    experience_years,

                "status":
                    "PENDING",
            }

            application = (
                TrainerApplication.objects.create(
                    **data
                )
            )

            # ====================================================
            # CREATE OWNER NOTIFICATION
            # ====================================================

            Notification.objects.create(
                recipient=qr.admin,
                workspace=workspace,
                notification_type="TRAINER_APPLICATION",
                title="New Trainer Application",
                message=f"{name} has submitted a trainer application.",
                related_id=application.id,
                related_type="trainer_application",
                )

            # ====================================================
            # SUCCESS
            # ====================================================

            return Response(
                {
                    "success": True,

                    "message":
                        "Trainer application submitted successfully.",

                    "application_id":
                        application.id,

                    "status":
                        application.status,

                    "workspace_id":
                        workspace.id,

                    "workspace_name":
                        workspace.name,
                },
                status=status.HTTP_201_CREATED,
            )

        # ========================================================
        # CREATION ERROR
        # ========================================================

        except Exception as e:

            print(
                "Trainer application creation error:",
                str(e)
            )

            return Response(
                {
                    "success": False,
                    "message":
                        "Unable to submit trainer application.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

# ============================================================
# OWNER - TRAINER APPLICATION LIST
# ============================================================

class TrainerApplicationListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        profile = get_or_create_profile(request.user)

        if not profile.is_owner:
            return Response(
                {
                    "success": False,
                    "message": "Only workspace owners can view trainer applications.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        workspace = get_user_workspace(request.user)

        if not workspace:
            return Response(
                {"success": False, "message": "Workspace not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        applications = (
            TrainerApplication.objects
            .filter(admin=request.user, workspace=workspace)
            .select_related("workspace", "registration_qr", "approved_user")
            .order_by("-created_at")
        )

        data = []

        for application in applications:
            data.append(
                {
                    "id": application.id,
                    "name": application.name,
                    "email": application.email,
                    "phone": application.phone,
                    "username": application.username,
                    "specialization": application.specialization,
                    "experience_years": application.experience_years,
                    "status": application.status,
                    "workspace_id": application.workspace_id,
                    "workspace_name": application.workspace.name,
                    "created_at": application.created_at,
                    "updated_at": application.updated_at,
                }
            )

        return Response(
            {
                "success": True,
                "count": len(data),
                "applications": data,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# OWNER - TRAINER APPLICATION ACTION
# ============================================================

class TrainerApplicationActionView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):

        profile = get_or_create_profile(request.user)

        if not profile.is_owner:
            return Response(
                {
                    "success": False,
                    "message": "Only workspace owners can approve or reject trainer applications.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        action = str(request.data.get("action", "")).strip().upper()

        if action not in {"APPROVE", "REJECT"}:
            return Response(
                {
                    "success": False,
                    "message": "Invalid action. Use APPROVE or REJECT.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        workspace = get_user_workspace(request.user)

        if not workspace:
            return Response(
                {"success": False, "message": "Workspace not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Lock the row while checking its status and creating the account.
            # This makes simultaneous owner taps safe: only one request can
            # transition this application out of PENDING.
            try:
                application = TrainerApplication.objects.select_for_update().select_related(
                    "admin", "workspace"
                ).get(
                    pk=pk,
                    admin=request.user,
                    workspace=workspace,
                )
            except TrainerApplication.DoesNotExist:
                return Response(
                    {
                        "success": False,
                        "message": "Trainer application not found.",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            if application.status != "PENDING":
                return Response(
                    {
                        "success": False,
                        "message": (
                            f"This application has already been "
                            f"{application.status.lower()}."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if action == "REJECT":
                application.status = "REJECTED"
                application.rejection_reason = str(
                    request.data.get("rejection_reason", "")
                ).strip()
                application.reviewed_at = timezone.now()
                application.save(
                    update_fields=[
                        "status",
                        "rejection_reason",
                        "reviewed_at",
                        "updated_at",
                    ]
                )

                return Response(
                    {
                        "success": True,
                        "message": "Trainer application rejected.",
                        "application_id": application.id,
                        "status": "REJECTED",
                    },
                    status=status.HTTP_200_OK,
                )

            # APPROVE. TrainerApplicationCreateView stores a Django hash, and
            # ensure_hashed_application_password also supports historical rows
            # that may contain plaintext without hashing an existing hash again.
            if User.objects.filter(
                username__iexact=application.username
            ).exists():
                return Response(
                    {
                        "success": False,
                        "message": "This username is already being used by another account.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user_password = ensure_hashed_application_password(
                application.password
            )

            name_parts = application.name.split(maxsplit=1)
            user = User.objects.create(
                username=application.username,
                email=application.email or "",
                first_name=name_parts[0] if name_parts else "",
                last_name=name_parts[1] if len(name_parts) > 1 else "",
                password=user_password,
                is_active=True,
                is_staff=False,
            )

            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    "role": "TRAINER",
                    "is_owner": False,
                    "is_trainer": True,
                },
            )

            if not created:
                profile.role = "TRAINER"
                profile.is_owner = False
                profile.is_trainer = True
                profile.save()

            trainer_profile = TrainerProfile.objects.create(
                user=user,
                workspace=application.workspace,
                phone=application.phone,
                specialization=application.specialization,
                experience_years=application.experience_years,
                bio=application.bio,
                is_active=True,
            )

            application.status = "APPROVED"
            application.approved_user = user
            application.reviewed_at = timezone.now()
            application.save(
                update_fields=[
                    "status",
                    "approved_user",
                    "reviewed_at",
                    "updated_at",
                ]
            )

        return Response(
            {
                "success": True,
                "message": "Trainer application approved successfully.",
                "application_id": application.id,
                "trainer_id": trainer_profile.id,
                "user_id": user.id,
                "username": user.username,
                "status": "APPROVED",
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# ADMIN PROFILE PICTURE
# ============================================================

class AdminProfilePictureView(APIView):

    permission_classes = [IsAuthenticated]

    parser_classes = [
        MultiPartParser,
        FormParser
    ]

    def get(self, request):

        profile = get_or_create_profile(
            request.user
        )

        profile_picture = None

        if profile.profile_picture:

            profile_picture = request.build_absolute_uri(
                profile.profile_picture.url
            )

        return Response(
            {
                "success": True,
                "profile_picture": profile_picture
            },
            status=status.HTTP_200_OK
        )

    def post(self, request):

        profile = get_or_create_profile(
            request.user
        )

        image = request.FILES.get(
            "profile_picture"
        )

        # ====================================================
        # VALIDATION
        # ====================================================

        if not image:

            return Response(
                {
                    "success": False,
                    "message": "Profile picture is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        allowed_types = {
            "image/jpeg",
            "image/png",
            "image/webp"
        }

        if image.content_type not in allowed_types:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Only JPG, JPEG, PNG and WEBP "
                        "images are allowed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Maximum file size = 5 MB
        if image.size > 5 * 1024 * 1024:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Profile picture must be "
                        "smaller than 5 MB."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # SAVE IMAGE
        # ====================================================

        try:

            # Delete previous profile picture
            if profile.profile_picture:

                profile.profile_picture.delete(
                    save=False
                )

            profile.profile_picture = image

            profile.save(
                update_fields=[
                    "profile_picture",
                    "updated_at"
                ]
            )

            profile_picture = request.build_absolute_uri(
                profile.profile_picture.url
            )

            return Response(
                {
                    "success": True,
                    "message": (
                        "Profile picture updated "
                        "successfully."
                    ),
                    "profile_picture": profile_picture
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Failed to upload profile picture."
                    ),
                    "error": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request):

        profile = get_or_create_profile(
            request.user
        )

        try:

            if profile.profile_picture:

                profile.profile_picture.delete(
                    save=False
                )

                profile.profile_picture = None

                profile.save(
                    update_fields=[
                        "profile_picture",
                        "updated_at"
                    ]
                )

            return Response(
                {
                    "success": True,
                    "message": (
                        "Profile picture removed "
                        "successfully."
                    ),
                    "profile_picture": None
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Failed to remove "
                        "profile picture."
                    ),
                    "error": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# ============================================================
# OWNER - TRAINER LIST
# ============================================================

class TrainerProfileView(APIView):
    """Authenticated trainer's own profile; never accepts workspace ownership fields."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_profile(self, request):
        profile = get_or_create_profile(request.user)
        if not profile.is_trainer:
            return None
        return TrainerProfile.objects.select_related("user", "workspace").filter(
            user=request.user,
            is_active=True,
            workspace__is_active=True,
        ).first()

    def get(self, request):
        trainer_profile = self.get_profile(request)
        if not trainer_profile:
            return Response({"success": False, "message": "Trainer profile not found or inactive."}, status=status.HTTP_403_FORBIDDEN)
        return Response({"success": True, "trainer": TrainerSerializer(trainer_profile, context={"request": request}).data})

    def patch(self, request):
        trainer_profile = self.get_profile(request)
        if not trainer_profile:
            return Response({"success": False, "message": "Trainer profile not found or inactive."}, status=status.HTTP_403_FORBIDDEN)

        image = request.FILES.get("profile_picture")
        if not image:
            return Response({"success": False, "message": "A profile picture is required."}, status=status.HTTP_400_BAD_REQUEST)
        if image.content_type not in {"image/jpeg", "image/png", "image/webp"} or image.size > 5 * 1024 * 1024:
            return Response({"success": False, "message": "Use a JPG, PNG, or WEBP image smaller than 5 MB."}, status=status.HTTP_400_BAD_REQUEST)

        trainer_profile.profile_picture = image
        trainer_profile.save(update_fields=["profile_picture", "updated_at"])
        return Response({"success": True, "trainer": TrainerSerializer(trainer_profile, context={"request": request}).data})

class TrainerListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        profile = get_or_create_profile(
            request.user
        )

        if not profile.is_owner:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only workspace owners "
                        "can access trainers."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        workspace = get_user_workspace(
            request.user
        )

        if not workspace:
            return Response(
                {
                    "success": False,
                    "message": (
                        "No active workspace "
                        "found for this account."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        trainers = (
            TrainerProfile.objects
            .filter(
                workspace=workspace
            )
            .select_related(
                "user",
                "workspace"
            )
            .order_by(
                "-created_at"
            )
        )

        serializer = TrainerSerializer(
            trainers,
            many=True,
            context={
                "request": request
            }
        )

        return Response(
            {
                "success": True,
                "workspace_id": workspace.id,
                "workspace_name": workspace.name,
                "count": trainers.count(),
                "trainers": serializer.data
            },
            status=status.HTTP_200_OK
        )

# ============================================================
# OWNER - TRAINER DETAILS / EDIT / DELETE
# ============================================================

class TrainerDetailView(APIView):
    """
    Owner-only trainer management.

    GET:
        View a trainer belonging to the owner's workspace.

    PATCH:
        Edit trainer account and trainer details.

    DELETE:
        Remove the trainer account from the workspace.
        Assigned members are automatically unassigned.
    """

    permission_classes = [IsAuthenticated]

    def _get_trainer(self, request, pk):
        profile = get_or_create_profile(request.user)

        if not profile.is_owner:
            return None, Response(
                {
                    "success": False,
                    "message": (
                        "Only workspace owners can "
                        "manage trainers."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        workspace = get_user_workspace(request.user)

        if not workspace:
            return None, Response(
                {
                    "success": False,
                    "message": (
                        "No active workspace found "
                        "for this account."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            trainer = (
                TrainerProfile.objects
                .select_related("user", "workspace")
                .get(
                    pk=pk,
                    workspace=workspace,
                )
            )

        except (
            TrainerProfile.DoesNotExist,
            ValueError,
            TypeError,
        ):
            return None, Response(
                {
                    "success": False,
                    "message": "Trainer not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return trainer, None

    # --------------------------------------------------------
    # GET TRAINER DETAILS
    # --------------------------------------------------------

    def get(self, request, pk):

        trainer, error_response = self._get_trainer(
            request,
            pk,
        )

        if error_response:
            return error_response

        serializer = TrainerSerializer(
            trainer,
            context={"request": request},
        )

        return Response(
            {
                "success": True,
                "trainer": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------------
    # UPDATE TRAINER
    # --------------------------------------------------------

    @transaction.atomic
    def patch(self, request, pk):

        trainer, error_response = self._get_trainer(
            request,
            pk,
        )

        if error_response:
            return error_response

        trainer_user = trainer.user

        # ----------------------------------------------------
        # Allowed fields
        # ----------------------------------------------------

        allowed_fields = {
            "name",
            "username",
            "email",
            "phone",
            "specialization",
            "experience_years",
            "is_active",
        }

        invalid_fields = (
            set(request.data.keys()) - allowed_fields
        )

        if invalid_fields:
            return Response(
                {
                    "success": False,
                    "message": (
                        "These fields cannot be edited: "
                        + ", ".join(
                            sorted(invalid_fields)
                        )
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ====================================================
        # NAME
        # ====================================================

        if "name" in request.data:

            name = str(
                request.data.get("name") or ""
            ).strip()

            if not name:
                return Response(
                    {
                        "success": False,
                        "message": "Full name is required.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            name_parts = name.split()

            trainer_user.first_name = name_parts[0]

            trainer_user.last_name = " ".join(
                name_parts[1:]
            )

        # ====================================================
        # USERNAME
        # ====================================================

        if "username" in request.data:

            username = str(
                request.data.get("username") or ""
            ).strip()

            if not username:
                return Response(
                    {
                        "success": False,
                        "message": "Username is required.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if len(username) > 150:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Username cannot be longer "
                            "than 150 characters."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            username_exists = (
                User.objects
                .filter(
                    username__iexact=username
                )
                .exclude(
                    pk=trainer_user.id
                )
                .exists()
            )

            if username_exists:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "This username is already "
                            "being used."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            trainer_user.username = username

        # ====================================================
        # EMAIL
        # ====================================================

        if "email" in request.data:

            email = str(
                request.data.get("email") or ""
            ).strip()

            if not email:
                return Response(
                    {
                        "success": False,
                        "message": "Email is required.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if "@" not in email or "." not in email.split("@")[-1]:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Please enter a valid email address."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            email_exists = (
                User.objects
                .filter(
                    email__iexact=email
                )
                .exclude(
                    pk=trainer_user.id
                )
                .exists()
            )

            if email_exists:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "This email is already "
                            "being used."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            trainer_user.email = email

        # ====================================================
        # PHONE
        # ====================================================

        if "phone" in request.data:

            phone = str(
                request.data.get("phone") or ""
            ).strip()

            if not phone:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Phone number is required."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Count only numeric characters.
            # This allows formats such as:
            # +91 9535046464
            # 95350-46464
            # 9535046464
            digits_only = "".join(
                character
                for character in phone
                if character.isdigit()
            )

            if len(digits_only) < 10:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Please enter a valid phone number."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            trainer.phone = phone

        # ====================================================
        # SPECIALIZATION
        # ====================================================

        if "specialization" in request.data:

            specialization = str(
                request.data.get("specialization") or ""
            ).strip()

            trainer.specialization = specialization

        # ====================================================
        # EXPERIENCE
        # ====================================================

        if "experience_years" in request.data:

            value = request.data.get(
                "experience_years"
            )

            try:
                value = int(value)

            except (
                TypeError,
                ValueError,
            ):
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Experience must be "
                            "a valid number."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if value < 0:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Experience cannot "
                            "be negative."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if value > 60:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Experience cannot be "
                            "greater than 60 years."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            trainer.experience_years = value

        # ====================================================
        # ACTIVE / INACTIVE
        # ====================================================

        if "is_active" in request.data:

            value = request.data.get(
                "is_active"
            )

            if isinstance(value, bool):

                trainer.is_active = value

            elif str(value).lower() in (
                "true",
                "1",
            ):

                trainer.is_active = True

            elif str(value).lower() in (
                "false",
                "0",
            ):

                trainer.is_active = False

            else:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "is_active must be "
                            "true or false."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ====================================================
        # SAVE USER
        # ====================================================

        trainer_user.save(
            update_fields=[
                "first_name",
                "last_name",
                "username",
                "email",
            ]
        )

        # ====================================================
        # SAVE TRAINER PROFILE
        # ====================================================

        trainer.save()

        # Refresh both objects
        trainer_user.refresh_from_db()
        trainer.refresh_from_db()

        serializer = TrainerSerializer(
            trainer,
            context={"request": request},
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Trainer updated successfully."
                ),
                "trainer": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------------
    # DELETE TRAINER
    # --------------------------------------------------------

    @transaction.atomic
    def delete(self, request, pk):

        trainer, error_response = self._get_trainer(
            request,
            pk,
        )

        if error_response:
            return error_response

        trainer_user = trainer.user

        # ----------------------------------------------------
        # Remove trainer assignment from all members.
        # ----------------------------------------------------

        Member.objects.filter(
            trainer=trainer_user
        ).update(
            trainer=None,
            updated_at=timezone.now(),
        )

        # ----------------------------------------------------
        # Delete trainer profile.
        # ----------------------------------------------------

        trainer.delete()

        # ----------------------------------------------------
        # Delete trainer's Django user account.
        # ----------------------------------------------------

        trainer_user.delete()

        return Response(
            {
                "success": True,
                "message": (
                    "Trainer deleted successfully."
                ),
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# OWNER - TRAINER ASSIGNMENT
# ============================================================

class TrainerAssignmentView(APIView):
    """Assign, change, or unassign a member's trainer."""

    permission_classes = [IsAuthenticated]

    def post(self, request):

        # ====================================================
        # GET OWNER PROFILE
        # ====================================================

        profile = get_or_create_profile(
            request.user
        )

        if not profile.is_owner:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only workspace owners "
                        "can assign trainers."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # ====================================================
        # GET WORKSPACE
        # ====================================================

        workspace = get_user_workspace(
            request.user
        )

        if not workspace:
            return Response(
                {
                    "success": False,
                    "message": "Workspace not found.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ====================================================
        # GET REQUEST DATA
        # ====================================================

        member_id = request.data.get(
            "member_id"
        )

        trainer_id = request.data.get(
            "trainer_id"
        )

        if not member_id:
            return Response(
                {
                    "success": False,
                    "message": (
                        "member_id is required."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ====================================================
        # GET MEMBER
        # ====================================================

        try:
            member = (
                Member.objects
                .select_related(
                    "workspace",
                    "trainer",
                )
                .get(
                    pk=member_id,
                    workspace=workspace,
                    is_deleted=False,
                )
            )

        except (
            Member.DoesNotExist,
            ValueError,
            TypeError,
        ):

            return Response(
                {
                    "success": False,
                    "message": "Member not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # ====================================================
        # TRACK PREVIOUS TRAINER
        # ====================================================

        previous_trainer = member.trainer

        # ====================================================
        # FIND NEW TRAINER
        # ====================================================

        trainer_user = None

        # Empty / null trainer_id means UNASSIGN.
        if trainer_id not in (
            None,
            "",
            0,
            "null",
        ):

            try:
                trainer_profile = (
                    TrainerProfile.objects
                    .select_related("user")
                    .get(
                        pk=trainer_id,
                        workspace=workspace,
                        is_active=True,
                    )
                )

            except (
                TrainerProfile.DoesNotExist,
                ValueError,
                TypeError,
            ):

                return Response(
                    {
                        "success": False,
                        "message": (
                            "Invalid trainer for this workspace."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            trainer_user = trainer_profile.user

        # ====================================================
        # ASSIGN / UNASSIGN TRAINER
        # ====================================================

        member.trainer = trainer_user

        member.save(
            update_fields=[
                "trainer",
                "updated_at",
            ]
        )

        member.refresh_from_db()

        # ====================================================
        # TRAINER ASSIGNED NOTIFICATIONS
        # ====================================================

        # Create notifications only when the trainer actually
        # changes to a new trainer.
        if (
            trainer_user is not None
            and trainer_user != previous_trainer
        ):

            # ------------------------------------------------
            # NOTIFICATION FOR TRAINER
            # ------------------------------------------------

            Notification.objects.create(
                recipient=trainer_user,
                workspace=workspace,
                notification_type="TRAINER_ASSIGNED",
                title="New Member Assigned",
                message=(
                    f"{member.name} has been assigned to you."
                ),
                related_id=member.id,
                related_type="member",
            )

            # ------------------------------------------------
            # NOTIFICATION FOR MEMBER
            # ------------------------------------------------

            Notification.objects.create(
                recipient_member=member,
                workspace=workspace,
                notification_type="TRAINER_ASSIGNED",
                title="Trainer Assigned",
                message=(
                    f"{trainer_user.get_full_name() or trainer_user.username} "
                    "has been assigned as your trainer."
                ),
                related_id=member.id,
                related_type="member",
            )

        # ====================================================
        # RESPONSE
        # ====================================================

        return Response(
            {
                "success": True,
                "message": (
                    "Member unassigned successfully."
                    if trainer_user is None
                    else "Trainer assigned successfully."
                ),
                "member": MemberSerializer(
                    member,
                    context={
                        "request": request,
                    },
                ).data,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# OWNER - ADD TRAINER
# ============================================================

class TrainerCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        profile = get_or_create_profile(
            request.user
        )

        if not profile.is_owner:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only workspace owners "
                        "can add trainers."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        workspace = get_user_workspace(
            request.user
        )

        if not workspace:
            return Response(
                {
                    "success": False,
                    "message": (
                        "No active workspace "
                        "found for this account."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        name = str(
            request.data.get(
                "name",
                ""
            )
        ).strip()

        username = str(
            request.data.get(
                "username",
                ""
            )
        ).strip()

        email = str(
            request.data.get(
                "email",
                ""
            )
        ).strip()

        password = request.data.get(
            "password",
            ""
        )

        if not name:
            return Response(
                {
                    "success": False,
                    "message": "Trainer name is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not username:
            return Response(
                {
                    "success": False,
                    "message": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not email:
            return Response(
                {
                    "success": False,
                    "message": "Email is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not password:
            return Response(
                {
                    "success": False,
                    "message": "Password is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(password) < 6:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Password must be at least "
                        "6 characters."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(
            username__iexact=username
        ).exists():
            return Response(
                {
                    "success": False,
                    "message": "Username already exists."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(
            email__iexact=email
        ).exists():
            return Response(
                {
                    "success": False,
                    "message": "Email already exists."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        name_parts = name.split()

        first_name = name_parts[0]

        last_name = " ".join(
            name_parts[1:]
        )

        try:

            with transaction.atomic():

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password
                )

                user.first_name = first_name
                user.last_name = last_name
                user.is_staff = False
                user.is_active = True

                user.save()

                UserProfile.objects.create(
                    user=user,
                    is_owner=False,
                    is_trainer=True
                )

                trainer_profile = (
                    TrainerProfile.objects.create(
                        user=user,
                        workspace=workspace,
                        is_active=True
                    )
                )

            serializer = TrainerSerializer(
                trainer_profile,
                context={
                    "request": request
                }
            )

            return Response(
                {
                    "success": True,
                    "message": (
                        "Trainer created "
                        "successfully."
                    ),
                    "trainer": serializer.data
                },
                status=status.HTTP_201_CREATED
            )

        except Exception as e:

            print(
                "Trainer creation error:",
                str(e)
            )

            return Response(
                {
                    "success": False,
                    "message": (
                        "Unable to create trainer."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================
# MEMBER PROFILE PICTURE
# ============================================================

class MemberProfilePictureView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        member = get_authenticated_member(request)
        if member is None:
            return Response(
                {"success": False, "message": "Invalid or expired member session."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {
                "success": True,
                "member_id": member.id,
                "profile_picture": (
                    request.build_absolute_uri(member.profile_picture.url)
                    if member.profile_picture
                    else None
                ),
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        member = get_authenticated_member(request)
        if member is None:
            return Response(
                {"success": False, "message": "Invalid or expired member session."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        image = request.FILES.get("profile_picture")
        if not image:
            return Response(
                {"success": False, "message": "Profile picture is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if image.content_type not in allowed_types:
            return Response(
                {
                    "success": False,
                    "message": "Only JPG, PNG, and WebP images are allowed.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image.size > 5 * 1024 * 1024:
            return Response(
                {
                    "success": False,
                    "message": "Profile picture must be 5 MB or smaller.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if member.profile_picture:
            member.profile_picture.delete(save=False)

        member.profile_picture = image
        member.save(update_fields=["profile_picture", "updated_at"])

        return Response(
            {
                "success": True,
                "message": "Profile picture updated successfully.",
                "member_id": member.id,
                "profile_picture": request.build_absolute_uri(
                    member.profile_picture.url
                ),
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        member = get_authenticated_member(request)
        if member is None:
            return Response(
                {"success": False, "message": "Invalid or expired member session."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if member.profile_picture:
            member.profile_picture.delete(save=False)
            member.profile_picture = None
            member.save(update_fields=["profile_picture", "updated_at"])

        return Response(
            {
                "success": True,
                "message": "Profile picture removed successfully.",
                "member_id": member.id,
                "profile_picture": None,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# MEMBER REGISTRATION
# ============================================================

class MemberRegisterView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        # ====================================================
        # GET DATA
        # ====================================================

        qr_token = str(
            request.data.get(
                "qr_token",
                ""
            )
        ).strip()

        name = str(
            request.data.get(
                "name",
                ""
            )
        ).strip()

        email = str(
            request.data.get(
                "email",
                ""
            )
        ).strip()

        phone = str(
            request.data.get(
                "phone",
                ""
            )
        ).strip()

        username = str(
            request.data.get(
                "username",
                ""
            )
        ).strip()

        password = request.data.get(
            "password",
            ""
        )

        confirm_password = request.data.get(
            "confirm_password",
            ""
        )

        # ====================================================
        # REQUIRED FIELDS
        # ====================================================

        if not qr_token:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Registration QR code "
                        "is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not name:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Full name is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not email:

            return Response(
                {
                    "success": False,
                    "message": "Email is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not phone:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Phone number is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not username:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Username is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not password:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Password is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not confirm_password:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Confirm password "
                        "is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # QR VALIDATION
        # ====================================================

        qr = (
            RegistrationQR.objects
            .filter(
                token=qr_token,
                registration_type="MEMBER",
                is_active=True
            )
            .select_related(
                "admin",
                "workspace"
            )
            .first()
        )

        if not qr:

            return Response(
                {
                    "success": False,
                    "message": (
                        "This registration QR code "
                        "is invalid or inactive."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # GET WORKSPACE
        # ====================================================

        workspace = qr.workspace

        # ----------------------------------------------------
        # Backward compatibility
        # ----------------------------------------------------

        if not workspace:

            workspace = Workspace.objects.filter(
                owner=qr.admin,
                is_active=True
            ).first()

            if workspace:

                qr.workspace = workspace

                qr.save(
                    update_fields=[
                        "workspace"
                    ]
                )

        if not workspace:

            return Response(
                {
                    "success": False,
                    "message": (
                        "This QR code is not "
                        "connected to a workspace."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # ADMIN VALIDATION
        # ====================================================

        admin = qr.admin

        if not admin.is_active:

            return Response(
                {
                    "success": False,
                    "message": (
                        "The gym administrator "
                        "account is currently inactive."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # PASSWORD VALIDATION
        # ====================================================

        if password != confirm_password:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Passwords do not match."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(password) < 6:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Password must contain at least "
                        "6 characters."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # USERNAME VALIDATION
        # ====================================================

        if User.objects.filter(
            username__iexact=username
        ).exists():

            return Response(
                {
                    "success": False,
                    "message": (
                        "This username is already taken."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if Member.objects.filter(
            username__iexact=username,
            is_deleted=False
        ).exists():

            return Response(
                {
                    "success": False,
                    "message": (
                        "This username is already "
                        "registered."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # EMAIL VALIDATION
        # ====================================================

        if User.objects.filter(
            email__iexact=email
        ).exists():

            return Response(
                {
                    "success": False,
                    "message": (
                        "This email is already "
                        "registered."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # PHONE VALIDATION
        # ====================================================

        if len(phone) < 10:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Please enter a valid "
                        "phone number."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if Member.objects.filter(
            phone=phone,
            is_deleted=False
        ).exists():

            return Response(
                {
                    "success": False,
                    "message": (
                        "This phone number is already "
                        "registered."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # CREATE MEMBER
        # ====================================================

        try:

            member = Member.objects.create(
                admin=admin,

                workspace=workspace,

                # ------------------------------------------------
                # No trainer assigned during workspace QR
                # registration.
                # ------------------------------------------------

                trainer=None,

                name=name,

                phone=phone,

                email=email,

                username=username,

                password=make_password(
                    password
                ),

                membership_start=None,

                membership_end=None,

                status="PENDING",

                id_verified=False,

                is_deleted=False,
            )

        except Exception as e:

            print(
                "Member registration error:",
                str(e)
            )

            return Response(
                {
                    "success": False,
                    "message": (
                        "Unable to create "
                        "member account."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # ====================================================
        # SUCCESS
        # ====================================================

        return Response(
            {
                "success": True,

                "message": (
                    "Member account created "
                    "successfully."
                ),

                "member_id": member.id,

                "username": member.username,

                "admin_id": admin.id,

                "admin_username": (
                    admin.username
                ),

                "workspace_id": workspace.id,

                "workspace_name": (
                    workspace.name
                ),

                "trainer_id": None,

                "status": "PENDING",

                "role": "MEMBER",
            },
            status=status.HTTP_201_CREATED
        )

# ============================================================
# TRAINER - OWN PROFILE
# ============================================================

class TrainerProfileView(APIView):
    """
    Return and manage the authenticated trainer's own profile.
    """

    permission_classes = [IsAuthenticated]

    def _get_trainer_profile(self, request):
        profile = get_or_create_profile(request.user)

        if not profile.is_trainer:
            return None

        return (
            TrainerProfile.objects
            .select_related("user", "workspace")
            .filter(
                user=request.user,
                is_active=True,
                workspace__is_active=True,
            )
            .first()
        )

    def get(self, request):
        trainer_profile = self._get_trainer_profile(request)

        if not trainer_profile:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Trainer profile not found or inactive."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                "success": True,
                "trainer": TrainerSerializer(
                    trainer_profile,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        trainer_profile = self._get_trainer_profile(request)

        if not trainer_profile:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Trainer profile not found or inactive."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        image = request.FILES.get("profile_picture")

        if not image:
            return Response(
                {
                    "success": False,
                    "message": (
                        "A profile picture is required."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_types = {
            "image/jpeg",
            "image/png",
            "image/webp",
        }

        if image.content_type not in allowed_types:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only JPG, JPEG, PNG and WEBP "
                        "images are allowed."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image.size > 5 * 1024 * 1024:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Profile picture must be "
                        "smaller than 5 MB."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if trainer_profile.profile_picture:
                trainer_profile.profile_picture.delete(
                    save=False
                )

            trainer_profile.profile_picture = image

            trainer_profile.save(
                update_fields=[
                    "profile_picture",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "success": True,
                    "message": (
                        "Profile picture updated "
                        "successfully."
                    ),
                    "trainer": TrainerSerializer(
                        trainer_profile,
                        context={"request": request},
                    ).data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Failed to upload "
                        "profile picture."
                    ),
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def delete(self, request):
        trainer_profile = self._get_trainer_profile(request)

        if not trainer_profile:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Trainer profile not found or inactive."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            if trainer_profile.profile_picture:
                trainer_profile.profile_picture.delete(
                    save=False
                )

                trainer_profile.profile_picture = None

                trainer_profile.save(
                    update_fields=[
                        "profile_picture",
                        "updated_at",
                    ]
                )

            return Response(
                {
                    "success": True,
                    "message": (
                        "Profile picture removed "
                        "successfully."
                    ),
                    "profile_picture": None,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Failed to remove "
                        "profile picture."
                    ),
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ============================================================
# TRAINER - WORKOUT PLANS
# ============================================================

class WorkoutPlanListCreateView(APIView):
    """
    Trainer can view/create workout plans only for members
    assigned to that trainer.
    """

    permission_classes = [IsAuthenticated]

    def _get_trainer_profile(self, request):
        profile = get_or_create_profile(request.user)

        if not profile.is_trainer:
            return None

        return (
            TrainerProfile.objects
            .select_related("workspace")
            .filter(
                user=request.user,
                is_active=True,
                workspace__is_active=True,
            )
            .first()
        )

    def get(self, request):
        trainer_profile = self._get_trainer_profile(request)

        if not trainer_profile:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only active trainers can "
                        "access workout plans."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        plans = (
            WorkoutPlan.objects
            .filter(
                trainer=request.user,
                workspace=trainer_profile.workspace,
                is_active=True,
                member__trainer=request.user,
                member__is_deleted=False,
            )
            .select_related(
                "trainer",
                "member",
                "workspace",
            )
            .order_by("-created_at")
        )

        serializer = WorkoutPlanSerializer(
            plans,
            many=True,
            context={"request": request},
        )

        return Response(
            {
                "success": True,
                "count": plans.count(),
                "workouts": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        trainer_profile = self._get_trainer_profile(request)

        if not trainer_profile:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only active trainers can "
                        "create workout plans."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        member_id = request.data.get("member")

        if not member_id:
            return Response(
                {
                    "success": False,
                    "message": "Member is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            member = (
                Member.objects
                .select_related("workspace")
                .get(
                    pk=member_id,
                    workspace=trainer_profile.workspace,
                    trainer=request.user,
                    is_deleted=False,
                )
            )
        except (Member.DoesNotExist, ValueError, TypeError):
            return Response(
                {
                    "success": False,
                    "message": (
                        "You can only create a workout "
                        "for a member assigned to you."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        payload = request.data.copy()

        # Accept both "member" and "member_id".
        payload["member"] = member.id

        serializer = WorkoutPlanSerializer(
            data=payload,
            context={"request": request},
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        workout = serializer.save(
            trainer=request.user,
            workspace=trainer_profile.workspace,
            member=member,
        )

        Notification.objects.create(
            recipient_member=member,
            workspace=trainer_profile.workspace,
            notification_type="WORKOUT_UPLOADED",
            title="New Workout Plan",
            message=(
                f"{request.user.get_full_name() or request.user.username} uploaded a new workout plan: {workout.title}."
            ),
            related_id=workout.id,
            related_type="workout",
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Workout plan created "
                    "and assigned successfully."
                ),
                "workout": WorkoutPlanSerializer(
                    workout,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class WorkoutPlanDetailView(APIView):
    """
    Edit/deactivate a trainer's own workout plan.
    """

    permission_classes = [IsAuthenticated]

    def _get_plan(self, request, pk):
        trainer_profile = (
            TrainerProfile.objects
            .filter(
                user=request.user,
                is_active=True,
                workspace__is_active=True,
            )
            .first()
        )

        if not trainer_profile:
            return None, None

        plan = (
            WorkoutPlan.objects
            .select_related(
                "trainer",
                "member",
                "workspace",
            )
            .filter(
                pk=pk,
                trainer=request.user,
                workspace=trainer_profile.workspace,
                is_active=True,
                member__trainer=request.user,
                member__is_deleted=False,
            )
            .first()
        )

        return trainer_profile, plan

    def get(self, request, pk):
        trainer_profile, plan = self._get_plan(
            request,
            pk,
        )

        if not trainer_profile:
            return Response(
                {
                    "success": False,
                    "message": "Trainer profile not found.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not plan:
            return Response(
                {
                    "success": False,
                    "message": "Workout plan not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "workout": WorkoutPlanSerializer(
                    plan,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk):
        trainer_profile, plan = self._get_plan(
            request,
            pk,
        )

        if not trainer_profile:
            return Response(
                {
                    "success": False,
                    "message": "Trainer profile not found.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not plan:
            return Response(
                {
                    "success": False,
                    "message": "Workout plan not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        payload = request.data.copy()

        # Do not allow changing ownership from the app.
        payload.pop("trainer", None)
        payload.pop("workspace", None)

        if "member" in payload:
            try:
                new_member = Member.objects.get(
                    pk=payload["member"],
                    workspace=trainer_profile.workspace,
                    trainer=request.user,
                    is_deleted=False,
                )
            except (Member.DoesNotExist, ValueError, TypeError):
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Invalid member. "
                            "The member must be assigned to you."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            new_member = plan.member

        serializer = WorkoutPlanSerializer(
            plan,
            data=payload,
            partial=True,
            context={"request": request},
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_member = plan.member

        workout = serializer.save(
            trainer=request.user,
            workspace=trainer_profile.workspace,
            member=new_member,
        )

        Notification.objects.create(
            recipient_member=new_member,
            workspace=trainer_profile.workspace,
            notification_type="WORKOUT_UPLOADED",
            title="Workout Plan Updated",
            message=(
                f"{request.user.get_full_name() or request.user.username} updated your workout plan: {workout.title}."
            ),
            related_id=workout.id,
            related_type="workout",
        )

        if old_member.id != new_member.id:
            Notification.objects.create(
                recipient_member=old_member,
                workspace=trainer_profile.workspace,
                notification_type="WORKOUT_UPLOADED",
                title="Workout Plan Updated",
                message=(
                    f"Your workout plan '{workout.title}' is no longer assigned to you."
                ),
                related_id=workout.id,
                related_type="workout",
            )

        return Response(
            {
                "success": True,
                "message": "Workout plan updated successfully.",
                "workout": WorkoutPlanSerializer(
                    workout,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        trainer_profile, plan = self._get_plan(
            request,
            pk,
        )

        if not trainer_profile:
            return Response(
                {
                    "success": False,
                    "message": "Trainer profile not found.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not plan:
            return Response(
                {
                    "success": False,
                    "message": "Workout plan not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        plan.is_active = False
        plan.save(update_fields=["is_active", "updated_at"])

        return Response(
            {
                "success": True,
                "message": "Workout plan removed successfully.",
            },
            status=status.HTTP_200_OK,
        )

# ============================================================
# EXERCISE LIBRARY
# ============================================================


class ExerciseListView(APIView):
    """
    Returns the GymRyt exercise library.

    Trainers can:
    - View all active exercises
    - Search exercises by name
    - Filter by primary muscle
    - Filter by equipment
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        profile = get_or_create_profile(
            request.user
        )

        if not profile.is_trainer:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only active trainers can "
                        "access the exercise library."
                    ),
                    "exercises": [],
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        exercises = Exercise.objects.filter(
            is_active=True
        )

        # ----------------------------------------------------
        # SEARCH
        # ----------------------------------------------------

        search = str(
            request.query_params.get(
                "search",
                ""
            )
        ).strip()

        if search:

            exercises = exercises.filter(
                name__icontains=search
            )

        # ----------------------------------------------------
        # MUSCLE FILTER
        # ----------------------------------------------------

        muscle = str(
            request.query_params.get(
                "muscle",
                ""
            )
        ).strip()

        if muscle:

            exercises = exercises.filter(
                primary_muscle__iexact=muscle
            )

        # ----------------------------------------------------
        # EQUIPMENT FILTER
        # ----------------------------------------------------

        equipment = str(
            request.query_params.get(
                "equipment",
                ""
            )
        ).strip()

        if equipment:

            exercises = exercises.filter(
                equipment__iexact=equipment
            )

        exercises = exercises.order_by(
            "name"
        )

        serializer = ExerciseSerializer(
            exercises,
            many=True,
            context={
                "request": request
            },
        )

        return Response(
            {
                "success": True,
                "count": exercises.count(),
                "exercises": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class ExerciseDetailView(APIView):
    """
    Returns details for one exercise.

    Used by the Trainer Exercise Details screen.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):

        profile = get_or_create_profile(
            request.user
        )

        if not profile.is_trainer:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only active trainers can "
                        "access exercise details."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        exercise = (
            Exercise.objects
            .filter(
                pk=pk,
                is_active=True,
            )
            .first()
        )

        if not exercise:
            return Response(
                {
                    "success": False,
                    "message": "Exercise not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ExerciseSerializer(
            exercise,
            context={
                "request": request
            },
        )

        return Response(
            {
                "success": True,
                "exercise": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

