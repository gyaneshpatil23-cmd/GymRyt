import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  Image,
  Platform,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

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

const NOTIFICATIONS_COUNT_API =
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

  const difference =
    endDate - today;

  return Math.max(
    Math.ceil(
      difference / 86400000
    ),
    0
  );
};

const getStatus = (member) => {
  if (member.status) {
    return member.status.toUpperCase();
  }

  const days =
    getDaysRemaining(
      member.membership_end
    );

  if (days <= 0) {
    return "EXPIRED";
  }

  if (days <= 7) {
    return "EXPIRING";
  }

  return "ACTIVE";
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function TrainerDashboard() {

  /* =======================================================
     THEME
  ======================================================= */

  const {
    isDark,
    colors,
    toggleTheme,
  } = useTheme();

  /* =======================================================
     THEME ANIMATION
  ======================================================= */

  const themeAnimation = useRef(
    new Animated.Value(
      isDark ? 1 : 0
    )
  ).current;

  useEffect(() => {
    Animated.spring(
      themeAnimation,
      {
        toValue:
          isDark ? 1 : 0,

        useNativeDriver: true,

        friction: 7,

        tension: 80,
      }
    ).start();
  }, [isDark]);

  /* =======================================================
     STATE
  ======================================================= */

  const [stats, setStats] =
    useState({
      total_members: 0,
      active_members: 0,
      expiring_members: 0,
      expired_members: 0,
    });

  const [members, setMembers] =
    useState([]);

  const [trainer, setTrainer] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    unreadNotificationCount,
    setUnreadNotificationCount,
  ] = useState(0);

  /* =======================================================
     SESSION EXPIRATION
  ======================================================= */

  const expireSession =
    async () => {

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

            onPress: () =>
              router.replace("/"),
          },
        ]
      );
    };

  /* =======================================================
     LOAD NOTIFICATION COUNT
  ======================================================= */

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
              method: "GET",

              headers: {
                Accept:
                  "application/json",

                Authorization:
                  `Token ${token}`,
              },
            }
          );

        console.log(
          "TRAINER NOTIFICATION COUNT STATUS:",
          response.status
        );

        if (
          response.status === 401
        ) {
          return;
        }

        if (!response.ok) {

          console.log(
            "TRAINER NOTIFICATION COUNT ERROR:",
            await response.text()
          );

          return;
        }

        const data =
          await response.json();

        console.log(
          "TRAINER NOTIFICATION COUNT:",
          data
        );

        setUnreadNotificationCount(
          Number(
            data.unread_count || 0
          )
        );

      } catch (error) {

        console.log(
          "TRAINER NOTIFICATION COUNT ERROR:",
          error
        );
      }
    };

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

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

        if (statsResponse.ok) {

          const statsData =
            await statsResponse.json();

          console.log(
            "TRAINER DASHBOARD STATS:",
            statsData
          );

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
        }

        /* ===================================================
           MEMBERS
        =================================================== */

        if (membersResponse.ok) {

          const membersData =
            await membersResponse.json();

          console.log(
            "TRAINER MEMBERS:",
            membersData
          );

          let memberList = [];

          if (
            Array.isArray(
              membersData
            )
          ) {

            memberList =
              membersData;

          } else if (
            Array.isArray(
              membersData.results
            )
          ) {

            memberList =
              membersData.results;

          } else if (
            Array.isArray(
              membersData.members
            )
          ) {

            memberList =
              membersData.members;
          }

          setMembers(
            memberList
          );
        }

        /* ===================================================
           TRAINER PROFILE
        =================================================== */

        if (profileResponse.ok) {

          const profileData =
            await profileResponse.json();

          console.log(
            "TRAINER PROFILE:",
            profileData
          );

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
          "Error",
          "Unable to load trainer dashboard."
        );

      } finally {

        setLoading(false);

        setRefreshing(false);
      }
    };

  /* =======================================================
     FOCUS EFFECT
  ======================================================= */

  useFocusEffect(
    useCallback(() => {

      loadDashboard(true);

      loadNotificationCount();

    }, [])
  );

  /* =======================================================
     REFRESH
  ======================================================= */

  const onRefresh =
    async () => {

      setRefreshing(true);

      await Promise.all([
        loadDashboard(false),
        loadNotificationCount(),
      ]);
    };

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
     LOADING
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
          color={
            colors.primary
          }
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                colors.secondaryText,
            },
          ]}
        >
          Loading dashboard...
        </Text>

      </View>
    );
  }

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
        showsVerticalScrollIndicator={
          false
        }

        contentContainerStyle={
          styles.scrollContent
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
          />
        }
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={styles.header}
        >

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
                    uri:
                      profilePicture,
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

          <View
            style={
              styles.headerInfo
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
              GYMRYT • TRAINER
            </Text>

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
              style={
                styles.locationRow
              }
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
              HEADER ACTIONS
          ================================================= */}

          <View
            style={
              styles.headerActions
            }
          >

            {/* =================================================
                LIGHT / DARK THEME SWITCH
            ================================================= */}

            <TouchableOpacity
              style={[
                styles.themeSwitch,
                {
                  backgroundColor:
                    isDark
                      ? "#111827"
                      : "#E2E8F0",
                },
              ]}

              onPress={
                toggleTheme
              }

              activeOpacity={0.8}
            >

              <Text
                style={
                  styles.themeIcon
                }
              >
                🌙
              </Text>

              <Text
                style={
                  styles.themeIcon
                }
              >
                ☀️
              </Text>

              <Animated.View
                style={[
                  styles.themeKnob,
                  {
                    backgroundColor:
                      isDark
                        ? "#1E293B"
                        : "#FFFFFF",

                    transform: [
                      {
                        translateX:
                          themeAnimation.interpolate(
                            {
                              inputRange:
                                [0, 1],

                              outputRange:
                                [30, 0],
                            }
                          ),
                      },
                    ],
                  },
                ]}
              >

                <Text
                  style={
                    styles.knobIcon
                  }
                >
                  {isDark
                    ? "🌙"
                    : "☀️"}
                </Text>

              </Animated.View>

            </TouchableOpacity>

            {/* =================================================
                NOTIFICATIONS
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

              onPress={() => {
                router.push(
                  "/admin/notifications"
                );
              }}
            >

              <Ionicons
                name="notifications-outline"
                size={25}
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
                        "#FF3B5C",
                    },
                  ]}
                >

                  <Text
                    style={
                      styles.notificationBadgeText
                    }
                  >
                    {
                      unreadNotificationCount >
                      99
                        ? "99+"
                        : unreadNotificationCount
                    }
                  </Text>

                </View>
              )}

            </TouchableOpacity>

          </View>

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

            <View>

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

              <Text
                style={[
                  styles.overviewSubtitle,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                Your assigned members
              </Text>

            </View>

            <Ionicons
              name="bar-chart-outline"
              size={25}
              color={
                colors.primaryLight
              }
            />

          </View>

          <View
            style={
              styles.statsGrid
            }
          >

            {/* TOTAL */}

            <View
              style={[
                styles.statCard,
                {
                  backgroundColor:
                    colors.iconBackground,
                  borderColor:
                    colors.border,
                },
              ]}
            >

              <Ionicons
                name="people-outline"
                size={23}
                color={
                  colors.primaryLight
                }
              />

              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {
                  stats.total_members
                }
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
                TOTAL
              </Text>

            </View>

            {/* ACTIVE */}

            <View
              style={[
                styles.statCard,
                {
                  backgroundColor:
                    colors.iconBackground,
                  borderColor:
                    colors.border,
                },
              ]}
            >

              <Ionicons
                name="checkmark-circle-outline"
                size={23}
                color="#22C55E"
              />

              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {
                  stats.active_members
                }
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
                ACTIVE
              </Text>

            </View>

            {/* EXPIRING */}

            <View
              style={[
                styles.statCard,
                {
                  backgroundColor:
                    colors.iconBackground,
                  borderColor:
                    colors.border,
                },
              ]}
            >

              <Ionicons
                name="time-outline"
                size={23}
                color="#F59E0B"
              />

              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {
                  stats.expiring_members
                }
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
                EXPIRING
              </Text>

            </View>

            {/* EXPIRED */}

            <View
              style={[
                styles.statCard,
                {
                  backgroundColor:
                    colors.iconBackground,
                  borderColor:
                    colors.border,
                },
              ]}
            >

              <Ionicons
                name="close-circle-outline"
                size={23}
                color="#EF4444"
              />

              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {
                  stats.expired_members
                }
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
                EXPIRED
              </Text>

            </View>

          </View>

        </View>

        {/* =================================================
            MEMBERS SECTION
        ================================================= */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <View>

            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              MY MEMBERS
            </Text>

            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Members assigned to you
            </Text>

          </View>

          <TouchableOpacity
            onPress={() =>
              router.push(
                "/trainer/members"
              )
            }

            activeOpacity={0.8}
          >

            <Text
              style={[
                styles.viewAllText,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              View All
            </Text>

          </TouchableOpacity>

        </View>

        {/* =================================================
            MEMBER LIST
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

            <Ionicons
              name="people-outline"
              size={42}
              color={
                colors.secondaryText
              }
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              No Members Assigned
            </Text>

            <Text
              style={[
                styles.emptySubtitle,
                {
                  color:
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
            .map(
              (
                member,
                index
              ) => {

                const name =
                  member.name ||
                  member.full_name ||
                  member.username ||
                  "Member";

                const days =
                  getDaysRemaining(
                    member.membership_end
                  );

                const status =
                  getStatus(
                    member
                  );

                const memberProfilePicture =
                  member.profile_picture ||
                  member.profile_image ||
                  null;

                return (

                  <TouchableOpacity
                    key={
                      member.id ||
                      index
                    }

                    activeOpacity={
                      0.85
                    }

                    onPress={() =>
                      router.push({
                        pathname:
                          "/trainer/members",
                        params: {
                          memberId:
                            member.id,
                        },
                      })
                    }

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
                        styles.memberAvatar,
                        {
                          backgroundColor:
                            colors.iconBackground,

                          borderColor:
                            colors.primary,
                        },
                      ]}
                    >

                      {memberProfilePicture ? (

                        <Image
                          source={{
                            uri:
                              memberProfilePicture,
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
                                colors.primaryLight,
                            },
                          ]}
                        >
                          {getInitials(
                            name
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

                        numberOfLines={
                          1
                        }
                      >
                        {name}
                      </Text>

                      <Text
                        style={[
                          styles.memberUsername,
                          {
                            color:
                              colors.secondaryText,
                          },
                        ]}

                        numberOfLines={
                          1
                        }
                      >
                        {member.username ||
                          member.email ||
                          "GymRyt Member"}
                      </Text>

                      <View
                        style={
                          styles.memberMetaRow
                        }
                      >

                        <Ionicons
                          name="calendar-outline"
                          size={13}
                          color={
                            colors.secondaryText
                          }
                        />

                        <Text
                          style={[
                            styles.memberMetaText,
                            {
                              color:
                                colors.secondaryText,
                            },
                          ]}
                        >
                          {days} days
                          remaining
                        </Text>

                      </View>

                    </View>

                    {/* STATUS */}

                    <View
                      style={
                        styles.memberRight
                      }
                    >

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              status ===
                              "ACTIVE"
                                ? "rgba(34,197,94,0.15)"
                                : status ===
                                  "EXPIRING"
                                ? "rgba(245,158,11,0.15)"
                                : "rgba(239,68,68,0.15)",
                          },
                        ]}
                      >

                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                status ===
                                "ACTIVE"
                                  ? "#22C55E"
                                  : status ===
                                    "EXPIRING"
                                  ? "#F59E0B"
                                  : "#EF4444",
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
                      />

                    </View>

                  </TouchableOpacity>

                );
              }
            )

        )}

        {/* =================================================
            QUICK ACTION
        ================================================= */}

        <View
          style={[
            styles.quickActionsTitleRow,
            {
              marginTop: 28,
            },
          ]}
        >

          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            QUICK ACTIONS
          </Text>

        </View>

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
              backgroundColor:
                colors.card,

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
              size={28}
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
              Trainer Profile
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
              View and manage your
              profile
            </Text>

          </View>

          <Ionicons
            name="chevron-forward"
            size={21}
            color={
              colors.secondaryText
            }
          />

        </TouchableOpacity>

      </ScrollView>

      {/* ===================================================
          BOTTOM NAVIGATION
      =================================================== */}

      <TrainerBottomNavigation
        active="home"
        colors={colors}
      />

    </View>
  );
}

/* =========================================================
   BOTTOM NAVIGATION
========================================================= */

function TrainerBottomNavigation({
  active,
  colors,
}) {

  const goTo =
    (screen) => {

      if (
        screen === "home"
      ) {
        router.push(
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
          "/trainer/workout"
        );

        return;
      }

      if (
        screen === "profile"
      ) {
        router.push(
          "/trainer/profile"
        );

        return;
      }
    };

  return (

    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor:
            colors.card,

          borderTopColor:
            colors.border,
        },
      ]}
    >

      <TrainerNavItem
        icon="home-outline"
        label="Home"
        active={
          active === "home"
        }
        colors={colors}
        onPress={() =>
          goTo("home")
        }
      />

      <TrainerNavItem
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

      <TrainerNavItem
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

      <TrainerNavItem
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
   NAV ITEM
========================================================= */

function TrainerNavItem({
  icon,
  label,
  active,
  colors,
  onPress,
}) {

  return (

    <TouchableOpacity
      style={
        styles.bottomNavItem
      }

      activeOpacity={0.8}

      onPress={onPress}
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

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop:
        Platform.OS === "ios"
          ? 55
          : 45,
      paddingBottom: 145,
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 27,
    },

    profilePhotoWrapper: {
      width: 82,
      height: 82,
      borderRadius: 41,
      borderWidth: 2,
      alignItems:
        "center",
      justifyContent:
        "center",
      overflow:
        "hidden",
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

    headerActions: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,
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
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 6,
    },

    locationText: {
      fontSize: 10,
      marginLeft: 4,
      flex: 1,
    },

    /* =====================================================
       THEME SWITCH
    ===================================================== */

    themeSwitch: {
      width: 66,
      height: 34,
      borderRadius: 18,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-around",

      paddingHorizontal: 4,

      position:
        "relative",
    },

    themeIcon: {
      fontSize: 13,
      width: 24,
      textAlign:
        "center",
    },

    themeKnob: {
      position:
        "absolute",

      left: 4,
      top: 3,

      width: 28,
      height: 28,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,
        height: 1,
      },

      shadowOpacity:
        0.2,

      shadowRadius:
        3,

      elevation: 3,
    },

    knobIcon: {
      fontSize: 13,
    },

    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    notificationButton: {
      width: 43,
      height: 43,
      borderRadius: 15,
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

      top: -5,
      right: -5,

      minWidth: 20,
      height: 20,

      paddingHorizontal: 5,

      borderRadius: 10,

      alignItems:
        "center",

      justifyContent:
        "center",

      borderWidth: 2,

      borderColor:
        "#020617",
    },

    notificationBadgeText: {
      color:
        "#FFFFFF",

      fontSize: 9,

      fontWeight:
        "900",

      textAlign:
        "center",
    },

    /* =====================================================
       OVERVIEW
    ===================================================== */

    overviewCard: {
      borderWidth: 1,
      borderRadius: 21,
      padding: 16,
      marginBottom: 27,
    },

    overviewHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 17,
    },

    overviewTitle: {
      fontSize: 15,
      fontWeight: "900",
      letterSpacing: 1,
    },

    overviewSubtitle: {
      fontSize: 11,
      marginTop: 4,
    },

    statsGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      justifyContent:
        "space-between",

      gap: 10,
    },

    statCard: {
      width: "48%",
      minHeight: 110,

      borderWidth: 1,

      borderRadius: 18,

      padding: 14,

      justifyContent:
        "center",
    },

    statValue: {
      fontSize: 27,
      fontWeight: "900",
      marginTop: 7,
    },

    statLabel: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1,
      marginTop: 2,
    },

    /* =====================================================
       SECTION
    ===================================================== */

    sectionHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 14,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: "900",
      letterSpacing: 1,
    },

    sectionSubtitle: {
      fontSize: 11,
      marginTop: 4,
    },

    viewAllText: {
      fontSize: 11,
      fontWeight: "900",
    },

    /* =====================================================
       MEMBER CARD
    ===================================================== */

    memberCard: {
      minHeight: 91,

      borderWidth: 1,

      borderRadius: 19,

      paddingHorizontal: 13,

      marginBottom: 11,

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    memberAvatar: {
      width: 53,
      height: 53,

      borderRadius: 27,

      borderWidth: 1.5,

      alignItems:
        "center",

      justifyContent:
        "center",

      overflow:
        "hidden",
    },

    memberAvatarImage: {
      width: "100%",
      height: "100%",
    },

    memberAvatarText: {
      fontSize: 17,
      fontWeight: "900",
    },

    memberInfo: {
      flex: 1,
      marginLeft: 13,
      marginRight: 8,
    },

    memberName: {
      fontSize: 14,
      fontWeight: "900",
    },

    memberUsername: {
      fontSize: 10,
      marginTop: 3,
    },

    memberMetaRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 6,
    },

    memberMetaText: {
      fontSize: 9,
      marginLeft: 4,
      fontWeight: "700",
    },

    memberRight: {
      alignItems:
        "flex-end",

      justifyContent:
        "center",

      gap: 8,
    },

    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
    },

    statusText: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.5,
    },

    /* =====================================================
       EMPTY STATE
    ===================================================== */

    emptyCard: {
      minHeight: 190,

      borderWidth: 1,

      borderRadius: 20,

      alignItems:
        "center",

      justifyContent:
        "center",

      padding: 25,
    },

    emptyTitle: {
      fontSize: 15,
      fontWeight: "900",
      marginTop: 12,
    },

    emptySubtitle: {
      fontSize: 11,
      marginTop: 6,
      textAlign:
        "center",
    },

    /* =====================================================
       QUICK ACTION
    ===================================================== */

    quickActionsTitleRow: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    profileActionCard: {
      minHeight: 110,

      borderWidth: 1,

      borderRadius: 20,

      paddingHorizontal: 18,

      marginTop: 10,

      marginBottom: 10,

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    profileActionIcon: {
      width: 61,
      height: 61,

      borderRadius: 17,

      alignItems:
        "center",

      justifyContent:
        "center",
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

    /* =====================================================
       BOTTOM NAVIGATION
    ===================================================== */

    bottomNav: {
      position:
        "absolute",

      left: 0,
      right: 0,
      bottom: 0,

      height: 91,

      borderTopWidth: 1,

      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      justifyContent:
        "space-around",

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

      alignItems:
        "center",

      justifyContent:
        "flex-start",

      position:
        "relative",
    },

    bottomIconContainer: {
      width: 48,
      height: 39,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",
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