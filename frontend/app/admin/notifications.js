import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";

import {
  router,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";


// ============================================================
// API
// ============================================================

const API_BASE_URL =
  "http://192.168.1.52:8000/api/members";

const NOTIFICATIONS_API =
  API_BASE_URL + "/notifications/";

const MARK_ALL_READ_API =
  API_BASE_URL + "/notifications/mark-all-read/";


// ============================================================
// NOTIFICATIONS SCREEN
// ============================================================

export default function Notifications() {

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
            "/trainer/workouts"
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
          return "🏋️";

        case "NEW_MEMBER":
          return "👤";

        case "TRAINER_ASSIGNED":
          return "🤝";

        case "WORKOUT_UPLOADED":
          return "💪";

        case "MEMBERSHIP_EXPIRING":
          return "⏳";

        case "MEMBERSHIP_EXPIRED":
          return "⚠️";

        case "PAYMENT_RECEIVED":
          return "💰";

        case "PAYMENT_FAILED":
          return "❌";

        case "MEMBER_REMOVED":
          return "🚫";

        case "WELCOME":
          return "👋";

        default:
          return "🔔";
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


      return (

        <TouchableOpacity
          style={[
            styles.notificationCard,

            isUnread &&
              styles.unreadCard,
          ]}

          onPress={() =>
            handleNotificationPress(
              item
            )
          }

          activeOpacity={0.8}

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

              isUnread &&
                styles.unreadIconContainer,
            ]}
          >

            <Text
              style={
                styles.notificationIcon
              }
            >
              {getNotificationIcon(
                item.notification_type
              )}
            </Text>

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
              {item.message ||
                ""}
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


          {/* =================================================
              ARROW
          ================================================= */}

          {isProcessing ? (

            <ActivityIndicator
              size="small"
              color="#2563EB"
            />

          ) : (

            <Text
              style={
                styles.arrow
              }
            >
              ›
            </Text>
          )}

        </TouchableOpacity>
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

            <Text
              style={
                styles.emptyIcon
              }
            >
              🔔
            </Text>

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
        style={
          styles.container
        }
      >

        <View
          style={
            styles.loadingContainer
          }
        >

          <ActivityIndicator
            size="large"
            color="#2563EB"
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
            styles.headerLeft
          }
        >

          <TouchableOpacity
            style={
              styles.backButton
            }

            onPress={() =>
              router.back()
            }

            activeOpacity={0.75}
          >

            <Text
              style={
                styles.backText
              }
            >
              ‹
            </Text>

          </TouchableOpacity>


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


        {/* ===================================================
            MARK ALL
        =================================================== */}

        {unreadCount > 0 && (

          <TouchableOpacity
            style={
              styles.markAllButton
            }

            onPress={
              markAllAsRead
            }

            disabled={
              processingId === "all"
            }

            activeOpacity={0.75}
          >

            {processingId === "all" ? (

              <ActivityIndicator
                size="small"
                color="#60A5FA"
              />

            ) : (

              <Text
                style={
                  styles.markAllText
                }
              >
                Mark all
              </Text>
            )}

          </TouchableOpacity>
        )}

      </View>


      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <View
        style={
          styles.summaryContainer
        }
      >

        <View>

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
              {unreadCount}
            </Text>

          </View>
        )}

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

            tintColor="#2563EB"
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

      backgroundColor:
        "#050816",
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {

      paddingHorizontal: 20,

      paddingTop: 55,

      paddingBottom: 18,

      flexDirection: "row",

      alignItems: "center",

      justifyContent: "space-between",

      borderBottomWidth: 1,

      borderBottomColor:
        "#172554",
    },


    headerLeft: {

      flexDirection: "row",

      alignItems: "center",

      flex: 1,
    },


    backButton: {

      width: 45,

      height: 45,

      borderRadius: 14,

      backgroundColor:
        "#0B1220",

      borderWidth: 1,

      borderColor:
        "#172554",

      alignItems: "center",

      justifyContent: "center",
    },


    backText: {

      color: "#FFFFFF",

      fontSize: 34,

      fontWeight: "300",

      marginTop: -4,
    },


    headerTextContainer: {

      marginLeft: 14,
    },


    headerSmallTitle: {

      color: "#38BDF8",

      fontSize: 9,

      fontWeight: "900",

      letterSpacing: 2,
    },


    headerTitle: {

      color: "#FFFFFF",

      fontSize: 21,

      fontWeight: "900",

      marginTop: 3,
    },


    // ========================================================
    // MARK ALL BUTTON
    // ========================================================

    markAllButton: {

      paddingHorizontal: 12,

      paddingVertical: 9,

      borderRadius: 12,

      backgroundColor:
        "#0B1220",

      borderWidth: 1,

      borderColor:
        "#1D4ED8",
    },


    markAllText: {

      color: "#60A5FA",

      fontSize: 10,

      fontWeight: "900",
    },


    // ========================================================
    // SUMMARY
    // ========================================================

    summaryContainer: {

      paddingHorizontal: 20,

      paddingVertical: 18,

      flexDirection: "row",

      alignItems: "center",

      justifyContent: "space-between",
    },


    summaryTitle: {

      color: "#FFFFFF",

      fontSize: 16,

      fontWeight: "900",
    },


    summarySubtitle: {

      color: "#64748B",

      fontSize: 11,

      marginTop: 4,
    },


    unreadBadge: {

      minWidth: 30,

      height: 30,

      paddingHorizontal: 8,

      borderRadius: 15,

      backgroundColor:
        "#DC2626",

      alignItems: "center",

      justifyContent: "center",
    },


    unreadBadgeText: {

      color: "#FFFFFF",

      fontSize: 11,

      fontWeight: "900",
    },


    // ========================================================
    // LIST
    // ========================================================

    listContent: {

      paddingHorizontal: 20,

      paddingBottom: 30,
    },


    emptyList: {

      flexGrow: 1,

      paddingHorizontal: 20,

      paddingBottom: 40,
    },


    // ========================================================
    // NOTIFICATION CARD
    // ========================================================

    notificationCard: {

      flexDirection: "row",

      alignItems: "flex-start",

      backgroundColor:
        "#0B1220",

      borderWidth: 1,

      borderColor:
        "#172554",

      borderRadius: 18,

      padding: 15,

      marginBottom: 12,
    },


    unreadCard: {

      borderColor:
        "#1D4ED8",

      backgroundColor:
        "#0C162B",
    },


    // ========================================================
    // ICON
    // ========================================================

    iconContainer: {

      width: 48,

      height: 48,

      borderRadius: 15,

      backgroundColor:
        "#111827",

      alignItems: "center",

      justifyContent: "center",

      marginRight: 13,
    },


    unreadIconContainer: {

      backgroundColor:
        "#172554",
    },


    notificationIcon: {

      fontSize: 22,
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

      color: "#38BDF8",

      fontSize: 8,

      fontWeight: "900",

      letterSpacing: 1.2,
    },


    unreadDot: {

      width: 7,

      height: 7,

      borderRadius: 4,

      backgroundColor:
        "#EF4444",

      marginLeft: 7,
    },


    notificationTitle: {

      color: "#FFFFFF",

      fontSize: 14,

      fontWeight: "900",

      marginTop: 2,
    },


    notificationMessage: {

      color: "#94A3B8",

      fontSize: 11,

      lineHeight: 17,

      marginTop: 5,
    },


    timeText: {

      color: "#475569",

      fontSize: 9,

      fontWeight: "700",

      marginTop: 8,
    },


    arrow: {

      color: "#475569",

      fontSize: 28,

      fontWeight: "300",

      marginLeft: 5,

      marginTop: 8,
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

      width: 80,

      height: 80,

      borderRadius: 25,

      backgroundColor:
        "#0B1220",

      borderWidth: 1,

      borderColor:
        "#172554",

      alignItems: "center",

      justifyContent: "center",

      marginBottom: 18,
    },


    emptyIcon: {

      fontSize: 32,
    },


    emptyTitle: {

      color: "#FFFFFF",

      fontSize: 19,

      fontWeight: "900",
    },


    emptyMessage: {

      color: "#64748B",

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


    loadingText: {

      color: "#64748B",

      fontSize: 12,

      marginTop: 14,
    },

  });