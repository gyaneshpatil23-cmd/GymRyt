from django.db import migrations


def fix_trainer_roles(apps, schema_editor):
    """
    Trainers created with "Add Trainer" were saved with the default
    role OWNER, which made them owners. Restore them to TRAINER.

    Matches only accounts that are not staff, have a trainer profile
    and do not own a gym, so real owners are never touched.
    """
    UserProfile = apps.get_model("members", "UserProfile")
    TrainerProfile = apps.get_model("members", "TrainerProfile")
    Workspace = apps.get_model("members", "Workspace")

    trainer_user_ids = TrainerProfile.objects.values_list(
        "user_id", flat=True
    )
    owner_user_ids = Workspace.objects.values_list(
        "owner_id", flat=True
    )

    UserProfile.objects.filter(
        role="OWNER",
        user__is_staff=False,
        user_id__in=trainer_user_ids,
    ).exclude(
        user_id__in=owner_user_ids,
    ).update(
        role="TRAINER",
        is_owner=False,
        is_trainer=True,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0023_attendance'),
    ]

    operations = [
        migrations.RunPython(
            fix_trainer_roles,
            migrations.RunPython.noop,
        ),
    ]
