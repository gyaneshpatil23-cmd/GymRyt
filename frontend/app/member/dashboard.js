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
  // DYNAMIC STYLES
  // ==========================================================

  const styles = useMemo(
    () => createStyles(themeColors),
    [themeColors]
  );


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
  // QUICK ACTION COMPONENT
  // ==========================================================

  const QuickAction = ({
    icon,
    title,
    subtitle,
    iconColor,
    onPress,
  }) => {

    return (

      <Pressable
        onPress={onPress}

        style={({ pressed }) => [

          styles.actionCard,

          {
            opacity:
              pressed
                ? 0.72
                : 1,
          },

        ]}
      >

        <View
          style={[
            styles.actionIcon,
            {
              backgroundColor:
                `${iconColor}18`,

              borderColor:
                `${iconColor}35`,
            },
          ]}
        >

          <Ionicons
            name={icon}
            size={23}
            color={iconColor}
          />

        </View>


        <View
          style={
            styles.actionContent
          }
        >

          <Text
            style={
              styles.actionTitle
            }
          >
            {title}
          </Text>


          <Text
            style={
              styles.actionSubtitle
            }
          >
            {subtitle}
          </Text>

        </View>


        <View
          style={
            styles.actionArrow
          }
        >

          <Ionicons
            name="chevron-forward"
            size={17}
            color={
              themeColors.textMuted
            }
          />

        </View>

      </Pressable>

    );

  };


  // ==========================================================
  // INFO ROW COMPONENT
  // ==========================================================

  const InfoRow = ({
    icon,
    label,
    value,
  }) => {

    return (

      <View
        style={
          styles.infoRow
        }
      >

        <View
          style={
            styles.infoLeft
          }
        >

          <View
            style={
              styles.infoIcon
            }
          >

            <Ionicons
              name={icon}
              size={17}
              color={
                themeColors.primaryLight
              }
            />

          </View>


          <Text
            style={
              styles.infoLabel
            }
          >
            {label}
          </Text>

        </View>


        <Text
          numberOfLines={1}
          style={
            styles.infoValue
          }
        >
          {value || "--"}
        </Text>

      </View>

    );

  };


  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (loading) {

    return (

      <View
        style={
          styles.loadingContainer
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
            styles.loadingLogo
          }
        >

          <Ionicons
            name="fitness"
            size={32}
            color={
              themeColors.white
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
              style={
                styles.eyebrow
              }
            >
              WELCOME BACK
            </Text>


            <View
              style={
                styles.profileRow
              }
            >

              <Pressable
                style={
                  styles.profileAvatar
                }

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
                    style={
                      styles.profileInitials
                    }
                  >
                    {
                      getMemberInitials()
                    }
                  </Text>

                )}

              </Pressable>


              <View
                style={
                  styles.profileText
                }
              >

                <Text
                  numberOfLines={1}
                  style={
                    styles.memberName
                  }
                >
                  {
                    member.name ||
                    "Member"
                  }
                </Text>


                <View
                  style={
                    styles.memberRole
                  }
                >

                  <View
                    style={
                      styles.onlineDot
                    }
                  />

                  <Text
                    style={
                      styles.memberRoleText
                    }
                  >
                    GYMRyt MEMBER
                  </Text>

                </View>

              </View>

            </View>

          </View>


          {/* ==================================================
              HEADER ACTIONS
              
              ORDER:
              🌙 THEME
              🔔 NOTIFICATIONS
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
                  "THEME BUTTON PRESSED"
                );

                toggleTheme();

              }}
            >

              <Ionicons
                name={
                  isDark
                    ? "sunny"
                    : "moon"
                }

                size={21}

                color={
                  themeColors.primaryLight
                }
              />

            </Pressable>


            {/* NOTIFICATIONS */}

            <Pressable
              style={
                styles.headerButton
              }

              onPress={
                openNotifications
              }
            >

              <Ionicons
                name={
                  unreadNotifications > 0
                    ? "notifications"
                    : "notifications-outline"
                }

                size={22}

                color={
                  themeColors.text
                }
              />


              {unreadNotifications > 0 && (

                <View
                  style={
                    styles.notificationBadge
                  }
                >

                  <Text
                    style={
                      styles.notificationBadgeText
                    }
                  >
                    {
                      unreadNotifications > 99
                        ? "99+"
                        : unreadNotifications
                    }
                  </Text>

                </View>

              )}

            </Pressable>

          </View>

        </View>


        {/* ==================================================
            HERO MEMBERSHIP CARD
        ================================================== */}

        <View
          style={
            styles.heroCard
          }
        >

          <View
            style={
              styles.heroGlowOne
            }
          />

          <View
            style={
              styles.heroGlowTwo
            }
          />


          <View
            style={
              styles.heroTopRow
            }
          >

            <View>

              <Text
                style={
                  styles.heroLabel
                }
              >
                MEMBERSHIP
              </Text>


              <Text
                numberOfLines={1}
                style={
                  styles.heroGymName
                }
              >
                {
                  member.workspaceName ||
                  "My Gym"
                }
              </Text>

            </View>


            <View
              style={[
                styles.statusBadge,

                {
                  backgroundColor:
                    statusConfig.background,

                  borderColor:
                    `${statusConfig.color}45`,
                },

              ]}
            >

              <Ionicons
                name={
                  statusConfig.icon
                }

                size={14}

                color={
                  statusConfig.color
                }
              />

              <Text
                style={[
                  styles.statusText,

                  {
                    color:
                      statusConfig.color,
                  },

                ]}
              >
                {
                  statusConfig.text
                }
              </Text>

            </View>

          </View>


          {/* DAYS REMAINING */}

          <View
            style={
              styles.heroCenter
            }
          >

            <Text
              style={[
                styles.daysNumber,

                {
                  color:
                    statusConfig.color,
                },

              ]}
            >
              {daysRemaining}
            </Text>


            <Text
              style={
                styles.daysLabel
              }
            >
              DAYS REMAINING
            </Text>


            <View
              style={
                styles.heroMiniStatus
              }
            >

              <Ionicons
                name="calendar-outline"
                size={13}
                color={
                  themeColors.textSecondary
                }
              />

              <Text
                style={
                  styles.heroMiniStatusText
                }
              >
                Membership validity
              </Text>

            </View>

          </View>


          {/* PROGRESS HEADER */}

          <View
            style={
              styles.progressHeader
            }
          >

            <Text
              style={
                styles.progressLabel
              }
            >
              MEMBERSHIP PROGRESS
            </Text>


            <Text
              style={
                styles.progressPercentage
              }
            >
              {membershipPercentage}%
            </Text>

          </View>


          {/* PROGRESS BAR */}

          <View
            style={
              styles.progressTrack
            }
          >

            <View
              style={[
                styles.progressFill,

                {
                  width:
                    `${membershipPercentage}%`,

                  backgroundColor:
                    statusConfig.color,
                },

              ]}
            />

          </View>


          {/* DATES */}

          <View
            style={
              styles.dateContainer
            }
          >

            <View
              style={
                styles.dateBlock
              }
            >

              <View
                style={
                  styles.dateIcon
                }
              >

                <Ionicons
                  name="play-outline"
                  size={15}
                  color={
                    themeColors.primaryLight
                  }
                />

              </View>


              <View>

                <Text
                  style={
                    styles.dateLabel
                  }
                >
                  START DATE
                </Text>

                <Text
                  style={
                    styles.dateValue
                  }
                >
                  {
                    formatDate(
                      member.membershipStart
                    )
                  }
                </Text>

              </View>

            </View>


            <View
              style={
                styles.dateDivider
              }
            />


            <View
              style={[
                styles.dateBlock,

                {
                  alignItems:
                    "flex-end",
                },

              ]}
            >

              <View
                style={
                  styles.dateIcon
                }
              >

                <Ionicons
                  name="flag-outline"
                  size={15}
                  color={
                    statusConfig.color
                  }
                />

              </View>


              <View
                style={
                  styles.dateTextRight
                }
              >

                <Text
                  style={
                    styles.dateLabel
                  }
                >
                  EXPIRY DATE
                </Text>

                <Text
                  style={
                    styles.dateValue
                  }
                >
                  {
                    formatDate(
                      member.membershipEnd
                    )
                  }
                </Text>

              </View>

            </View>

          </View>

        </View>


        {/* ==================================================
            EXPIRED ALERT
        ================================================== */}

        {
          String(
            member.status
          ).toUpperCase() ===
            "EXPIRED" && (

            <View
              style={[
                styles.alertCard,

                {
                  backgroundColor:
                    themeColors.dangerSoft,

                  borderColor:
                    `${themeColors.danger}40`,
                },

              ]}
            >

              <View
                style={
                  styles.alertIcon
                }
              >

                <Ionicons
                  name="alert-circle"
                  size={22}
                  color={
                    themeColors.danger
                  }
                />

              </View>


              <View
                style={
                  styles.alertContent
                }
              >

                <Text
                  style={[
                    styles.alertTitle,

                    {
                      color:
                        themeColors.danger,
                    },

                  ]}
                >
                  MEMBERSHIP EXPIRED
                </Text>


                <Text
                  style={
                    styles.alertText
                  }
                >
                  Your membership has expired.
                  Please contact the gym to renew
                  your membership.
                </Text>

              </View>

            </View>

          )
        }


        {/* ==================================================
            EXPIRING ALERT
        ================================================== */}

        {
          String(
            member.status
          ).toUpperCase() ===
            "EXPIRING" && (

            <View
              style={[
                styles.alertCard,

                {
                  backgroundColor:
                    themeColors.warningSoft,

                  borderColor:
                    `${themeColors.warning}40`,
                },

              ]}
            >

              <View
                style={
                  styles.alertIcon
                }
              >

                <Ionicons
                  name="warning"
                  size={22}
                  color={
                    themeColors.warning
                  }
                />

              </View>


              <View
                style={
                  styles.alertContent
                }
              >

                <Text
                  style={[
                    styles.alertTitle,

                    {
                      color:
                        themeColors.warning,
                    },

                  ]}
                >
                  MEMBERSHIP EXPIRING SOON
                </Text>


                <Text
                  style={
                    styles.alertText
                  }
                >
                  Only {daysRemaining} days
                  remaining. Consider renewing
                  your membership soon.
                </Text>

              </View>

            </View>

          )
        }


        {/* ==================================================
            QUICK ACCESS
        ================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <View>

            <Text
              style={
                styles.sectionTitle
              }
            >
              QUICK ACCESS
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Everything you need in one place
            </Text>

          </View>

        </View>


        <View
          style={
            styles.actionGrid
          }
        >

          <QuickAction
            icon="checkmark-circle-outline"
            title="Attendance"
            subtitle="Track your visits"
            iconColor={
              themeColors.iconBlue
            }

            onPress={() => {

              Alert.alert(
                "Attendance",
                "Attendance will be connected in the next phase."
              );

            }}
          />


          <QuickAction
            icon="card-outline"
            title="Payments"
            subtitle="Payment history"
            iconColor={
              themeColors.iconGreen
            }

            onPress={() => {

              Alert.alert(
                "Payments",
                "Payments will be connected in the next phase."
              );

            }}
          />


          <QuickAction
            icon="person-outline"
            title="My Trainer"
            subtitle="View your trainer"
            iconColor={
              themeColors.iconOrange
            }

            onPress={() => {

              Alert.alert(
                "My Trainer",
                "Trainer information will be connected in the next phase."
              );

            }}
          />


          <QuickAction
            icon="settings-outline"
            title="My Profile"
            subtitle="Manage your profile"
            iconColor={
              themeColors.primaryLight
            }

            onPress={() =>
              router.push(
                "/member/profile"
              )
            }
          />

        </View>


        {/* ==================================================
            MEMBERSHIP SUMMARY
        ================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <View>

            <Text
              style={
                styles.sectionTitle
              }
            >
              MEMBERSHIP SUMMARY
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Your current membership overview
            </Text>

          </View>

        </View>


        <View
          style={
            styles.summaryCard
          }
        >

          <View
            style={
              styles.summaryItem
            }
          >

            <View
              style={[
                styles.summaryIcon,

                {
                  backgroundColor:
                    `${themeColors.primary}18`,
                },

              ]}
            >

              <Ionicons
                name="time-outline"
                size={19}
                color={
                  themeColors.primaryLight
                }
              />

            </View>


            <Text
              style={
                styles.summaryValue
              }
            >
              {daysRemaining}
            </Text>


            <Text
              style={
                styles.summaryLabel
              }
            >
              Days Left
            </Text>

          </View>


          <View
            style={
              styles.summaryDivider
            }
          />


          <View
            style={
              styles.summaryItem
            }
          >

            <View
              style={[
                styles.summaryIcon,

                {
                  backgroundColor:
                    `${themeColors.success}18`,
                },

              ]}
            >

              <Ionicons
                name="trending-up-outline"
                size={19}
                color={
                  themeColors.success
                }
              />

            </View>


            <Text
              style={
                styles.summaryValue
              }
            >
              {membershipPercentage}%
            </Text>


            <Text
              style={
                styles.summaryLabel
              }
            >
              Remaining
            </Text>

          </View>


          <View
            style={
              styles.summaryDivider
            }
          />


          <View
            style={
              styles.summaryItem
            }
          >

            <View
              style={[
                styles.summaryIcon,

                {
                  backgroundColor:
                    `${themeColors.warning}18`,
                },

              ]}
            >

              <Ionicons
                name="calendar-outline"
                size={19}
                color={
                  themeColors.warning
                }
              />

            </View>


            <Text
              style={
                styles.summaryValueSmall
              }
            >
              {
                totalMembershipDays ||
                "--"
              }
            </Text>


            <Text
              style={
                styles.summaryLabel
              }
            >
              Total Days
            </Text>

          </View>

        </View>


        {/* ==================================================
            ACCOUNT INFORMATION
        ================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <View>

            <Text
              style={
                styles.sectionTitle
              }
            >
              ACCOUNT INFORMATION
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Your registered account details
            </Text>

          </View>


          <Pressable
            onPress={() =>
              router.push(
                "/member/profile"
              )
            }
          >

            <Text
              style={
                styles.editText
              }
            >
              EDIT
            </Text>

          </Pressable>

        </View>


        <View
          style={
            styles.accountCard
          }
        >

          <InfoRow
            icon="at-outline"
            label="Username"
            value={
              member.username
                ? `@${member.username}`
                : "--"
            }
          />


          <View
            style={
              styles.infoDivider
            }
          />


          <InfoRow
            icon="call-outline"
            label="Phone"
            value={
              member.phone ||
              "--"
            }
          />


          <View
            style={
              styles.infoDivider
            }
          />


          <InfoRow
            icon="mail-outline"
            label="Email"
            value={
              member.email ||
              "--"
            }
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
            style={
              styles.footerLogo
            }
          >

            <Ionicons
              name="fitness"
              size={15}
              color={
                themeColors.primaryLight
              }
            />

          </View>


          <Text
            style={
              styles.footerText
            }
          >
            GYMRyt • MEMBER
          </Text>

        </View>


      </ScrollView>


      {/* ======================================================
          BOTTOM NAVIGATION
      ====================================================== */}

      <View
        style={
          styles.bottomNav
        }
      >

        {/* HOME */}

        <Pressable
          style={
            styles.navItem
          }

          onPress={() =>
            router.replace(
              "/member/dashboard"
            )
          }
        >

          <View
            style={
              styles.activeNavIcon
            }
          >

            <Ionicons
              name="home"
              size={21}
              color={
                themeColors.primaryLight
              }
            />

          </View>


          <Text
            style={
              styles.navTextActive
            }
          >
            Home
          </Text>

        </Pressable>


        {/* ATTENDANCE */}

        <Pressable
          style={
            styles.navItem
          }

          onPress={() => {

            Alert.alert(
              "Attendance",
              "Attendance will be connected in the next phase."
            );

          }}
        >

          <Ionicons
            name="checkmark-circle-outline"
            size={21}
            color={
              themeColors.textMuted
            }
          />


          <Text
            style={
              styles.navText
            }
          >
            Attendance
          </Text>

        </Pressable>


        {/* PAYMENTS */}

        <Pressable
          style={
            styles.navItem
          }

          onPress={() => {

            Alert.alert(
              "Payments",
              "Payments will be connected in the next phase."
            );

          }}
        >

          <Ionicons
            name="card-outline"
            size={21}
            color={
              themeColors.textMuted
            }
          />


          <Text
            style={
              styles.navText
            }
          >
            Payments
          </Text>

        </Pressable>


        {/* PROFILE */}

        <Pressable
          style={
            styles.navItem
          }

          onPress={() =>
            router.push(
              "/member/profile"
            )
          }
        >

          <View
            style={
              styles.navProfileAvatar
            }
          >

            {member.profilePicture ? (

              <Image
                source={{
                  uri:
                    member.profilePicture,
                }}

                style={
                  styles.navProfileImage
                }
              />

            ) : (

              <Text
                style={
                  styles.navProfileText
                }
              >
                {
                  getMemberInitials()
                }
              </Text>

            )}

          </View>


          <Text
            style={
              styles.navText
            }
          >
            Profile
          </Text>

        </Pressable>

      </View>

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
    // MAIN
    // ========================================================

    container: {
      flex: 1,

      backgroundColor:
        GYM_COLORS.background,
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

      backgroundColor:
        GYM_COLORS.background,
    },


    loadingLogo: {
      width: 64,
      height: 64,

      borderRadius: 20,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        GYM_COLORS.primary,

      marginBottom: 22,
    },


    loadingText: {
      marginTop: 14,

      color:
        GYM_COLORS.textSecondary,

      fontSize: 13,

      fontWeight:
        "600",
    },


    // ========================================================
    // CONTENT
    // ========================================================

    content: {
      paddingHorizontal: 18,

      paddingTop: 54,

      paddingBottom: 125,
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      justifyContent:
        "space-between",

      marginBottom: 26,
    },


    headerLeft: {
      flex: 1,

      paddingRight: 12,
    },


    eyebrow: {
      color:
        GYM_COLORS.primaryLight,

      fontSize: 10,

      fontWeight:
        "900",

      letterSpacing: 2,

      marginBottom: 9,
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

      backgroundColor:
        GYM_COLORS.primary,

      borderWidth: 2,

      borderColor:
        GYM_COLORS.primaryLight,

      alignItems:
        "center",

      justifyContent:
        "center",

      overflow:
        "hidden",

      marginRight: 12,
    },


    profileImage: {
      width: "100%",
      height: "100%",
    },


    profileInitials: {
      color:
        GYM_COLORS.white,

      fontSize: 18,

      fontWeight:
        "900",
    },


    profileText: {
      flex: 1,
    },


    memberName: {
      color:
        GYM_COLORS.text,

      fontSize: 22,

      fontWeight:
        "900",

      letterSpacing: -0.4,
    },


    memberRole: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 5,
    },


    onlineDot: {
      width: 7,
      height: 7,

      borderRadius: 4,

      backgroundColor:
        GYM_COLORS.success,

      marginRight: 6,
    },


    memberRoleText: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 9,

      fontWeight:
        "800",

      letterSpacing: 1.1,
    },


    // ========================================================
    // HEADER ACTIONS
    // ========================================================

    headerActions: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 9,
    },


    headerButton: {
      width: 43,
      height: 43,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        GYM_COLORS.card,

      borderWidth: 1,

      borderColor:
        GYM_COLORS.border,
    },


    notificationBadge: {
      position:
        "absolute",

      right: -4,

      top: -4,

      minWidth: 18,

      height: 18,

      paddingHorizontal: 4,

      borderRadius: 10,

      backgroundColor:
        GYM_COLORS.danger,

      borderWidth: 2,

      borderColor:
        GYM_COLORS.background,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    notificationBadgeText: {
      color:
        GYM_COLORS.white,

      fontSize: 8,

      fontWeight:
        "900",
    },


    // ========================================================
    // HERO CARD
    // ========================================================

    heroCard: {
      position:
        "relative",

      overflow:
        "hidden",

      backgroundColor:
        GYM_COLORS.card,

      borderRadius: 26,

      padding: 20,

      marginBottom: 20,

      borderWidth: 1,

      borderColor:
        GYM_COLORS.border,
    },


    heroGlowOne: {
      position:
        "absolute",

      width: 170,
      height: 170,

      borderRadius: 100,

      right: -80,

      top: -85,

      backgroundColor:
        `${GYM_COLORS.primary}16`,
    },


    heroGlowTwo: {
      position:
        "absolute",

      width: 120,
      height: 120,

      borderRadius: 100,

      left: -75,

      bottom: -75,

      backgroundColor:
        `${GYM_COLORS.primaryLight}0D`,
    },


    heroTopRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "flex-start",
    },


    heroLabel: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 9,

      fontWeight:
        "900",

      letterSpacing: 1.7,

      marginBottom: 5,
    },


    heroGymName: {
      color:
        GYM_COLORS.text,

      fontSize: 19,

      fontWeight:
        "900",

      maxWidth: 190,
    },


    // ========================================================
    // STATUS
    // ========================================================

    statusBadge: {
      flexDirection:
        "row",

      alignItems:
        "center",

      paddingHorizontal: 10,

      paddingVertical: 8,

      borderRadius: 11,

      borderWidth: 1,
    },


    statusText: {
      fontSize: 9,

      fontWeight:
        "900",

      marginLeft: 5,

      letterSpacing: 0.5,
    },


    // ========================================================
    // DAYS
    // ========================================================

    heroCenter: {
      alignItems:
        "center",

      marginTop: 28,

      marginBottom: 25,
    },


    daysNumber: {
      fontSize: 72,

      lineHeight: 76,

      fontWeight:
        "900",

      letterSpacing: -3,
    },


    daysLabel: {
      color:
        GYM_COLORS.textSecondary,

      fontSize: 10,

      fontWeight:
        "900",

      letterSpacing: 2,

      marginTop: 2,
    },


    heroMiniStatus: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 10,

      paddingHorizontal: 10,

      paddingVertical: 6,

      borderRadius: 10,

      backgroundColor:
        GYM_COLORS.backgroundSecondary,
    },


    heroMiniStatusText: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 10,

      fontWeight:
        "600",

      marginLeft: 5,
    },


    // ========================================================
    // PROGRESS
    // ========================================================

    progressHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      marginBottom: 9,
    },


    progressLabel: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 9,

      fontWeight:
        "900",

      letterSpacing: 1.2,
    },


    progressPercentage: {
      color:
        GYM_COLORS.textSecondary,

      fontSize: 10,

      fontWeight:
        "900",
    },


    progressTrack: {
      height: 8,

      borderRadius: 5,

      backgroundColor:
        GYM_COLORS.backgroundSecondary,

      overflow:
        "hidden",
    },


    progressFill: {
      height: "100%",

      borderRadius: 5,
    },


    // ========================================================
    // DATES
    // ========================================================

    dateContainer: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 22,

      paddingTop: 18,

      borderTopWidth: 1,

      borderTopColor:
        GYM_COLORS.border,
    },


    dateBlock: {
      flex: 1,

      flexDirection:
        "row",

      alignItems:
        "center",
    },


    dateIcon: {
      width: 32,
      height: 32,

      borderRadius: 10,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        GYM_COLORS.backgroundSecondary,

      marginRight: 8,
    },


    dateTextRight: {
      alignItems:
        "flex-end",
    },


    dateDivider: {
      width: 1,

      height: 32,

      backgroundColor:
        GYM_COLORS.border,

      marginHorizontal: 10,
    },


    dateLabel: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 8,

      fontWeight:
        "900",

      letterSpacing: 1,

      marginBottom: 4,
    },


    dateValue: {
      color:
        GYM_COLORS.text,

      fontSize: 11,

      fontWeight:
        "800",
    },


    // ========================================================
    // ALERT
    // ========================================================

    alertCard: {
      flexDirection:
        "row",

      alignItems:
        "center",

      borderRadius: 18,

      padding: 15,

      marginBottom: 20,

      borderWidth: 1,
    },


    alertIcon: {
      width: 42,
      height: 42,

      borderRadius: 13,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        `${GYM_COLORS.black}18`,

      marginRight: 12,
    },


    alertContent: {
      flex: 1,
    },


    alertTitle: {
      fontSize: 10,

      fontWeight:
        "900",

      letterSpacing: 1,

      marginBottom: 5,
    },


    alertText: {
      color:
        GYM_COLORS.textSecondary,

      fontSize: 11,

      lineHeight: 17,

      fontWeight:
        "500",
    },


    // ========================================================
    // SECTION HEADER
    // ========================================================

    sectionHeader: {
      flexDirection:
        "row",

      alignItems:
        "flex-end",

      justifyContent:
        "space-between",

      marginBottom: 13,

      marginTop: 4,
    },


    sectionTitle: {
      color:
        GYM_COLORS.text,

      fontSize: 11,

      fontWeight:
        "900",

      letterSpacing: 1.5,
    },


    sectionSubtitle: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 10,

      fontWeight:
        "500",

      marginTop: 4,
    },


    editText: {
      color:
        GYM_COLORS.primaryLight,

      fontSize: 9,

      fontWeight:
        "900",

      letterSpacing: 1,
    },


    // ========================================================
    // QUICK ACTION GRID
    // ========================================================

    actionGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      justifyContent:
        "space-between",

      marginBottom: 22,
    },


    actionCard: {
      width: "48.2%",

      minHeight: 118,

      borderRadius: 20,

      padding: 15,

      marginBottom: 12,

      backgroundColor:
        GYM_COLORS.card,

      borderWidth: 1,

      borderColor:
        GYM_COLORS.border,

      justifyContent:
        "space-between",
    },


    actionIcon: {
      width: 42,
      height: 42,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",

      borderWidth: 1,
    },


    actionContent: {
      marginTop: 13,
    },


    actionTitle: {
      color:
        GYM_COLORS.text,

      fontSize: 13,

      fontWeight:
        "900",
    },


    actionSubtitle: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 9.5,

      fontWeight:
        "500",

      marginTop: 4,
    },


    actionArrow: {
      position:
        "absolute",

      right: 12,

      top: 13,
    },


    // ========================================================
    // SUMMARY
    // ========================================================

    summaryCard: {
      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        GYM_COLORS.card,

      borderRadius: 21,

      paddingVertical: 19,

      borderWidth: 1,

      borderColor:
        GYM_COLORS.border,

      marginBottom: 22,
    },


    summaryItem: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    summaryDivider: {
      width: 1,

      height: 55,

      backgroundColor:
        GYM_COLORS.border,
    },


    summaryIcon: {
      width: 36,
      height: 36,

      borderRadius: 12,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 7,
    },


    summaryValue: {
      color:
        GYM_COLORS.text,

      fontSize: 17,

      fontWeight:
        "900",
    },


    summaryValueSmall: {
      color:
        GYM_COLORS.text,

      fontSize: 15,

      fontWeight:
        "900",
    },


    summaryLabel: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 8.5,

      fontWeight:
        "800",

      marginTop: 3,

      letterSpacing: 0.4,
    },


    // ========================================================
    // ACCOUNT
    // ========================================================

    accountCard: {
      backgroundColor:
        GYM_COLORS.card,

      borderRadius: 21,

      paddingHorizontal: 15,

      borderWidth: 1,

      borderColor:
        GYM_COLORS.border,

      marginBottom: 24,

      overflow:
        "hidden",
    },


    infoRow: {
      minHeight: 67,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },


    infoLeft: {
      flexDirection:
        "row",

      alignItems:
        "center",

      flex: 1,
    },


    infoIcon: {
      width: 36,
      height: 36,

      borderRadius: 11,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        `${GYM_COLORS.primary}15`,

      marginRight: 10,
    },


    infoLabel: {
      color:
        GYM_COLORS.textSecondary,

      fontSize: 11,

      fontWeight:
        "600",
    },


    infoValue: {
      color:
        GYM_COLORS.text,

      fontSize: 11,

      fontWeight:
        "800",

      maxWidth: "52%",

      textAlign:
        "right",
    },


    infoDivider: {
      height: 1,

      backgroundColor:
        GYM_COLORS.border,
    },


    // ========================================================
    // FOOTER
    // ========================================================

    footer: {
      alignItems:
        "center",

      justifyContent:
        "center",

      marginTop: 4,

      marginBottom: 4,
    },


    footerLogo: {
      width: 30,
      height: 30,

      borderRadius: 10,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        `${GYM_COLORS.primary}15`,

      marginBottom: 7,
    },


    footerText: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 8,

      fontWeight:
        "800",

      letterSpacing: 1.4,
    },


    // ========================================================
    // BOTTOM NAVIGATION
    // ========================================================

    bottomNav: {
      position:
        "absolute",

      bottom: 0,

      left: 0,

      right: 0,

      height: 82,

      backgroundColor:
        GYM_COLORS.nav,

      borderTopWidth: 1,

      borderTopColor:
        GYM_COLORS.border,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-around",

      paddingHorizontal: 8,

      paddingBottom: 4,
    },


    navItem: {
      width: 78,

      height: 62,

      alignItems:
        "center",

      justifyContent:
        "center",

      borderRadius: 17,
    },


    activeNavIcon: {
      width: 39,

      height: 30,

      borderRadius: 12,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        `${GYM_COLORS.primary}18`,

      marginBottom: 3,
    },


    navText: {
      color:
        GYM_COLORS.textMuted,

      fontSize: 9,

      fontWeight:
        "700",

      marginTop: 4,
    },


    navTextActive: {
      color:
        GYM_COLORS.primaryLight,

      fontSize: 9,

      fontWeight:
        "800",

      marginTop: 2,
    },


    // ========================================================
    // NAV PROFILE
    // ========================================================

    navProfileAvatar: {
      width: 29,
      height: 29,

      borderRadius: 10,

      alignItems:
        "center",

      justifyContent:
        "center",

      overflow:
        "hidden",

      backgroundColor:
        GYM_COLORS.primary,

      borderWidth: 1.5,

      borderColor:
        GYM_COLORS.primaryLight,
    },


    navProfileImage: {
      width: "100%",

      height: "100%",
    },


    navProfileText: {
      color:
        GYM_COLORS.white,

      fontSize: 9,

      fontWeight:
        "900",
    },

  });