from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User


# ============================================================
# USER PROFILE
# ============================================================

class UserProfile(models.Model):

    ROLE_CHOICES = [
        ("OWNER", "Gym Owner"),
        ("OWNER_TRAINER", "Owner + Trainer"),
        ("TRAINER", "Trainer"),
        ("MEMBER", "Member"),
    ]

    id = models.BigAutoField(
        primary_key=True
    )

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

    is_owner = models.BooleanField(
        default=False
    )

    is_trainer = models.BooleanField(
        default=False
    )

    profile_picture = models.ImageField(
        upload_to="admin_profiles/",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

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
        return (
            f"{self.user.username} "
            f"({self.role})"
        )


# ============================================================
# GET USER ROLE
# ============================================================

def get_user_role(user):

    try:

        profile = getattr(
            user,
            "profile",
            None
        )

        if profile:

            if profile.role:
                return profile.role

            if (
                profile.is_owner
                and profile.is_trainer
            ):
                return "OWNER_TRAINER"

            if profile.is_owner:
                return "OWNER"

            if profile.is_trainer:
                return "TRAINER"

    except Exception:
        pass

    # Existing Django staff users are treated as owners.
    if user.is_staff:
        return "OWNER"

    return "MEMBER"


# ============================================================
# ADD ROLE PROPERTY TO DJANGO USER
# ============================================================

User.add_to_class(
    "role",
    property(get_user_role)
)


# ============================================================
# WORKSPACE / GYM
# ============================================================

class Workspace(models.Model):

    id = models.BigAutoField(
        primary_key=True
    )

    name = models.CharField(
        max_length=150
    )

    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_workspaces",
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    is_active = models.BooleanField(
        default=True
    )

    def __str__(self):
        return self.name


# ============================================================
# TRAINER PROFILE
# ============================================================

class TrainerProfile(models.Model):

    id = models.BigAutoField(
        primary_key=True
    )

    # One Django account = one trainer profile
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="trainer_profile",
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="trainers",
    )

    phone = models.CharField(
        max_length=15,
        blank=True,
        null=True,
    )

    specialization = models.CharField(
        max_length=150,
        blank=True,
        null=True,
    )

    experience_years = models.PositiveIntegerField(
        default=0
    )

    bio = models.TextField(
        blank=True,
        null=True,
    )

    profile_picture = models.ImageField(
        upload_to="trainer_profiles/",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    is_active = models.BooleanField(
        default=True
    )

    class Meta:

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "user",
                    "workspace",
                ],
                name="unique_trainer_workspace",
            )
        ]

        indexes = [
            models.Index(
                fields=[
                    "workspace",
                    "is_active",
                ]
            ),
        ]

    def __str__(self):

        return (
            f"{self.user.get_full_name() or self.user.username}"
            f" - {self.workspace.name}"
        )


# ============================================================
# MEMBER
# ============================================================

class Member(models.Model):

    id = models.BigAutoField(
        primary_key=True
    )

    # Owner who created/manages the member
    admin = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="gym_members",
    )

    # Gym / workspace
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="members",
    )

    # --------------------------------------------------------
    # TRAINER ASSIGNMENT
    # --------------------------------------------------------

    trainer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_members",
        limit_choices_to={
            "profile__is_trainer": True
        },
    )

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("ACTIVE", "Active"),
        ("EXPIRING", "Expiring"),
        ("EXPIRED", "Expired"),
    ]

    name = models.CharField(
        max_length=100
    )

    phone = models.CharField(
        max_length=15
    )

    email = models.EmailField(
        blank=True,
        null=True,
    )

    username = models.CharField(
        max_length=50,
        unique=True,
    )

    # --------------------------------------------------------
    # MEMBER LOGIN
    # --------------------------------------------------------
    #
    # Keeping this field because your existing application
    # already uses it.
    #
    # IMPORTANT:
    # Ideally this should eventually be migrated to Django's
    # User authentication system.
    # --------------------------------------------------------

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
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    is_deleted = models.BooleanField(
        default=False
    )

    class Meta:

        indexes = [
            models.Index(
                fields=[
                    "workspace",
                    "status",
                ]
            ),

            models.Index(
                fields=[
                    "trainer",
                    "status",
                ]
            ),

            models.Index(
                fields=[
                    "admin",
                    "status",
                ]
            ),
        ]

    # --------------------------------------------------------
    # MEMBERSHIP STATUS
    # --------------------------------------------------------

    def calculate_status(self):

        if (
            not self.membership_start
            or not self.membership_end
        ):
            return "PENDING"

        today = timezone.localdate()

        days_remaining = (
            self.membership_end - today
        ).days

        if days_remaining <= 0:
            return "EXPIRED"

        elif days_remaining <= 7:
            return "EXPIRING"

        return "ACTIVE"

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    def save(self, *args, **kwargs):

        self.status = self.calculate_status()

        super().save(
            *args,
            **kwargs
        )

    def __str__(self):

        return self.name

    @property
    def role(self):

        return "MEMBER"


# ============================================================
# PAYMENT
# ============================================================

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

    id = models.BigAutoField(
        primary_key=True
    )

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
        max_length=100
    )

    method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
    )

    date = models.DateTimeField(
        default=timezone.now
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
        auto_now_add=True
    )

    def save(self, *args, **kwargs):

        if (
            self.admin_id is None
            and self.member_id
        ):
            self.admin = self.member.admin

        if (
            self.workspace_id is None
            and self.member_id
        ):
            self.workspace = self.member.workspace

        super().save(
            *args,
            **kwargs
        )

    def __str__(self):

        return (
            f"{self.member.name} "
            f"- ₹{self.amount}"
        )


# ============================================================
# REGISTRATION QR
# ============================================================

class RegistrationQR(models.Model):

    REGISTRATION_TYPE_CHOICES = [
        ("MEMBER", "Member"),
        ("TRAINER", "Trainer"),
    ]

    id = models.BigAutoField(
        primary_key=True
    )

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
        auto_now_add=True
    )

    is_active = models.BooleanField(
        default=True
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

        indexes = [
            models.Index(
                fields=[
                    "workspace",
                    "registration_type",
                    "is_active",
                ]
            ),
        ]

    def __str__(self):

        qr_type = (
            self.get_registration_type_display()
        )

        if self.workspace:

            return (
                f"{self.workspace.name} - "
                f"{qr_type} Registration QR"
            )

        return (
            f"{self.admin.username} - "
            f"{qr_type} Registration QR"
        )


# ============================================================
# TRAINER APPLICATION
# ============================================================

class TrainerApplication(models.Model):

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    id = models.BigAutoField(
        primary_key=True
    )

    # --------------------------------------------------------
    # OWNER / GYM
    # --------------------------------------------------------

    admin = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="trainer_applications",
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="trainer_applications",
    )

    # --------------------------------------------------------
    # QR USED FOR REGISTRATION
    # --------------------------------------------------------

    registration_qr = models.ForeignKey(
        RegistrationQR,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trainer_applications",
    )

    # --------------------------------------------------------
    # TRAINER INFORMATION
    # --------------------------------------------------------

    name = models.CharField(
        max_length=100
    )

    email = models.EmailField(
        blank=True,
        null=True,
    )

    phone = models.CharField(
        max_length=15
    )

    username = models.CharField(
        max_length=50
    )

    password = models.CharField(
    max_length=255,
    )
    
    profile_picture = models.ImageField(
        upload_to="trainer_applications/",
        blank=True,
        null=True,
    )

    specialization = models.CharField(
        max_length=150,
        blank=True,
        null=True,
    )

    experience_years = models.PositiveIntegerField(
        default=0
    )

    bio = models.TextField(
        blank=True,
        null=True,
    )

    # --------------------------------------------------------
    # APPLICATION STATUS
    # --------------------------------------------------------

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="PENDING",
    )

    rejection_reason = models.TextField(
        blank=True,
        null=True,
    )

    # --------------------------------------------------------
    # RESULTING TRAINER USER
    # --------------------------------------------------------

    approved_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_trainer_applications",
    )

    # --------------------------------------------------------
    # TIMESTAMPS
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:

        ordering = [
            "-created_at"
        ]

        indexes = [
            models.Index(
                fields=[
                    "workspace",
                    "status",
                ]
            ),

            models.Index(
                fields=[
                    "admin",
                    "status",
                ]
            ),
        ]

    def __str__(self):

        return (
            f"{self.name} - "
            f"{self.workspace.name} - "
            f"{self.status}"
        )

# ============================================================
# WORKOUT PLAN
# ============================================================

class WorkoutPlan(models.Model):
    """
    A workout plan designed by a trainer and assigned to one member.
    Exercises are stored as structured JSON so the trainer can create
    flexible workout routines without requiring a separate exercise table.
    """

    id = models.BigAutoField(primary_key=True)

    trainer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_workout_plans",
    )

    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="workout_plans",
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="workout_plans",
    )

    title = models.CharField(
        max_length=150
    )

    description = models.TextField(
        blank=True,
        null=True,
    )

    days_per_week = models.PositiveIntegerField(
        default=3
    )

    schedule = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    exercises = models.JSONField(
        default=list,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
        null=True,
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["workspace", "is_active"]
            ),
            models.Index(
                fields=["trainer", "is_active"]
            ),
            models.Index(
                fields=["member", "is_active"]
            ),
        ]

    def __str__(self):
        return (
            f"{self.title} - "
            f"{self.member.name} - "
            f"{self.trainer.username}"
        )

# ============================================================
# NOTIFICATION
# ============================================================

class Notification(models.Model):
    """
    Stores notifications for owners, trainers and members.

    Examples:
    - New trainer application
    - New member joined
    - Trainer assigned
    - Workout uploaded
    - Membership expiring
    - Payment received
    """

    NOTIFICATION_TYPE_CHOICES = [
        (
            "TRAINER_APPLICATION",
            "Trainer Application",
        ),
        (
            "NEW_MEMBER",
            "New Member",
        ),
        (
            "TRAINER_ASSIGNED",
            "Trainer Assigned",
        ),
        (
            "WORKOUT_UPLOADED",
            "Workout Uploaded",
        ),
        (
            "MEMBERSHIP_EXPIRING",
            "Membership Expiring",
        ),
        (
            "MEMBERSHIP_EXPIRED",
            "Membership Expired",
        ),
        (
            "PAYMENT_RECEIVED",
            "Payment Received",
        ),
        (
            "PAYMENT_FAILED",
            "Payment Failed",
        ),
        (
            "MEMBER_REMOVED",
            "Member Removed",
        ),
        (
            "WELCOME",
            "Welcome",
        ),
    ]

    id = models.BigAutoField(
        primary_key=True
    )

    # --------------------------------------------------------
    # WHO RECEIVES THE NOTIFICATION
    # --------------------------------------------------------

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    # --------------------------------------------------------
    # GYM / WORKSPACE
    # --------------------------------------------------------

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    # --------------------------------------------------------
    # NOTIFICATION TYPE
    # --------------------------------------------------------

    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPE_CHOICES,
    )

    # --------------------------------------------------------
    # NOTIFICATION CONTENT
    # --------------------------------------------------------

    title = models.CharField(
        max_length=200
    )

    message = models.TextField()

    # --------------------------------------------------------
    # RELATED OBJECT
    # --------------------------------------------------------
    #
    # These two fields allow the notification to open the
    # correct screen when the user taps it.
    #
    # Example:
    #
    # Trainer Application #9
    #
    # related_type = "trainer_application"
    # related_id   = 9
    #
    # Later:
    #
    # Member #15
    #
    # related_type = "member"
    # related_id   = 15
    #
    # --------------------------------------------------------

    related_id = models.BigIntegerField(
        null=True,
        blank=True,
    )

    related_type = models.CharField(
        max_length=50,
        blank=True,
        null=True,
    )

    # --------------------------------------------------------
    # READ / UNREAD
    # --------------------------------------------------------

    is_read = models.BooleanField(
        default=False
    )

    # --------------------------------------------------------
    # TIMESTAMP
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:

        ordering = [
            "-created_at"
        ]

        indexes = [

            models.Index(
                fields=[
                    "recipient",
                    "is_read",
                    "created_at",
                ]
            ),

            models.Index(
                fields=[
                    "workspace",
                    "created_at",
                ]
            ),

            models.Index(
                fields=[
                    "notification_type",
                    "created_at",
                ]
            ),
        ]

    def __str__(self):

        return (
            f"{self.recipient.username} - "
            f"{self.title}"
        )
