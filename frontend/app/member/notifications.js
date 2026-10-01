import React, {
  useCallback,
  useEffect,
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
  Platform,
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
  "http://192.168.1.43:8000/api/members";

const NOTIFICATIONS_API =
  `${BASE_URL}/member-notifications/`;

const UNREAD_COUNT_API =
  `${BASE_URL}/member-notifications/unread-count/`;

const MARK_ALL_READ_API =
  `${BASE_URL}/member-notifications/mark-all-read/`;

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
          return "#36B7FF";

        case "WORKOUT_UPLOADED":
          return "#A78BFA";

        case "MEMBERSHIP_EXPIRING":
          return "#FFB21C";

        case "MEMBERSHIP_EXPIRED":
          return "#FF5870";

        case "PAYMENT_RECEIVED":
          return "#45E0A5";

        case "PAYMENT_FAILED":
          return "#FF5870";

        case "WELCOME":
          return "#36B7FF";

        default:
          return "#60A5FA";
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

      const icon = {
        name:
          getNotificationIcon(
            item.notification_type
          ),

        color:
          getNotificationIconColor(
            item.notification_type
          ),
      };


      return (

        <Pressable

          style={[
            styles.notificationCard,

            {
              backgroundColor:
                colors.card,

              borderColor:
                isUnread
                  ? `${icon.color}66`
                  : colors.border,
            },
          ]}

          onPress={() =>
            handleNotificationPress(
              item
            )
          }

          android_ripple={{
            color:
              colors.iconBackground,
          }}

          disabled={
            isProcessing
          }

        >

          {/* =================================================
              ICON
          ================================================= */}

          <View
            style={[
              styles.iconContainer,

              {
                backgroundColor:
                  `${icon.color}18`,
              },
            ]}
          >

            <Ionicons
              name={
                icon.name
              }
              size={22}
              color={
                icon.color
              }
            />

          </View>


          {/* =================================================
              CONTENT
          ================================================= */}

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
                style={[
                  styles.categoryText,

                  {
                    color:
                      icon.color,
                  },
                ]}
              >
                {getNotificationCategory(
                  item.notification_type
                )}
              </Text>


              {isUnread && (

                <View
                  style={[
                    styles.unreadDot,

                    {
                      backgroundColor:
                        colors.primaryLight,
                    },
                  ]}
                />

              )}

            </View>


            <Text
              style={[
                styles.notificationTitle,

                {
                  color:
                    colors.text,
                },
              ]}
            >
              {item.title ||
                "Notification"}
            </Text>


            <Text
              style={[
                styles.notificationMessage,

                {
                  color:
                    colors.secondaryText,
                },
              ]}
              numberOfLines={3}
            >
              {item.message ||
                ""}
            </Text>


            <View
              style={
                styles.timeRow
              }
            >

              <Ionicons
                name="time-outline"
                size={10}
                color={
                  colors.mutedText
                }
              />

              <Text
                style={[
                  styles.timeText,

                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                {getRelativeTime(
                  item.created_at
                )}
              </Text>

            </View>

          </View>


          {/* =================================================
              ARROW
          ================================================= */}

          {isProcessing ? (

            <ActivityIndicator
              size="small"
              color={
                colors.primary
              }
            />

          ) : (

            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                colors.secondaryText
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
              name="notifications-off-outline"
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
            No Notifications
          </Text>


          <Text
            style={[
              styles.emptyMessage,

              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            You&apos;re all caught up.
            {"\n"}
            New gym updates will
            appear here.
          </Text>

        </View>
      );
    };


  // ==========================================================
  // LOADING STATE
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
                colors.mutedText,
            },
          ]}
        >
          Loading notifications...
        </Text>

      </View>
    );
  }


  // ==========================================================
  // MAIN SCREEN
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

      <StatusBar
        barStyle={
          isDark
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={
          colors.background
        }
      />


      {/* =====================================================
          HEADER
      ===================================================== */}

      <View
        style={
          styles.header
        }
      >

        <View
          style={
            styles.headerTop
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
              GYMRYT • MEMBER
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
              Notifications
            </Text>

          </View>


          {/* ===================================================
              HEADER ACTIONS
          =================================================== */}

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
                size={20}
                color={
                  colors.text
                }
              />

            </Pressable>


            {/* BACK */}

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
                router.back()
              }
            >

              <Ionicons
                name="arrow-back"
                size={20}
                color={
                  colors.text
                }
              />

            </Pressable>

          </View>

        </View>


        {/* ===================================================
            SUMMARY
        =================================================== */}

        <View
          style={[
            styles.summaryCard,

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
              styles.summaryIcon,

              {
                backgroundColor:
                  colors.iconBackground,
              },
            ]}
          >

            <Ionicons
              name="notifications-outline"
              size={22}
              color={
                colors.primaryLight
              }
            />

          </View>


          <View
            style={
              styles.summaryInfo
            }
          >

            <Text
              style={[
                styles.summaryLabel,

                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              RECENT ACTIVITY
            </Text>


            <Text
              style={[
                styles.summaryValue,

                {
                  color:
                    colors.text,
                },
              ]}
            >
              {unreadCount}
              <Text
                style={[
                  styles.summaryValueSuffix,

                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                {" "}unread
              </Text>
            </Text>

          </View>


          {/* =================================================
              MARK ALL
          ================================================= */}

          {unreadCount > 0 && (

            <Pressable
              style={[
                styles.markAllButton,

                {
                  backgroundColor:
                    colors.iconBackground,

                  borderColor:
                    colors.border,
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
                    colors.primaryLight
                  }
                />

              ) : (

                <>

                  <Ionicons
                    name="checkmark-done-outline"
                    size={14}
                    color={
                      colors.primaryLight
                    }
                  />

                  <Text
                    style={[
                      styles.markAllText,

                      {
                        color:
                          colors.primaryLight,
                      },
                    ]}
                  >
                    Mark all
                  </Text>

                </>

              )}

            </Pressable>

          )}

        </View>

      </View>


      {/* =====================================================
          NOTIFICATION LIST
      ===================================================== */}

      <FlatList

        data={
          notifications
        }

        keyExtractor={
          (item, index) =>
            String(
              item.id ||
              index
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
              colors.primary
            }
            colors={[
              colors.primary,
            ]}
          />
        }

      />

    </View>
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
    // HEADER
    // ========================================================

    header: {
      paddingHorizontal: 18,

      paddingTop:
        Platform.OS === "ios"
          ? 54
          : 44,

      paddingBottom: 6,
    },

    headerTop: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 17,
    },

    headerLeft: {
      flex: 1,
      marginRight: 10,
    },

    eyebrow: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.4,
    },

    title: {
      fontSize: 22,
      fontWeight: "900",
      marginTop: 4,
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
    },


    // ========================================================
    // SUMMARY
    // ========================================================

    summaryCard: {
      minHeight: 78,

      borderWidth: 1,
      borderRadius: 21,

      paddingHorizontal: 13,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 6,
    },

    summaryIcon: {
      width: 44,
      height: 44,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    summaryInfo: {
      flex: 1,
      marginLeft: 11,
    },

    summaryLabel: {
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 1,
    },

    summaryValue: {
      fontSize: 23,
      fontWeight: "900",
      marginTop: 2,
    },

    summaryValueSuffix: {
      fontSize: 10,
      fontWeight: "700",
    },

    markAllButton: {
      flexDirection:
        "row",

      alignItems:
        "center",

      borderWidth: 1,
      borderRadius: 14,

      paddingHorizontal: 11,
      paddingVertical: 8,
    },

    markAllText: {
      fontSize: 10,
      fontWeight: "900",
      marginLeft: 4,
    },


    // ========================================================
    // LIST
    // ========================================================

    listContent: {
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 40,
    },

    emptyList: {
      flexGrow: 1,

      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 40,
    },


    // ========================================================
    // NOTIFICATION CARD
    // ========================================================

    notificationCard: {
      borderWidth: 1,
      borderRadius: 20,

      paddingVertical: 12,
      paddingLeft: 11,
      paddingRight: 10,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 8,
    },

    iconContainer: {
      width: 46,
      height: 46,

      borderRadius: 15,

      alignItems:
        "center",

      justifyContent:
        "center",

      alignSelf:
        "flex-start",
    },

    notificationContent: {
      flex: 1,

      marginLeft: 11,
      marginRight: 6,
    },

    titleRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    categoryText: {
      fontSize: 7.5,
      fontWeight: "900",
      letterSpacing: 1,
    },

    unreadDot: {
      width: 8,
      height: 8,

      borderRadius: 4,
    },

    notificationTitle: {
      fontSize: 13,
      fontWeight: "900",
      marginTop: 4,
    },

    notificationMessage: {
      fontSize: 10,
      fontWeight: "600",
      lineHeight: 14,
      marginTop: 3,
    },

    timeRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 6,
    },

    timeText: {
      fontSize: 8,
      fontWeight: "700",
      marginLeft: 4,
    },


    // ========================================================
    // EMPTY
    // ========================================================

    emptyCard: {
      borderWidth: 1,
      borderRadius: 21,

      paddingVertical: 31,
      paddingHorizontal: 20,

      alignItems:
        "center",
    },

    emptyIconContainer: {
      width: 58,
      height: 58,

      borderRadius: 18,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emptyTitle: {
      fontSize: 15,
      fontWeight: "900",
      marginTop: 12,
    },

    emptyMessage: {
      fontSize: 9,
      fontWeight: "600",
      lineHeight: 14,
      marginTop: 5,

      textAlign:
        "center",
    },

  });