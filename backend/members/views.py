import secrets
from datetime import date

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password
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
from rest_framework.parsers import MultiPartParser, FormParser

from .models import (
    Member,
    Payment,
    RegistrationQR,
    UserProfile,
    Workspace,
    TrainerProfile,
)

from .serializers import (
    MemberSerializer,
    PaymentSerializer,
    WorkspaceSerializer,
    TrainerSerializer,
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
    Get the UserProfile for a user.

    If the profile doesn't exist, create it.
    """

    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "role": "OWNER" if user.is_staff else "MEMBER",
            "is_owner": user.is_staff,
            "is_trainer": False,
        }
    )

    return profile


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
# MEMBER AUTHENTICATION HELPERS
# ============================================================

MEMBER_TOKEN_SALT = "gymryt-member-auth"
MEMBER_TOKEN_MAX_AGE = 60 * 60 * 24 * 30


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
# TRAINER REGISTRATION QR
# ============================================================

class TrainerRegistrationQRView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        # ----------------------------------------------------
        # ONLY OWNER / OWNER + TRAINER CAN GENERATE
        # ----------------------------------------------------

        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "User profile not found."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not profile.is_owner:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only gym owners can generate "
                        "a trainer registration QR."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # ----------------------------------------------------
        # FIND OWNER'S WORKSPACE
        # ----------------------------------------------------

        workspace = (
            Workspace.objects
            .filter(
                owner=request.user,
                is_active=True
            )
            .first()
        )

        if not workspace:
            return Response(
                {
                    "success": False,
                    "message": "Active gym workspace not found."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # CREATE SIGNED TRAINER QR TOKEN
        # ----------------------------------------------------

        token = signing.dumps(
            {
                "type": "TRAINER",
                "admin_id": request.user.id,
                "workspace_id": workspace.id,
            }
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return Response(
            {
                "success": True,
                "token": token,
                "qr_type": "TRAINER",
                "admin_id": request.user.id,
                "admin_username": request.user.username,
                "workspace_id": workspace.id,
                "workspace_name": workspace.name,
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

        # ====================================================
        # ADMIN / TRAINER LOGIN
        # ====================================================

        user = authenticate(
            username=username,
            password=password
        )

        if user is not None:

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

            # ------------------------------------------------
            # Get/create profile
            # ------------------------------------------------

            profile = get_or_create_profile(
                user
            )

            # ------------------------------------------------
            # Determine capabilities
            # ------------------------------------------------

            is_owner = profile.is_owner
            is_trainer = profile.is_trainer

            # Existing staff accounts are owners by default.
            if user.is_staff and not is_owner:

                profile.is_owner = True
                profile.save(
                    update_fields=[
                        "is_owner",
                        "updated_at"
                    ]
                )

                is_owner = True

            # ------------------------------------------------
            # Determine role response
            # ------------------------------------------------

            if hasattr(user, "role") and user.role:
                role = user.role
            elif hasattr(profile, "role") and profile.role:
                role = profile.role
            elif is_owner and is_trainer:
                role = "OWNER_TRAINER"
            elif is_owner:
                role = "OWNER"
            elif is_trainer:
                role = "TRAINER"
            else:
                role = "MEMBER"

            # ------------------------------------------------
            # Token
            # ------------------------------------------------

            token, created = Token.objects.get_or_create(
                user=user
            )

            # ------------------------------------------------
            # Workspace
            # ------------------------------------------------

            workspace = get_user_workspace(
                user
            )

            return Response(
                {
                    "success": True,
                    "message": "Login successful.",

                    "role": role,

                    "token": token.key,

                    "id": user.id,

                    "username": user.username,

                    "email": user.email,

                    "first_name": user.first_name,

                    "last_name": user.last_name,

                    "is_owner": is_owner,

                    "is_trainer": is_trainer,

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

        # ====================================================
        # MEMBER LOGIN
        # ====================================================

        try:

            member = Member.objects.select_related(
                "workspace",
                "trainer"
            ).get(
                username=username,
                is_deleted=False
            )

        except Member.DoesNotExist:

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
        # Password
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

        return Response(
            {
                "success": True,

                "message": (
                    "Member login successful."
                ),

                "role": "MEMBER",

                "member_token": create_member_token(member),

                "id": member.id,

                "username": member.username,

                "name": member.name,

                "phone": member.phone,

                "email": member.email,

                "profile_picture": (
                    request.build_absolute_uri(member.profile_picture.url)
                    if member.profile_picture
                    else None
                ),

                "membership_start": (
                    member.membership_start
                ),

                "membership_end": (
                    member.membership_end
                ),

                "status": (
                    member.calculate_status()
                ),

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

                "trainer_username": trainer_username,

                "trainer_name": trainer_name,
            },
            status=status.HTTP_200_OK
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

        serializer = MemberSerializer(
            members,
            many=True
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
            member
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

        serializer = MemberSerializer(
            member,
            data=data
        )

        if serializer.is_valid():

            serializer.save()

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

        serializer = MemberSerializer(
            member,
            data=data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

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
        for member in members.only(
            "id",
            "status",
            "membership_start",
            "membership_end",
        ):
            calculated_status = member.calculate_status()

            if member.status != calculated_status:
                Member.objects.filter(pk=member.pk).update(
                    status=calculated_status
                )
                member.status = calculated_status

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
        # Extend membership
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # Membership start
        # ----------------------------------------------------

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

        profile = get_or_create_profile(
            request.user
        )

        # ----------------------------------------------------
        # Revenue is OWNER-ONLY
        # ----------------------------------------------------

        if not profile.is_owner:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Only workspace owners "
                        "can view revenue."
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
                    "total_revenue": 0,
                    "total_payments": 0,
                },
                status=status.HTTP_200_OK
            )

        paid_payments = Payment.objects.filter(
            workspace=workspace,
            status="PAID"
        )

        total_revenue = (
            paid_payments.aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )

        total_payments = (
            paid_payments.count()
        )

        return Response(
            {
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
                is_active=True
            ).first()

            # ------------------------------------------------
            # Backward compatibility
            # ------------------------------------------------

            if not qr:

                qr = RegistrationQR.objects.filter(
                    admin=admin,
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
                    )
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