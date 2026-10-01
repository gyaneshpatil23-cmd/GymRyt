import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";

import {
  router,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../context/ThemeContext";


// ============================================================
// API
// ============================================================

const API_BASE_URL =
  "http://192.168.1.43:8000/api/members";

const NOTIFICATIONS_API =
  API_BASE_URL + "/notifications/";

const MARK_ALL_READ_API =
  API_BASE_URL + "/notifications/mark-all-read/";


// ============================================================
// NOTIFICATIONS SCREEN
// ============================================================

export default function Notifications() {

  const {
    colors,
    isDark,
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

  const [userRole, setUserRole] =
    useState("");


  // ==========================================================
  // GET TOKEN
  // ==========================================================

  const getToken = async () => {

    const token =
      await AsyncStorage.getItem(
        "adminToken"
      );

    return token;
  };


  // ==========================================================
  // GET USER ROLE
  // ==========================================================

  const getUserRole = async () => {

    try {

      const role =
        await AsyncStorage.getItem(
          "userRole"
        );

      const normalizedRole =
        String(role || "")
          .trim()
          .toUpperCase();

      console.log(
        "NOTIFICATION USER ROLE:",
        normalizedRole
      );

      setUserRole(
        normalizedRole
      );

      return normalizedRole;

    } catch (error) {

      console.log(
        "GET USER ROLE ERROR:",
        error
      );

      setUserRole("");

      return "";
    }
  };


  // ==========================================================
  // SESSION EXPIRED
  // ==========================================================

  const handleSessionExpired = () => {

    Alert.alert(
      "Session Expired",
      "Please login again.",
      [
        {
          text: "OK",

          onPress: async () => {

            await AsyncStorage.multiRemove([
              "adminToken",
              "adminUsername",
              "adminId",
              "userRole",
              "workspaceId",
              "workspaceName",
            ]);

            router.replace("/");
          },
        },
      ]
    );
  };


  // ==========================================================
  // FETCH NOTIFICATIONS
  // ==========================================================

  const fetchNotifications =
    useCallback(async () => {

      try {

        const token =
          await getToken();

        if (!token) {

          handleSessionExpired();

          return;
        }

        const response =
          await fetch(
            NOTIFICATIONS_API,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",

                Authorization:
                  "Token " + token,
              },
            }
          );


        console.log(
          "NOTIFICATIONS STATUS:",
          response.status
        );


        // ====================================================
        // AUTHORIZATION
        // ====================================================

        if (
          response.status === 401
        ) {

          handleSessionExpired();

          return;
        }


        // ====================================================
        // SERVER ERROR
        // ====================================================

        if (!response.ok) {

          const errorText =
            await response.text();

          console.log(
            "NOTIFICATIONS ERROR:",
            errorText
          );

          throw new Error(
            "Failed to fetch notifications"
          );
        }


        // ====================================================
        // RESPONSE DATA
        // ====================================================

        const data =
          await response.json();

        console.log(
          "NOTIFICATIONS DATA:",
          data
        );


        // ====================================================
        // NORMALIZE LIST
        // ====================================================

        let notificationList = [];


        if (
          Array.isArray(data)
        ) {

          notificationList =
            data;

        } else if (
          Array.isArray(
            data.results
          )
        ) {

          notificationList =
            data.results;

        } else if (
          Array.isArray(
            data.notifications
          )
        ) {

          notificationList =
            data.notifications;
        }


        // ====================================================
        // SET NOTIFICATIONS
        // ====================================================

        setNotifications(
          notificationList
        );


        // ====================================================
        // CALCULATE UNREAD
        // ====================================================

        const unread =
          notificationList.filter(
            (item) =>
              !item.is_read
          ).length;


        setUnreadCount(
          unread
        );


      } catch (error) {

        console.log(
          "FETCH NOTIFICATIONS ERROR:",
          error
        );


        Alert.alert(
          "Error",
          "Could not load notifications."
        );


      } finally {

        setLoading(false);
      }

    }, []);


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    getUserRole();

    fetchNotifications();

  }, [
    fetchNotifications,
  ]);


  // ==========================================================
  // REFRESH
  // ==========================================================

  const onRefresh =
    async () => {

      try {

        setRefreshing(true);

        await getUserRole();

        await fetchNotifications();

      } finally {

        setRefreshing(false);
      }
    };


  // ==========================================================
  // MARK SINGLE NOTIFICATION AS READ
  // ==========================================================

  const markNotificationAsRead =
    async (
      notification
    ) => {

      try {

        if (!notification) {
          return true;
        }


        // Already read
        if (
          notification.is_read
        ) {
          return true;
        }


        const token =
          await getToken();


        if (!token) {

          handleSessionExpired();

          return false;
        }


        setProcessingId(
          notification.id
        );


        const response =
          await fetch(
            NOTIFICATIONS_API +
              notification.id +
              "/read/",
            {
              method: "PATCH",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",

                Authorization:
                  "Token " + token,
              },
            }
          );


        console.log(
          "MARK READ STATUS:",
          response.status
        );


        // ====================================================
        // AUTHORIZATION
        // ====================================================

        if (
          response.status === 401
        ) {

          handleSessionExpired();

          return false;
        }


        // ====================================================
        // FAILED
        // ====================================================

        if (!response.ok) {

          const errorText =
            await response.text();

          console.log(
            "MARK READ ERROR:",
            errorText
          );

          return false;
        }


        // ====================================================
        // UPDATE LOCAL STATE
        // ====================================================

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
          "MARK NOTIFICATION READ ERROR:",
          error
        );

        return false;


      } finally {

        setProcessingId(
          null
        );
      }
    };


  // ==========================================================
  // ROLE HELPERS
  // ==========================================================

  const isOwner =
    userRole === "OWNER";

  const isOwnerTrainer =
    userRole ===
    "OWNER_TRAINER";

  const isTrainer =
    userRole === "TRAINER";


  // ==========================================================
  // HANDLE NOTIFICATION PRESS
  // ==========================================================

  const handleNotificationPress =
    async (
      notification
    ) => {

      if (!notification) {
        return;
      }


      console.log(
        "======================================"
      );

      console.log(
        "NOTIFICATION PRESSED:"
      );

      console.log(
        notification
      );

      console.log(
        "NOTIFICATION TYPE:",
        notification.notification_type
      );

      console.log(
        "RELATED ID:",
        notification.related_id
      );

      console.log(
        "USER ROLE:",
        userRole
      );

      console.log(
        "======================================"
      );


      // ======================================================
      // MARK AS READ
      // ======================================================

      if (
        !notification.is_read
      ) {

        const marked =
          await markNotificationAsRead(
            notification
          );


        if (!marked) {
          return;
        }
      }


      const type =
        notification.notification_type;


      // ======================================================
      // TRAINER APPLICATION
      // ======================================================

      if (
        type ===
          "TRAINER_APPLICATION" &&
        notification.related_id
      ) {

        /*
          Trainer applications are an Owner function.

          OWNER:
              Open application details.

          OWNER_TRAINER:
              Also has owner access, so open it.

          TRAINER:
              This notification normally should not
              be received by a normal Trainer.
        */

        if (
          isOwner ||
          isOwnerTrainer
        ) {

          router.push({
            pathname:
              "/admin/trainerapplicationdetails",

            params: {
              applicationId:
                String(
                  notification.related_id
                ),
            },
          });

        }

        return;
      }


      // ======================================================
      // NEW MEMBER
      // ======================================================

      if (
        type ===
        "NEW_MEMBER"
      ) {

        /*
          New member management belongs to the owner.

          OWNER / OWNER_TRAINER:
              Open Owner Members.

          TRAINER:
              This notification normally should not
              be delivered to a Trainer.
        */

        if (
          isOwner ||
          isOwnerTrainer
        ) {

          router.push(
            "/admin/members"
          );
        }

        return;
      }


      // ======================================================
      // PAYMENT RECEIVED / FAILED
      // ======================================================

      if (
        type ===
          "PAYMENT_RECEIVED" ||
        type ===
          "PAYMENT_FAILED"
      ) {

        /*
          Payment management is an Owner function.

          OWNER / OWNER_TRAINER:
              Open Revenue.

          TRAINER:
              No Owner revenue access.
        */

        if (
          isOwner ||
          isOwnerTrainer
        ) {

          router.push(
            "/admin/revenue"
          );
        }

        return;
      }


      // ======================================================
      // TRAINER ASSIGNED
      // ======================================================

      if (
        type ===
        "TRAINER_ASSIGNED"
      ) {

        /*
          This notification can be relevant to:

          OWNER:
              Owner can see trainer/member management.

          OWNER_TRAINER:
              Can work with their assigned members.

          TRAINER:
              Should open their own Members page.
        */

        if (
          isTrainer ||
          isOwnerTrainer
        ) {

          router.push(
            "/trainer/members"
          );

        } else if (
          isOwner
        ) {

          router.push(
            "/admin/trainers"
          );
        }

        return;
      }


      // ======================================================
      // MEMBERSHIP EXPIRING
      // ======================================================

      if (
        type ===
        "MEMBERSHIP_EXPIRING"
      ) {

        /*
          Owner:
              Owner Members.

          Owner + Trainer:
              Trainer Members.

          Trainer:
              Trainer Members.
        */

        if (
          isTrainer ||
          isOwnerTrainer
        ) {

          router.push(
            "/trainer/members"
          );

        } else if (
          isOwner
        ) {

          router.push(
            "/admin/members"
          );
        }

        return;
      }


      // ======================================================
      // MEMBERSHIP EXPIRED
      // ======================================================

      if (
        type ===
        "MEMBERSHIP_EXPIRED"
      ) {

        if (
          isTrainer ||
          isOwnerTrainer
        ) {

          router.push(
            "/trainer/members"
          );

        } else if (
          isOwner
        ) {

          router.push(
            "/admin/members"
          );
        }

        return;
      }


      // ======================================================
      // MEMBER REMOVED
      // ======================================================

      if (
        type ===
        "MEMBER_REMOVED"
      ) {

        /*
          This is primarily useful for Trainers.

          Trainer:
              Trainer Members.

          Owner + Trainer:
              Trainer Members.

          Owner:
              Owner Members.
        */

        if (
          isTrainer ||
          isOwnerTrainer
        ) {

          router.push(
            "/trainer/members"
          );

        } else if (
          isOwner
        ) {

          router.push(
            "/admin/members"
          );
        }

        return;
      }


      // ======================================================
      // WORKOUT UPLOADED
      // ======================================================

      if (
        type ===
        "WORKOUT_UPLOADED"
      ) {

        /*
          WORKOUT_UPLOADED is primarily a
          Member-facing notification.

          A Django User should normally not receive it.

          If Owner + Trainer or Trainer receives one,
          opening Trainer Workouts is the safest
          role-appropriate destination.
        */

        if (
          isTrainer ||
          isOwnerTrainer
        ) {

          router.push(
            "/trainer/workout"
          );
        }

        return;
      }


      // ======================================================
      // WELCOME
      // ======================================================

      if (
        type ===
        "WELCOME"
      ) {

        /*
          WELCOME is primarily Member-facing.

          No Owner/Trainer navigation is necessary.
        */

        return;
      }


      // ======================================================
      // DEFAULT
      // ======================================================

      console.log(
        "NO ROUTE FOR NOTIFICATION TYPE:",
        type
      );
    };


  // ==========================================================
  // MARK ALL AS READ
  // ==========================================================

  const markAllAsRead =
    async () => {

      try {

        if (
          unreadCount === 0
        ) {
          return;
        }


        const token =
          await getToken();


        if (!token) {

          handleSessionExpired();

          return;
        }


        setProcessingId(
          "all"
        );


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

                Authorization:
                  "Token " + token,
              },
            }
          );


        console.log(
          "MARK ALL READ STATUS:",
          response.status
        );


        if (
          response.status === 401
        ) {

          handleSessionExpired();

          return;
        }


        if (!response.ok) {

          const errorText =
            await response.text();

          console.log(
            "MARK ALL READ ERROR:",
            errorText
          );

          throw new Error(
            "Failed to mark all notifications as read"
          );
        }


        // ====================================================
        // UPDATE LOCAL STATE
        // ====================================================

        setNotifications(
          (previous) =>
            previous.map(
              (item) => ({
                ...item,
                is_read: true,
              })
            )
        );


        setUnreadCount(
          0
        );


      } catch (error) {

        console.log(
          "MARK ALL READ ERROR:",
          error
        );


        Alert.alert(
          "Error",
          "Could not mark all notifications as read."
        );


      } finally {

        setProcessingId(
          null
        );
      }
    };


  // ==========================================================
  // NOTIFICATION ICON
  // ==========================================================

  const getNotificationIcon =
    (type) => {

      switch (type) {

        case "TRAINER_APPLICATION":
          return {
            name: "barbell-outline",
            color: "#36B7FF",
          };

        case "NEW_MEMBER":
          return {
            name: "person-add-outline",
            color: "#45E0A5",
          };

        case "TRAINER_ASSIGNED":
          return {
            name: "git-network-outline",
            color: "#60A5FA",
          };

        case "WORKOUT_UPLOADED":
          return {
            name: "fitness-outline",
            color: "#A78BFA",
          };

        case "MEMBERSHIP_EXPIRING":
          return {
            name: "time-outline",
            color: "#FFB21C",
          };

        case "MEMBERSHIP_EXPIRED":
          return {
            name: "alert-circle-outline",
            color: "#FF5870",
          };

        case "PAYMENT_RECEIVED":
          return {
            name: "cash-outline",
            color: "#45E0A5",
          };

        case "PAYMENT_FAILED":
          return {
            name: "close-circle-outline",
            color: "#FF5870",
          };

        case "MEMBER_REMOVED":
          return {
            name: "person-remove-outline",
            color: "#FF5870",
          };

        case "WELCOME":
          return {
            name: "hand-left-outline",
            color: "#36B7FF",
          };

        default:
          return {
            name: "notifications-outline",
            color: "#60A5FA",
          };
      }
    };


  // ==========================================================
  // NOTIFICATION CATEGORY
  // ==========================================================

  const getNotificationCategory =
    (type) => {

      switch (type) {

        case "TRAINER_APPLICATION":
          return "TRAINER APPLICATION";

        case "NEW_MEMBER":
          return "NEW MEMBER";

        case "TRAINER_ASSIGNED":
          return "TRAINER ASSIGNED";

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

        case "MEMBER_REMOVED":
          return "MEMBER";

        case "WELCOME":
          return "WELCOME";

        default:
          return "NOTIFICATION";
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
        new Date(
          dateString
        );


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
        Math.floor(
          difference / 1000
        );


      if (
        seconds < 60
      ) {

        return "Just now";
      }


      const minutes =
        Math.floor(
          seconds / 60
        );


      if (
        minutes < 60
      ) {

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


      if (
        hours < 24
      ) {

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


      if (
        days < 7
      ) {

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

      const icon =
        getNotificationIcon(
          item.notification_type
        );


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
              name="notifications-outline"
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
            New gym updates and
            applications will appear here.
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
              GYMRYT • UPDATES
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