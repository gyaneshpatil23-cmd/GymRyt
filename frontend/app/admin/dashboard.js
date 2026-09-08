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
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../context/ThemeContext";

// ======================================================
// API
// ======================================================

const BASE_URL =
  "http://192.168.1.49:8000/api/members";

const DASHBOARD_API =
  `${BASE_URL}/dashboard-stats/`;

const MEMBERS_API =
  `${BASE_URL}/`;

const REVENUE_API =
  `${BASE_URL}/revenue-stats/`;

// ======================================================
// ADMIN DASHBOARD
// ======================================================

export default function AdminDashboard() {

  // ====================================================
  // THEME
  // ====================================================

  const {
    isDark,
    colors,
    toggleTheme,
  } = useTheme();

  // ====================================================
  // THEME ANIMATION
  // ====================================================

  const themeAnimation = useRef(
    new Animated.Value(isDark ? 1 : 0)
  ).current;

  useEffect(() => {
    Animated.spring(
      themeAnimation,
      {
        toValue: isDark ? 1 : 0,
        useNativeDriver: true,
        friction: 7,
        tension: 80,
      }
    ).start();
  }, [isDark]);

  // ====================================================
  // STATE
  // ====================================================

  const [stats, setStats] = useState({
    total_members: 0,
    active_members: 0,
    expired_members: 0,
    expiring_members: 0,
    attendance_today: 0,
  });

  const [revenue, setRevenue] = useState(0);

  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [adminUsername, setAdminUsername] =
    useState("Admin");

  // ====================================================
  // GET CURRENT ADMIN SESSION
  // ====================================================

  const getAdminSession = async () => {
    const token =
      await AsyncStorage.getItem("adminToken");

    const username =
      await AsyncStorage.getItem("adminUsername");

    const adminId =
      await AsyncStorage.getItem("adminId");

    console.log(
      "=========================================="
    );

    console.log(
      "CURRENT ADMIN SESSION"
    );

    console.log(
      "ADMIN ID:",
      adminId
    );

    console.log(
      "ADMIN USERNAME:",
      username
    );

    console.log(
      "TOKEN EXISTS:",
      !!token
    );

    console.log(
      "=========================================="
    );

    return {
      token,
      username,
      adminId,
    };
  };

  // ====================================================
  // CLEAR SESSION
  // ====================================================

  const clearAdminSession = async () => {
    await AsyncStorage.multiRemove([
      "adminToken",
      "adminUsername",
      "adminId",
      "userRole",
    ]);
  };

  // ====================================================
  // LOGOUT / SESSION EXPIRED
  // ====================================================

  const handleSessionExpired = async () => {
    await clearAdminSession();

    Alert.alert(
      "Session Expired",
      "Please login again.",
      [
        {
          text: "OK",
          onPress: () => {
            router.replace("/");
          },
        },
      ]
    );
  };

  // ====================================================
  // FETCH DASHBOARD DATA
  // ====================================================

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // ==================================================
      // GET CURRENT ADMIN TOKEN
      // ==================================================

      const session =
        await getAdminSession();

      const token =
        session.token;

      // ==================================================
      // TOKEN NOT FOUND
      // ==================================================

      if (!token) {
        await clearAdminSession();

        Alert.alert(
          "Authentication Error",
          "Admin login session not found. Please login again.",
          [
            {
              text: "OK",
              onPress: () => {
                router.replace("/");
              },
            },
          ]
        );

        return;
      }

      // ==================================================
      // SHOW ADMIN NAME
      // ==================================================

      if (session.username) {
        setAdminUsername(
          session.username
        );
      }

      // ==================================================
      // AUTH HEADERS
      // ==================================================

      const authHeaders = {
        "Content-Type":
          "application/json",

        Authorization:
          `Token ${token}`,
      };

      console.log(
        "FETCHING DASHBOARD FOR ADMIN:",
        session.username
      );

      // ==================================================
      // DASHBOARD STATS
      // ==================================================

      const statsResponse =
        await fetch(
          DASHBOARD_API,
          {
            method: "GET",
            headers: authHeaders,
          }
        );

      console.log(
        "DASHBOARD STATUS:",
        statsResponse.status
      );

      // ==================================================
      // UNAUTHORIZED
      // ==================================================

      if (
        statsResponse.status === 401
      ) {
        await handleSessionExpired();
        return;
      }

      // ==================================================
      // OTHER ERROR
      // ==================================================

      if (!statsResponse.ok) {
        const errorText =
          await statsResponse.text();

        console.log(
          "DASHBOARD ERROR RESPONSE:",
          errorText
        );

        throw new Error(
          "Failed to fetch dashboard statistics"
        );
      }

      // ==================================================
      // DASHBOARD DATA
      // ==================================================

      const statsData =
        await statsResponse.json();

      console.log(
        "DASHBOARD STATS:",
        statsData
      );

      // ==================================================
      // SET STATS
      // ==================================================

      setStats({
        total_members:
          statsData.total_members ?? 0,

        active_members:
          statsData.active_members ?? 0,

        expired_members:
          statsData.expired_members ?? 0,

        expiring_members:
          statsData.expiring_members ?? 0,

        attendance_today:
          statsData.attendance_today ?? 0,
      });

      // ==================================================
      // REVENUE
      // ==================================================

      const revenueResponse =
        await fetch(
          REVENUE_API,
          {
            method: "GET",
            headers: authHeaders,
          }
        );

      console.log(
        "REVENUE STATUS:",
        revenueResponse.status
      );

      // ==================================================
      // REVENUE UNAUTHORIZED
      // ==================================================

      if (
        revenueResponse.status === 401
      ) {
        await handleSessionExpired();
        return;
      }

      // ==================================================
      // REVENUE ERROR
      // ==================================================

      if (!revenueResponse.ok) {
        const errorText =
          await revenueResponse.text();

        console.log(
          "REVENUE ERROR RESPONSE:",
          errorText
        );

        throw new Error(
          "Failed to fetch revenue data"
        );
      }

      // ==================================================
      // REVENUE DATA
      // ==================================================

      const revenueData =
        await revenueResponse.json();

      console.log(
        "REVENUE DATA:",
        revenueData
      );

      // ==================================================
      // SET REVENUE
      // ==================================================

      setRevenue(
        Number(
          revenueData.total_revenue ?? 0
        )
      );

      // ==================================================
      // MEMBERS
      // ==================================================

      const membersResponse =
        await fetch(
          MEMBERS_API,
          {
            method: "GET",
            headers: authHeaders,
          }
        );

      console.log(
        "MEMBERS STATUS:",
        membersResponse.status
      );

      // ==================================================
      // MEMBERS UNAUTHORIZED
      // ==================================================

      if (
        membersResponse.status === 401
      ) {
        await handleSessionExpired();
        return;
      }

      // ==================================================
      // MEMBERS ERROR
      // ==================================================

      if (!membersResponse.ok) {
        const errorText =
          await membersResponse.text();

        console.log(
          "MEMBERS ERROR RESPONSE:",
          errorText
        );

        throw new Error(
          "Failed to fetch members"
        );
      }

      // ==================================================
      // MEMBERS DATA
      // ==================================================

      const membersData =
        await membersResponse.json();

      console.log(
        "MEMBERS FROM CURRENT ADMIN:",
        membersData
      );

      // ==================================================
      // DJANGO PAGINATION SAFETY
      // ==================================================

      if (
        Array.isArray(membersData)
      ) {
        setMembers(
          membersData
        );
      } else if (
        Array.isArray(
          membersData.results
        )
      ) {
        setMembers(
          membersData.results
        );
      } else {
        setMembers([]);
      }

    } catch (error) {

      console.log(
        "=========================================="
      );

      console.log(
        "DASHBOARD ERROR:",
        error
      );

      console.log(
        "=========================================="
      );

      Alert.alert(
        "Connection Error",
        "Could not load dashboard data.\n\nMake sure Django is running and your phone is connected to the same Wi-Fi."
      );

    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // REFRESH WHEN SCREEN OPENS
  // ====================================================

  useFocusEffect(
    useCallback(() => {

      console.log(
        "DASHBOARD FOCUSED - REFRESHING"
      );

      fetchDashboardData();

    }, [])
  );

  // ====================================================
  // RECENT MEMBERS
  // ====================================================

  const recentMembers =
    members.slice(0, 3);

  // ====================================================
  // MEMBER DETAILS
  // ====================================================

  const openMemberDetails = (
    member
  ) => {

    router.push({
      pathname:
        "/admin/memberdetails",

      params: {
        id:
          String(member.id),

        name:
          member.name || "",

        phone:
          member.phone || "",

        email:
          member.email || "",

        username:
          member.username || "",

        membership_start:
          member.membership_start || "",

        membership_end:
          member.membership_end || "",

        status:
          member.status || "",

        id_verified:
          member.id_verified
            ? "true"
            : "false",
      },
    });
  };

  // ====================================================
  // INITIALS
  // ====================================================

  const getInitials = (
    name
  ) => {

    if (!name) {
      return "?";
    }

    return name
      .split(" ")
      .filter(Boolean)
      .map(
        (word) =>
          word[0]
      )
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // ====================================================
  // FORMAT REVENUE
  // ====================================================

  const formattedRevenue =
    revenue.toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2,
      }
    );

  // ====================================================
  // LOADING
  // ====================================================

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
              color:
                colors.mutedText,
            },
          ]}
        >
          Loading dashboard...
        </Text>

      </View>
    );
  }

  // ====================================================
  // DASHBOARD
  // ====================================================

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
          styles.content
        }
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <View style={styles.header}>

          <View
            style={styles.headerLeft}
          >

            <Text
              style={[
                styles.smallText,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              WELCOME BACK
            </Text>

            <Text
              style={[
                styles.title,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {adminUsername} 👋
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Manage your gym with ease.
            </Text>

          </View>

          <View
            style={styles.headerRight}
          >

            {/* ==================================================
                THEME SWITCH
            ================================================== */}

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
              onPress={toggleTheme}
              activeOpacity={0.8}
            >

              {/* MOON */}

              <Text
                style={styles.themeIcon}
              >
                🌙
              </Text>

              {/* SUN */}

              <Text
                style={styles.themeIcon}
              >
                ☀️
              </Text>

              {/* SLIDING KNOB */}

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
                          themeAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [30, 0],
                          }),
                      },
                    ],
                  },
                ]}
              >

                <Text
                  style={styles.knobIcon}
                >
                  {isDark
                    ? "🌙"
                    : "☀️"}
                </Text>

              </Animated.View>

            </TouchableOpacity>

            {/* ==================================================
                PROFILE
            ================================================== */}

            <View
              style={[
                styles.profileCircle,
                {
                  backgroundColor:
                    colors.primary,
                },
              ]}
            >

              <Text
                style={
                  styles.profileText
                }
              >
                {getInitials(
                  adminUsername
                )}
              </Text>

            </View>

          </View>

        </View>

        {/* ==================================================
            OVERVIEW
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.mutedText,
            },
          ]}
        >
          OVERVIEW
        </Text>

        <View
          style={styles.statsGrid}
        >

          {/* ==================================================
              TOTAL MEMBERS
          ================================================== */}

          <TouchableOpacity
            style={[
              styles.statCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
            onPress={() =>
              router.push(
                "/admin/members"
              )
            }
            activeOpacity={0.8}
          >

            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >

              <Text
                style={styles.icon}
              >
                👥
              </Text>

            </View>

            <Text
              style={[
                styles.statNumber,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {stats.total_members}
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
              Total Members
            </Text>

            <Text
              style={[
                styles.growth,
                {
                  color:
                    colors.success,
                },
              ]}
            >
              ↗ Total registered members
            </Text>

          </TouchableOpacity>

          {/* ==================================================
              REVENUE
          ================================================== */}

          <TouchableOpacity
            style={[
              styles.statCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
            onPress={() =>
              router.push(
                "/admin/revenue"
              )
            }
            activeOpacity={0.8}
          >

            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor:
                    colors.successBackground,
                },
              ]}
            >

              <Text
                style={styles.icon}
              >
                ₹
              </Text>

            </View>

            <Text
              style={[
                styles.revenueNumber,
                {
                  color:
                    colors.revenue,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              ₹{formattedRevenue}
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
              Revenue & Records
            </Text>

            <Text
              style={[
                styles.revenueText,
                {
                  color:
                    colors.revenue,
                },
              ]}
            >
              ↗ Total revenue
            </Text>

          </TouchableOpacity>

          {/* ==================================================
              EXPIRED
          ================================================== */}

          <TouchableOpacity
            style={[
              styles.statCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
            onPress={() =>
              router.push(
                "/admin/members"
              )
            }
            activeOpacity={0.8}
          >

            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor:
                    colors.warningBackground,
                },
              ]}
            >

              <Text
                style={styles.icon}
              >
                !
              </Text>

            </View>

            <Text
              style={[
                styles.statNumber,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {stats.expired_members}
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
              Expired
            </Text>

            <Text
              style={[
                styles.warningText,
                {
                  color:
                    colors.warning,
                },
              ]}
            >
              {stats.expired_members > 0
                ? "Needs attention"
                : "All memberships active"}
            </Text>

          </TouchableOpacity>

          {/* ==================================================
              ATTENDANCE
          ================================================== */}

          <TouchableOpacity
            style={[
              styles.statCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
            activeOpacity={0.8}
          >

            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >

              <Text
                style={styles.icon}
              >
                🔥
              </Text>

            </View>

            <Text
              style={[
                styles.statNumber,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {stats.attendance_today}
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
              Today's Attendance
            </Text>

            <Text
              style={[
                styles.growth,
                {
                  color:
                    colors.success,
                },
              ]}
            >
              ● Present today
            </Text>

          </TouchableOpacity>

        </View>

        {/* ==================================================
            QUICK ACTIONS
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.mutedText,
            },
          ]}
        >
          QUICK ACTIONS
        </Text>

        {/* ==================================================
            VIEW MEMBERS
        ================================================== */}

        <TouchableOpacity
          style={[
            styles.actionCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
          onPress={() =>
            router.push(
              "/admin/members"
            )
          }
          activeOpacity={0.8}
        >

          <View
            style={[
              styles.actionIcon,
              {
                backgroundColor:
                  colors.primary,
              },
            ]}
          >

            <Text
              style={
                styles.actionIconText
              }
            >
              👥
            </Text>

          </View>

          <View
            style={
              styles.actionContent
            }
          >

            <Text
              style={[
                styles.actionTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              View All Members
            </Text>

            <Text
              style={[
                styles.actionSubtitle,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Manage your gym members
            </Text>

          </View>

          <Text
            style={[
              styles.arrow,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            →
          </Text>

        </TouchableOpacity>

        {/* ==================================================
            RECORD PAYMENT
        ================================================== */}

        <TouchableOpacity
          style={[
            styles.actionCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
          onPress={() =>
            router.push(
              "/admin/members"
            )
          }
          activeOpacity={0.8}
        >

          <View
            style={[
              styles.actionIcon,
              styles.paymentActionIcon,
            ]}
          >

            <Text
              style={
                styles.actionIconText
              }
            >
              ₹
            </Text>

          </View>

          <View
            style={
              styles.actionContent
            }
          >

            <Text
              style={[
                styles.actionTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              Record Payment
            </Text>

            <Text
              style={[
                styles.actionSubtitle,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Select a member and record payment
            </Text>

          </View>

          <Text
            style={[
              styles.arrow,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            →
          </Text>

        </TouchableOpacity>

        {/* ==================================================
            RECENT MEMBERS
        ================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            RECENT MEMBERS
          </Text>

          <TouchableOpacity
            onPress={() =>
              router.push(
                "/admin/members"
              )
            }
          >

            <Text
              style={[
                styles.viewAll,
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

        {/* ==================================================
            MEMBER LIST
        ================================================== */}

        {recentMembers.length === 0 ? (

          <View
            style={
              styles.emptyContainer
            }
          >

            <Text
              style={
                styles.emptyIcon
              }
            >
              👥
            </Text>

            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              No Members Yet
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
              Add your first gym member.
            </Text>

          </View>

        ) : (

          recentMembers.map(
            (member) => (

              <TouchableOpacity
                key={
                  member.id
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
                activeOpacity={0.8}
                onPress={() =>
                  openMemberDetails(
                    member
                  )
                }
              >

                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor:
                        colors.iconBackground,
                    },
                  ]}
                >

                  <Text
                    style={[
                      styles.avatarText,
                      {
                        color:
                          colors.primaryLight,
                      },
                    ]}
                  >
                    {getInitials(
                      member.name
                    )}
                  </Text>

                </View>

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
                    {member.name}
                  </Text>

                  <Text
                    style={[
                      styles.memberDays,
                      {
                        color:
                          colors.mutedText,
                      },
                    ]}
                  >
                    {member.status ===
                    "EXPIRED"
                      ? "Membership expired"
                      : `${calculateDaysRemaining(
                          member.membership_end
                        )} days remaining`}
                  </Text>

                </View>

                {/* ACTIVE */}

                {member.status ===
                  "ACTIVE" && (

                  <View
                    style={[
                      styles.activeBadge,
                      {
                        backgroundColor:
                          colors.successBackground,
                      },
                    ]}
                  >

                    <Text
                      style={[
                        styles.activeBadgeText,
                        {
                          color:
                            colors.success,
                        },
                      ]}
                    >
                      ACTIVE
                    </Text>

                  </View>

                )}

                {/* EXPIRING */}

                {member.status ===
                  "EXPIRING" && (

                  <View
                    style={[
                      styles.warningBadge,
                      {
                        backgroundColor:
                          colors.warningBackground,
                      },
                    ]}
                  >

                    <Text
                      style={[
                        styles.warningBadgeText,
                        {
                          color:
                            colors.warning,
                        },
                      ]}
                    >
                      EXPIRING
                    </Text>

                  </View>

                )}

                {/* EXPIRED */}

                {member.status ===
                  "EXPIRED" && (

                  <View
                    style={[
                      styles.expiredBadge,
                      {
                        backgroundColor:
                          colors.dangerBackground,
                      },
                    ]}
                  >

                    <Text
                      style={[
                        styles.expiredBadgeText,
                        {
                          color:
                            colors.danger,
                        },
                      ]}
                    >
                      EXPIRED
                    </Text>

                  </View>

                )}

              </TouchableOpacity>

            )
          )

        )}

      </ScrollView>

      {/* ==================================================
          BOTTOM NAVIGATION
      ================================================== */}

      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor:
              colors.nav,
            borderTopColor:
              colors.border,
          },
        ]}
      >

        {/* HOME */}

        <TouchableOpacity
          style={
            styles.navItem
          }
          activeOpacity={0.7}
        >

          <Text
            style={
              styles.navIconActive
            }
          >
            🛖
          </Text>

          <Text
            style={[
              styles.navTextActive,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            Home
          </Text>

        </TouchableOpacity>

        {/* MEMBERS */}

        <TouchableOpacity
          style={
            styles.navItem
          }
          onPress={() =>
            router.push(
              "/admin/members"
            )
          }
          activeOpacity={0.7}
        >

          <Text
            style={
              styles.navIcon
            }
          >
            👥
          </Text>

          <Text
            style={[
              styles.navText,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            Members
          </Text>

        </TouchableOpacity>

        {/* ADD MEMBER */}

        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor:
                colors.primary,
              borderColor:
                colors.background,
            },
          ]}
          onPress={() =>
            router.push(
              "/admin/addmembers"
            )
          }
          activeOpacity={0.8}
        >

          <Text
            style={
              styles.addButtonText
            }
          >
            +
          </Text>

        </TouchableOpacity>

        {/* REPORTS */}

        <TouchableOpacity
          style={
            styles.navItem
          }
          onPress={() =>
            router.push(
              "/admin/revenue"
            )
          }
          activeOpacity={0.7}
        >

          <Text
            style={
              styles.navIcon
            }
          >
            📊
          </Text>

          <Text
            style={[
              styles.navText,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            Reports
          </Text>

        </TouchableOpacity>

        {/* SETTINGS */}

        <TouchableOpacity
          style={
            styles.navItem
          }
          activeOpacity={0.7}
        >

          <Text
            style={
              styles.navIcon
            }
          >
            ⚙️
          </Text>

          <Text
            style={[
              styles.navText,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            Settings
          </Text>

        </TouchableOpacity>

      </View>

    </View>
  );
}

// ======================================================
// CALCULATE DAYS REMAINING
// ======================================================

function calculateDaysRemaining(
  endDate
) {

  if (!endDate) {
    return 0;
  }

  const today =
    new Date();

  const end =
    new Date(endDate);

  today.setHours(
    0,
    0,
    0,
    0
  );

  end.setHours(
    0,
    0,
    0,
    0
  );

  const difference =
    end.getTime() -
    today.getTime();

  const days =
    Math.ceil(
      difference /
        (1000 *
          60 *
          60 *
          24)
    );

  return Math.max(
    days,
    0
  );
}

// ======================================================
// STYLES
// ======================================================

const styles =
  StyleSheet.create({

    // ==================================================
    // MAIN
    // ==================================================

    container: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 55,
      paddingBottom: 120,
    },

    // ==================================================
    // LOADING
    // ==================================================

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 15,
      fontSize: 13,
    },

    // ==================================================
    // HEADER
    // ==================================================

    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 30,
    },

    headerLeft: {
      flex: 1,
    },

    headerRight: {
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 12,
      marginLeft: 10,
    },

    smallText: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 2,
      marginBottom: 6,
    },

    title: {
      fontSize: 32,
      fontWeight: "900",
    },

    subtitle: {
      fontSize: 14,
      marginTop: 5,
    },

    // ==================================================
    // THEME SWITCH
    // ==================================================

    themeSwitch: {
      width: 66,
      height: 34,
      borderRadius: 18,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      paddingHorizontal: 7,

      position: "relative",
    },

    themeIcon: {
      fontSize: 13,
    },

    themeKnob: {
      position: "absolute",

      width: 28,
      height: 28,

      borderRadius: 14,

      left: 4,

      alignItems: "center",
      justifyContent: "center",

      elevation: 3,

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.2,
      shadowRadius: 3,
    },

    knobIcon: {
      fontSize: 13,
    },

    // ==================================================
    // PROFILE
    // ==================================================

    profileCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,

      justifyContent: "center",
      alignItems: "center",
    },

    profileText: {
      color: "#FFFFFF",
      fontSize: 19,
      fontWeight: "800",
    },

    // ==================================================
    // SECTIONS
    // ==================================================

    sectionTitle: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.8,
      marginBottom: 14,
    },

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 28,
    },

    viewAll: {
      fontSize: 13,
      fontWeight: "700",
    },

    // ==================================================
    // STATS
    // ==================================================

    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 12,
    },

    statCard: {
      width: "48%",
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
    },

    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 12,

      justifyContent: "center",
      alignItems: "center",

      marginBottom: 12,
    },

    icon: {
      fontSize: 18,
      fontWeight: "900",
    },

    statNumber: {
      fontSize: 28,
      fontWeight: "900",
    },

    revenueNumber: {
      fontSize: 25,
      fontWeight: "900",
      minHeight: 32,
    },

    statLabel: {
      fontSize: 12,
      marginTop: 3,
    },

    growth: {
      fontSize: 11,
      fontWeight: "700",
      marginTop: 8,
    },

    revenueText: {
      fontSize: 11,
      fontWeight: "700",
      marginTop: 8,
    },

    warningText: {
      fontSize: 11,
      fontWeight: "700",
      marginTop: 8,
    },

    // ==================================================
    // QUICK ACTIONS
    // ==================================================

    actionCard: {
      flexDirection: "row",
      alignItems: "center",

      borderRadius: 18,

      padding: 15,
      marginBottom: 12,

      borderWidth: 1,
    },

    actionIcon: {
      width: 45,
      height: 45,
      borderRadius: 14,

      justifyContent: "center",
      alignItems: "center",
    },

    paymentActionIcon: {
      backgroundColor: "#15803D",
    },

    actionIconText: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "700",
    },

    actionContent: {
      flex: 1,
      marginLeft: 14,
    },

    actionTitle: {
      fontSize: 15,
      fontWeight: "800",
    },

    actionSubtitle: {
      fontSize: 12,
      marginTop: 4,
    },

    arrow: {
      fontSize: 22,
    },

    // ==================================================
    // MEMBERS
    // ==================================================

    memberCard: {
      flexDirection: "row",
      alignItems: "center",

      borderRadius: 18,

      padding: 14,
      marginBottom: 10,

      borderWidth: 1,
    },

    avatar: {
      width: 45,
      height: 45,
      borderRadius: 23,

      justifyContent: "center",
      alignItems: "center",
    },

    avatarText: {
      fontSize: 13,
      fontWeight: "800",
    },

    memberInfo: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },

    memberName: {
      fontSize: 15,
      fontWeight: "800",
    },

    memberDays: {
      fontSize: 12,
      marginTop: 4,
    },

    // ==================================================
    // BADGES
    // ==================================================

    activeBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
    },

    activeBadgeText: {
      fontSize: 9,
      fontWeight: "800",
    },

    warningBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
    },

    warningBadgeText: {
      fontSize: 9,
      fontWeight: "800",
    },

    expiredBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
    },

    expiredBadgeText: {
      fontSize: 9,
      fontWeight: "800",
    },

    // ==================================================
    // EMPTY
    // ==================================================

    emptyContainer: {
      alignItems: "center",
      paddingVertical: 35,
    },

    emptyIcon: {
      fontSize: 35,
      marginBottom: 10,
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight: "800",
    },

    emptyText: {
      fontSize: 12,
      marginTop: 5,
    },

    // ==================================================
    // BOTTOM NAVIGATION
    // ==================================================

    bottomNav: {
      position: "absolute",

      bottom: 0,
      left: 0,
      right: 0,

      height: 78,

      borderTopWidth: 1,

      flexDirection: "row",

      alignItems: "center",
      justifyContent: "space-around",

      paddingHorizontal: 8,
    },

    navItem: {
      alignItems: "center",
      justifyContent: "center",
      width: 65,
    },

    navIcon: {
      fontSize: 19,
      opacity: 0.6,
    },

    navIconActive: {
      fontSize: 19,
    },

    navText: {
      fontSize: 10,
      marginTop: 4,
    },

    navTextActive: {
      fontSize: 10,
      fontWeight: "700",
      marginTop: 4,
    },

    addButton: {
      width: 56,
      height: 56,
      borderRadius: 28,

      justifyContent: "center",
      alignItems: "center",

      marginTop: -25,

      borderWidth: 5,
    },

    addButtonText: {
      color: "#FFFFFF",
      fontSize: 30,
      fontWeight: "300",
    },

  });