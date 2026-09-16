# ============================================================
# IMPORTS
# ============================================================

from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User

from rest_framework import serializers

from .models import (
    Member,
    Payment,
    Workspace,
    TrainerProfile,
    TrainerApplication,
    WorkoutPlan,
)


# ============================================================
# WORKSPACE SERIALIZER
# ============================================================

class WorkspaceSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(
        source="owner.username",
        read_only=True,
    )

    class Meta:
        model = Workspace

        fields = [
            "id",
            "name",
            "owner",
            "owner_username",
            "created_at",
            "updated_at",
            "is_active",
        ]

        read_only_fields = [
            "id",
            "owner",
            "owner_username",
            "created_at",
            "updated_at",
        ]


# ============================================================
# TRAINER SERIALIZER
# ============================================================

class TrainerSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    name = serializers.SerializerMethodField()

    email = serializers.EmailField(
        source="user.email",
        read_only=True,
        allow_null=True,
    )

    phone = serializers.CharField(
        read_only=True,
        allow_null=True,
    )

    workspace_name = serializers.CharField(
        source="workspace.name",
        read_only=True,
    )

    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = TrainerProfile

        fields = [
            "id",
            "user",
            "username",
            "name",
            "email",
            "phone",
            "workspace",
            "workspace_name",
            "specialization",
            "experience_years",
            "bio",
            "profile_picture",
            "created_at",
            "is_active",
        ]

        read_only_fields = [
            "id",
            "user",
            "username",
            "name",
            "email",
            "phone",
            "workspace_name",
            "created_at",
        ]

    def get_name(self, obj):
        """
        Return trainer's full name.
        Falls back to username if first/last name are empty.
        """

        full_name = (
            f"{obj.user.first_name} {obj.user.last_name}"
        ).strip()

        return (
            full_name
            if full_name
            else obj.user.username
        )

    def get_profile_picture(self, obj):
        """
        Return an absolute URL for the trainer profile picture.
        """

        if not obj.profile_picture:
            return None

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(
                obj.profile_picture.url
            )

        return obj.profile_picture.url


# ============================================================
# MEMBER SERIALIZER
# ============================================================

class MemberSerializer(serializers.ModelSerializer):
    admin_username = serializers.CharField(
        source="admin.username",
        read_only=True,
    )

    workspace_name = serializers.CharField(
        source="workspace.name",
        read_only=True,
    )

    trainer_username = serializers.CharField(
        source="trainer.username",
        read_only=True,
        allow_null=True,
    )

    trainer_name = serializers.SerializerMethodField()

    trainer_profile_id = serializers.SerializerMethodField()

    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = Member

        fields = [
            "id",
            "admin",
            "admin_username",

            "workspace",
            "workspace_name",

            "trainer",
            "trainer_profile_id",
            "trainer_username",
            "trainer_name",

            "name",
            "phone",
            "email",
            "username",
            "password",
            "profile_picture",

            "membership_start",
            "membership_end",
            "status",
            "id_verified",

            "created_at",
            "updated_at",
        ]

        extra_kwargs = {
            "admin": {
                "read_only": True,
            },

            "workspace": {
                "read_only": True,
            },

            "trainer": {
                "required": False,
                "allow_null": True,
            },

            "password": {
                "write_only": True,
                "required": False,
            },

            "status": {
                "read_only": True,
            },

            "id_verified": {
                "required": False,
            },
        }

    # --------------------------------------------------------
    # TRAINER NAME
    # --------------------------------------------------------

    def get_trainer_name(self, obj):
        """
        Return assigned trainer's full name.
        """

        if not obj.trainer:
            return None

        full_name = (
            f"{obj.trainer.first_name} "
            f"{obj.trainer.last_name}"
        ).strip()

        return (
            full_name
            if full_name
            else obj.trainer.username
        )

    # --------------------------------------------------------
    # TRAINER PROFILE ID
    # --------------------------------------------------------

    def get_trainer_profile_id(self, obj):
        """
        Return TrainerProfile ID for the assigned trainer.
        """

        if not obj.trainer:
            return None

        profile = getattr(
            obj.trainer,
            "trainer_profile",
            None,
        )

        return profile.id if profile else None

    # --------------------------------------------------------
    # MEMBER PROFILE PICTURE
    # --------------------------------------------------------

    def get_profile_picture(self, obj):
        """
        Return an absolute URL for the member profile picture.
        """

        if not obj.profile_picture:
            return None

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(
                obj.profile_picture.url
            )

        return obj.profile_picture.url

    # --------------------------------------------------------
    # CREATE MEMBER
    # --------------------------------------------------------

    def create(self, validated_data):
        """
        Hash the password before creating a member.
        """

        password = validated_data.get("password")

        if password:
            validated_data["password"] = make_password(
                password
            )

        return Member.objects.create(
            **validated_data
        )

    # --------------------------------------------------------
    # UPDATE MEMBER
    # --------------------------------------------------------

    def update(self, instance, validated_data):
        """
        Handle password hashing and protect
        admin/workspace/status fields.
        """

        if "password" in validated_data:
            password = validated_data.get("password")

            if password:
                validated_data["password"] = make_password(
                    password
                )
            else:
                validated_data.pop(
                    "password",
                    None,
                )

        # These fields should not be manually changed here.
        validated_data.pop("status", None)
        validated_data.pop("admin", None)
        validated_data.pop("workspace", None)

        return super().update(
            instance,
            validated_data,
        )

    # --------------------------------------------------------
    # REPRESENTATION
    # --------------------------------------------------------

    def to_representation(self, instance):
        """
        Recalculate membership status whenever
        the member is returned through the API.
        """

        calculated_status = instance.calculate_status()

        if instance.status != calculated_status:
            Member.objects.filter(
                pk=instance.pk
            ).update(
                status=calculated_status
            )

            instance.status = calculated_status

        return super().to_representation(
            instance
        )


# ============================================================
# PAYMENT SERIALIZER
# ============================================================

class PaymentSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(
        source="member.name",
        read_only=True,
    )

    member_id = serializers.IntegerField(
        source="member.id",
        read_only=True,
    )

    workspace_name = serializers.CharField(
        source="workspace.name",
        read_only=True,
        allow_null=True,
    )

    admin_username = serializers.CharField(
        source="admin.username",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Payment

        fields = [
            "id",

            "member",
            "member_id",
            "member_name",

            "admin",
            "admin_username",

            "workspace",
            "workspace_name",

            "amount",
            "plan",
            "method",
            "date",
            "remark",
            "status",

            "created_at",
        ]

        read_only_fields = [
            "id",

            "member_id",
            "member_name",

            "admin",
            "admin_username",

            "workspace",
            "workspace_name",

            "created_at",
        ]

    # --------------------------------------------------------
    # PAYMENT AMOUNT VALIDATION
    # --------------------------------------------------------

    def validate_amount(self, value):
        """
        Payment amount must be greater than zero.
        """

        if value <= 0:
            raise serializers.ValidationError(
                "Payment amount must be greater than 0."
            )

        return value


# ============================================================
# TRAINER APPLICATION SERIALIZER
# ============================================================

class TrainerApplicationSerializer(
    serializers.ModelSerializer
):
    password = serializers.CharField(
        write_only=True
    )

    workspace_name = serializers.CharField(
        source="workspace.name",
        read_only=True,
    )

    class Meta:
        model = TrainerApplication

        fields = [
            "id",

            "workspace",
            "workspace_name",

            "name",
            "email",
            "phone",
            "username",
            "password",

            "specialization",
            "experience_years",

            "status",

            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "workspace",
            "workspace_name",
            "status",
            "created_at",
            "updated_at",
        ]

        extra_kwargs = {
            "password": {
                "write_only": True,
                "required": True,
            },

            "email": {
                "required": False,
                "allow_blank": True,
                "allow_null": True,
            },
        }

    # --------------------------------------------------------
    # USERNAME VALIDATION
    # --------------------------------------------------------

    def validate_username(self, value):
        """
        Ensure username is not already registered
        or already used by an active application.
        """

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Username is required."
            )

        if User.objects.filter(
            username__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "This username is already registered."
            )

        if TrainerApplication.objects.filter(
            username__iexact=value,
            status__in=[
                "PENDING",
                "APPROVED",
            ],
        ).exists():
            raise serializers.ValidationError(
                "A trainer application already exists "
                "with this username."
            )

        return value

    # --------------------------------------------------------
    # PHONE VALIDATION
    # --------------------------------------------------------

    def validate_phone(self, value):
        """
        Phone number is mandatory.
        """

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Phone number is required."
            )

        return value

    # --------------------------------------------------------
    # NAME VALIDATION
    # --------------------------------------------------------

    def validate_name(self, value):
        """
        Trainer name is mandatory.
        """

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Trainer name is required."
            )

        return value

    # --------------------------------------------------------
    # CREATE APPLICATION
    # --------------------------------------------------------

    def create(self, validated_data):
        """
        Hash password and create a pending
        trainer application.
        """

        password = validated_data.get("password")

        if password:
            validated_data["password"] = make_password(
                password
            )

        validated_data["status"] = "PENDING"

        return TrainerApplication.objects.create(
            **validated_data
        )

    # --------------------------------------------------------
    # UPDATE APPLICATION
    # --------------------------------------------------------

    def update(self, instance, validated_data):
        """
        Prevent users from modifying protected
        application fields.
        """

        protected_fields = [
            "status",
            "admin",
            "workspace",
            "approved_user",
            "reviewed_at",
            "rejection_reason",
        ]

        for field in protected_fields:
            validated_data.pop(
                field,
                None,
            )

        if "password" in validated_data:
            password = validated_data.get("password")

            if password:
                validated_data["password"] = make_password(
                    password
                )
            else:
                validated_data.pop(
                    "password",
                    None,
                )

        return super().update(
            instance,
            validated_data,
        )

# ============================================================
# WORKOUT PLAN SERIALIZER
# ============================================================

class WorkoutPlanSerializer(serializers.ModelSerializer):
    trainer_username = serializers.CharField(
        source="trainer.username",
        read_only=True,
    )

    trainer_name = serializers.SerializerMethodField()

    member_name = serializers.CharField(
        source="member.name",
        read_only=True,
    )

    workspace_name = serializers.CharField(
        source="workspace.name",
        read_only=True,
    )

    class Meta:
        model = WorkoutPlan

        fields = [
            "id",
            "trainer",
            "trainer_username",
            "trainer_name",

            "member",
            "member_name",

            "workspace",
            "workspace_name",

            "title",
            "description",
            "days_per_week",
            "schedule",
            "exercises",
            "notes",

            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "trainer",
            "trainer_username",
            "trainer_name",
            "member_name",
            "workspace",
            "workspace_name",
            "created_at",
            "updated_at",
        ]

    def get_trainer_name(self, obj):
        full_name = (
            f"{obj.trainer.first_name} "
            f"{obj.trainer.last_name}"
        ).strip()

        return (
            full_name
            if full_name
            else obj.trainer.username
        )

    def validate_title(self, value):
        value = str(value).strip()

        if not value:
            raise serializers.ValidationError(
                "Workout title is required."
            )

        return value

    def validate_days_per_week(self, value):
        if value < 1 or value > 7:
            raise serializers.ValidationError(
                "Days per week must be between 1 and 7."
            )

        return value

    def validate_exercises(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "Exercises must be a list."
            )

        for index, exercise in enumerate(value):
            if not isinstance(exercise, dict):
                raise serializers.ValidationError(
                    f"Exercise {index + 1} must be an object."
                )

            name = str(
                exercise.get("name", "")
            ).strip()

            if not name:
                raise serializers.ValidationError(
                    f"Exercise {index + 1} needs a name."
                )

            exercise["name"] = name

            exercise["sets"] = max(
                0,
                int(exercise.get("sets", 0) or 0)
            )

            exercise["reps"] = str(
                exercise.get("reps", "")
            ).strip()

            exercise["rest"] = str(
                exercise.get("rest", "")
            ).strip()

            exercise["day"] = str(
                exercise.get("day", "")
            ).strip()

        return value
