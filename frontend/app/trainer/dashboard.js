// ============================================================
// GYMRyt — TRAINER DASHBOARD
// ============================================================

import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Platform,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import AsyncStorage from
  "@react-native-async-storage/async-storage";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useTheme,
} from "../../context/ThemeContext";


// ============================================================
// API CONFIGURATION
// ============================================================

const BASE_URL =
  "http://192.168.1.52:8000/api/members";

const DASHBOARD_API =
  `${BASE_URL}/dashboard-stats/`;

const MEMBERS_API =
  `${BASE_URL}/`;

const PROFILE_API =
  `${BASE_URL}/trainer/profile/`;

const NOTIFICATIONS_COUNT_API =
  `${BASE_URL}/notifications/unread-count/`;


// ============================================================
// HELPER — INITIALS
// ============================================================

const getInitials = (name) => {
  if (!name) {
    return "T";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};


// ============================================================
// HELPER — DAYS REMAINING
// ============================================================

const getDaysRemaining = (date) => {
  if (!date) {
    return 0;
  }

  const today = new Date();
  const endDate = new Date(date);

  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const difference =
    endDate.getTime() -
    today.getTime();

  return Math.max(
    Math.ceil(
      difference / 86400000
    ),
    0
  );
};


// ============================================================
// HELPER — MEMBER STATUS
// ============================================================

const getStatus = (member) => {
  if (member?.status) {
    return String(
      member.status
    ).toUpperCase();
  }

  const days =
    getDaysRemaining(
      member?.membership_end
    );

  if (days <= 0) {
    return "EXPIRED";
  }

  if (days <= 7) {
    return "EXPIRING";
  }

  return "ACTIVE";
};


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TrainerDashboard() {

  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();


  // ==========================================================
  // DASHBOARD STATE
  // ==========================================================

  const [stats, setStats] = useState({
    total_members: 0,
    active_members: 0,
    expiring_members: 0,
    expired_members: 0,
  });

  const [members, setMembers] =
    useState([]);

  const [trainer, setTrainer] =
    useState(null);

  const [
    unreadNotificationCount,
    setUnreadNotificationCount,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);


  // ==========================================================
  // SESSION EXPIRATION
  // ==========================================================

  const expireSession =
    async () => {

      try {

        await AsyncStorage.multiRemove([
          "adminToken",
          "adminUsername",
          "adminId",
          "userRole",
          "workspaceId",
          "workspaceName",
        ]);

      } catch (error) {

        console.log(
          "SESSION CLEAR ERROR:",
          error
        );
      }

      Alert.alert(
        "Session Expired",
        "Please login again.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace("/"),
          },
        ]
      );
    };


  // ==========================================================
  // LOAD NOTIFICATION COUNT
  // ==========================================================

  const loadNotificationCount =
    async () => {

      try {

        const token =
          await AsyncStorage.getItem(
            "adminToken"
          );

        if (!token) {
          return;
        }

        const response =
          await fetch(
            NOTIFICATIONS_COUNT_API,
            {
              headers: {
                Accept:
                  "application/json",
                Authorization:
                  `Token ${token}`,
              },
            }
          );

        if (response.status === 401) {
          return;
        }

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        const count =
          Number(
            data.unread_count ??
            data.count ??
            0
          );

        setUnreadNotificationCount(
          Math.max(count, 0)
        );

      } catch (error) {

        console.log(
          "NOTIFICATION COUNT ERROR:",
          error
        );
      }
    };


  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard =
    async (
      initialLoad = true
    ) => {

      try {

        if (initialLoad) {
          setLoading(true);
        }

        const token =
          await AsyncStorage.getItem(
            "adminToken"
          );

        if (!token) {
          return expireSession();
        }

        const headers = {
          Accept:
            "application/json",
          Authorization:
            `Token ${token}`,
        };


        // ----------------------------------------------------
        // LOAD EVERYTHING TOGETHER
        // ----------------------------------------------------

        const [
          statsResponse,
          membersResponse,
          profileResponse,
        ] =
          await Promise.all([
            fetch(
              DASHBOARD_API,
              {
                headers,
              }
            ),

            fetch(
              MEMBERS_API,
              {
                headers,
              }
            ),

            fetch(
              PROFILE_API,
              {
                headers,
              }
            ),
          ]);


        // ----------------------------------------------------
        // AUTHORIZATION CHECK
        // ----------------------------------------------------

        if (
          statsResponse.status ===
            401 ||
          membersResponse.status ===
            401 ||
          profileResponse.status ===
            401
        ) {

          return expireSession();
        }


        // ----------------------------------------------------
        // DASHBOARD STATS
        // ----------------------------------------------------

        if (!statsResponse.ok) {

          throw new Error(
            "Unable to load dashboard statistics."
          );
        }

        const statsData =
          await statsResponse.json();

        setStats({
          total_members:
            Number(
              statsData.total_members ||
              0
            ),

          active_members:
            Number(
              statsData.active_members ||
              0
            ),

          expiring_members:
            Number(
              statsData.expiring_members ||
              0
            ),

          expired_members:
            Number(
              statsData.expired_members ||
              0
            ),
        });


        // ----------------------------------------------------
        // MEMBERS
        // ----------------------------------------------------

        if (!membersResponse.ok) {

          throw new Error(
            "Unable to load assigned members."
          );
        }

        const memberData =
          await membersResponse.json();

        let memberList = [];

        if (
          Array.isArray(memberData)
        ) {

          memberList =
            memberData;

        } else if (
          Array.isArray(
            memberData.results
          )
        ) {

          memberList =
            memberData.results;

        } else if (
          Array.isArray(
            memberData.members
          )
        ) {

          memberList =
            memberData.members;
        }

        setMembers(memberList);


        // ----------------------------------------------------
        // TRAINER PROFILE
        // ----------------------------------------------------

        if (profileResponse.ok) {

          const profileData =
            await profileResponse.json();

          const trainerData =
            profileData.trainer ||
            profileData.profile ||
            profileData;

          setTrainer(
            trainerData
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


  // ==========================================================
  // SCREEN FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {

      loadDashboard(true);
      loadNotificationCount();

    }, [])
  );


  // ==========================================================
  // PULL TO REFRESH
  // ==========================================================

  const onRefresh =
    async () => {

      setRefreshing(true);

      await Promise.all([
        loadDashboard(false),
        loadNotificationCount(),
      ]);
    };


  // ==========================================================
  // OPEN MEMBER
  // ==========================================================

  const openMember =
    (member) => {

      router.push({
        pathname:
          "/admin/memberdetails",

        params: {
          id: String(
            member.id || ""
          ),

          name:
            member.name || "",

          phone:
            member.phone || "",

          email:
            member.email || "",

          username:
            member.username || "",

          membership_start:
            member.membership_start ||
            "",

          membership_end:
            member.membership_end ||
            "",

          status:
            member.status || "",

          id_verified:
            member.id_verified
              ? "true"
              : "false",

          trainer_name:
            member.trainer_name ||
            "",
        },
      });
    };


  // ==========================================================
  // TRAINER INFORMATION
  // ==========================================================

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


  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

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
          color={
            colors.primary
          }
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                colors.mutedText ||
                colors.secondaryText,
            },
          ]}
        >
          Loading trainer dashboard...
        </Text>

      </View>
    );
  }


  // ==========================================================
  // MAIN UI
  // ==========================================================

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
        showsVerticalScrollIndicator={
          false
        }

        contentContainerStyle={
          styles.content
        }

        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }

            onRefresh={
              onRefresh
            }

            tintColor={
              colors.primary
            }

            colors={[
              colors.primary,
            ]}
          />
        }
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={
            styles.header
          }
        >

          <View
            style={
              styles.headerLeft
            }
          >

            <Text
              style={[
                styles.eyebrow,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              WELCOME BACK
            </Text>


            <View
              style={
                styles.profileRow
              }
            >

              <Pressable
                style={[
                  styles.profileAvatar,
                  {
                    backgroundColor:
                      colors.iconBackground,
                    borderColor:
                      colors.border,
                  },
                ]}

                onPress={() =>
                  router.push(
                    "/trainer/profile"
                  )
                }
              >

                {profilePicture ? (

                  <Image
                    source={{
                      uri:
                        profilePicture,
                    }}

                    style={
                      styles.profileImage
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

              </Pressable>


              <View
                style={
                  styles.headerText
                }
              >

                <Text
                  style={[
                    styles.trainerName,
                    {
                      color:
                        colors.text,
                    },
                  ]}

                  numberOfLines={1}
                >
                  {trainerName}
                </Text>

                <Text
                  style={[
                    styles.trainerRole,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}

                  numberOfLines={1}
                >
                  {specialization}
                </Text>

              </View>

            </View>

          </View>


          {/* ==================================================
              HEADER ACTIONS
          ================================================== */}

          <View
            style={
              styles.headerActions
            }
          >

            {/* THEME */}

            <Pressable
              style={[
                styles.headerButton,
                {
                  backgroundColor:
                    colors.card,
                  borderColor:
                    colors.border,
                },
              ]}

              onPress={
                toggleTheme
              }
            >

              <Ionicons
                name={
                  isDark
                    ? "sunny-outline"
                    : "moon-outline"
                }

                size={21}

                color={
                  colors.text
                }
              />

            </Pressable>


            {/* NOTIFICATIONS */}

            <Pressable
              style={[
                styles.headerButton,
                {
                  backgroundColor:
                    colors.card,
                  borderColor:
                    colors.border,
                },
              ]}

              onPress={() =>
                router.push(
                  "/admin/notifications"
                )
              }
            >

              <Ionicons
                name="notifications-outline"
                size={21}
                color={
                  colors.text
                }
              />

              {unreadNotificationCount >
                0 && (

                <View
                  style={[
                    styles.notificationBadge,
                    {
                      backgroundColor:
                        colors.primaryLight,
                    },
                  ]}
                >

                  <Text
                    style={
                      styles.notificationBadgeText
                    }
                  >
                    {unreadNotificationCount >
                    99
                      ? "99+"
                      : unreadNotificationCount}
                  </Text>

                </View>
              )}

            </Pressable>

          </View>

        </View>


        {/* ==================================================
            TRAINER OVERVIEW
        ================================================== */}

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
              styles.sectionHeader
            }
          >

            <View>

              <Text
                style={[
                  styles.sectionEyebrow,
                  {
                    color:
                      colors.primaryLight,
                  },
                ]}
              >
                YOUR WORKSPACE
              </Text>

              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Trainer Overview
              </Text>

            </View>


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


          {/* ==================================================
              STAT GRID
          ================================================== */}

          <View
            style={
              styles.statsGrid
            }
          >

            <OverviewStat
              value={
                stats.total_members
              }

              label="TOTAL MEMBERS"

              icon="people-outline"

              iconColor="#36B7FF"

              colors={
                colors
              }
            />


            <OverviewStat
              value={
                stats.active_members
              }

              label="ACTIVE MEMBERS"

              icon="checkmark-circle-outline"

              iconColor="#45E0A5"

              colors={
                colors
              }
            />


            <OverviewStat
              value={
                stats.expiring_members
              }

              label="EXPIRING SOON"

              icon="time-outline"

              iconColor="#FFB21C"

              colors={
                colors
              }
            />


            <OverviewStat
              value={
                stats.expired_members
              }

              label="EXPIRED MEMBERS"

              icon="close-circle-outline"

              iconColor="#FF5870"

              colors={
                colors
              }
            />

          </View>

        </View>


        {/* ==================================================
            QUICK ACTIONS
        ================================================== */}

        <View
          style={
            styles.sectionHeaderSimple
          }
        >

          <Text
            style={[
              styles.sectionHeading,
              {
                color:
                  colors.text,
              },
            ]}
          >
            QUICK ACTIONS
          </Text>

        </View>


        <View
          style={
            styles.quickGrid
          }
        >

          {/* ATTENDANCE */}

          <QuickAction
            icon="checkmark-circle-outline"
            title="Attendance"
            subtitle="Manage member attendance"
            colors={colors}
            onPress={() =>
              router.push(
                "/trainer/attendance"
              )
            }
          />


          {/* WORKOUTS */}

          <QuickAction
            icon="barbell-outline"
            title="Workouts"
            subtitle="Create workout plans"
            colors={colors}
            onPress={() =>
              router.push(
                "/trainer/workout"
              )
            }
          />


          {/* MEMBERS */}

          <QuickAction
            icon="people-outline"
            title="Members"
            subtitle="View assigned members"
            colors={colors}
            onPress={() =>
              router.push(
                "/trainer/members"
              )
            }
          />


          {/* PROFILE */}

          <QuickAction
            icon="person-outline"
            title="My Profile"
            subtitle="View trainer profile"
            colors={colors}
            onPress={() =>
              router.push(
                "/trainer/profile"
              )
            }
          />

        </View>


        {/* ==================================================
            MY MEMBERS
        ================================================== */}

        <View
          style={
            styles.sectionHeaderSimple
          }
        >

          <Text
            style={[
              styles.sectionHeading,
              {
                color:
                  colors.text,
              },
            ]}
          >
            MY MEMBERS
          </Text>


          <Pressable
            style={
              styles.seeAllButton
            }

            onPress={() =>
              router.push(
                "/trainer/members"
              )
            }
          >

            <Text
              style={[
                styles.seeAllText,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              View All
            </Text>

            <Ionicons
              name="chevron-forward"
              size={15}
              color={
                colors.primaryLight
              }
            />

          </Pressable>

        </View>


        {/* ==================================================
            MEMBER LIST
        ================================================== */}

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
                styles.emptyIcon,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >

              <Ionicons
                name="people-outline"
                size={28}
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
                styles.emptySubtitle,
                {
                  color:
                    colors.mutedText ||
                    colors.secondaryText,
                },
              ]}
            >
              Members assigned to you
              will appear here.
            </Text>

          </View>

        ) : (

          members
            .slice(0, 5)
            .map((member) => (

              <MemberCard
                key={
                  member.id
                }

                member={
                  member
                }

                colors={
                  colors
                }

                onPress={() =>
                  openMember(
                    member
                  )
                }
              />

            ))
        )}


        {/* ==================================================
            WORKSPACE INFO
        ================================================== */}

        <View
          style={[
            styles.workspaceCard,
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
              styles.workspaceIcon,
              {
                backgroundColor:
                  colors.iconBackground,
              },
            ]}
          >

            <Ionicons
              name="location-outline"
              size={23}
              color={
                colors.primaryLight
              }
            />

          </View>


          <View
            style={
              styles.workspaceInfo
            }
          >

            <Text
              style={[
                styles.workspaceLabel,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              YOUR WORKSPACE
            </Text>

            <Text
              style={[
                styles.workspaceName,
                {
                  color:
                    colors.text,
                },
              ]}
              numberOfLines={1}
            >
              {workspaceName}
            </Text>

          </View>

        </View>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <View
          style={
            styles.footer
          }
        >

          <View
            style={[
              styles.footerIcon,
              {
                backgroundColor:
                  colors.iconBackground,
              },
            ]}
          >

            <Ionicons
              name="fitness-outline"
              size={15}
              color={
                colors.primaryLight
              }
            />

          </View>

          <Text
            style={[
              styles.footerText,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            GYMRyt • TRAINER
          </Text>

        </View>

      </ScrollView>


      {/* ==================================================
          BOTTOM NAVIGATION
      ================================================== */}

      <TrainerBottomNavigation
        colors={
          colors
        }

        active="home"
      />

    </View>
  );
}


// ============================================================
// OVERVIEW STAT
// ============================================================

function OverviewStat({
  value,
  label,
  icon,
  iconColor,
  colors,
}) {

  return (

    <View
      style={[
        styles.statCard,
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
          styles.statIcon,
          {
            backgroundColor:
              `${iconColor}18`,
          },
        ]}
      >

        <Ionicons
          name={
            icon
          }

          size={24}

          color={
            iconColor
          }
        />

      </View>


      <View
        style={
          styles.statContent
        }
      >

        <Text
          style={[
            styles.statValue,
            {
              color:
                colors.text,
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


// ============================================================
// QUICK ACTION
// ============================================================

function QuickAction({
  icon,
  title,
  subtitle,
  colors,
  onPress,
}) {

  return (

    <Pressable
      style={[
        styles.quickCard,
        {
          backgroundColor:
            colors.card,
          borderColor:
            colors.border,
        },
      ]}

      onPress={
        onPress
      }

      android_ripple={{
        color:
          colors.iconBackground,
      }}
    >

      <View
        style={[
          styles.quickIcon,
          {
            backgroundColor:
              colors.iconBackground,
          },
        ]}
      >

        <Ionicons
          name={
            icon
          }

          size={25}

          color={
            colors.primaryLight
          }
        />

      </View>


      <Text
        style={[
          styles.quickTitle,
          {
            color:
              colors.text,
          },
        ]}
      >
        {title}
      </Text>


      <Text
        style={[
          styles.quickSubtitle,
          {
            color:
              colors.secondaryText,
          },
        ]}

        numberOfLines={2}
      >
        {subtitle}
      </Text>

    </Pressable>
  );
}


// ============================================================
// MEMBER CARD
// ============================================================

function MemberCard({
  member,
  colors,
  onPress,
}) {

  const status =
    getStatus(member);

  const days =
    getDaysRemaining(
      member?.membership_end
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
    member?.name ||
    member?.username ||
    "Unknown Member";


  const profilePicture =
    member?.profile_picture ||
    member?.profile_image ||
    null;


  return (

    <Pressable
      style={[
        styles.memberCard,
        {
          backgroundColor:
            colors.card,
          borderColor:
            colors.border,
        },
      ]}

      onPress={
        onPress
      }

      android_ripple={{
        color:
          colors.iconBackground,
      }}
    >

      {/* AVATAR */}

      <View
        style={[
          styles.memberAvatar,
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
              uri:
                profilePicture,
            }}

            style={
              styles.memberImage
            }
          />

        ) : (

          <Text
            style={[
              styles.memberInitials,
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


      {/* MEMBER INFO */}

      <View
        style={
          styles.memberInfo
        }
      >

        <Text
          style={[
            styles.memberName,
            {
              color:
                colors.text,
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
              color:
                isExpired
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


      <Ionicons
        name="chevron-forward"
        size={20}
        color={
          colors.secondaryText
        }

        style={
          styles.memberArrow
        }
      />

    </Pressable>
  );
}


// ============================================================
// TRAINER BOTTOM NAVIGATION
// ============================================================

function TrainerBottomNavigation({
  colors,
  active,
}) {

  const goTo =
    (screen) => {

      if (
        screen === "home"
      ) {

        router.replace(
          "/trainer/dashboard"
        );

        return;
      }


      if (
        screen === "members"
      ) {

        router.push(
          "/trainer/members"
        );

        return;
      }


      if (
        screen === "workouts"
      ) {

        router.push(
          "/trainer/workouts"
        );

        return;
      }


      if (
        screen === "attendance"
      ) {

        router.push(
          "/trainer/attendance"
        );

        return;
      }


      if (
        screen === "profile"
      ) {

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
        colors={
          colors
        }
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
        colors={
          colors
        }
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
        colors={
          colors
        }
        onPress={() =>
          goTo("trainer/workout")
        }
      />


      <BottomNavItem
        icon="checkmark-circle-outline"
        label="Attendance"
        active={
          active === "attendance"
        }
        colors={
          colors
        }
        onPress={() =>
          goTo("attendance")
        }
      />


      <BottomNavItem
        icon="person-outline"
        label="Profile"
        active={
          active === "profile"
        }
        colors={
          colors
        }
        onPress={() =>
          goTo("profile")
        }
      />

    </View>
  );
}


// ============================================================
// BOTTOM NAV ITEM
// ============================================================

function BottomNavItem({
  icon,
  label,
  active,
  colors,
  onPress,
}) {

  return (

    <Pressable
      onPress={
        onPress
      }

      style={
        styles.bottomNavItem
      }

      android_ripple={{
        color:
          colors.iconBackground,
      }}
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
          name={
            icon
          }

          size={21}

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
            color:
              active
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

    </Pressable>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    // ========================================================
    // CONTAINER
    // ========================================================

    container: {
      flex: 1,
    },


    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: "700",
    },


    // ========================================================
    // CONTENT
    // ========================================================

    content: {
      paddingHorizontal: 18,

      paddingTop:
        Platform.OS === "ios"
          ? 54
          : 44,

      paddingBottom: 125,
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 22,
    },

    headerLeft: {
      flex: 1,
    },

    eyebrow: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.4,
      marginBottom: 7,
    },

    profileRow: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    profileAvatar: {
      width: 52,
      height: 52,
      borderRadius: 18,
      borderWidth: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      overflow:
        "hidden",
    },

    profileImage: {
      width: "100%",
      height: "100%",
    },

    profileInitials: {
      fontSize: 18,
      fontWeight: "900",
    },

    headerText: {
      flex: 1,
      marginLeft: 11,
      marginRight: 5,
    },

    trainerName: {
      fontSize: 18,
      fontWeight: "900",
    },

    trainerRole: {
      fontSize: 10,
      fontWeight: "600",
      marginTop: 3,
    },


    // ========================================================
    // HEADER ACTIONS
    // ========================================================

    headerActions: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,
    },

    headerButton: {
      width: 43,
      height: 43,
      borderRadius: 14,
      borderWidth: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      position:
        "relative",
    },

    notificationBadge: {
      position:
        "absolute",

      right: -3,
      top: -4,

      minWidth: 17,
      height: 17,

      paddingHorizontal: 4,

      borderRadius: 9,

      alignItems:
        "center",
      justifyContent:
        "center",

      borderWidth: 2,
      borderColor:
        "transparent",
    },

    notificationBadgeText: {
      color: "#FFFFFF",
      fontSize: 7,
      fontWeight: "900",
    },


    // ========================================================
    // OVERVIEW CARD
    // ========================================================

    overviewCard: {
      borderWidth: 1,
      borderRadius: 26,
      padding: 16,
      marginBottom: 21,
    },

    sectionHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 15,
    },

    sectionEyebrow: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.3,
      marginBottom: 3,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: "900",
    },

    todayBadge: {
      flexDirection:
        "row",

      alignItems:
        "center",

      borderWidth: 1,
      borderRadius: 14,

      paddingHorizontal: 9,
      paddingVertical: 6,
    },

    todayText: {
      fontSize: 8,
      fontWeight: "800",
      marginLeft: 4,
    },


    // ========================================================
    // STATS
    // ========================================================

    statsGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      justifyContent:
        "space-between",
    },

    statCard: {
      width: "48.2%",
      minHeight: 105,

      borderWidth: 1,
      borderRadius: 20,

      padding: 12,

      marginBottom: 9,

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    statIcon: {
      width: 43,
      height: 43,
      borderRadius: 15,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    statContent: {
      flex: 1,
      marginLeft: 9,
    },

    statValue: {
      fontSize: 25,
      fontWeight: "900",
    },

    statLabel: {
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.4,
      marginTop: 3,
      lineHeight: 10,
    },


    // ========================================================
    // SECTION HEADER
    // ========================================================

    sectionHeaderSimple: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 11,
      marginTop: 2,
    },

    sectionHeading: {
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    seeAllButton: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    seeAllText: {
      fontSize: 10,
      fontWeight: "800",
      marginRight: 2,
    },


    // ========================================================
    // QUICK ACTIONS
    // ========================================================

    quickGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      justifyContent:
        "space-between",

      marginBottom: 21,
    },

    quickCard: {
      width: "48.2%",
      minHeight: 116,

      borderWidth: 1,
      borderRadius: 20,

      padding: 13,

      marginBottom: 9,
    },

    quickIcon: {
      width: 43,
      height: 43,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 10,
    },

    quickTitle: {
      fontSize: 12,
      fontWeight: "900",
    },

    quickSubtitle: {
      fontSize: 8,
      fontWeight: "600",
      lineHeight: 11,
      marginTop: 4,
    },


    // ========================================================
    // EMPTY MEMBERS
    // ========================================================

    emptyCard: {
      borderWidth: 1,
      borderRadius: 21,

      paddingVertical: 28,
      paddingHorizontal: 18,

      alignItems:
        "center",

      marginBottom: 10,
    },

    emptyIcon: {
      width: 55,
      height: 55,

      borderRadius: 17,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emptyTitle: {
      fontSize: 14,
      fontWeight: "900",
      marginTop: 11,
    },

    emptySubtitle: {
      fontSize: 9,
      fontWeight: "600",
      marginTop: 4,
      textAlign:
        "center",
    },


    // ========================================================
    // MEMBER CARD
    // ========================================================

    memberCard: {
      minHeight: 78,

      borderWidth: 1,
      borderRadius: 20,

      paddingVertical: 9,
      paddingLeft: 9,
      paddingRight: 8,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 8,
    },

    memberAvatar: {
      width: 52,
      height: 52,

      borderRadius: 17,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      overflow:
        "hidden",
    },

    memberImage: {
      width: "100%",
      height: "100%",
    },

    memberInitials: {
      fontSize: 16,
      fontWeight: "900",
    },

    memberInfo: {
      flex: 1,
      marginLeft: 10,
      marginRight: 6,
    },

    memberName: {
      fontSize: 12,
      fontWeight: "900",
    },

    memberDays: {
      fontSize: 9,
      fontWeight: "600",
      marginTop: 4,
    },

    statusBadge: {
      borderWidth: 1,
      borderRadius: 13,

      paddingHorizontal: 7,
      paddingVertical: 5,
    },

    statusText: {
      fontSize: 6.5,
      fontWeight: "900",
      letterSpacing: 0.3,
    },

    memberArrow: {
      marginLeft: 5,
    },


    // ========================================================
    // WORKSPACE CARD
    // ========================================================

    workspaceCard: {
      minHeight: 76,

      borderWidth: 1,
      borderRadius: 21,

      paddingHorizontal: 13,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 7,
    },

    workspaceIcon: {
      width: 44,
      height: 44,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    workspaceInfo: {
      flex: 1,
      marginLeft: 11,
    },

    workspaceLabel: {
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 1,
    },

    workspaceName: {
      fontSize: 13,
      fontWeight: "900",
      marginTop: 3,
    },


    // ========================================================
    // FOOTER
    // ========================================================

    footer: {
      alignItems:
        "center",

      justifyContent:
        "center",

      paddingTop: 20,
      paddingBottom: 8,

      flexDirection:
        "row",
    },

    footerIcon: {
      width: 27,
      height: 27,

      borderRadius: 9,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 7,
    },

    footerText: {
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.7,
    },


    // ========================================================
    // BOTTOM NAVIGATION
    // ========================================================

    bottomNav: {
      position:
        "absolute",

      left: 0,
      right: 0,
      bottom: 0,

      height: 82,

      borderTopWidth: 1,

      borderTopLeftRadius: 27,
      borderTopRightRadius: 27,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      justifyContent:
        "space-around",

      paddingTop: 8,

      elevation: 20,

      shadowOffset: {
        width: 0,
        height: -4,
      },

      shadowOpacity: 0.12,
      shadowRadius: 12,
    },

    bottomNavItem: {
      flex: 1,

      height: 70,

      alignItems:
        "center",

      justifyContent:
        "flex-start",

      position:
        "relative",
    },

    bottomIconContainer: {
      width: 42,
      height: 35,

      borderRadius: 13,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    bottomLabel: {
      fontSize: 7.5,
      fontWeight: "800",
      marginTop: 2,
    },

    activeIndicator: {
      width: 25,
      height: 3,

      borderRadius: 3,

      marginTop: 4,
    },

  });