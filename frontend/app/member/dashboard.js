import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
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

import { useTheme } from "../../context/ThemeContext";

// ======================================================
// MEMBER DASHBOARD
// ======================================================

export default function MemberDashboard() {
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
    Animated.spring(themeAnimation, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }, [isDark]);

  // ====================================================
  // MEMBER STATE
  // ====================================================

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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ====================================================
  // LOAD MEMBER SESSION
  // ====================================================

  const loadMemberSession = useCallback(
    async () => {
      try {
        const values =
          await AsyncStorage.multiGet([
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

        const memberId =
          session.memberId;

        const username =
          session.memberUsername;

        // ==================================================
        // NO MEMBER SESSION
        // ==================================================

        if (
          !memberId &&
          !username
        ) {
          Alert.alert(
            "Session Not Found",
            "Please login again.",
            [
              {
                text: "OK",
                onPress: () =>
                  router.replace("/"),
              },
            ]
          );

          return;
        }

        // ==================================================
        // SET MEMBER
        // ==================================================

        setMember({
          id: memberId || "",

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
    []
  );

  // ====================================================
  // LOAD WHEN SCREEN OPENS
  // ====================================================

  useFocusEffect(
    useCallback(() => {
      loadMemberSession();
    }, [loadMemberSession])
  );

  // ====================================================
  // REFRESH
  // ====================================================

  const handleRefresh =
    async () => {
      setRefreshing(true);
      await loadMemberSession();
    };

  // ====================================================
  // GET MEMBER INITIALS
  // ====================================================

  const getMemberInitials =
    useCallback(() => {
      const name =
        member.name?.trim();

      if (!name) {
        return "M";
      }

      const parts =
        name
          .split(/\s+/)
          .filter(Boolean);

      if (parts.length === 1) {
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
    }, [member.name]);

  // ====================================================
  // DATE FORMATTER
  // ====================================================

  const formatDate =
    (dateString) => {
      if (!dateString) {
        return "--";
      }

      try {
        const date =
          new Date(
            dateString
          );

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

        return `${day}-${month}-${year}`;
      } catch {
        return dateString;
      }
    };

  // ====================================================
  // DAYS REMAINING
  // ====================================================

  const daysRemaining =
    useMemo(() => {
      if (
        !member.membershipEnd
      ) {
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
              (1000 *
                60 *
                60 *
                24)
          )
        );
      } catch {
        return 0;
      }
    }, [
      member.membershipEnd,
    ]);

  // ====================================================
  // MEMBERSHIP PROGRESS
  // ====================================================

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

  // ====================================================
  // STATUS CONFIG
  // ====================================================

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
              colors.danger,
            background:
              colors.dangerBackground,
          };

        case "EXPIRING":
          return {
            text: "EXPIRING",
            color:
              colors.warning,
            background:
              colors.warningBackground,
          };

        default:
          return {
            text: "ACTIVE",
            color:
              colors.success,
            background:
              colors.successBackground,
          };
      }
    }, [
      member.status,
      colors,
    ]);

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
          Loading dashboard...
        </Text>
      </View>
    );
  }

  // ====================================================
  // QUICK ACTION
  // ====================================================

  const QuickAction = ({
    icon,
    title,
    subtitle,
    backgroundColor,
    onPress,
  }) => {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.actionCard,
          {
            backgroundColor:
              colors.card,
            borderColor:
              colors.border,
            opacity:
              pressed
                ? 0.75
                : 1,
          },
        ]}
      >
        <View
          style={[
            styles.actionIcon,
            {
              backgroundColor,
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
      </Pressable>
    );
  };

  // ====================================================
  // MAIN DASHBOARD
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

      {/* ==================================================
          CONTENT
      ================================================== */}

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
          style={styles.header}
        >

          {/* =================================================
              HEADER LEFT
          ================================================= */}

          <View
            style={
              styles.headerLeft
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

            {/* ===============================================
                MEMBER NAME + PHOTO
            =============================================== */}

            <View
              style={
                styles.memberHeaderRow
              }
            >

              {/* PROFILE PHOTO */}

              <Pressable
                style={[
                  styles.headerProfileCircle,
                  {
                    backgroundColor:
                      colors.primary,
                    borderColor:
                      colors.primary,
                  },
                ]}
                onPress={() =>
                  router.push(
                    "/member/profile"
                  )
                }
                activeOpacity={0.8}
              >

                {member.profilePicture ? (
                  <Image
                    source={{
                      uri:
                        member.profilePicture,
                    }}
                    style={
                      styles.headerProfileImage
                    }
                  />
                ) : (
                  <Text
                    style={
                      styles.headerProfileText
                    }
                  >
                    {getMemberInitials()}
                  </Text>
                )}

              </Pressable>

              {/* NAME */}

              <View
                style={
                  styles.memberNameContainer
                }
              >
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
                  {member.name ||
                    "Member"}{" "}
                  👋
                </Text>
              </View>

            </View>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Manage your membership with ease.
            </Text>

          </View>

          {/* ==================================================
              HEADER RIGHT
          ================================================== */}

          <View
            style={
              styles.headerRight
            }
          >

            {/* THEME SWITCH */}

            <Pressable
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

            </Pressable>

          </View>

        </View>

        {/* ==================================================
            MEMBERSHIP
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
          MEMBERSHIP
        </Text>

        <View
          style={[
            styles.membershipCard,
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
              styles.membershipTop
            }
          >

            <View
              style={
                styles.membershipInfo
              }
            >

              <Text
                style={[
                  styles.membershipLabel,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                GYM
              </Text>

              <Text
                style={[
                  styles.gymName,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {member.workspaceName ||
                  "My Gym"}
              </Text>

            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    statusConfig.background,
                },
              ]}
            >

              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      statusConfig.color,
                  },
                ]}
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

          {/* DAYS */}

          <View
            style={
              styles.daysContainer
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
              style={[
                styles.daysLabel,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              DAYS REMAINING
            </Text>

          </View>

          {/* PROGRESS */}

          <View
            style={[
              styles.progressBackground,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          >

            <View
              style={[
                styles.progressFill,
                {
                  width: `${membershipProgress * 100}%`,
                  backgroundColor:
                    statusConfig.color,
                },
              ]}
            />

          </View>

          {/* DATES */}

          <View
            style={
              styles.dateRow
            }
          >

            <View
              style={
                styles.dateColumn
              }
            >

              <Text
                style={[
                  styles.dateLabel,
                  {
                    color:
                      colors.mutedText,
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
              style={[
                styles.dateColumn,
                {
                  alignItems:
                    "flex-end",
                },
              ]}
            >

              <Text
                style={[
                  styles.dateLabel,
                  {
                    color:
                      colors.mutedText,
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

        {/* ==================================================
            MEMBERSHIP ALERT
        ================================================== */}

        {String(
          member.status
        ).toUpperCase() ===
          "EXPIRED" && (

          <View
            style={[
              styles.alertCard,
              {
                backgroundColor:
                  colors.dangerBackground,
                borderColor:
                  colors.danger,
              },
            ]}
          >

            <Text
              style={[
                styles.alertTitle,
                {
                  color:
                    colors.danger,
                },
              ]}
            >
              MEMBERSHIP EXPIRED
            </Text>

            <Text
              style={[
                styles.alertText,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Your membership has expired.
              Please contact the gym to renew your membership.
            </Text>

          </View>
        )}

        {String(
          member.status
        ).toUpperCase() ===
          "EXPIRING" && (

          <View
            style={[
              styles.alertCard,
              {
                backgroundColor:
                  colors.warningBackground,
                borderColor:
                  colors.warning,
              },
            ]}
          >

            <Text
              style={[
                styles.alertTitle,
                {
                  color:
                    colors.warning,
                },
              ]}
            >
              MEMBERSHIP EXPIRING SOON
            </Text>

            <Text
              style={[
                styles.alertText,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Your membership has only{" "}
              {daysRemaining} days remaining.
              Consider renewing soon.
            </Text>

          </View>
        )}

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

        <QuickAction
          icon="✓"
          title="Attendance"
          subtitle="Track your gym visits"
          backgroundColor={
            colors.iconBackground
          }
          onPress={() => {
            Alert.alert(
              "Attendance",
              "Attendance will be connected in the next phase."
            );
          }}
        />

        <QuickAction
          icon="₹"
          title="Payments"
          subtitle="View your payment history"
          backgroundColor={
            colors.successBackground
          }
          onPress={() => {
            Alert.alert(
              "Payments",
              "Payments will be connected in the next phase."
            );
          }}
        />

        <QuickAction
          icon="★"
          title="My Trainer"
          subtitle="View your assigned trainer"
          backgroundColor={
            colors.warningBackground
          }
          onPress={() => {
            Alert.alert(
              "My Trainer",
              "Trainer information will be connected in the next phase."
            );
          }}
        />

        <QuickAction
          icon="●"
          title="My Profile"
          subtitle="Manage your account details"
          backgroundColor={
            colors.iconBackground
          }
          onPress={() =>
            router.push(
              "/member/profile"
            )
          }
        />

        {/* ==================================================
            ACCOUNT INFORMATION
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
          ACCOUNT INFORMATION
        </Text>

        <View
          style={[
            styles.accountCard,
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
              styles.accountRow
            }
          >

            <Text
              style={[
                styles.accountLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Username
            </Text>

            <Text
              style={[
                styles.accountValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {member.username
                ? `@${member.username}`
                : "--"}
            </Text>

          </View>

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          <View
            style={
              styles.accountRow
            }
          >

            <Text
              style={[
                styles.accountLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Phone
            </Text>

            <Text
              style={[
                styles.accountValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {member.phone ||
                "--"}
            </Text>

          </View>

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          <View
            style={
              styles.accountRow
            }
          >

            <Text
              style={[
                styles.accountLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Email
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.accountValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {member.email ||
                "--"}
            </Text>

          </View>

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
              colors.nav,
            borderTopColor:
              colors.border,
          },
        ]}
      >

        {/* HOME */}

        <Pressable
          style={
            styles.navItem
          }
          activeOpacity={0.7}
          onPress={() =>
            router.replace(
              "/member/dashboard"
            )
          }
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
          activeOpacity={0.7}
        >

          <Text
            style={[
              styles.navIcon,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            ✓
          </Text>

          <Text
            style={[
              styles.navText,
              {
                color:
                  colors.secondaryText,
              },
            ]}
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
          activeOpacity={0.7}
        >

          <Text
            style={[
              styles.navIcon,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            ₹
          </Text>

          <Text
            style={[
              styles.navText,
              {
                color:
                  colors.secondaryText,
              },
            ]}
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
          activeOpacity={0.7}
        >

          <View
            style={[
              styles.navProfileAvatar,
              {
                backgroundColor:
                  colors.iconBackground,
                borderColor:
                  colors.primary,
              },
            ]}
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
                style={[
                  styles.navProfileText,
                  {
                    color:
                      colors.primaryLight,
                  },
                ]}
              >
                {getMemberInitials()}
              </Text>
            )}

          </View>

          <Text
            style={[
              styles.navText,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            Profile
          </Text>

        </Pressable>

      </View>

    </View>
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
      paddingHorizontal: 20,
      paddingTop: 55,
      paddingBottom: 120,
    },

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
      alignItems: "flex-start",
      marginBottom: 30,
    },

    headerLeft: {
      flex: 1,
      paddingRight: 8,
    },

    headerRight: {
      alignItems: "flex-end",
      justifyContent: "flex-start",
      marginLeft: 8,
    },

    smallText: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 2,
      marginBottom: 6,
    },

    // ==================================================
    // MEMBER HEADER
    // ==================================================

    memberHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    headerProfileCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,

      justifyContent: "center",
      alignItems: "center",

      borderWidth: 2,

      overflow: "hidden",

      marginRight: 11,
    },

    headerProfileImage: {
      width: "100%",
      height: "100%",
      borderRadius: 25,
    },

    headerProfileText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "900",
    },

    memberNameContainer: {
      flex: 1,
    },

    title: {
      fontSize: 28,
      fontWeight: "900",
    },

    subtitle: {
      fontSize: 14,
      marginTop: 7,
      lineHeight: 19,
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
    // SECTION
    // ==================================================

    sectionTitle: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.8,
      marginBottom: 14,
    },

    // ==================================================
    // MEMBERSHIP
    // ==================================================

    membershipCard: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 18,
      borderWidth: 1,
    },

    membershipTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },

    membershipInfo: {
      flex: 1,
    },

    membershipLabel: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.5,
      marginBottom: 6,
    },

    gymName: {
      fontSize: 22,
      fontWeight: "900",
    },

    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 10,
      marginLeft: 10,
    },

    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },

    statusText: {
      fontSize: 10,
      fontWeight: "800",
    },

    daysContainer: {
      alignItems: "center",
      marginTop: 25,
      marginBottom: 18,
    },

    daysNumber: {
      fontSize: 64,
      lineHeight: 70,
      fontWeight: "900",
    },

    daysLabel: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.8,
      marginTop: 2,
    },

    progressBackground: {
      height: 9,
      borderRadius: 5,
      overflow: "hidden",
      marginBottom: 22,
    },

    progressFill: {
      height: "100%",
      borderRadius: 5,
    },

    dateRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },

    dateColumn: {
      flex: 1,
    },

    dateLabel: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.3,
      marginBottom: 5,
    },

    dateValue: {
      fontSize: 13,
      fontWeight: "800",
    },

    // ==================================================
    // ALERT
    // ==================================================

    alertCard: {
      borderRadius: 18,
      padding: 15,
      marginBottom: 18,
      borderWidth: 1,
    },

    alertTitle: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
      marginBottom: 6,
    },

    alertText: {
      fontSize: 12,
      lineHeight: 18,
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
    // ACCOUNT
    // ==================================================

    accountCard: {
      borderRadius: 18,
      paddingHorizontal: 15,
      borderWidth: 1,
      marginBottom: 25,
    },

    accountRow: {
      minHeight: 58,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    accountLabel: {
      fontSize: 12,
    },

    accountValue: {
      fontSize: 12,
      fontWeight: "800",
      maxWidth: "60%",
      textAlign: "right",
    },

    divider: {
      height: 1,
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

      width: 78,
      height: 65,
    },

    navIcon: {
      fontSize: 19,
      fontWeight: "800",
      opacity: 1,
    },

    navIconActive: {
      fontSize: 19,
    },

    navText: {
      fontSize: 10,
      fontWeight: "600",
      marginTop: 4,
    },

    navTextActive: {
      fontSize: 10,
      fontWeight: "700",
      marginTop: 4,
    },

    // ==================================================
    // BOTTOM PROFILE AVATAR
    // ==================================================

    navProfileAvatar: {
      width: 27,
      height: 27,

      borderRadius: 14,

      alignItems: "center",
      justifyContent: "center",

      overflow: "hidden",

      borderWidth: 1,
    },

    navProfileImage: {
      width: "100%",
      height: "100%",
      borderRadius: 14,
    },

    navProfileText: {
      fontSize: 9,
      fontWeight: "900",
    },

  });