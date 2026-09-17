import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

/* =========================================================
   API CONFIGURATION
========================================================= */

const BASE_URL =
  "http://192.168.1.52:8000/api/members";

const DASHBOARD_API =
  `${BASE_URL}/dashboard-stats/`;

const MEMBERS_API =
  `${BASE_URL}/`;

const PROFILE_API =
  `${BASE_URL}/trainer/profile/`;

const NOTIFICATION_UNREAD_API =
  `${BASE_URL}/notifications/unread-count/`;

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const getInitials = (name) => {
  if (!name) return "T";

  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const getDaysRemaining = (date) => {
  if (!date) return 0;

  const today = new Date();
  const endDate = new Date(date);

  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const difference = endDate - today;

  return Math.max(
    Math.ceil(difference / 86400000),
    0
  );
};

const getStatus = (member) => {
  if (member.status) {
    return member.status.toUpperCase();
  }

  const days = getDaysRemaining(
    member.membership_end
  );

  if (days <= 0) return "EXPIRED";
  if (days <= 7) return "EXPIRING";

  return "ACTIVE";
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function TrainerDashboard() {
  const { colors } = useTheme();

  const [stats, setStats] = useState({
    total_members: 0,
    active_members: 0,
    expiring_members: 0,
    expired_members: 0,
  });

  const [members, setMembers] = useState([]);
  const [trainer, setTrainer] = useState(null);

  const [unreadNotificationCount, setUnreadNotificationCount] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* =======================================================
     SESSION EXPIRATION
  ======================================================= */

  const expireSession = async () => {
    await AsyncStorage.multiRemove([
      "adminToken",
      "adminUsername",
      "adminId",
      "userRole",
      "workspaceId",
      "workspaceName",
    ]);

    Alert.alert(
      "Session Expired",
      "Please login again.",
      [
        {
          text: "OK",
          onPress: () => router.replace("/"),
        },
      ]
    );
  };

  /* =======================================================
     LOAD UNREAD NOTIFICATION COUNT
  ======================================================= */

  const loadUnreadNotificationCount = async () => {
    try {
      const token =
        await AsyncStorage.getItem("adminToken");

      if (!token) {
        return;
      }

      const response = await fetch(
        NOTIFICATION_UNREAD_API,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Token ${token}`,
          },
        }
      );

      console.log(
        "TRAINER NOTIFICATION COUNT STATUS:",
        response.status
      );

      if (response.status === 401) {
        return;
      }

      if (!response.ok) {
        console.log(
          "TRAINER NOTIFICATION COUNT FAILED:",
          response.status
        );
        return;
      }

      const data = await response.json();

      console.log(
        "TRAINER NOTIFICATION COUNT:",
        data
      );

      const unreadCount = Number(
        data.unread_count ??
        data.count ??
        data.unread ??
        0
      );

      setUnreadNotificationCount(
        Math.max(unreadCount, 0)
      );

    } catch (error) {
      console.log(
        "UNREAD NOTIFICATION COUNT ERROR:",
        error
      );
    }
  };

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  const loadDashboard = async (
    initialLoad = true
  ) => {
    try {
      if (initialLoad) {
        setLoading(true);
      }

      const token =
        await AsyncStorage.getItem("adminToken");

      if (!token) {
        return expireSession();
      }

      const headers = {
        Accept: "application/json",
        Authorization: `Token ${token}`,
      };

      const [
        statsResponse,
        membersResponse,
        profileResponse,
      ] = await Promise.all([
        fetch(DASHBOARD_API, {
          headers,
        }),

        fetch(MEMBERS_API, {
          headers,
        }),

        fetch(PROFILE_API, {
          headers,
        }),
      ]);

      /* ===================================================
         AUTHORIZATION CHECK
      =================================================== */

      if (
        statsResponse.status === 401 ||
        membersResponse.status === 401 ||
        profileResponse.status === 401
      ) {
        return expireSession();
      }

      /* ===================================================
         STATS
      =================================================== */

      if (!statsResponse.ok) {
        throw new Error(
          "Unable to load dashboard statistics."
        );
      }

      const statsData =
        await statsResponse.json();

      setStats({
        total_members: Number(
          statsData.total_members || 0
        ),

        active_members: Number(
          statsData.active_members || 0
        ),

        expiring_members: Number(
          statsData.expiring_members || 0
        ),

        expired_members: Number(
          statsData.expired_members || 0
        ),
      });

      /* ===================================================
         MEMBERS
      =================================================== */

      if (!membersResponse.ok) {
        throw new Error(
          "Unable to load assigned members."
        );
      }

      const memberData =
        await membersResponse.json();

      const memberList =
        Array.isArray(memberData)
          ? memberData
          : memberData.results ||
            memberData.members ||
            [];

      setMembers(memberList);

      /* ===================================================
         TRAINER PROFILE
      =================================================== */

      if (profileResponse.ok) {
        const profileData =
          await profileResponse.json();

        setTrainer(
          profileData.trainer ||
            profileData.profile ||
            null
        );
      }

    } catch (error) {
      console.log(
        "TRAINER DASHBOARD ERROR:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Could not load your trainer dashboard. Make sure Django is running."
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =======================================================
     REFRESH WHEN SCREEN OPENS
  ======================================================= */

  useFocusEffect(
    useCallback(() => {
      loadDashboard(true);
      loadUnreadNotificationCount();
    }, [])
  );

  /* =======================================================
     OPEN MEMBER DETAILS
  ======================================================= */

  const openMember = (member) => {
    router.push({
      pathname: "/admin/memberdetails",

      params: {
        id: String(member.id || ""),
        name: member.name || "",
        phone: member.phone || "",
        email: member.email || "",
        username: member.username || "",
        membership_start:
          member.membership_start || "",
        membership_end:
          member.membership_end || "",
        status: member.status || "",
        id_verified:
          member.id_verified
            ? "true"
            : "false",
        trainer_name:
          member.trainer_name || "",
      },
    });
  };

  /* =======================================================
     LOADING SCREEN
  ======================================================= */

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color: colors.mutedText,
            },
          ]}
        >
          Loading trainer dashboard...
        </Text>
      </View>
    );
  }

  /* =======================================================
     TRAINER DATA
  ======================================================= */

  const trainerName =
    trainer?.name ||
    trainer?.username ||
    "Trainer";

  const specialization =
    trainer?.specialization ||
    "Personal Training";

  const workspaceName =
    trainer?.workspace_name ||
    "GymRyt Workspace";

  const profilePicture =
    trainer?.profile_picture ||
    trainer?.profile_image ||
    null;

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);

              loadDashboard(false);
              loadUnreadNotificationCount();
            }}
            tintColor={colors.primary}
          />
        }
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>

          {/* PROFILE PHOTO */}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push(
                "/trainer/profile"
              )
            }
          >
            <View
              style={[
                styles.profilePhotoWrapper,
                {
                  borderColor:
                    colors.primary,

                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >
              {profilePicture ? (
                <Image
                  source={{
                    uri: profilePicture,
                  }}
                  style={
                    styles.profilePhoto
                  }
                />
              ) : (
                <Text
                  style={[
                    styles.profileInitials,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  {getInitials(
                    trainerName
                  )}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* TRAINER INFORMATION */}

          <View style={styles.headerInfo}>
            <Text
              style={[
                styles.eyebrow,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              GYMRYT • TRAINER
            </Text>

            <Text
              style={[
                styles.trainerName,
                {
                  color: colors.text,
                },
              ]}
              numberOfLines={1}
            >
              {trainerName} 👋
            </Text>

            <Text
              style={[
                styles.specialization,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
              numberOfLines={1}
            >
              {specialization}
            </Text>

            <View
              style={styles.locationRow}
            >
              <Ionicons
                name="location"
                size={15}
                color={
                  colors.secondaryText
                }
              />

              <Text
                style={[
                  styles.locationText,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
                numberOfLines={1}
              >
                {workspaceName}
              </Text>
            </View>
          </View>

          {/* =================================================
              NOTIFICATION BUTTON
          ================================================= */}

          <TouchableOpacity
            style={[
              styles.notificationButton,
              {
                backgroundColor:
                  colors.card,

                borderColor:
                  colors.border,
              },
            ]}
            activeOpacity={0.8}
            onPress={() =>
              router.push(
                "/admin/notifications"
              )
            }
          >
            <Ionicons
              name={
                unreadNotificationCount > 0
                  ? "notifications"
                  : "notifications-outline"
              }
              size={25}
              color={colors.text}
            />

            {/* UNREAD BADGE */}

            {unreadNotificationCount >
              0 && (
              <View
                style={[
                  styles.notificationBadge,
                  {
                    backgroundColor:
                      "#EF4444",
                  },
                ]}
              >
                <Text
                  style={
                    styles.notificationBadgeText
                  }
                >
                  {unreadNotificationCount >
                  9
                    ? "9+"
                    : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* =================================================
            TRAINER OVERVIEW
        ================================================= */}

        <View
          style={[
            styles.overviewCard,
            {
              backgroundColor:
                colors.card,

              borderColor:
                colors.border,
            },
          ]}
        >
          <View
            style={
              styles.overviewHeader
            }
          >
            <Text
              style={[
                styles.overviewTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              TRAINER OVERVIEW
            </Text>

            <View
              style={[
                styles.todayBadge,
                {
                  backgroundColor:
                    colors.iconBackground,

                  borderColor:
                    colors.border,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={
                  colors.secondaryText
                }
              />

              <Text
                style={[
                  styles.todayText,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                Today
              </Text>
            </View>
          </View>

          <View
            style={styles.statsGrid}
          >

            {/* TOTAL MEMBERS */}

            <OverviewStat
              value={
                stats.total_members
              }
              label="TOTAL MEMBERS"
              icon="people"
              colors={colors}
              iconColor="#36B7FF"
            />

            {/* ACTIVE MEMBERS */}

            <OverviewStat
              value={
                stats.active_members
              }
              label="ACTIVE MEMBERS"
              icon="person"
              colors={colors}
              iconColor="#45E0A5"
            />

            {/* EXPIRING */}

            <OverviewStat
              value={
                stats.expiring_members
              }
              label="EXPIRING SOON"
              icon="time"
              colors={colors}
              iconColor="#FFB21C"
            />

            {/* EXPIRED */}

            <OverviewStat
              value={
                stats.expired_members
              }
              label="EXPIRED MEMBERS"
              icon="person-remove"
              colors={colors}
              iconColor="#FF5870"
            />

          </View>
        </View>

        {/* =================================================
            MY MEMBERS HEADER
        ================================================= */}

        <View
          style={styles.membersHeader}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
              },
            ]}
          >
            MY MEMBERS
          </Text>

          <TouchableOpacity
            style={
              styles.membersCountContainer
            }
            onPress={() =>
              router.push(
                "/trainer/members"
              )
            }
          >
            <Text
              style={[
                styles.membersCount,
                {
                  color: colors.text,
                },
              ]}
            >
              {members.length}
            </Text>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={
                colors.secondaryText
              }
            />
          </TouchableOpacity>
        </View>

        {/* =================================================
            MEMBERS LIST
        ================================================= */}

        {members.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor:
                  colors.card,

                borderColor:
                  colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconContainer,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={30}
                color={
                  colors.primaryLight
                }
              />
            </View>

            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              No members assigned
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Members assigned to you
              will appear here.
            </Text>
          </View>
        ) : (
          members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              colors={colors}
              onPress={() =>
                openMember(member)
              }
            />
          ))
        )}

        {/* =================================================
            TRAINER PROFILE CARD
        ================================================= */}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push(
              "/trainer/profile"
            )
          }
          style={[
            styles.profileActionCard,
            {
              borderColor:
                colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.profileActionIcon,
              {
                backgroundColor:
                  colors.iconBackground,
              },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={30}
              color={
                colors.primaryLight
              }
            />
          </View>

          <View
            style={
              styles.profileActionInfo
            }
          >
            <Text
              style={[
                styles.profileActionTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              MY TRAINER PROFILE
            </Text>

            <Text
              style={[
                styles.profileActionSubtitle,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              View and manage your profile
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={27}
            color={colors.text}
          />
        </TouchableOpacity>

      </ScrollView>

      {/* ===================================================
          BOTTOM NAVIGATION
      =================================================== */}

      <TrainerBottomNav
        colors={colors}
        active="home"
      />
    </View>
  );
}

/* =========================================================
   OVERVIEW STAT COMPONENT
========================================================= */

function OverviewStat({
  value,
  label,
  icon,
  colors,
  iconColor,
}) {
  return (
    <View
      style={[
        styles.overviewStat,
        {
          backgroundColor:
            colors.background,

          borderColor:
            colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.statIconCircle,
          {
            backgroundColor:
              `${iconColor}18`,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={29}
          color={iconColor}
        />
      </View>

      <View
        style={styles.statContent}
      >
        <Text
          style={[
            styles.statValue,
            {
              color: colors.text,
            },
          ]}
        >
          {value}
        </Text>

        <Text
          style={[
            styles.statLabel,
            {
              color:
                colors.secondaryText,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   MEMBER CARD COMPONENT
========================================================= */

function MemberCard({
  member,
  colors,
  onPress,
}) {
  const status =
    getStatus(member);

  const days =
    getDaysRemaining(
      member.membership_end
    );

  const isExpired =
    status === "EXPIRED";

  const isExpiring =
    status === "EXPIRING";

  const statusColor =
    isExpired
      ? "#FF5870"
      : isExpiring
      ? "#FFB21C"
      : "#45E0A5";

  const memberName =
    member.name ||
    member.username ||
    "Unknown Member";

  const profilePicture =
    member.profile_picture ||
    member.profile_image ||
    null;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.memberCard,
        {
          backgroundColor:
            colors.card,

          borderColor:
            colors.border,
        },
      ]}
    >

      {/* MEMBER AVATAR */}

      <View
        style={[
          styles.memberAvatarContainer,
          {
            backgroundColor:
              colors.iconBackground,

            borderColor:
              `${statusColor}55`,
          },
        ]}
      >
        {profilePicture ? (
          <Image
            source={{
              uri: profilePicture,
            }}
            style={
              styles.memberAvatarImage
            }
          />
        ) : (
          <Text
            style={[
              styles.memberAvatarText,
              {
                color:
                  statusColor,
              },
            ]}
          >
            {getInitials(
              memberName
            )}
          </Text>
        )}
      </View>

      {/* MEMBER INFORMATION */}

      <View
        style={styles.memberInfo}
      >
        <Text
          style={[
            styles.memberName,
            {
              color: colors.text,
            },
          ]}
          numberOfLines={1}
        >
          {memberName}
        </Text>

        <Text
          style={[
            styles.memberDays,
            {
              color: isExpired
                ? "#FF5870"
                : isExpiring
                ? "#FFB21C"
                : colors.secondaryText,
            },
          ]}
        >
          {isExpired
            ? "Membership expired"
            : `${days} days remaining`}
        </Text>
      </View>

      {/* STATUS */}

      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor:
              `${statusColor}18`,

            borderColor:
              `${statusColor}55`,
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            {
              color:
                statusColor,
            },
          ]}
        >
          {status}
        </Text>
      </View>

      {/* ARROW */}

      <Ionicons
        name="chevron-forward"
        size={23}
        color={
          colors.secondaryText
        }
        style={
          styles.memberArrow
        }
      />
    </TouchableOpacity>
  );
}

/* =========================================================
   BOTTOM NAVIGATION
========================================================= */

function TrainerBottomNav({
  colors,
  active,
}) {
  const goTo = (screen) => {
    if (screen === "home") {
      router.replace(
        "/trainer/dashboard"
      );
      return;
    }

    if (screen === "members") {
      router.push(
        "/trainer/members"
      );
      return;
    }

    if (screen === "workouts") {
      router.push(
        "/trainer/workouts"
      );
      return;
    }

    if (screen === "profile") {
      router.push(
        "/trainer/profile"
      );
    }
  };

  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor:
            colors.card,

          borderColor:
            colors.border,
        },
      ]}
    >
      <BottomNavItem
        icon="home"
        label="Home"
        active={
          active === "home"
        }
        colors={colors}
        onPress={() =>
          goTo("home")
        }
      />

      <BottomNavItem
        icon="people-outline"
        label="Members"
        active={
          active === "members"
        }
        colors={colors}
        onPress={() =>
          goTo("members")
        }
      />

      <BottomNavItem
        icon="barbell-outline"
        label="Workouts"
        active={
          active === "workouts"
        }
        colors={colors}
        onPress={() =>
          goTo("workouts")
        }
      />

      <BottomNavItem
        icon="person-outline"
        label="Profile"
        active={
          active === "profile"
        }
        colors={colors}
        onPress={() =>
          goTo("profile")
        }
      />
    </View>
  );
}

/* =========================================================
   BOTTOM NAV ITEM
========================================================= */

function BottomNavItem({
  icon,
  label,
  active,
  colors,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={
        styles.bottomNavItem
      }
    >
      <View
        style={[
          styles.bottomIconContainer,
          active && {
            backgroundColor:
              colors.iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={27}
          color={
            active
              ? colors.primaryLight
              : colors.secondaryText
          }
        />
      </View>

      <Text
        style={[
          styles.bottomLabel,
          {
            color: active
              ? colors.primaryLight
              : colors.secondaryText,
          },
        ]}
      >
        {label}
      </Text>

      {active && (
        <View
          style={[
            styles.activeIndicator,
            {
              backgroundColor:
                colors.primaryLight,
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: "700",
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop:
        Platform.OS === "ios"
          ? 55
          : 45,
      paddingBottom: 145,
    },

    /* =======================================================
       HEADER
    ======================================================= */

    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 27,
    },

    profilePhotoWrapper: {
      width: 82,
      height: 82,
      borderRadius: 41,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },

    profilePhoto: {
      width: "100%",
      height: "100%",
    },

    profileInitials: {
      fontSize: 27,
      fontWeight: "900",
    },

    headerInfo: {
      flex: 1,
      marginLeft: 15,
      marginRight: 8,
    },

    eyebrow: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.4,
    },

    trainerName: {
      fontSize: 23,
      fontWeight: "900",
      marginTop: 4,
    },

    specialization: {
      fontSize: 13,
      fontWeight: "600",
      marginTop: 3,
    },

    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 6,
    },

    locationText: {
      fontSize: 10,
      marginLeft: 4,
      flex: 1,
    },

    notificationButton: {
      width: 43,
      height: 43,
      borderRadius: 15,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },

    /* =======================================================
       NOTIFICATION BADGE
    ======================================================= */

    notificationBadge: {
      position: "absolute",
      right: -4,
      top: -5,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#050816",
    },

    notificationBadgeText: {
      color: "#FFFFFF",
      fontSize: 8,
      fontWeight: "900",
    },

    /* =======================================================
       OVERVIEW
    ======================================================= */

    overviewCard: {
      borderWidth: 1,
      borderRadius: 21,
      padding: 16,
      marginBottom: 27,
    },

    overviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 17,
    },

    overviewTitle: {
      fontSize: 15,
      fontWeight: "900",
      letterSpacing: 1,
    },

    todayBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 15,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },

    todayText: {
      fontSize: 9,
      fontWeight: "700",
      marginLeft: 5,
    },

    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },

    overviewStat: {
      width: "48.4%",
      minHeight: 116,
      borderWidth: 1,
      borderRadius: 18,
      padding: 13,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
    },

    statIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },

    statContent: {
      flex: 1,
      marginLeft: 10,
    },

    statValue: {
      fontSize: 27,
      fontWeight: "900",
    },

    statLabel: {
      fontSize: 8,
      fontWeight: "900",
      marginTop: 4,
      lineHeight: 11,
    },

    /* =======================================================
       MEMBERS HEADER
    ======================================================= */

    membersHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 13,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: "900",
      letterSpacing: 1,
    },

    membersCountContainer: {
      flexDirection: "row",
      alignItems: "center",
    },

    membersCount: {
      fontSize: 18,
      fontWeight: "900",
      marginRight: 4,
    },

    /* =======================================================
       MEMBER CARD
    ======================================================= */

    memberCard: {
      minHeight: 88,
      borderWidth: 1,
      borderRadius: 18,
      paddingVertical: 11,
      paddingLeft: 11,
      paddingRight: 9,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },

    memberAvatarContainer: {
      width: 58,
      height: 58,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },

    memberAvatarImage: {
      width: "100%",
      height: "100%",
    },

    memberAvatarText: {
      fontSize: 18,
      fontWeight: "900",
    },

    memberInfo: {
      flex: 1,
      marginLeft: 12,
      marginRight: 7,
    },

    memberName: {
      fontSize: 13,
      fontWeight: "900",
    },

    memberDays: {
      fontSize: 10,
      fontWeight: "600",
      marginTop: 5,
    },

    statusBadge: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },

    statusText: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.4,
    },

    memberArrow: {
      marginLeft: 7,
    },

    /* =======================================================
       EMPTY MEMBERS
    ======================================================= */

    emptyCard: {
      borderWidth: 1,
      borderRadius: 19,
      paddingVertical: 30,
      paddingHorizontal: 20,
      alignItems: "center",
      marginBottom: 10,
    },

    emptyIconContainer: {
      width: 58,
      height: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyTitle: {
      fontSize: 15,
      fontWeight: "900",
      marginTop: 12,
    },

    emptyText: {
      fontSize: 10,
      marginTop: 5,
      textAlign: "center",
    },

    /* =======================================================
       PROFILE ACTION
    ======================================================= */

    profileActionCard: {
      minHeight: 110,
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 18,
      marginTop: 10,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "rgba(90, 65, 180, 0.22)",
    },

    profileActionIcon: {
      width: 61,
      height: 61,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },

    profileActionInfo: {
      flex: 1,
      marginLeft: 15,
    },

    profileActionTitle: {
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 0.7,
    },

    profileActionSubtitle: {
      fontSize: 10,
      marginTop: 5,
    },

    /* =======================================================
       BOTTOM NAVIGATION
    ======================================================= */

    bottomNav: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 91,
      borderTopWidth: 1,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-around",
      paddingTop: 10,

      shadowOffset: {
        width: 0,
        height: -4,
      },

      shadowOpacity: 0.15,
      shadowRadius: 15,

      elevation: 20,
    },

    bottomNavItem: {
      width: "25%",
      height: 76,
      alignItems: "center",
      justifyContent: "flex-start",
      position: "relative",
    },

    bottomIconContainer: {
      width: 48,
      height: 39,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    bottomLabel: {
      fontSize: 9,
      fontWeight: "800",
      marginTop: 2,
    },

    activeIndicator: {
      width: 32,
      height: 4,
      borderRadius: 4,
      marginTop: 6,
    },
  });