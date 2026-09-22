import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import AsyncStorage from
  "@react-native-async-storage/async-storage";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useTheme,
} from "../../context/ThemeContext";


// ============================================================
// API
// ============================================================

const API_URL =
  "http://192.168.1.52:8000/api/members/";


// ============================================================
// HELPERS
// ============================================================

const getInitials = (name) => {

  if (!name) {
    return "M";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map(
      (part) =>
        part[0]
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
};


const getDaysRemaining = (
  date
) => {

  if (!date) {
    return 0;
  }

  const today =
    new Date();

  const endDate =
    new Date(date);

  today.setHours(
    0,
    0,
    0,
    0
  );

  endDate.setHours(
    0,
    0,
    0,
    0
  );

  const difference =
    endDate.getTime() -
    today.getTime();

  return Math.max(
    Math.ceil(
      difference /
        86400000
    ),
    0
  );
};


const getMemberStatus = (
  member
) => {

  if (member?.status) {

    return String(
      member.status
    ).toUpperCase();
  }

  const days =
    getDaysRemaining(
      member?.membership_end
    );

  if (days <= 0) {
    return "EXPIRED";
  }

  if (days <= 7) {
    return "EXPIRING";
  }

  return "ACTIVE";
};


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TrainerMembersScreen() {

  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();


  // ==========================================================
  // STATE
  // ==========================================================

  const [members, setMembers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);


  // ==========================================================
  // LOAD MEMBERS
  // ==========================================================

  const loadMembers =
    async (
      showLoader = true
    ) => {

      try {

        if (showLoader) {
          setLoading(true);
        }

        const token =
          await AsyncStorage.getItem(
            "adminToken"
          );

        if (!token) {

          router.replace("/");

          return;
        }


        const response =
          await fetch(
            API_URL,
            {
              headers: {
                Accept:
                  "application/json",

                Authorization:
                  `Token ${token}`,
              },
            }
          );


        const data =
          await response.json();


        if (
          response.status ===
          401
        ) {

          router.replace("/");

          return;
        }


        if (!response.ok) {

          throw new Error(
            data.message ||
              data.detail ||
              "Could not load members."
          );
        }


        let memberList = [];


        if (
          Array.isArray(data)
        ) {

          memberList =
            data;

        } else if (
          Array.isArray(
            data.results
          )
        ) {

          memberList =
            data.results;

        } else if (
          Array.isArray(
            data.members
          )
        ) {

          memberList =
            data.members;
        }


        setMembers(
          memberList
        );

      } catch (error) {

        console.log(
          "TRAINER MEMBERS ERROR:",
          error
        );

        Alert.alert(
          "Members Error",
          error.message ||
            "Unable to connect to GymRyt server."
        );

      } finally {

        setLoading(false);
        setRefreshing(false);
      }
    };


  // ==========================================================
  // LOAD WHEN SCREEN OPENS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {

      loadMembers(true);

    }, [])
  );


  // ==========================================================
  // REFRESH
  // ==========================================================

  const onRefresh =
    async () => {

      setRefreshing(true);

      await loadMembers(false);
    };


  // ==========================================================
  // OPEN MEMBER
  // ==========================================================

  const openMember =
    (member) => {

      router.push({
        pathname:
          "/admin/memberdetails",

        params: {
          id: String(
            member.id || ""
          ),

          name:
            member.name || "",

          phone:
            member.phone || "",

          email:
            member.email || "",

          username:
            member.username || "",

          membership_start:
            member.membership_start ||
            "",

          membership_end:
            member.membership_end ||
            "",

          status:
            member.status || "",

          id_verified:
            member.id_verified
              ? "true"
              : "false",

          trainer_name:
            member.trainer_name ||
            "",
        },
      });
    };


  // ==========================================================
  // MEMBER CARD
  // ==========================================================

  const renderMember =
    ({ item }) => {

      const memberName =
        item.name ||
        item.username ||
        "Unknown Member";


      const initials =
        getInitials(
          memberName
        );


      const profilePicture =
        item.profile_picture ||
        item.profile_image ||
        null;


      const status =
        getMemberStatus(
          item
        );


      const days =
        getDaysRemaining(
          item.membership_end
        );


      const isExpired =
        status ===
        "EXPIRED";


      const isExpiring =
        status ===
        "EXPIRING";


      const statusColor =
        isExpired
          ? "#FF5870"
          : isExpiring
          ? "#FFB21C"
          : "#45E0A5";


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

          onPress={() =>
            openMember(item)
          }

          android_ripple={{
            color:
              colors.iconBackground,
          }}
        >

          {/* ==================================================
              AVATAR
          ================================================== */}

          <View
            style={[
              styles.avatar,
              {
                backgroundColor:
                  colors.iconBackground,

                borderColor:
                  `${statusColor}55`,
              },
            ]}
          >

            {profilePicture ? (

              <Image
                source={{
                  uri:
                    profilePicture,
                }}

                style={
                  styles.avatarImage
                }
              />

            ) : (

              <Text
                style={[
                  styles.avatarText,
                  {
                    color:
                      statusColor,
                  },
                ]}
              >
                {initials}
              </Text>

            )}

          </View>


          {/* ==================================================
              MEMBER INFO
          ================================================== */}

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
              {memberName}
            </Text>


            <Text
              style={[
                styles.memberPhone,
                {
                  color:
                    colors.secondaryText ||
                    colors.mutedText,
                },
              ]}

              numberOfLines={1}
            >
              {item.phone ||
                "Not provided"}
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
                      : colors.secondaryText ||
                        colors.mutedText,
                },
              ]}
            >

              {isExpired
                ? "Membership expired"
                : `${days} days remaining`}

            </Text>

          </View>


          {/* ==================================================
              STATUS + ARROW
          ================================================== */}

          <View
            style={
              styles.memberRight
            }
          >

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


            <Ionicons
              name="chevron-forward"
              size={19}
              color={
                colors.secondaryText
              }

              style={
                styles.arrow
              }
            />

          </View>

        </Pressable>
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
                colors.secondaryText ||
                colors.mutedText,
            },
          ]}
        >
          Loading your members...
        </Text>

      </View>
    );
  }


  // ==========================================================
  // MAIN UI
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
            styles.headerTop
          }
        >

          <View>

            <Text
              style={[
                styles.eyebrow,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              GYMRYT • TRAINER
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
              My Members
            </Text>

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


        {/* ==================================================
            MEMBER COUNT
        ================================================== */}

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
              name="people-outline"
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
                    colors.secondaryText ||
                    colors.mutedText,
                },
              ]}
            >
              ASSIGNED MEMBERS
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
              {members.length}
            </Text>

          </View>


          <View
            style={
              styles.summaryRight
            }
          >

            <Text
              style={[
                styles.summaryRightText,
                {
                  color:
                    colors.secondaryText ||
                    colors.mutedText,
                },
              ]}
            >
              Your members
            </Text>

          </View>

        </View>

      </View>


      {/* ======================================================
          MEMBER LIST
      ====================================================== */}

      <FlatList

        data={
          members
        }

        keyExtractor={(item) =>
          String(
            item.id
          )
        }

        renderItem={
          renderMember
        }

        showsVerticalScrollIndicator={
          false
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

        contentContainerStyle={[
          styles.list,

          members.length === 0 &&
            styles.emptyList,
        ]}

        ListHeaderComponent={

          members.length > 0
            ? (

              <View
                style={
                  styles.listHeader
                }
              >

                <Text
                  style={[
                    styles.listTitle,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  ALL MEMBERS
                </Text>

                <Text
                  style={[
                    styles.listCount,
                    {
                      color:
                        colors.secondaryText ||
                        colors.mutedText,
                    },
                  ]}
                >
                  {members.length}
                </Text>

              </View>

            )
            : null
        }

        ListEmptyComponent={

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
                size={29}
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
              No members assigned
            </Text>


            <Text
              style={[
                styles.emptyText,
                {
                  color:
                    colors.secondaryText ||
                    colors.mutedText,
                },
              ]}
            >
              Members assigned to you
              will appear here.
            </Text>

          </View>
        }

      />


      {/* ======================================================
          BOTTOM NAVIGATION
      ====================================================== */}

      <TrainerBottomNavigation
        colors={
          colors
        }

        active="members"
      />

    </View>
  );
}


// ============================================================
// BOTTOM NAVIGATION
// ============================================================

function TrainerBottomNavigation({
  colors,
  active,
}) {

  const goTo =
    (screen) => {

      if (
        screen === "home"
      ) {

        router.replace(
          "/trainer/dashboard"
        );

        return;
      }


      if (
        screen === "members"
      ) {

        return;
      }


      if (
        screen === "workouts"
      ) {

        router.push(
          "/trainer/workouts"
        );

        return;
      }


      if (
        screen === "attendance"
      ) {

        router.push(
          "/trainer/attendance"
        );

        return;
      }


      if (
        screen === "profile"
      ) {

        router.push(
          "/trainer/profile"
        );
      }
    };


  return (

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
        active={
          active === "home"
        }
        colors={
          colors
        }
        onPress={() =>
          goTo("home")
        }
      />


      <BottomNavItem
        icon="people-outline"
        label="Members"
        active={
          active === "members"
        }
        colors={
          colors
        }
        onPress={() =>
          goTo("members")
        }
      />


      <BottomNavItem
        icon="barbell-outline"
        label="Workouts"
        active={
          active === "workouts"
        }
        colors={
          colors
        }
        onPress={() =>
          goTo("workouts")
        }
      />


      <BottomNavItem
        icon="checkmark-circle-outline"
        label="Attendance"
        active={
          active === "attendance"
        }
        colors={
          colors
        }
        onPress={() =>
          goTo("attendance")
        }
      />


      <BottomNavItem
        icon="person-outline"
        label="Profile"
        active={
          active === "profile"
        }
        colors={
          colors
        }
        onPress={() =>
          goTo("profile")
        }
      />

    </View>
  );
}


// ============================================================
// BOTTOM NAV ITEM
// ============================================================

function BottomNavItem({
  icon,
  label,
  active,
  colors,
  onPress,
}) {

  return (

    <Pressable
      onPress={
        onPress
      }

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
          name={
            icon
          }

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

      paddingBottom: 10,
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

    summaryRight: {
      flex: 1,

      alignItems:
        "flex-end",
    },

    summaryRightText: {
      fontSize: 8,
      fontWeight: "700",
    },


    // ========================================================
    // LIST
    // ========================================================

    list: {
      paddingHorizontal: 18,
      paddingTop: 9,
      paddingBottom: 115,
    },

    emptyList: {
      flexGrow: 1,
      justifyContent:
        "center",
    },

    listHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 10,
      marginTop: 4,
    },

    listTitle: {
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    listCount: {
      fontSize: 10,
      fontWeight: "800",
    },


    // ========================================================
    // MEMBER CARD
    // ========================================================

    memberCard: {
      minHeight: 82,

      borderWidth: 1,
      borderRadius: 20,

      paddingVertical: 10,
      paddingLeft: 10,
      paddingRight: 8,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 8,
    },

    avatar: {
      width: 54,
      height: 54,

      borderRadius: 17,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      overflow:
        "hidden",
    },

    avatarImage: {
      width: "100%",
      height: "100%",
    },

    avatarText: {
      fontSize: 16,
      fontWeight: "900",
    },

    memberInfo: {
      flex: 1,

      marginLeft: 11,
      marginRight: 5,
    },

    memberName: {
      fontSize: 13,
      fontWeight: "900",
    },

    memberPhone: {
      fontSize: 9,
      fontWeight: "600",
      marginTop: 3,
    },

    memberDays: {
      fontSize: 8,
      fontWeight: "700",
      marginTop: 3,
    },

    memberRight: {
      alignItems:
        "flex-end",

      justifyContent:
        "center",
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

    arrow: {
      marginTop: 5,
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

    emptyIcon: {
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

    emptyText: {
      fontSize: 9,
      fontWeight: "600",
      marginTop: 5,
      textAlign:
        "center",
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

      position:
        "relative",
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