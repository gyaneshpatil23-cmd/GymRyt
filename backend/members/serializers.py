from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User

from rest_framework import serializers

from .models import (
    Member,
    Payment,
    Workspace,
    TrainerProfile,
    TrainerApplication,
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

    phone = serializers.CharField(read_only=True, allow_null=True)

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

        full_name = (
            f"{obj.user.first_name} "
            f"{obj.user.last_name}"
        ).strip()

        return (
            full_name
            if full_name
            else obj.user.username
        )

    def get_profile_picture(self, obj):
        if not obj.profile_picture:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.profile_picture.url) if request else obj.profile_picture.url


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

    def get_trainer_name(self, obj):

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

    def get_profile_picture(self, obj):

        if not obj.profile_picture:
            return None

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(
                obj.profile_picture.url
            )

        return obj.profile_picture.url

    def create(self, validated_data):

        password = validated_data.get("password")

        if password:
            validated_data["password"] = make_password(
                password
            )

        return Member.objects.create(
            **validated_data
        )

    def update(self, instance, validated_data):

        if "password" in validated_data:

            password = validated_data.get("password")

            if password:

                validated_data["password"] = make_password(
                    password
                )

            else:

                validated_data.pop(
                    "password",
                    None
                )

        validated_data.pop(
            "status",
            None
        )

        validated_data.pop(
            "admin",
            None
        )

        validated_data.pop(
            "workspace",
            None
        )

        return super().update(
            instance,
            validated_data
        )

    def to_representation(self, instance):

        calculated_status = (
            instance.calculate_status()
        )

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

    def validate_amount(self, value):

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

    # Applications retain a hash only until approval. It is accepted on write
    # for compatibility with this serializer but must never be serialized.
    password = serializers.CharField(write_only=True)

    workspace_name = serializers.CharField(
        source="workspace.name",
        read_only=True,
    )

    class Meta:
        model = TrainerApplication

        fields = [
            "id",

            # Owner / workspace
            "workspace",
            "workspace_name",

            # Trainer information
            "name",
            "email",
            "phone",
            "username",
            "password",
            "specialization",
            "experience_years",

            # Application status
            "status",

            # Timestamps
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
    # VALIDATE USERNAME
    # --------------------------------------------------------

    def validate_username(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Username is required."
            )

        # Check Django User table.
        if User.objects.filter(
            username__iexact=value
        ).exists():

            raise serializers.ValidationError(
                "This username is already registered."
            )

        # Check pending/approved applications.
        existing_application = (
            TrainerApplication.objects.filter(
                username__iexact=value,
                status__in=[
                    "PENDING",
                    "APPROVED",
                ],
            ).exists()
        )

        if existing_application:

            raise serializers.ValidationError(
                "A trainer application already exists with this username."
            )

        return value

    # --------------------------------------------------------
    # VALIDATE PHONE
    # --------------------------------------------------------

    def validate_phone(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Phone number is required."
            )

        return value

    # --------------------------------------------------------
    # VALIDATE NAME
    # --------------------------------------------------------

    def validate_name(self, value):

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

        password = validated_data.get(
            "password"
        )

        if password:

            validated_data["password"] = (
                make_password(password)
            )

        # Every new application starts as PENDING.
        validated_data["status"] = "PENDING"

        return TrainerApplication.objects.create(
            **validated_data
        )

    # --------------------------------------------------------
    # UPDATE APPLICATION
    # --------------------------------------------------------

    def update(self, instance, validated_data):

        # Do not allow normal serializer updates to
        # modify owner-controlled fields.

        validated_data.pop(
            "status",
            None
        )

        validated_data.pop(
            "admin",
            None
        )

        validated_data.pop(
            "workspace",
            None
        )

        validated_data.pop(
            "approved_user",
            None
        )

        validated_data.pop(
            "reviewed_at",
            None
        )

        validated_data.pop(
            "rejection_reason",
            None
        )

        # Hash password if a password is supplied.

        if "password" in validated_data:

            password = validated_data.get(
                "password"
            )

            if password:

                validated_data["password"] = (
                    make_password(password)
                )

            else:

                validated_data.pop(
                    "password",
                    None
                )

        return super().update(
            instance,
            validated_data
        )

    # --------------------------------------------------------
    # REPRESENTATION
    # --------------------------------------------------------

    def to_representation(self, instance):

        data = super().to_representation(
            instance
        )

        return data
