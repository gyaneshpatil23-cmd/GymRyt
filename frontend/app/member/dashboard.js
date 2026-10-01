import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
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

const MEMBER_NOTIFICATIONS_COUNT_API =
  `${BASE_URL}/member-notifications/unread-count/`;


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

  iconPurple: "#6C63FF",
  iconBlue: "#3B82F6",
  iconGreen: "#22C55E",
  iconOrange: "#F59E0B",
};


// ============================================================
// MEMBER DASHBOARD
// ============================================================

export default function MemberDashboard() {

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
  //
  // IMPORTANT:
  // Never reference themeColors from inside its own creation.
  // The previous version did that and could cause a runtime error.
  //
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

      white:
        GYM_COLORS.white,

      black:
        GYM_COLORS.black,

      iconPurple:
        GYM_COLORS.iconPurple,

      iconBlue:
        GYM_COLORS.iconBlue,

      iconGreen:
        GYM_COLORS.iconGreen,

      iconOrange:
        GYM_COLORS.iconOrange,

    };

  }, [colors, isDark]);


  // ==========================================================
  // MEMBER STATE
  // ==========================================================

  const [member, setMember] = useState({

    id: "",

    name: "",

    username: "",

    email: "",

    phone: "",

    status: "ACTIVE",

    membershipStart: "",

    membershipEnd: "",

    workspaceName: "",

    profilePicture: "",

  });


  // ==========================================================
  // NOTIFICATION STATE
  // ==========================================================

  const [
    unreadNotifications,
    setUnreadNotifications,
  ] = useState(0);


  // ==========================================================
  // LOADING
  // ==========================================================

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);


  // ==========================================================
  // SESSION EXPIRATION
  // ==========================================================

  const expireMemberSession =
    useCallback(
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
  // LOAD MEMBER SESSION
  // ==========================================================

  const loadMemberSession =
    useCallback(
      async () => {

        try {

          const values =
            await AsyncStorage.multiGet([

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


          const session = {};


          values.forEach(
            ([key, value]) => {

              session[key] = value;

            }
          );


          const memberToken =
            session.memberToken;

          const memberId =
            session.memberId;

          const username =
            session.memberUsername;


          // ==================================================
          // NO SESSION
          // ==================================================

          if (
            !memberToken ||
            (!memberId && !username)
          ) {

            return expireMemberSession();

          }


          // ==================================================
          // SET MEMBER
          // ==================================================

          setMember({

            id:
              memberId || "",

            name:
              session.memberName ||
              "Member",

            username:
              session.memberUsername ||
              "",

            email:
              session.memberEmail ||
              "",

            phone:
              session.memberPhone ||
              "",

            status:
              session.memberStatus ||
              "ACTIVE",

            membershipStart:
              session.memberMembershipStart ||
              "",

            membershipEnd:
              session.memberMembershipEnd ||
              "",

            workspaceName:
              session.memberWorkspaceName ||
              "My Gym",

            profilePicture:
              session.memberProfilePicture ||
              "",

          });

        } catch (error) {

          console.log(
            "MEMBER SESSION ERROR:",
            error
          );

          Alert.alert(
            "Error",
            "Could not load your account information."
          );

        } finally {

          setLoading(false);
          setRefreshing(false);

        }

      },
      [expireMemberSession]
    );


  // ==========================================================
  // LOAD NOTIFICATION COUNT
  // ==========================================================

  const loadNotificationCount =
    useCallback(
      async () => {

        try {

          const memberToken =
            await AsyncStorage.getItem(
              "memberToken"
            );


          if (!memberToken) {
            return;
          }


          const response =
            await fetch(
              MEMBER_NOTIFICATIONS_COUNT_API,
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

            await expireMemberSession();

            return;

          }


          if (!response.ok) {
            return;
          }


          const data =
            await response.json();


          setUnreadNotifications(
            Number(
              data.unread_count || 0
            )
          );

        } catch (error) {

          console.log(
            "NOTIFICATION COUNT ERROR:",
            error
          );

        }

      },
      [expireMemberSession]
    );


  // ==========================================================
  // LOAD SCREEN
  // ==========================================================

  useFocusEffect(
    useCallback(() => {

      loadMemberSession();

      loadNotificationCount();

    }, [
      loadMemberSession,
      loadNotificationCount,
    ])
  );


  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh =
    async () => {

      setRefreshing(true);

      await Promise.all([
        loadMemberSession(),
        loadNotificationCount(),
      ]);

    };


  // ==========================================================
  // OPEN NOTIFICATIONS
  // ==========================================================

  const openNotifications = () => {

    router.push(
      "/member/notifications"
    );

  };


  // ==========================================================
  // MEMBER INITIALS
  // ==========================================================

  const getMemberInitials =
    useCallback(
      () => {

        const name =
          member.name?.trim();


        if (!name) {
          return "M";
        }


        const parts =
          name
            .split(/\s+/)
            .filter(Boolean);


        if (
          parts.length === 1
        ) {

          return parts[0]
            .charAt(0)
            .toUpperCase();

        }


        return (

          parts[0]
            .charAt(0)
            .toUpperCase() +

          parts[
            parts.length - 1
          ]
            .charAt(0)
            .toUpperCase()

        );

      },
      [member.name]
    );


  // ==========================================================
  // DATE FORMATTER
  // ==========================================================

  const formatDate =
    (dateString) => {

      if (!dateString) {
        return "--";
      }


      try {

        const date =
          new Date(dateString);


        if (
          Number.isNaN(
            date.getTime()
          )
        ) {

          return dateString;

        }


        const day =
          String(
            date.getDate()
          ).padStart(2, "0");


        const monthNames = [

          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",

        ];


        const month =
          monthNames[
            date.getMonth()
          ];


        const year =
          date.getFullYear();


        return `${day} ${month} ${year}`;

      } catch {

        return dateString;

      }

    };


  // ==========================================================
  // DAYS REMAINING
  // ==========================================================

  const daysRemaining =
    useMemo(() => {

      if (!member.membershipEnd) {
        return 0;
      }


      try {

        const today =
          new Date();

        const expiry =
          new Date(
            member.membershipEnd
          );


        today.setHours(
          0,
          0,
          0,
          0
        );

        expiry.setHours(
          0,
          0,
          0,
          0
        );


        const difference =
          expiry.getTime() -
          today.getTime();


        return Math.max(
          0,
          Math.ceil(
            difference /
            (
              1000 *
              60 *
              60 *
              24
            )
          )
        );

      } catch {

        return 0;

      }

    }, [
      member.membershipEnd,
    ]);


  // ==========================================================
  // TOTAL MEMBERSHIP DAYS
  // ==========================================================

  const totalMembershipDays =
    useMemo(() => {

      if (
        !member.membershipStart ||
        !member.membershipEnd
      ) {

        return 0;

      }


      try {

        const start =
          new Date(
            member.membershipStart
          );

        const end =
          new Date(
            member.membershipEnd
          );


        const total =
          end.getTime() -
          start.getTime();


        if (total <= 0) {
          return 0;
        }


        return Math.max(
          1,
          Math.ceil(
            total /
            (
              1000 *
              60 *
              60 *
              24
            )
          )
        );

      } catch {

        return 0;

      }

    }, [
      member.membershipStart,
      member.membershipEnd,
    ]);


  // ==========================================================
  // MEMBERSHIP PROGRESS
  // ==========================================================

  const membershipProgress =
    useMemo(() => {

      if (
        !member.membershipStart ||
        !member.membershipEnd
      ) {

        return 0;

      }


      try {

        const start =
          new Date(
            member.membershipStart
          );

        const end =
          new Date(
            member.membershipEnd
          );

        const today =
          new Date();


        const total =
          end.getTime() -
          start.getTime();

        const elapsed =
          today.getTime() -
          start.getTime();


        if (total <= 0) {
          return 0;
        }


        const progress =
          1 -
          elapsed / total;


        return Math.min(
          1,
          Math.max(
            0,
            progress
          )
        );

      } catch {

        return 0;

      }

    }, [
      member.membershipStart,
      member.membershipEnd,
    ]);


  const membershipPercentage =
    Math.round(
      membershipProgress * 100
    );


  // ==========================================================
  // STATUS CONFIGURATION
  // ==========================================================

  const statusConfig =
    useMemo(() => {

      switch (
        String(
          member.status
        ).toUpperCase()
      ) {

        case "EXPIRED":

          return {

            text: "EXPIRED",

            color:
              themeColors.danger,

            background:
              themeColors.dangerSoft,

            icon:
              "close-circle",

          };


        case "EXPIRING":

          return {

            text: "EXPIRING SOON",

            color:
              themeColors.warning,

            background:
              themeColors.warningSoft,

            icon:
              "warning",

          };


        default:

          return {

            text: "ACTIVE",

            color:
              themeColors.success,

            background:
              themeColors.successSoft,

            icon:
              "checkmark-circle",

          };

      }

    }, [
      member.status,
      themeColors,
    ]);


  // ==========================================================
  // STATUS COLOR
  // ==========================================================

  const statusColor =
    statusConfig.text === "EXPIRED"
      ? "#FF5870"
      : statusConfig.text === "ACTIVE"
      ? "#45E0A5"
      : "#FFB21C";


  // ==========================================================
  // COMING SOON
  // ==========================================================

  const showComingSoon =
    (title, message) => {
      Alert.alert(
        title,
        message
      );
    };


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
          Loading your dashboard...
        </Text>

      </View>
    );
  }


  // ==========================================================
  // MAIN DASHBOARD
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


      {/* ====================================================
          MAIN CONTENT
      ==================================================== */}

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
              handleRefresh
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
                    "/member/profile"
                  )
                }
              >

                {member.profilePicture ? (

                  <Image
                    source={{
                      uri:
                        member.profilePicture,
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
                    {getMemberInitials()}
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
                    styles.memberName,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {member.name ||
                    "Member"}
                </Text>

                <Text
                  style={[
                    styles.memberRole,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {member.workspaceName ||
                    "GymRyt Member"}
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
            MEMBERSHIP OVERVIEW
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
                YOUR MEMBERSHIP
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
                Membership Overview
              </Text>

            </View>


            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    `${statusColor}18`,
                  borderColor:
                    `${statusColor}55`,
                },
              ]}
            >
              <Ionicons
                name={
                  statusConfig.icon
                }
                size={12}
                color={
                  statusColor
                }
              />

              <Text
                style={[
                  styles.statusPillText,
                  {
                    color:
                      statusColor,
                  },
                ]}
              >
                {statusConfig.text}
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
              value={daysRemaining}
              label="DAYS REMAINING"
              icon="calendar-outline"
              iconColor="#36B7FF"
              colors={colors}
            />

            <OverviewStat
              value={`${membershipPercentage}%`}
              label="REMAINING"
              icon="pie-chart-outline"
              iconColor="#45E0A5"
              colors={colors}
            />

            <OverviewStat
              value={totalMembershipDays}
              label="TOTAL DAYS"
              icon="time-outline"
              iconColor="#FFB21C"
              colors={colors}
            />

            <OverviewStat
              value={unreadNotifications}
              label="NEW UPDATES"
              icon="notifications-outline"
              iconColor="#A78BFA"
              colors={colors}
            />

          </View>


          {/* ==================================================
              PROGRESS
          ================================================== */}

          <View
            style={[
              styles.progressCard,
              {
                backgroundColor:
                  colors.background,
                borderColor:
                  colors.border,
              },
            ]}
          >

            <View
              style={
                styles.progressHeader
              }
            >

              <Text
                style={[
                  styles.progressLabel,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                MEMBERSHIP PROGRESS
              </Text>

              <Text
                style={[
                  styles.progressValue,
                  {
                    color:
                      colors.primaryLight,
                  },
                ]}
              >
                {membershipPercentage}%
              </Text>

            </View>


            <View
              style={[
                styles.progressTrack,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width:
                      `${membershipPercentage}%`,
                    backgroundColor:
                      statusColor,
                  },
                ]}
              />
            </View>


            <View
              style={
                styles.datesRow
              }
            >

              <View>

                <Text
                  style={[
                    styles.dateLabel,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  START DATE
                </Text>

                <Text
                  style={[
                    styles.dateValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {formatDate(
                    member.membershipStart
                  )}
                </Text>

              </View>


              <View
                style={
                  styles.dateRight
                }
              >

                <Text
                  style={[
                    styles.dateLabel,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  EXPIRY DATE
                </Text>

                <Text
                  style={[
                    styles.dateValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {formatDate(
                    member.membershipEnd
                  )}
                </Text>

              </View>

            </View>

          </View>

        </View>


        {/* ==================================================
            EXPIRED / EXPIRING ALERT
        ================================================== */}

        {statusConfig.text !== "ACTIVE" && (

          <View
            style={[
              styles.alertCard,
              {
                backgroundColor:
                  `${statusColor}12`,
                borderColor:
                  `${statusColor}55`,
              },
            ]}
          >

            <View
              style={[
                styles.alertIcon,
                {
                  backgroundColor:
                    `${statusColor}20`,
                },
              ]}
            >
              <Ionicons
                name={
                  statusConfig.icon
                }
                size={22}
                color={
                  statusColor
                }
              />
            </View>


            <View
              style={
                styles.alertText
              }
            >

              <Text
                style={[
                  styles.alertTitle,
                  {
                    color:
                      statusColor,
                  },
                ]}
              >
                {statusConfig.text === "EXPIRED"
                  ? "MEMBERSHIP EXPIRED"
                  : "MEMBERSHIP EXPIRING SOON"}
              </Text>

              <Text
                style={[
                  styles.alertSubtitle,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                {statusConfig.text === "EXPIRED"
                  ? "Please contact the gym to renew your membership."
                  : `Only ${daysRemaining} days left. Renew soon to keep training.`}
              </Text>

            </View>

          </View>

        )}


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
            QUICK ACCESS
          </Text>
        </View>


        <View
          style={
            styles.quickGrid
          }
        >

          <QuickAction
            icon="checkmark-circle-outline"
            title="Attendance"
            subtitle="Track your visits"
            colors={colors}
            onPress={() =>
              showComingSoon(
                "Attendance",
                "Attendance will be connected in the next phase."
              )
            }
          />

          <QuickAction
            icon="card-outline"
            title="Payments"
            subtitle="Payment history"
            colors={colors}
            onPress={() =>
              showComingSoon(
                "Payments",
                "Payments will be connected in the next phase."
              )
            }
          />

          <QuickAction
            icon="barbell-outline"
            title="My Trainer"
            subtitle="View your trainer"
            colors={colors}
            onPress={() =>
              showComingSoon(
                "My Trainer",
                "Trainer information will be connected in the next phase."
              )
            }
          />

          <QuickAction
            icon="person-outline"
            title="My Profile"
            subtitle="Manage your profile"
            colors={colors}
            onPress={() =>
              router.push(
                "/member/profile"
              )
            }
          />

        </View>


        {/* ==================================================
            ACCOUNT INFORMATION
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
            ACCOUNT INFORMATION
          </Text>

          <Pressable
            style={
              styles.seeAllButton
            }
            onPress={() =>
              router.push(
                "/member/profile"
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
              Edit
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


        <View
          style={[
            styles.infoCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >

          <InfoRow
            icon="at-outline"
            label="Username"
            value={
              member.username
                ? `@${member.username}`
                : "--"
            }
            colors={colors}
          />

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          <InfoRow
            icon="call-outline"
            label="Phone"
            value={member.phone}
            colors={colors}
          />

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          <InfoRow
            icon="mail-outline"
            label="Email"
            value={member.email}
            colors={colors}
          />

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
            GYMRyt • MEMBER
          </Text>

        </View>

      </ScrollView>


      {/* ======================================================
          BOTTOM NAVIGATION
      ====================================================== */}

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

        {/* HOME */}

        <BottomNavItem
          icon="home"
          label="Home"
          active
          colors={colors}
          onPress={() =>
            router.replace(
              "/member/dashboard"
            )
          }
        />


        {/* ATTENDANCE */}

        <BottomNavItem
          icon="checkmark-circle-outline"
          label="Attendance"
          colors={colors}
          onPress={() =>
            showComingSoon(
              "Attendance",
              "Attendance will be connected in the next phase."
            )
          }
        />


        {/* PAYMENTS */}

        <BottomNavItem
          icon="card-outline"
          label="Payments"
          colors={colors}
          onPress={() =>
            showComingSoon(
              "Payments",
              "Payments will be connected in the next phase."
            )
          }
        />


        {/* PROFILE */}

        <BottomNavItem
          icon="person-outline"
          label="Profile"
          colors={colors}
          onPress={() =>
            router.push(
              "/member/profile"
            )
          }
        />

      </View>

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
          name={icon}
          size={22}
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


// ============================================================
// INFO ROW
// ============================================================

function InfoRow({
  icon,
  label,
  value,
  colors,
}) {

  return (

    <View
      style={
        styles.infoRow
      }
    >

      <View
        style={[
          styles.infoIcon,
          {
            backgroundColor:
              colors.iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            colors.primaryLight
          }
        />
      </View>

      <View
        style={
          styles.infoTextContainer
        }
      >

        <Text
          style={[
            styles.infoLabel,
            {
              color:
                colors.secondaryText,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            {
              color:
                colors.text,
            },
          ]}
          numberOfLines={1}
        >
          {value || "--"}
        </Text>

      </View>

    </View>
  );
}


// ============================================================
// BOTTOM NAV ITEM
// ============================================================

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


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    // ========================================================
    // MAIN
    // ========================================================

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

    memberName: {
      fontSize: 18,
      fontWeight: "900",
    },

    memberRole: {
      fontSize: 10,
      fontWeight: "600",
      marginTop: 3,
    },

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
      marginBottom: 14,
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

    statusPill: {
      flexDirection:
        "row",

      alignItems:
        "center",

      borderWidth: 1,
      borderRadius: 14,

      paddingHorizontal: 9,
      paddingVertical: 6,
    },

    statusPillText: {
      fontSize: 7.5,
      fontWeight: "900",
      letterSpacing: 0.6,
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
      minHeight: 96,

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
      width: 41,
      height: 41,
      borderRadius: 14,
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
      fontSize: 23,
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
    // PROGRESS
    // ========================================================

    progressCard: {
      borderWidth: 1,
      borderRadius: 20,
      padding: 13,
    },

    progressHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    progressLabel: {
      fontSize: 7.5,
      fontWeight: "900",
      letterSpacing: 1,
    },

    progressValue: {
      fontSize: 12,
      fontWeight: "900",
    },

    progressTrack: {
      height: 8,
      borderRadius: 4,
      overflow:
        "hidden",
      marginTop: 10,
    },

    progressFill: {
      height: "100%",
      borderRadius: 4,
    },

    datesRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      marginTop: 12,
    },

    dateRight: {
      alignItems:
        "flex-end",
    },

    dateLabel: {
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.8,
    },

    dateValue: {
      fontSize: 11,
      fontWeight: "900",
      marginTop: 3,
    },


    // ========================================================
    // ALERT
    // ========================================================

    alertCard: {
      minHeight: 76,

      borderWidth: 1,
      borderRadius: 21,

      paddingHorizontal: 13,
      paddingVertical: 12,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 14,
    },

    alertIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    alertText: {
      flex: 1,
      marginLeft: 11,
    },

    alertTitle: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.8,
    },

    alertSubtitle: {
      fontSize: 9,
      fontWeight: "600",
      lineHeight: 13,
      marginTop: 3,
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
      marginTop: 7,
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

      marginBottom: 12,
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
    // INFO CARD
    // ========================================================

    infoCard: {
      borderWidth: 1,
      borderRadius: 21,
      paddingHorizontal: 13,
      paddingVertical: 3,
    },

    infoRow: {
      minHeight: 64,

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    infoIcon: {
      width: 41,
      height: 41,
      borderRadius: 14,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 11,
    },

    infoTextContainer: {
      flex: 1,
    },

    infoLabel: {
      fontSize: 8,
      fontWeight: "700",
      marginBottom: 3,
    },

    infoValue: {
      fontSize: 12,
      fontWeight: "800",
    },

    divider: {
      height: 1,
      marginLeft: 52,
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