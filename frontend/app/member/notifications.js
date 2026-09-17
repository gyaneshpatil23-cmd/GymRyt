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
  API_BASE_URL + "/member-notifications/";

const UNREAD_COUNT_API =
  API_BASE_URL + "/member-notifications/unread-count/";

const MARK_ALL_READ_API =
  API_BASE_URL + "/member-notifications/mark-all-read/";



// ============================================================
// MEMBER NOTIFICATIONS SCREEN
// ============================================================

export default function MemberNotifications() {

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

  const handleSessionExpired = useCallback(
    async () => {

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

    },
    []
  );



  // ==========================================================
  // FETCH NOTIFICATIONS
  // ==========================================================

  const fetchNotifications =
    useCallback(async () => {

      try {

        const memberToken =
          await getMemberToken();


        // ====================================================
        // NO TOKEN
        // ====================================================

        if (!memberToken) {

          await handleSessionExpired();

          return;
        }



        // ====================================================
        // REQUEST
        // ====================================================

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



        // ====================================================
        // SESSION EXPIRED
        // ====================================================

        if (
          response.status === 401
        ) {

          await handleSessionExpired();

          return;
        }



        // ====================================================
        // SERVER ERROR
        // ====================================================

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



        // ====================================================
        // RESPONSE
        // ====================================================

        const data =
          await response.json();

        console.log(
          "MEMBER NOTIFICATIONS DATA:",
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
            data.notifications
          )
        ) {

          notificationList =
            data.notifications;

        } else if (
          Array.isArray(
            data.results
          )
        ) {

          notificationList =
            data.results;
        }



        // ====================================================
        // SET NOTIFICATIONS
        // ====================================================

        setNotifications(
          notificationList
        );



        // ====================================================
        // UNREAD COUNT
        // ====================================================

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

          setUnreadCount(
            unread
          );
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
    async (
      notification
    ) => {

      try {

        if (!notification) {
          return false;
        }


        // Already read
        if (
          notification.is_read
        ) {

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

                "X-Member-Token":
                  memberToken,
              },
            }
          );


        console.log(
          "MEMBER MARK READ STATUS:",
          response.status
        );


        // ====================================================
        // SESSION EXPIRED
        // ====================================================

        if (
          response.status === 401
        ) {

          await handleSessionExpired();

          return false;
        }


        // ====================================================
        // FAILED
        // ====================================================

        if (!response.ok) {

          const errorText =
            await response.text();

          console.log(
            "MEMBER MARK READ ERROR:",
            errorText
          );

          return false;
        }


        // ====================================================
        // LOCAL STATE
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
          "MARK MEMBER NOTIFICATION READ ERROR:",
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
        "MEMBER NOTIFICATION PRESSED:"
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


      // ======================================================
      // MEMBER-SPECIFIC NOTIFICATION HANDLING
      // ======================================================

      const type =
        notification.notification_type;


      // ------------------------------------------------------
      // TRAINER ASSIGNED
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // WORKOUT UPLOADED
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // MEMBERSHIP EXPIRING
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // MEMBERSHIP EXPIRED
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // PAYMENT RECEIVED
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // PAYMENT FAILED
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // WELCOME
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // DEFAULT
      // ------------------------------------------------------

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

        if (
          unreadCount === 0
        ) {

          return;
        }


        const memberToken =
          await getMemberToken();


        if (!memberToken) {

          await handleSessionExpired();

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

                "X-Member-Token":
                  memberToken,
              },
            }
          );


        console.log(
          "MEMBER MARK ALL READ STATUS:",
          response.status
        );


        // ====================================================
        // SESSION EXPIRED
        // ====================================================

        if (
          response.status === 401
        ) {

          await handleSessionExpired();

          return;
        }


        // ====================================================
        // FAILED
        // ====================================================

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


        // ====================================================
        // LOCAL STATE
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
          "MARK ALL MEMBER NOTIFICATIONS ERROR:",
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
        Math.max(
          0,
          Math.floor(
            difference / 1000
          )
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
    // MARK ALL
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