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
  Image,
  RefreshControl,
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

const ADMIN_PROFILE_PICTURE_API =
  `${BASE_URL}/admin/profile-picture/`;

// ======================================================
// OWNER DASHBOARD
// ======================================================

export default function OwnerDashboard() {
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
    Animated.spring(themeAnimation, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }, [isDark, themeAnimation]);

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

  const [refreshing, setRefreshing] = useState(false);

  const [adminUsername, setAdminUsername] =
    useState("Owner");

  const [adminProfilePicture, setAdminProfilePicture] =
    useState(null);

  const isMounted = useRef(true);

  // ====================================================
  // CLEANUP
  // ====================================================

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ====================================================
  // SESSION
  // ====================================================

  const getAdminSession = async () => {
    try {
      const token =
        await AsyncStorage.getItem("adminToken");

      const username =
        await AsyncStorage.getItem("adminUsername");

      const adminId =
        await AsyncStorage.getItem("adminId");

      const userRole =
        await AsyncStorage.getItem("userRole");

      return {
        token,
        username,
        adminId,
        userRole,
      };
    } catch (error) {
      console.log(
        "SESSION ERROR:",
        error
      );

      return {
        token: null,
        username: null,
        adminId: null,
        userRole: null,
      };
    }
  };

  // ====================================================
  // CLEAR SESSION
  // ====================================================

  const clearAdminSession = async () => {
    try {
      await AsyncStorage.multiRemove([
        "adminToken",
        "adminUsername",
        "adminId",
        "userRole",
      ]);
    } catch (error) {
      console.log(
        "CLEAR SESSION ERROR:",
        error
      );
    }
  };

  // ====================================================
  // SESSION EXPIRED
  // ====================================================

  const handleSessionExpired = async () => {
    await clearAdminSession();

    Alert.alert(
      "Session Expired",
      "Your owner session has expired. Please login again.",
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
  // PROFILE PICTURE
  // ====================================================

  const fetchAdminProfilePicture = async (
    token
  ) => {
    try {
      const response =
        await fetch(
          ADMIN_PROFILE_PICTURE_API,
          {
            method: "GET",
            headers: {
              Authorization:
                `Token ${token}`,
            },
          }
        );

      if (response.status === 401) {
        await handleSessionExpired();
        return;
      }

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      if (isMounted.current) {
        setAdminProfilePicture(
          data.profile_picture || null
        );
      }
    } catch (error) {
      console.log(
        "PROFILE PICTURE ERROR:",
        error
      );
    }
  };

  // ====================================================
  // FETCH DASHBOARD DATA
  // ====================================================

  const fetchDashboardData = async (
    isRefresh = false
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const session =
        await getAdminSession();

      const token =
        session.token;

      // ==================================================
      // CHECK LOGIN
      // ==================================================

      if (!token) {
        await clearAdminSession();

        Alert.alert(
          "Authentication Error",
          "Owner login session not found. Please login again.",
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
      // USERNAME
      // ==================================================

      if (
        session.username &&
        isMounted.current
      ) {
        setAdminUsername(
          session.username
        );
      }

      // ==================================================
      // PROFILE PICTURE
      // ==================================================

      await fetchAdminProfilePicture(
        token
      );

      // ==================================================
      // AUTH HEADERS
      // ==================================================

      const authHeaders = {
        "Content-Type":
          "application/json",

        Accept:
          "application/json",

        Authorization:
          `Token ${token}`,
      };

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

      if (
        statsResponse.status === 401
      ) {
        await handleSessionExpired();
        return;
      }

      if (!statsResponse.ok) {
        throw new Error(
          "Failed to fetch dashboard statistics"
        );
      }

      const statsData =
        await statsResponse.json();

      console.log(
        "OWNER DASHBOARD STATS:",
        statsData
      );

      if (isMounted.current) {
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
      }

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

      if (
        revenueResponse.status === 401
      ) {
        await handleSessionExpired();
        return;
      }

      if (!revenueResponse.ok) {
        throw new Error(
          "Failed to fetch revenue"
        );
      }

      const revenueData =
        await revenueResponse.json();

      console.log(
        "OWNER REVENUE:",
        revenueData
      );

      if (isMounted.current) {
        setRevenue(
          Number(
            revenueData.total_revenue ?? 0
          )
        );
      }

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

      if (
        membersResponse.status === 401
      ) {
        await handleSessionExpired();
        return;
      }

      if (!membersResponse.ok) {
        throw new Error(
          "Failed to fetch members"
        );
      }

      const membersData =
        await membersResponse.json();

      console.log(
        "OWNER MEMBERS:",
        membersData
      );

      if (!isMounted.current) {
        return;
      }

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
        "OWNER DASHBOARD ERROR:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Could not load dashboard data.\n\nMake sure Django is running and your phone is connected to the same Wi-Fi."
      );
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // ====================================================
  // REFRESH
  // ====================================================

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  // ====================================================
  // REFRESH WHEN SCREEN OPENS
  // ====================================================

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(false);
    }, [])
  );

  // ====================================================
  // RECENT MEMBERS
  // ====================================================

  const recentMembers =
    members.slice(0, 3);

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
        (word) => word[0]
      )
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

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
  // REVENUE FORMAT
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
          Loading owner dashboard...
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={
              colors.primary
            }
          />
        }
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={styles.header}
        >

          <View
            style={styles.headerLeft}
          >

            {/* PROFILE */}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push(
                  "/admin/profile"
                )
              }
            >
              {adminProfilePicture ? (
                <Image
                  source={{
                    uri:
                      adminProfilePicture,
                  }}
                  style={
                    styles.profileCircle
                  }
                />
              ) : (
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
              )}
            </TouchableOpacity>

            {/* OWNER INFO */}

            <View
              style={
                styles.adminNameContainer
              }
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
                numberOfLines={1}
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

          </View>

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
                        themeAnimation.interpolate({
                          inputRange: [
                            0,
                            1,
                          ],
                          outputRange: [
                            30,
                            0,
                          ],
                        }),
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

        </View>

        {/* ==================================================
            ROLE BADGE
        ================================================== */}

        <View
          style={[
            styles.roleBadge,
            {
              backgroundColor:
                colors.iconBackground,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.roleBadgeText,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            GYM OWNER
          </Text>
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
          style={
            styles.statsGrid
          }
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
                style={
                  styles.icon
                }
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
                style={
                  styles.icon
                }
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
              Revenue
            </Text>
          </TouchableOpacity>

          {/* ==================================================
              ACTIVE MEMBERS
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
                    colors.successBackground,
                },
              ]}
            >
              <Text
                style={
                  styles.icon
                }
              >
                ✓
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
              {stats.active_members}
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
              Active Members
            </Text>
          </TouchableOpacity>

          {/* ==================================================
              EXPIRING MEMBERS
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
                style={
                  styles.icon
                }
              >
                ⏳
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
              {stats.expiring_members}
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
              Expiring Soon
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
              {stats.expiring_members > 0
                ? "Follow up required"
                : "No memberships expiring"}
            </Text>
          </TouchableOpacity>

          {/* ==================================================
              EXPIRED MEMBERS
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
                    colors.dangerBackground,
                },
              ]}
            >
              <Text
                style={
                  styles.icon
                }
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
                styles.dangerText,
                {
                  color:
                    colors.danger,
                },
              ]}
            >
              {stats.expired_members > 0
                ? "Needs attention"
                : "No expired members"}
            </Text>
          </TouchableOpacity>

          {/* ==================================================
              TODAY'S ATTENDANCE
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
                "/admin/attendance"
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
                style={
                  styles.icon
                }
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

        <ActionCard
          icon="👥"
          title="Manage Members"
          subtitle="View and manage your gym members"
          onPress={() =>
            router.push(
              "/admin/members"
            )
          }
          colors={colors}
        />

        <ActionCard
          icon="₹"
          title="Record Payment"
          subtitle="Record a new member payment"
          onPress={() =>
            router.push(
              "/admin/recordpayment"
            )
          }
          colors={colors}
          payment
        />

        <ActionCard
          icon="📊"
          title="Revenue & Reports"
          subtitle="View financial records and reports"
          onPress={() =>
            router.push(
              "/admin/revenue"
            )
          }
          colors={colors}
        />

        <ActionCard
          icon="🔥"
          title="Attendance"
          subtitle="Track today's gym attendance"
          onPress={() =>
            router.push(
              "/admin/attendance"
            )
          }
          colors={colors}
        />

        <ActionCard
          icon="📱"
          title="Registration QR"
          subtitle="Let new members register"
          onPress={() =>
            router.push(
              "/admin/adminqr"
            )
          }
          colors={colors}
        />

        <ActionCard
          icon="🏋️"
          title="Manage Trainers"
          subtitle="Add and manage gym trainers"
          onPress={() =>
            router.push(
              "/admin/trainers"
            )
          }
          colors={colors}
        />

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
            activeOpacity={0.7}
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
            NO MEMBERS
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
              Add your first gym member to get started.
            </Text>

            <TouchableOpacity
              style={[
                styles.emptyButton,
                {
                  backgroundColor:
                    colors.primary,
                },
              ]}
              onPress={() =>
                router.push(
                  "/admin/adminqr"
                )
              }
              activeOpacity={0.8}
            >
              <Text
                style={
                  styles.emptyButtonText
                }
              >
                Register Member
              </Text>
            </TouchableOpacity>
          </View>
        ) : (

          /* ==================================================
              MEMBER LIST
          ================================================== */

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

                {/* AVATAR */}

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
                    {member.name ||
                      "Unnamed Member"}
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

                {/* STATUS */}

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
            🏠
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

        {/* ADD / REGISTRATION */}

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
              "/admin/adminqr"
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

        {/* PROFILE */}

        <TouchableOpacity
          style={
            styles.navItem
          }
          onPress={() =>
            router.push(
              "/admin/profile"
            )
          }
          activeOpacity={0.7}
        >
          <Text
            style={
              styles.navIcon
            }
          >
            👤
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
            Profile
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ======================================================
// ACTION CARD
// ======================================================

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
  colors,
  payment = false,
}) {
  return (
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
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* ICON */}

      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor:
              payment
                ? "#15803D"
                : colors.primary,
          },
        ]}
      >
        <Text
          style={
            styles.actionIconText
          }
        >
          {icon}
        </Text>
      </View>

      {/* CONTENT */}

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
          {title}
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
          {subtitle}
        </Text>
      </View>

      {/* ARROW */}

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
    // CONTAINER
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
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 15,
    },

    headerLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },

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

    adminNameContainer: {
      flex: 1,
      marginLeft: 12,
    },

    smallText: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 2,
      marginBottom: 6,
    },

    title: {
      fontSize: 28,
      fontWeight: "900",
    },

    subtitle: {
      fontSize: 14,
      marginTop: 5,
    },

    // ==================================================
    // ROLE BADGE
    // ==================================================

    roleBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 9,
      borderWidth: 1,
      marginBottom: 22,
    },

    roleBadgeText: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.3,
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
      marginLeft: 10,
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
    // SECTION
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
      fontSize: 24,
      fontWeight: "900",
      minHeight: 32,
    },

    statLabel: {
      fontSize: 12,
      marginTop: 3,
    },

    warningText: {
      fontSize: 11,
      fontWeight: "700",
      marginTop: 8,
    },

    dangerText: {
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

    actionIconText: {
      color: "#FFFFFF",
      fontSize: 22,
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
    // STATUS BADGES
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
    // EMPTY STATE
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
      textAlign: "center",
    },

    emptyButton: {
      marginTop: 16,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: 12,
    },

    emptyButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
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