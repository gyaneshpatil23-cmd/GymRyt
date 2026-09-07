from django.contrib import admin
from .models import Member


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "phone",
        "email",
        "status",
        "membership_start",
        "membership_end",
        "id_verified",
    )

    search_fields = (
        "name",
        "phone",
        "email",
        "username",
    )

    list_filter = (
        "status",
        "id_verified",
    )