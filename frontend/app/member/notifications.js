import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  router,
  useFocusEffect,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../context/ThemeContext";

// ============================================================
// API CONFIGURATION
// ============================================================

const BASE_URL =
  "http://192.168.1.52:8000/api/members";

const NOTIFICATIONS_API =
  `${BASE_URL}/member-notifications/`;

const UNREAD_COUNT_API =
  `${BASE_URL}/member-notifications/unread-count/`;

const MARK_ALL_READ_API =
  `${BASE_URL}/member-notifications/mark-all-read/`;

// ============================================================
// BASE GYMRyt COLORS
// ============================================================

const GYM_COLORS = {
  background: "#070B14",
  backgroundSecondary: "#0B1120",

  card: "#101827",
  cardSecondary: "#131D2E",
  cardElevated: "#172235",

  border: "#223047",
  borderLight: "#2A3A55",

  text: "#F8FAFC",
  textSecondary: "#A8B3C5",
  textMuted: "#6F7C91",

  primary: "#6C63FF",
  primaryDark: "#554BE8",
  primaryLight: "#8B84FF",

  success: "#22C55E",
  successSoft: "#163B2A",

  warning: "#F59E0B",
  warningSoft: "#3B2D12",

  danger: "#EF4444",
  dangerSoft: "#3A181D",

  white: "#FFFFFF",
  black: "#000000",

  nav: "#0A101C",
};

// ============================================================
// MEMBER NOTIFICATIONS SCREEN
// ============================================================

export default function MemberNotifications() {
  // ==========================================================
  // THEME
  // ==========================================================

  const {
    isDark,
    colors,
    toggleTheme,
  } = useTheme();

  // ==========================================================
  // ACTIVE THEME COLORS
  // ==========================================================

  const themeColors = useMemo(() => {
    const c = colors || {};

    return {
      ...GYM_COLORS,

      background:
        c.background ||
        (isDark
          ? GYM_COLORS.background
          : "#F5F7FB"),

      backgroundSecondary:
        c.backgroundSecondary ||
        (isDark
          ? GYM_COLORS.backgroundSecondary
          : "#EEF1F7"),

      card:
        c.card ||
        (isDark
          ? GYM_COLORS.card
          : "#FFFFFF"),

      cardSecondary:
        c.cardSecondary ||
        (isDark
          ? GYM_COLORS.cardSecondary
          : "#F8F9FC"),

      cardElevated:
        c.cardElevated ||
        (isDark
          ? GYM_COLORS.cardElevated
          : "#FFFFFF"),

      border:
        c.border ||
        (isDark
          ? GYM_COLORS.border
          : "#E1E6EF"),

      borderLight:
        c.borderLight ||
        (isDark
          ? GYM_COLORS.borderLight
          : "#D5DBE6"),

      text:
        c.text ||
        (isDark
          ? GYM_COLORS.text
          : "#111827"),

      textSecondary:
        c.secondaryText ||
        c.textSecondary ||
        (isDark
          ? GYM_COLORS.textSecondary
          : "#5B6472"),

      textMuted:
        c.mutedText ||
        c.textMuted ||
        (isDark
          ? GYM_COLORS.textMuted
          : "#7B8494"),

      primary:
        c.primary ||
        GYM_COLORS.primary,

      primaryDark:
        c.primaryDark ||
        GYM_COLORS.primaryDark,

      primaryLight:
        c.primaryLight ||
        GYM_COLORS.primaryLight,

      success:
        c.success ||
        GYM_COLORS.success,

      successSoft:
        c.successBackground ||
        c.successSoft ||
        (isDark
          ? GYM_COLORS.successSoft
          : "#E9F9EF"),

      warning:
        c.warning ||
        GYM_COLORS.warning,

      warningSoft:
        c.warningBackground ||
        c.warningSoft ||
        (isDark
          ? GYM_COLORS.warningSoft
          : "#FFF6DF"),

      danger:
        c.danger ||
        GYM_COLORS.danger,

      dangerSoft:
        c.dangerBackground ||
        c.dangerSoft ||
        (isDark
          ? GYM_COLORS.dangerSoft
          : "#FDEBEC"),

      nav:
        c.nav ||
        (isDark
          ? GYM_COLORS.nav
          : "#FFFFFF"),

      white: GYM_COLORS.white,
      black: GYM_COLORS.black,
    };
  }, [colors, isDark]);

  // ==========================================================
  // DYNAMIC STYLES
  // ==========================================================

  const styles = useMemo(
    () => createStyles(themeColors),
    [themeColors]
  );

  // ==========================================================
  // STATE
  // ==========================================================

  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [processingId, setProcessingId] =
    useState(null);

  // ==========================================================
  // GET MEMBER TOKEN
  // ==========================================================

  const getMemberToken = async () => {
    try {
      const token =
        await AsyncStorage.getItem(
          "memberToken"
        );

      return token;
    } catch (error) {
      console.log(
        "GET MEMBER TOKEN ERROR:",
        error
      );

      return null;
    }
  };

  // ==========================================================
  // SESSION EXPIRED
  // ==========================================================

  const handleSessionExpired =
    useCallback(async () => {
      try {
        await AsyncStorage.multiRemove([
          "memberToken",
          "memberId",
          "memberName",
          "memberUsername",
          "memberEmail",
          "memberPhone",
          "memberStatus",
          "memberMembershipStart",
          "memberMembershipEnd",
          "memberWorkspaceName",
          "memberProfilePicture",
        ]);
      } catch (error) {
        console.log(
          "MEMBER SESSION CLEAR ERROR:",
          error
        );
      }

      Alert.alert(
        "Session Expired",
        "Your member session has expired. Please login again.",
        [
          {
            text: "OK",
            onPress: () => {
              router.replace("/");
            },
          },
        ]
      );
    }, []);

  // ==========================================================
  // FETCH NOTIFICATIONS
  // ==========================================================

  const fetchNotifications =
    useCallback(async () => {
      try {
        const memberToken =
          await getMemberToken();

        // ------------------------------------------------------
        // NO TOKEN
        // ------------------------------------------------------

        if (!memberToken) {
          await handleSessionExpired();
          return;
        }

        // ------------------------------------------------------
        // REQUEST
        // ------------------------------------------------------

        const response =
          await fetch(
            NOTIFICATIONS_API,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",

                "X-Member-Token":
                  memberToken,
              },
            }
          );

        console.log(
          "MEMBER NOTIFICATIONS STATUS:",
          response.status
        );

        // ------------------------------------------------------
        // SESSION EXPIRED
        // ------------------------------------------------------

        if (response.status === 401) {
          await handleSessionExpired();
          return;
        }

        // ------------------------------------------------------
        // SERVER ERROR
        // ------------------------------------------------------

        if (!response.ok) {
          const errorText =
            await response.text();

          console.log(
            "MEMBER NOTIFICATIONS ERROR:",
            errorText
          );

          throw new Error(
            "Failed to fetch notifications"
          );
        }

        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------

        const data =
          await response.json();

        console.log(
          "MEMBER NOTIFICATIONS DATA:",
          data
        );

        // ------------------------------------------------------
        // NORMALIZE LIST
        // ------------------------------------------------------

        let notificationList = [];

        if (Array.isArray(data)) {
          notificationList = data;
        } else if (
          Array.isArray(data.notifications)
        ) {
          notificationList =
            data.notifications;
        } else if (
          Array.isArray(data.results)
        ) {
          notificationList =
            data.results;
        }

        // ------------------------------------------------------
        // SET NOTIFICATIONS
        // ------------------------------------------------------

        setNotifications(
          notificationList
        );

        // ------------------------------------------------------
        // UNREAD COUNT
        // ------------------------------------------------------

        if (
          typeof data.unread_count !==
          "undefined"
        ) {
          setUnreadCount(
            Number(
              data.unread_count || 0
            )
          );
        } else {
          const unread =
            notificationList.filter(
              (item) =>
                !item.is_read
            ).length;

          setUnreadCount(unread);
        }
      } catch (error) {
        console.log(
          "FETCH MEMBER NOTIFICATIONS ERROR:",
          error
        );

        Alert.alert(
          "Error",
          "Could not load notifications."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [
      handleSessionExpired,
    ]);

  // ==========================================================
  // LOAD UNREAD COUNT
  // ==========================================================

  const fetchUnreadCount =
    useCallback(async () => {
      try {
        const memberToken =
          await getMemberToken();

        if (!memberToken) {
          return;
        }

        const response =
          await fetch(
            UNREAD_COUNT_API,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",

                "X-Member-Token":
                  memberToken,
              },
            }
          );

        if (
          response.status === 401
        ) {
          await handleSessionExpired();
          return;
        }

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        setUnreadCount(
          Number(
            data.unread_count || 0
          )
        );
      } catch (error) {
        console.log(
          "MEMBER UNREAD COUNT ERROR:",
          error
        );
      }
    }, [
      handleSessionExpired,
    ]);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ==========================================================
  // REFRESH WHEN SCREEN GETS FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  // ==========================================================
  // REFRESH
  // ==========================================================

  const onRefresh = async () => {
    try {
      setRefreshing(true);

      await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // ==========================================================
  // MARK SINGLE NOTIFICATION AS READ
  // ==========================================================

  const markNotificationAsRead =
    async (notification) => {
      try {
        if (!notification) {
          return false;
        }

        // ------------------------------------------------------
        // ALREADY READ
        // ------------------------------------------------------

        if (notification.is_read) {
          return true;
        }

        const memberToken =
          await getMemberToken();

        if (!memberToken) {
          await handleSessionExpired();
          return false;
        }

        setProcessingId(
          notification.id
        );

        const response =
          await fetch(
            `${NOTIFICATIONS_API}${notification.id}/read/`,
            {
              method: "PATCH",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",

                "X-Member-Token":
                  memberToken,
              },
            }
          );

        console.log(
          "MEMBER MARK READ STATUS:",
          response.status
        );

        // ------------------------------------------------------
        // SESSION EXPIRED
        // ------------------------------------------------------

        if (response.status === 401) {
          await handleSessionExpired();
          return false;
        }

        // ------------------------------------------------------
        // FAILED
        // ------------------------------------------------------

        if (!response.ok) {
          const errorText =
            await response.text();

          console.log(
            "MEMBER MARK READ ERROR:",
            errorText
          );

          return false;
        }

        // ------------------------------------------------------
        // LOCAL STATE
        // ------------------------------------------------------

        setNotifications(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                notification.id
                  ? {
                      ...item,
                      is_read: true,
                    }
                  : item
            )
        );

        setUnreadCount(
          (previous) =>
            Math.max(
              0,
              previous - 1
            )
        );

        return true;
      } catch (error) {
        console.log(
          "MARK MEMBER NOTIFICATION READ ERROR:",
          error
        );

        return false;
      } finally {
        setProcessingId(null);
      }
    };

  // ==========================================================
  // HANDLE NOTIFICATION PRESS
  // ==========================================================

  const handleNotificationPress =
    async (notification) => {
      if (!notification) {
        return;
      }

      console.log(
        "======================================"
      );

      console.log(
        "MEMBER NOTIFICATION PRESSED:"
      );

      console.log(notification);

      console.log(
        "NOTIFICATION TYPE:",
        notification.notification_type
      );

      console.log(
        "RELATED ID:",
        notification.related_id
      );

      console.log(
        "======================================"
      );

      // --------------------------------------------------------
      // MARK AS READ
      // --------------------------------------------------------

      if (!notification.is_read) {
        const marked =
          await markNotificationAsRead(
            notification
          );

        if (!marked) {
          return;
        }
      }

      // --------------------------------------------------------
      // NOTIFICATION TYPE
      // --------------------------------------------------------

      const type =
        notification.notification_type;

      // --------------------------------------------------------
      // TRAINER ASSIGNED
      // --------------------------------------------------------

      if (
        type ===
        "TRAINER_ASSIGNED"
      ) {
        Alert.alert(
          "Trainer Assigned",
          notification.message ||
            "A trainer has been assigned to you."
        );

        return;
      }

      // --------------------------------------------------------
      // WORKOUT UPLOADED
      // --------------------------------------------------------

      if (
        type ===
        "WORKOUT_UPLOADED"
      ) {
        Alert.alert(
          notification.title ||
            "Workout Updated",
          notification.message ||
            "Your trainer has updated your workout plan."
        );

        return;
      }

      // --------------------------------------------------------
      // MEMBERSHIP EXPIRING
      // --------------------------------------------------------

      if (
        type ===
        "MEMBERSHIP_EXPIRING"
      ) {
        Alert.alert(
          notification.title ||
            "Membership Expiring",
          notification.message ||
            "Your membership is expiring soon."
        );

        return;
      }

      // --------------------------------------------------------
      // MEMBERSHIP EXPIRED
      // --------------------------------------------------------

      if (
        type ===
        "MEMBERSHIP_EXPIRED"
      ) {
        Alert.alert(
          notification.title ||
            "Membership Expired",
          notification.message ||
            "Your membership has expired."
        );

        return;
      }

      // --------------------------------------------------------
      // PAYMENT RECEIVED
      // --------------------------------------------------------

      if (
        type ===
        "PAYMENT_RECEIVED"
      ) {
        Alert.alert(
          notification.title ||
            "Payment Received",
          notification.message ||
            "Your payment has been received successfully."
        );

        return;
      }

      // --------------------------------------------------------
      // PAYMENT FAILED
      // --------------------------------------------------------

      if (
        type ===
        "PAYMENT_FAILED"
      ) {
        Alert.alert(
          notification.title ||
            "Payment Failed",
          notification.message ||
            "Your payment could not be processed."
        );

        return;
      }

      // --------------------------------------------------------
      // WELCOME
      // --------------------------------------------------------

      if (
        type ===
        "WELCOME"
      ) {
        Alert.alert(
          notification.title ||
            "Welcome to GymRyt",
          notification.message ||
            "Welcome to GymRyt."
        );

        return;
      }

      // --------------------------------------------------------
      // DEFAULT
      // --------------------------------------------------------

      Alert.alert(
        notification.title ||
          "Notification",
        notification.message ||
          "You have a new notification."
      );
    };

  // ==========================================================
  // MARK ALL AS READ
  // ==========================================================

  const markAllAsRead =
    async () => {
      try {
        if (unreadCount === 0) {
          return;
        }

        const memberToken =
          await getMemberToken();

        if (!memberToken) {
          await handleSessionExpired();
          return;
        }

        setProcessingId("all");

        const response =
          await fetch(
            MARK_ALL_READ_API,
            {
              method: "PATCH",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",

                "X-Member-Token":
                  memberToken,
              },
            }
          );

        console.log(
          "MEMBER MARK ALL READ STATUS:",
          response.status
        );

        // ------------------------------------------------------
        // SESSION EXPIRED
        // ------------------------------------------------------

        if (response.status === 401) {
          await handleSessionExpired();
          return;
        }

        // ------------------------------------------------------
        // FAILED
        // ------------------------------------------------------

        if (!response.ok) {
          const errorText =
            await response.text();

          console.log(
            "MEMBER MARK ALL READ ERROR:",
            errorText
          );

          throw new Error(
            "Failed to mark all notifications as read"
          );
        }

        // ------------------------------------------------------
        // LOCAL STATE
        // ------------------------------------------------------

        setNotifications(
          (previous) =>
            previous.map(
              (item) => ({
                ...item,
                is_read: true,
              })
            )
        );

        setUnreadCount(0);
      } catch (error) {
        console.log(
          "MARK ALL MEMBER NOTIFICATIONS ERROR:",
          error
        );

        Alert.alert(
          "Error",
          "Could not mark all notifications as read."
        );
      } finally {
        setProcessingId(null);
      }
    };

  // ==========================================================
  // NOTIFICATION ICON
  // ==========================================================

  const getNotificationIcon =
    (type) => {
      switch (type) {
        case "TRAINER_ASSIGNED":
          return "people-outline";

        case "WORKOUT_UPLOADED":
          return "barbell-outline";

        case "MEMBERSHIP_EXPIRING":
          return "time-outline";

        case "MEMBERSHIP_EXPIRED":
          return "warning-outline";

        case "PAYMENT_RECEIVED":
          return "checkmark-circle-outline";

        case "PAYMENT_FAILED":
          return "close-circle-outline";

        case "WELCOME":
          return "hand-left-outline";

        default:
          return "notifications-outline";
      }
    };

  // ==========================================================
  // NOTIFICATION ICON COLOR
  // ==========================================================

  const getNotificationIconColor =
    (type) => {
      switch (type) {
        case "TRAINER_ASSIGNED":
          return themeColors.iconBlue ||
            "#3B82F6";

        case "WORKOUT_UPLOADED":
          return themeColors.primaryLight;

        case "MEMBERSHIP_EXPIRING":
          return themeColors.warning;

        case "MEMBERSHIP_EXPIRED":
          return themeColors.danger;

        case "PAYMENT_RECEIVED":
          return themeColors.success;

        case "PAYMENT_FAILED":
          return themeColors.danger;

        case "WELCOME":
          return themeColors.primaryLight;

        default:
          return themeColors.primaryLight;
      }
    };

  // ==========================================================
  // NOTIFICATION CATEGORY
  // ==========================================================

  const getNotificationCategory =
    (type) => {
      switch (type) {
        case "TRAINER_ASSIGNED":
          return "TRAINER";

        case "WORKOUT_UPLOADED":
          return "WORKOUT";

        case "MEMBERSHIP_EXPIRING":
          return "MEMBERSHIP";

        case "MEMBERSHIP_EXPIRED":
          return "MEMBERSHIP";

        case "PAYMENT_RECEIVED":
          return "PAYMENT";

        case "PAYMENT_FAILED":
          return "PAYMENT";

        case "WELCOME":
          return "WELCOME";

        default:
          return "GYM UPDATE";
      }
    };

  // ==========================================================
  // RELATIVE TIME
  // ==========================================================

  const getRelativeTime =
    (dateString) => {
      if (!dateString) {
        return "";
      }

      const date =
        new Date(dateString);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "";
      }

      const now =
        new Date();

      const difference =
        now.getTime() -
        date.getTime();

      const seconds =
        Math.max(
          0,
          Math.floor(
            difference / 1000
          )
        );

      if (seconds < 60) {
        return "Just now";
      }

      const minutes =
        Math.floor(
          seconds / 60
        );

      if (minutes < 60) {
        return (
          minutes +
          (
            minutes === 1
              ? " minute ago"
              : " minutes ago"
          )
        );
      }

      const hours =
        Math.floor(
          minutes / 60
        );

      if (hours < 24) {
        return (
          hours +
          (
            hours === 1
              ? " hour ago"
              : " hours ago"
          )
        );
      }

      const days =
        Math.floor(
          hours / 24
        );

      if (days < 7) {
        return (
          days +
          (
            days === 1
              ? " day ago"
              : " days ago"
          )
        );
      }

      return date.toLocaleDateString();
    };

  // ==========================================================
  // RENDER NOTIFICATION
  // ==========================================================

  const renderNotification =
    ({ item }) => {
      const isUnread =
        !item.is_read;

      const isProcessing =
        processingId === item.id;

      const iconColor =
        getNotificationIconColor(
          item.notification_type
        );

      return (
        <Pressable
          style={({ pressed }) => [
            styles.notificationCard,

            isUnread &&
              styles.unreadCard,

            {
              opacity:
                pressed
                  ? 0.75
                  : 1,
            },
          ]}
          onPress={() =>
            handleNotificationPress(
              item
            )
          }
          disabled={isProcessing}
        >
          {/* ==================================================
              ICON
          ================================================== */}

          <View
            style={[
              styles.iconContainer,

              isUnread &&
                styles.unreadIconContainer,

              {
                backgroundColor:
                  isUnread
                    ? `${iconColor}20`
                    : themeColors.cardSecondary,
              },
            ]}
          >
            <Ionicons
              name={getNotificationIcon(
                item.notification_type
              )}
              size={23}
              color={iconColor}
            />
          </View>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <View
            style={
              styles.notificationContent
            }
          >
            <View
              style={
                styles.titleRow
              }
            >
              <Text
                style={
                  styles.categoryText
                }
              >
                {getNotificationCategory(
                  item.notification_type
                )}
              </Text>

              {isUnread && (
                <View
                  style={
                    styles.unreadDot
                  }
                />
              )}
            </View>

            <Text
              style={
                styles.notificationTitle
              }
              numberOfLines={2}
            >
              {item.title ||
                "Notification"}
            </Text>

            <Text
              style={
                styles.notificationMessage
              }
              numberOfLines={3}
            >
              {item.message || ""}
            </Text>

            <Text
              style={
                styles.timeText
              }
            >
              {getRelativeTime(
                item.created_at
              )}
            </Text>
          </View>

          {/* ==================================================
              ARROW / LOADING
          ================================================== */}

          {isProcessing ? (
            <ActivityIndicator
              size="small"
              color={
                themeColors.primary
              }
              style={
                styles.processingIndicator
              }
            />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={19}
              color={
                themeColors.textMuted
              }
              style={
                styles.arrow
              }
            />
          )}
        </Pressable>
      );
    };

  // ==========================================================
  // EMPTY STATE
  // ==========================================================

  const renderEmptyState =
    () => {
      if (loading) {
        return null;
      }

      return (
        <View
          style={
            styles.emptyContainer
          }
        >
          <View
            style={
              styles.emptyIconContainer
            }
          >
            <Ionicons
              name="notifications-off-outline"
              size={34}
              color={
                themeColors.textMuted
              }
            />
          </View>

          <Text
            style={
              styles.emptyTitle
            }
          >
            No Notifications
          </Text>

          <Text
            style={
              styles.emptyMessage
            }
          >
            You're all caught up.
            {"\n"}
            New gym updates will
            appear here.
          </Text>
        </View>
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <View
        style={
          styles.container
        }
      >
        <StatusBar
          barStyle={
            isDark
              ? "light-content"
              : "dark-content"
          }
          backgroundColor={
            themeColors.background
          }
        />

        <View
          style={
            styles.loadingContainer
          }
        >
          <View
            style={
              styles.loadingIconContainer
            }
          >
            <Ionicons
              name="notifications"
              size={28}
              color={
                themeColors.primaryLight
              }
            />
          </View>

          <ActivityIndicator
            size="small"
            color={
              themeColors.primary
            }
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading notifications...
          </Text>
        </View>
      </View>
    );
  }

  // ==========================================================
  // MAIN SCREEN
  // ==========================================================

  return (
    <View
      style={
        styles.container
      }
    >
      <StatusBar
        barStyle={
          isDark
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={
          themeColors.background
        }
      />

      {/* ======================================================
          HEADER
      ====================================================== */}

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
          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color={
                themeColors.text
              }
            />
          </Pressable>

          <View
            style={
              styles.headerTextContainer
            }
          >
            <Text
              style={
                styles.headerSmallTitle
              }
            >
              GYMRyt
            </Text>

            <Text
              style={
                styles.headerTitle
              }
            >
              Notifications
            </Text>
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
            style={
              styles.headerButton
            }
            onPress={() => {
              console.log(
                "NOTIFICATION THEME BUTTON PRESSED"
              );

              toggleTheme();
            }}
          >
            <Ionicons
              name={
                isDark
                  ? "sunny-outline"
                  : "moon-outline"
              }
              size={20}
              color={
                themeColors.primaryLight
              }
            />
          </Pressable>

          {/* UNREAD */}

          {unreadCount > 0 && (
            <View
              style={
                styles.headerUnreadBadge
              }
            >
              <Text
                style={
                  styles.headerUnreadBadgeText
                }
              >
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <View
        style={
          styles.summaryContainer
        }
      >
        <View
          style={
            styles.summaryIconContainer
          }
        >
          <Ionicons
            name="notifications-outline"
            size={21}
            color={
              themeColors.primaryLight
            }
          />
        </View>

        <View
          style={
            styles.summaryTextContainer
          }
        >
          <Text
            style={
              styles.summaryTitle
            }
          >
            Recent Activity
          </Text>

          <Text
            style={
              styles.summarySubtitle
            }
          >
            Stay updated with your gym
          </Text>
        </View>

        {unreadCount > 0 && (
          <View
            style={
              styles.unreadBadge
            }
          >
            <Text
              style={
                styles.unreadBadgeText
              }
            >
              {unreadCount > 99
                ? "99+"
                : unreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* ======================================================
          MARK ALL
      ====================================================== */}

      {unreadCount > 0 && (
        <View
          style={
            styles.markAllContainer
          }
        >
          <Text
            style={
              styles.unreadDescription
            }
          >
            You have {unreadCount} unread{" "}
            {unreadCount === 1
              ? "notification"
              : "notifications"}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.markAllButton,
              {
                opacity:
                  pressed
                    ? 0.7
                    : 1,
              },
            ]}
            onPress={
              markAllAsRead
            }
            disabled={
              processingId === "all"
            }
          >
            {processingId === "all" ? (
              <ActivityIndicator
                size="small"
                color={
                  themeColors.primaryLight
                }
              />
            ) : (
              <>
                <Ionicons
                  name="checkmark-done-outline"
                  size={15}
                  color={
                    themeColors.primaryLight
                  }
                />

                <Text
                  style={
                    styles.markAllText
                  }
                >
                  Mark all
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* ======================================================
          NOTIFICATION LIST
      ====================================================== */}

      <FlatList
        data={notifications}
        keyExtractor={
          (item, index) =>
            String(
              item.id || index
            )
        }
        renderItem={
          renderNotification
        }
        ListEmptyComponent={
          renderEmptyState
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          notifications.length === 0
            ? styles.emptyList
            : styles.listContent
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
              themeColors.primary
            }
            colors={[
              themeColors.primary,
            ]}
            progressBackgroundColor={
              themeColors.card
            }
          />
        }
      />
    </View>
  );
}

// ============================================================
// DYNAMIC STYLES
// ============================================================

const createStyles = (
  GYM_COLORS
) =>
  StyleSheet.create({
    // ========================================================
    // CONTAINER
    // ========================================================

    container: {
      flex: 1,
      backgroundColor:
        GYM_COLORS.background,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      paddingHorizontal: 18,
      paddingTop: 52,
      paddingBottom: 17,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      borderBottomWidth: 1,
      borderBottomColor:
        GYM_COLORS.border,
    },

    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    backButton: {
      width: 44,
      height: 44,

      borderRadius: 14,

      backgroundColor:
        GYM_COLORS.card,

      borderWidth: 1,
      borderColor:
        GYM_COLORS.border,

      alignItems: "center",
      justifyContent: "center",
    },

    headerTextContainer: {
      marginLeft: 12,
      flex: 1,
    },

    headerSmallTitle: {
      color:
        GYM_COLORS.primaryLight,

      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 2,
    },

    headerTitle: {
      color:
        GYM_COLORS.text,

      fontSize: 22,
      fontWeight: "900",

      marginTop: 2,
    },

    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 10,
    },

    headerButton: {
      width: 43,
      height: 43,

      borderRadius: 14,

      backgroundColor:
        GYM_COLORS.card,

      borderWidth: 1,
      borderColor:
        GYM_COLORS.border,

      alignItems: "center",
      justifyContent: "center",
    },

    headerUnreadBadge: {
      position: "absolute",

      right: -5,
      top: -5,

      minWidth: 18,
      height: 18,

      paddingHorizontal: 4,

      borderRadius: 10,

      backgroundColor:
        GYM_COLORS.danger,

      borderWidth: 2,
      borderColor:
        GYM_COLORS.background,

      alignItems: "center",
      justifyContent: "center",
    },

    headerUnreadBadgeText: {
      color:
        GYM_COLORS.white,

      fontSize: 7,
      fontWeight: "900",
    },

    // ========================================================
    // SUMMARY
    // ========================================================

    summaryContainer: {
      marginHorizontal: 18,
      marginTop: 18,

      padding: 15,

      flexDirection: "row",
      alignItems: "center",

      backgroundColor:
        GYM_COLORS.card,

      borderWidth: 1,
      borderColor:
        GYM_COLORS.border,

      borderRadius: 18,
    },

    summaryIconContainer: {
      width: 44,
      height: 44,

      borderRadius: 14,

      backgroundColor:
        `${GYM_COLORS.primary}18`,

      borderWidth: 1,
      borderColor:
        `${GYM_COLORS.primary}30`,

      alignItems: "center",
      justifyContent: "center",
    },

    summaryTextContainer: {
      flex: 1,
      marginLeft: 12,
    },

    summaryTitle: {
      color:
        GYM_COLORS.text,

      fontSize: 15,
      fontWeight: "900",
    },

    summarySubtitle: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 10,
      fontWeight: "600",

      marginTop: 3,
    },

    unreadBadge: {
      minWidth: 32,
      height: 32,

      paddingHorizontal: 8,

      borderRadius: 16,

      backgroundColor:
        GYM_COLORS.danger,

      alignItems: "center",
      justifyContent: "center",
    },

    unreadBadgeText: {
      color:
        GYM_COLORS.white,

      fontSize: 10,
      fontWeight: "900",
    },

    // ========================================================
    // MARK ALL
    // ========================================================

    markAllContainer: {
      marginHorizontal: 18,
      marginTop: 12,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    unreadDescription: {
      flex: 1,

      color:
        GYM_COLORS.textMuted,

      fontSize: 10,
      fontWeight: "600",
    },

    markAllButton: {
      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 12,
      paddingVertical: 8,

      borderRadius: 11,

      backgroundColor:
        `${GYM_COLORS.primary}15`,

      borderWidth: 1,
      borderColor:
        `${GYM_COLORS.primary}35`,
    },

    markAllText: {
      color:
        GYM_COLORS.primaryLight,

      fontSize: 10,
      fontWeight: "900",

      marginLeft: 5,
    },

    // ========================================================
    // LIST
    // ========================================================

    listContent: {
      paddingHorizontal: 18,
      paddingTop: 15,
      paddingBottom: 30,
    },

    emptyList: {
      flexGrow: 1,

      paddingHorizontal: 18,
      paddingBottom: 40,
    },

    // ========================================================
    // NOTIFICATION CARD
    // ========================================================

    notificationCard: {
      flexDirection: "row",
      alignItems: "flex-start",

      backgroundColor:
        GYM_COLORS.card,

      borderWidth: 1,
      borderColor:
        GYM_COLORS.border,

      borderRadius: 18,

      padding: 15,

      marginBottom: 11,
    },

    unreadCard: {
      backgroundColor:
        GYM_COLORS.cardSecondary,

      borderColor:
        `${GYM_COLORS.primary}55`,
    },

    // ========================================================
    // ICON
    // ========================================================

    iconContainer: {
      width: 48,
      height: 48,

      borderRadius: 15,

      backgroundColor:
        GYM_COLORS.cardSecondary,

      borderWidth: 1,
      borderColor:
        GYM_COLORS.border,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 13,
    },

    unreadIconContainer: {
      borderColor:
        `${GYM_COLORS.primary}35`,
    },

    // ========================================================
    // CONTENT
    // ========================================================

    notificationContent: {
      flex: 1,
      paddingRight: 5,
    },

    titleRow: {
      flexDirection: "row",
      alignItems: "center",

      marginBottom: 4,
    },

    categoryText: {
      color:
        GYM_COLORS.primaryLight,

      fontSize: 8,
      fontWeight: "900",

      letterSpacing: 1.2,
    },

    unreadDot: {
      width: 7,
      height: 7,

      borderRadius: 4,

      backgroundColor:
        GYM_COLORS.danger,

      marginLeft: 7,
    },

    notificationTitle: {
      color:
        GYM_COLORS.text,

      fontSize: 14,
      fontWeight: "900",

      marginTop: 2,
    },

    notificationMessage: {
      color:
        GYM_COLORS.textSecondary,

      fontSize: 11,
      lineHeight: 17,

      marginTop: 5,
    },

    timeText: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 9,
      fontWeight: "700",

      marginTop: 8,
    },

    arrow: {
      marginLeft: 5,
      marginTop: 14,
    },

    processingIndicator: {
      marginLeft: 5,
      marginTop: 14,
    },

    // ========================================================
    // EMPTY STATE
    // ========================================================

    emptyContainer: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 30,
    },

    emptyIconContainer: {
      width: 82,
      height: 82,

      borderRadius: 26,

      backgroundColor:
        GYM_COLORS.card,

      borderWidth: 1,
      borderColor:
        GYM_COLORS.border,

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 18,
    },

    emptyTitle: {
      color:
        GYM_COLORS.text,

      fontSize: 19,
      fontWeight: "900",
    },

    emptyMessage: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 12,
      lineHeight: 19,

      textAlign: "center",

      marginTop: 8,
    },

    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",
    },

    loadingIconContainer: {
      width: 64,
      height: 64,

      borderRadius: 20,

      backgroundColor:
        `${GYM_COLORS.primary}18`,

      borderWidth: 1,
      borderColor:
        `${GYM_COLORS.primary}30`,

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 20,
    },

    loadingText: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 12,
      fontWeight: "600",

      marginTop: 14,
    },
  });