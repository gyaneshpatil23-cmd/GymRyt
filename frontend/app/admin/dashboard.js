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

// ======================================================
// API
// ======================================================

const BASE_URL =
  "http://192.168.1.43:8000/api/members";

const DASHBOARD_API =
  `${BASE_URL}/dashboard-stats/`;

const MEMBERS_API =
  `${BASE_URL}/`;

const REVENUE_API =
  `${BASE_URL}/revenue-stats/`;

const ADMIN_PROFILE_PICTURE_API =
  `${BASE_URL}/admin/profile-picture/`;

const NOTIFICATION_UNREAD_API =
  `${BASE_URL}/notifications/unread-count/`;

// ======================================================
// OWNER-ONLY DASHBOARD
// ======================================================

export default function OwnerDashboard() {
  const {
    isDark,
    colors,
    toggleTheme,
  } = useTheme();

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
    useState("Owner");

  const [adminProfilePicture, setAdminProfilePicture] =
    useState(null);

  const [unreadNotifications, setUnreadNotifications] =
    useState(0);

  // ====================================================
  // SESSION
  // ====================================================

  const getAdminSession = async () => {
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
  // SESSION EXPIRED
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
  // PROFILE PICTURE
  // ====================================================

  const fetchAdminProfilePicture = async (token) => {
    try {
      const response = await fetch(
        ADMIN_PROFILE_PICTURE_API,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${token}`,
            Accept: "application/json",
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

      setAdminProfilePicture(
        data.profile_picture || null
      );
    } catch (error) {
      console.log(
        "PROFILE PICTURE ERROR:",
        error
      );
    }
  };

  // ====================================================
  // NOTIFICATION UNREAD COUNT
  // ====================================================

  const fetchUnreadNotifications = async (token) => {
    try {
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

      if (response.status === 401) {
        await handleSessionExpired();
        return;
      }

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      setUnreadNotifications(
        Number(data.unread_count ?? 0)
      );
    } catch (error) {
      console.log(
        "NOTIFICATION COUNT ERROR:",
        error
      );
    }
  };

  // ====================================================
  // OPEN NOTIFICATIONS
  // ====================================================

  const openNotifications = () => {
    router.push(
      "/admin/notifications"
    );
  };

  // ====================================================
  // FETCH DASHBOARD DATA
  // ====================================================

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const session =
        await getAdminSession();

      const token =
        session.token;

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

      if (session.username) {
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
      // NOTIFICATIONS
      // ==================================================

      await fetchUnreadNotifications(
        token
      );

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
      setLoading(false);
    }
  };

  // ====================================================
  // REFRESH WHEN SCREEN OPENS
  // ====================================================

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
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

  const getInitials = (name) => {
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

              {/* PROFILE PICTURE */}

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
                      adminUsername
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
                    styles.ownerName,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {adminUsername}
                </Text>

                <Text
                  style={[
                    styles.ownerRole,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                  numberOfLines={1}
                >
                  Manage your gym with ease.
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
              onPress={
                openNotifications
              }
            >
              <Ionicons
                name="notifications-outline"
                size={21}
                color={
                  colors.text
                }
              />

              {unreadNotifications > 0 && (
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
                    {unreadNotifications > 99
                      ? "99+"
                      : unreadNotifications}
                  </Text>
                </View>
              )}
            </Pressable>

          </View>

        </View>

        {/* ==================================================
            GYM OVERVIEW
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
                YOUR GYM
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
                Gym Overview
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
              colors={colors}
              onPress={() =>
                router.push(
                  "/admin/members"
                )
              }
            />

            <OverviewStat
              value={
                `₹${formattedRevenue}`
              }
              label="REVENUE"
              icon="cash-outline"
              iconColor="#45E0A5"
              colors={colors}
              onPress={() =>
                router.push(
                  "/admin/revenue"
                )
              }
            />

            <OverviewStat
              value={
                stats.expired_members
              }
              label={
                stats.expired_members > 0
                  ? "EXPIRED • NEEDS ATTENTION"
                  : "EXPIRED MEMBERS"
              }
              icon="close-circle-outline"
              iconColor="#FF5870"
              colors={colors}
              onPress={() =>
                router.push(
                  "/admin/members"
                )
              }
            />

            <OverviewStat
              value={
                stats.attendance_today
              }
              label="TODAY'S ATTENDANCE"
              icon="checkmark-circle-outline"
              iconColor="#FFB21C"
              colors={colors}
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

          <QuickAction
            icon="people-outline"
            title="Manage Members"
            subtitle="View and manage your gym members"
            colors={colors}
            onPress={() =>
              router.push(
                "/admin/members"
              )
            }
          />

          <QuickAction
            icon="barbell-outline"
            title="Manage Trainers"
            subtitle="Add and manage gym trainers"
            colors={colors}
            onPress={() =>
              router.push(
                "/admin/trainers"
              )
            }
          />

          <QuickAction
            icon="git-network-outline"
            title="Assign Trainers"
            subtitle="Assign members to personal trainers"
            colors={colors}
            onPress={() =>
              router.push(
                "/admin/trainerassignment"
              )
            }
          />

          <QuickAction
            icon="wallet-outline"
            title="Record Payment"
            subtitle="Record member payment"
            colors={colors}
            onPress={() =>
              router.push(
                "/admin/recordpayment"
              )
            }
          />

          <QuickAction
            icon="stats-chart-outline"
            title="Revenue & Reports"
            subtitle="View gym financial records"
            colors={colors}
            onPress={() =>
              router.push(
                "/admin/revenue"
              )
            }
          />

          <QuickAction
            icon="qr-code-outline"
            title="Registration QR"
            subtitle="Let members register"
            colors={colors}
            onPress={() =>
              router.push(
                "/admin/adminqr"
              )
            }
          />

        </View>

        {/* ==================================================
            RECENT MEMBERS
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
            RECENT MEMBERS
          </Text>

          <Pressable
            style={
              styles.seeAllButton
            }
            onPress={() =>
              router.push(
                "/admin/members"
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

        {recentMembers.length === 0 ? (
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
              No Members Yet
            </Text>

            <Text
              style={[
                styles.emptySubtitle,
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
              <MemberCard
                key={
                  member.id
                }
                member={
                  member
                }
                initials={getInitials(
                  member.name
                )}
                colors={colors}
                onPress={() =>
                  openMemberDetails(
                    member
                  )
                }
              />
            )
          )
        )}

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
            GYMRyt • OWNER
          </Text>
        </View>

      </ScrollView>

      {/* ==================================================
          BOTTOM NAVIGATION
      ================================================== */}

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
          active
          colors={colors}
          onPress={() => {}}
        />

        <BottomNavItem
          icon="people-outline"
          label="Members"
          colors={colors}
          onPress={() =>
            router.push(
              "/admin/members"
            )
          }
        />

        <BottomNavItem
          icon="qr-code-outline"
          label="Register"
          colors={colors}
          onPress={() =>
            router.push(
              "/admin/adminqr"
            )
          }
        />

        <BottomNavItem
          icon="stats-chart-outline"
          label="Reports"
          colors={colors}
          onPress={() =>
            router.push(
              "/admin/revenue"
            )
          }
        />

        <BottomNavItem
          icon="person-outline"
          label="Profile"
          colors={colors}
          onPress={() =>
            router.push(
              "/admin/profile"
            )
          }
        />

      </View>
    </View>
  );
}

// ======================================================
// OVERVIEW STAT
// ======================================================

function OverviewStat({
  value,
  label,
  icon,
  iconColor,
  colors,
  onPress,
}) {
  return (
    <Pressable
      style={[
        styles.statCard,
        {
          backgroundColor:
            colors.background,
          borderColor:
            colors.border,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
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
          name={icon}
          size={24}
          color={iconColor}
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
          numberOfLines={1}
          adjustsFontSizeToFit
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
    </Pressable>
  );
}

// ======================================================
// QUICK ACTION
// ======================================================

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
      onPress={onPress}
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
          name={icon}
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

// ======================================================
// MEMBER CARD
// ======================================================

function MemberCard({
  member,
  initials,
  colors,
  onPress,
}) {
  const status =
    String(
      member.status || ""
    ).toUpperCase();

  const isExpired =
    status === "EXPIRED";

  const isExpiring =
    status === "EXPIRING";

  const isActive =
    status === "ACTIVE";

  const statusColor =
    isExpired
      ? "#FF5870"
      : isExpiring
      ? "#FFB21C"
      : isActive
      ? "#45E0A5"
      : colors.secondaryText;

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
      onPress={onPress}
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
        <Text
          style={[
            styles.memberInitials,
            {
              color:
                statusColor,
            },
          ]}
        >
          {initials}
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
          {member.name}
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
            : `${calculateDaysRemaining(
                member.membership_end
              )} days remaining`}
        </Text>
      </View>

      {/* STATUS */}

      {status !== "" && (
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
      )}

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

// ======================================================
// BOTTOM NAV ITEM
// ======================================================

function BottomNavItem({
  icon,
  label,
  active = false,
  colors,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
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
          name={icon}
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

    container: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 18,
      paddingTop:
        Platform.OS === "ios"
          ? 54
          : 44,
      paddingBottom: 125,
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

    // ==================================================
    // HEADER
    // ==================================================

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
      flexDirection: "row",
      alignItems: "center",
    },

    profileAvatar: {
      width: 52,
      height: 52,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
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

    ownerName: {
      fontSize: 18,
      fontWeight: "900",
    },

    ownerRole: {
      fontSize: 10,
      fontWeight: "600",
      marginTop: 3,
    },

    // ==================================================
    // HEADER ACTIONS
    // ==================================================

    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    headerButton: {
      width: 43,
      height: 43,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },

    notificationBadge: {
      position: "absolute",
      right: -3,
      top: -4,
      minWidth: 17,
      height: 17,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },

    notificationBadgeText: {
      color: "#FFFFFF",
      fontSize: 7,
      fontWeight: "900",
    },

    // ==================================================
    // OVERVIEW CARD
    // ==================================================

    overviewCard: {
      borderWidth: 1,
      borderRadius: 26,
      padding: 16,
      marginBottom: 21,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
      flexDirection: "row",
      alignItems: "center",
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

    // ==================================================
    // STATS
    // ==================================================

    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },

    statCard: {
      width: "48.2%",
      minHeight: 105,
      borderWidth: 1,
      borderRadius: 20,
      padding: 12,
      marginBottom: 9,
      flexDirection: "row",
      alignItems: "center",
    },

    statIcon: {
      width: 43,
      height: 43,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
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

    // ==================================================
    // SECTION HEADER
    // ==================================================

    sectionHeaderSimple: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 11,
      marginTop: 2,
    },

    sectionHeading: {
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    seeAllButton: {
      flexDirection: "row",
      alignItems: "center",
    },

    seeAllText: {
      fontSize: 10,
      fontWeight: "800",
      marginRight: 2,
    },

    // ==================================================
    // QUICK ACTIONS
    // ==================================================

    quickGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
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
      alignItems: "center",
      justifyContent: "center",
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

    // ==================================================
    // EMPTY MEMBERS
    // ==================================================

    emptyCard: {
      borderWidth: 1,
      borderRadius: 21,
      paddingVertical: 28,
      paddingHorizontal: 18,
      alignItems: "center",
      marginBottom: 10,
    },

    emptyIcon: {
      width: 55,
      height: 55,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
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
      textAlign: "center",
    },

    // ==================================================
    // MEMBER CARD
    // ==================================================

    memberCard: {
      minHeight: 78,
      borderWidth: 1,
      borderRadius: 20,
      paddingVertical: 9,
      paddingLeft: 9,
      paddingRight: 8,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },

    memberAvatar: {
      width: 52,
      height: 52,
      borderRadius: 17,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
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

    // ==================================================
    // FOOTER
    // ==================================================

    footer: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 20,
      paddingBottom: 8,
      flexDirection: "row",
    },

    footerIcon: {
      width: 27,
      height: 27,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 7,
    },

    footerText: {
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.7,
    },

    // ==================================================
    // BOTTOM NAVIGATION
    // ==================================================

    bottomNav: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 82,
      borderTopWidth: 1,
      borderTopLeftRadius: 27,
      borderTopRightRadius: 27,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-around",
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
      alignItems: "center",
      justifyContent: "flex-start",
      position: "relative",
    },

    bottomIconContainer: {
      width: 42,
      height: 35,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
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