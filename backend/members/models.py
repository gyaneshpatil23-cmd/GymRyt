from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ("OWNER", "Gym Owner"),
        ("OWNER_TRAINER", "Owner + Trainer"),
        ("TRAINER", "Trainer"),
        ("MEMBER", "Member"),
    ]

    id = models.BigAutoField(primary_key=True)

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="OWNER",
    )

    is_owner = models.BooleanField(default=False)

    is_trainer = models.BooleanField(default=False)

    profile_picture = models.ImageField(
        upload_to="admin_profiles/",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.role == "OWNER":
            self.is_owner = True
            self.is_trainer = False
        elif self.role == "OWNER_TRAINER":
            self.is_owner = True
            self.is_trainer = True
        elif self.role == "TRAINER":
            self.is_owner = False
            self.is_trainer = True
        elif self.role == "MEMBER":
            self.is_owner = False
            self.is_trainer = False
        else:
            if self.is_owner and self.is_trainer:
                self.role = "OWNER_TRAINER"
            elif self.is_owner:
                self.role = "OWNER"
            elif self.is_trainer:
                self.role = "TRAINER"
            else:
                self.role = "MEMBER"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


def get_user_role(user):
    try:
        profile = getattr(user, "profile", None)
        if profile and profile.role:
            return profile.role
        if profile and profile.is_owner and profile.is_trainer:
            return "OWNER_TRAINER"
        if profile and profile.is_owner:
            return "OWNER"
        if profile and profile.is_trainer:
            return "TRAINER"
    except Exception:
        pass
    if user.is_staff:
        return "OWNER"
    return "MEMBER"


User.add_to_class("role", property(get_user_role))


class Workspace(models.Model):
    id = models.BigAutoField(primary_key=True)

    name = models.CharField(max_length=150)

    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_workspaces",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class TrainerProfile(models.Model):
    id = models.BigAutoField(primary_key=True)

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="trainer_profiles",
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="trainers",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "workspace"],
                name="unique_trainer_workspace",
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.workspace.name}"


class Member(models.Model):
    id = models.BigAutoField(primary_key=True)

    admin = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="gym_members",
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="members",
    )

    trainer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_members",
    )

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("ACTIVE", "Active"),
        ("EXPIRING", "Expiring"),
        ("EXPIRED", "Expired"),
    ]

    name = models.CharField(max_length=100)

    phone = models.CharField(max_length=15)

    email = models.EmailField(
        blank=True,
        null=True,
    )

    username = models.CharField(
        max_length=50,
        unique=True,
    )

    password = models.CharField(
        max_length=255,
    )

    profile_picture = models.ImageField(
        upload_to="member_profiles/",
        blank=True,
        null=True,
    )

    membership_start = models.DateField(
        blank=True,
        null=True,
    )

    membership_end = models.DateField(
        blank=True,
        null=True,
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="PENDING",
    )

    id_verified = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    is_deleted = models.BooleanField(
        default=False,
    )

    def calculate_status(self):
        if not self.membership_start or not self.membership_end:
            return "PENDING"

        today = timezone.localdate()

        days_remaining = (
            self.membership_end - today
        ).days

        if days_remaining <= 0:
            return "EXPIRED"

        elif days_remaining <= 7:
            return "EXPIRING"

        else:
            return "ACTIVE"

    def save(self, *args, **kwargs):
        self.status = self.calculate_status()

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def role(self):
        return "MEMBER"


class Payment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ("PAID", "Paid"),
        ("PENDING", "Pending"),
        ("FAILED", "Failed"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("CASH", "Cash"),
        ("UPI", "UPI"),
        ("CARD", "Card"),
        ("BANK", "Bank Transfer"),
    ]

    id = models.BigAutoField(primary_key=True)

    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="payments",
    )

    admin = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="gym_payments",
        null=True,
        blank=True,
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="payments",
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    plan = models.CharField(
        max_length=100,
    )

    method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
    )

    date = models.DateTimeField(
        default=timezone.now,
    )

    remark = models.TextField(
        blank=True,
        null=True,
    )

    status = models.CharField(
        max_length=10,
        choices=PAYMENT_STATUS_CHOICES,
        default="PAID",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    def save(self, *args, **kwargs):
        if self.admin_id is None and self.member_id:
            self.admin = self.member.admin

        if self.workspace_id is None and self.member_id:
            self.workspace = self.member.workspace

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.member.name} - ₹{self.amount}"


class RegistrationQR(models.Model):

    REGISTRATION_TYPE_CHOICES = [
        ("MEMBER", "Member"),
        ("TRAINER", "Trainer"),
    ]

    id = models.BigAutoField(primary_key=True)

    admin = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="registration_qrs",
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="registration_qrs",
    )

    token = models.CharField(
        max_length=255,
        unique=True,
    )

    registration_type = models.CharField(
        max_length=10,
        choices=REGISTRATION_TYPE_CHOICES,
        default="MEMBER",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "admin",
                    "workspace",
                    "registration_type",
                ],
                name="unique_registration_qr_per_type",
            )
        ]

    def __str__(self):
        qr_type = self.get_registration_type_display()

        if self.workspace:
            return (
                f"{self.workspace.name} - "
                f"{qr_type} Registration QR"
            )

        return (
            f"{self.admin.username} - "
            f"{qr_type} Registration QR"
        )