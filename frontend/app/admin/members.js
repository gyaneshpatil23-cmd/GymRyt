import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../context/ThemeContext";


// ============================================================
// API
// ============================================================

const API_URL =
  "http://192.168.1.43:8000/api/members/";


// ============================================================
// MEMBERS SCREEN
// ============================================================

export default function MembersScreen() {

  const { colors, isDark, toggleTheme } = useTheme();

  const params = useLocalSearchParams();

  // ==========================================================
  // PAYMENT SELECTION MODE
  // ==========================================================

  /*
    When Dashboard opens this page using:

    /admin/members?selectForPayment=true

    this becomes true.

    In that mode, tapping a member will open
    the Record Payment screen instead of Member Details.
  */

  const selectForPayment =
    params.selectForPayment === "true";


  // ==========================================================
  // STATE
  // ==========================================================

  const [members, setMembers] = useState([]);

  const [search, setSearch] = useState("");

  const [selectedFilter, setSelectedFilter] =
    useState("ALL");

  const [loading, setLoading] =
    useState(true);


  // ==========================================================
  // FETCH MEMBERS FROM DJANGO
  // ==========================================================

  const fetchMembers = async () => {

    try {

      setLoading(true);

      // ------------------------------------------------------
      // GET ADMIN TOKEN
      // ------------------------------------------------------

      const token =
        await AsyncStorage.getItem(
          "adminToken"
        );

      console.log(
        "ADMIN TOKEN EXISTS:",
        !!token
      );


      // ------------------------------------------------------
      // TOKEN NOT FOUND
      // ------------------------------------------------------

      if (!token) {

        Alert.alert(
          "Authentication Error",
          "Admin authentication token was not found. Please login again."
        );

        router.replace("/");

        return;
      }


      // ------------------------------------------------------
      // REQUEST MEMBERS
      // ------------------------------------------------------

      const response =
        await fetch(
          API_URL,
          {
            method: "GET",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Token ${token}`,
            },
          }
        );


      console.log(
        "MEMBERS API STATUS:",
        response.status
      );


      // ------------------------------------------------------
      // SESSION EXPIRED
      // ------------------------------------------------------

      if (
        response.status === 401
      ) {

        Alert.alert(
          "Session Expired",
          "Your admin session has expired. Please login again."
        );

        await AsyncStorage.removeItem(
          "adminToken"
        );

        await AsyncStorage.removeItem(
          "adminUsername"
        );

        await AsyncStorage.removeItem(
          "adminId"
        );

        router.replace("/");

        return;
      }


      // ------------------------------------------------------
      // OTHER API ERROR
      // ------------------------------------------------------

      if (!response.ok) {

        const errorText =
          await response.text();

        console.log(
          "MEMBERS API ERROR:",
          errorText
        );

        throw new Error(
          `Failed to fetch members (${response.status})`
        );
      }


      // ------------------------------------------------------
      // READ RESPONSE
      // ------------------------------------------------------

      const data =
        await response.json();

      console.log(
        "MEMBERS FROM DJANGO:",
        data
      );


      // ------------------------------------------------------
      // MAKE SURE RESPONSE IS ARRAY
      // ------------------------------------------------------

      if (
        Array.isArray(data)
      ) {

        setMembers(data);

      } else {

        console.log(
          "UNEXPECTED MEMBERS RESPONSE:",
          data
        );

        setMembers([]);
      }

    } catch (error) {

      console.log(
        "FETCH MEMBERS ERROR:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Could not connect to GymRyt server.\n\nMake sure Django is running and your phone is connected to the same Wi-Fi."
      );

    } finally {

      setLoading(false);

    }
  };


  // ==========================================================
  // LOAD MEMBERS WHEN SCREEN OPENS
  // ==========================================================

  useEffect(() => {

    fetchMembers();

  }, []);


  // ==========================================================
  // SEARCH + FILTER
  // ==========================================================

  const filteredMembers =
    members.filter(
      (member) => {

        const searchText =
          search
            .toLowerCase()
            .trim();


        const matchesSearch =
          member.name
            ?.toLowerCase()
            .includes(searchText)

          ||

          member.phone
            ?.includes(searchText)

          ||

          member.email
            ?.toLowerCase()
            .includes(searchText)

          ||

          member.username
            ?.toLowerCase()
            .includes(searchText);


        const matchesFilter =
          selectedFilter === "ALL" ||
          member.status ===
            selectedFilter;


        return (
          matchesSearch &&
          matchesFilter
        );
      }
    );


  // ==========================================================
  // INITIALS
  // ==========================================================

  const getInitials = (
    name
  ) => {

    if (!name) {

      return "?";

    }

    return name
      .split(" ")
      .filter(Boolean)
      .map(
        (word) =>
          word[0]
      )
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };


  // ==========================================================
  // OPEN MEMBER
  // ==========================================================

  const openMember = (
    member
  ) => {

    console.log(
      "MEMBER SELECTED:",
      member
    );


    // ========================================================
    // PAYMENT MODE
    // ========================================================

    if (
      selectForPayment
    ) {

      console.log(
        "OPENING RECORD PAYMENT FOR MEMBER:",
        member.id
      );


      /*
        IMPORTANT:

        We pass all member information required by
        recordpayment.js.
      */

      router.push({
        pathname:
          "/admin/recordpayment",

        params: {

          id:
            String(
              member.id
            ),

          name:
            member.name || "",

          phone:
            member.phone || "",

        },
      });

      return;
    }


    // ========================================================
    // NORMAL MEMBER DETAILS MODE
    // ========================================================

    router.push({

      pathname:
        "/admin/memberdetails",

      params: {

        id:
          String(
            member.id
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
          member.membership_start || "",

        membership_end:
          member.membership_end || "",

        status:
          member.status ||
          "ACTIVE",

        id_verified:
          member.id_verified
            ? "true"
            : "false",

      },

    });
  };


  // ==========================================================
  // STATUS COLOR
  // ==========================================================

  const getStatusColor = (
    status
  ) => {

    if (status === "ACTIVE") {
      return "#45E0A5";
    }

    if (status === "EXPIRING") {
      return "#FFB21C";
    }

    if (status === "EXPIRED") {
      return "#FF5870";
    }

    return colors.secondaryText;
  };


  // ==========================================================
  // MEMBER CARD
  // ==========================================================

  const renderMember = ({
    item,
  }) => {

    const daysRemaining =
      calculateDaysRemaining(
        item.membership_end
      );

    const statusColor =
      getStatusColor(
        item.status
      );


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

        android_ripple={{
          color:
            colors.iconBackground,
        }}

        onPress={() =>
          openMember(item)
        }

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

          <Text
            style={[
              styles.avatarText,

              {
                color:
                  statusColor,
              },
            ]}
          >
            {
              getInitials(
                item.name
              )
            }
          </Text>

        </View>


        {/* ==================================================
            MEMBER INFORMATION
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
            {
              item.name
            }
          </Text>


          <Text
            style={[
              styles.memberPhone,

              {
                color:
                  colors.secondaryText,
              },
            ]}
            numberOfLines={1}
          >
            {
              item.phone
            }
          </Text>


          <Text
            style={[
              styles.memberDays,

              {
                color:
                  item.status ===
                  "EXPIRED"

                    ? "#FF5870"

                    : item.status ===
                      "EXPIRING"

                    ? "#FFB21C"

                    : colors.secondaryText,
              },
            ]}
          >

            {
              item.status ===
              "EXPIRED"

                ? "Membership expired"

                : `${daysRemaining} days remaining`
            }

          </Text>

        </View>


        {/* ==================================================
            STATUS / PAYMENT ARROW
        ================================================== */}

        {selectForPayment ? (

          <View
            style={[
              styles.paymentIcon,

              {
                backgroundColor:
                  colors.iconBackground,
              },
            ]}
          >

            <Ionicons
              name="wallet-outline"
              size={20}
              color={
                colors.primaryLight
              }
            />

          </View>

        ) : (

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
                {
                  item.status
                }
              </Text>

            </View>


            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                colors.secondaryText
              }
              style={
                styles.arrow
              }
            />

          </View>

        )}

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
                colors.mutedText,
            },
          ]}
        >
          Loading members...
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

      {/* ====================================================
          HEADER
      ==================================================== */}

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

              {
                selectForPayment
                  ? "GYMRYT • PAYMENT"
                  : "GYMRYT • OWNER"
              }

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

              {
                selectForPayment
                  ? "Select Member"
                  : "Members"
              }

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
            SUMMARY
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
              name={
                selectForPayment
                  ? "wallet-outline"
                  : "people-outline"
              }
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
              TOTAL MEMBERS
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
                    colors.secondaryText,
                },
              ]}
              numberOfLines={2}
            >

              {
                selectForPayment
                  ? "Choose a member to record a payment"
                  : "Your gym members"
              }

            </Text>

          </View>

        </View>


        {/* ==================================================
            SEARCH
        ================================================== */}

        <View
          style={[
            styles.searchContainer,

            {
              backgroundColor:
                colors.card,

              borderColor:
                colors.border,
            },
          ]}
        >

          <Ionicons
            name="search-outline"
            size={18}
            color={
              colors.secondaryText
            }
          />


          <TextInput
            style={[
              styles.searchInput,

              {
                color:
                  colors.text,
              },
            ]}

            placeholder={
              selectForPayment
                ? "Search member by name or username..."
                : "Search members..."
            }

            placeholderTextColor={
              colors.mutedText
            }

            value={
              search
            }

            onChangeText={
              setSearch
            }

            autoCapitalize="none"

          />

        </View>


        {/* ==================================================
            FILTERS
        ================================================== */}

        <View
          style={
            styles.filters
          }
        >

          {[
            "ALL",
            "ACTIVE",
            "EXPIRING",
            "EXPIRED",
          ].map(
            (filter) => {

              const selected =
                selectedFilter ===
                filter;

              return (

                <Pressable

                  key={
                    filter
                  }

                  style={[
                    styles.filterButton,

                    {
                      backgroundColor:
                        selected
                          ? colors.iconBackground
                          : colors.card,

                      borderColor:
                        selected
                          ? colors.primaryLight
                          : colors.border,
                    },
                  ]}

                  onPress={() =>
                    setSelectedFilter(
                      filter
                    )
                  }

                >

                  <Text
                    style={[
                      styles.filterText,

                      {
                        color:
                          selected
                            ? colors.primaryLight
                            : colors.secondaryText,
                      },
                    ]}
                  >
                    {
                      filter
                    }
                  </Text>

                </Pressable>

              );
            }
          )}

        </View>

      </View>


      {/* ====================================================
          MEMBER LIST
      ==================================================== */}

      <FlatList

        data={
          filteredMembers
        }

        keyExtractor={
          (item) =>
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

        contentContainerStyle={[
          styles.list,

          filteredMembers.length === 0 &&
            styles.emptyList,
        ]}

        ListHeaderComponent={

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
              {
                filteredMembers.length
              } MEMBERS
            </Text>


            <Pressable
              style={
                styles.refreshButton
              }

              onPress={
                fetchMembers
              }
            >

              <Ionicons
                name="refresh"
                size={14}
                color={
                  colors.primaryLight
                }
              />

              <Text
                style={[
                  styles.refreshText,

                  {
                    color:
                      colors.primaryLight,
                  },
                ]}
              >
                Refresh
              </Text>

            </Pressable>

          </View>

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
              No Members Found
            </Text>


            <Text
              style={[
                styles.emptyText,

                {
                  color:
                    colors.mutedText,
                },
              ]}
            >

              Try changing your
              search or filter.

            </Text>

          </View>

        }

      />

    </View>
  );
}


// ============================================================
// CALCULATE DAYS REMAINING
// ============================================================

function calculateDaysRemaining(
  endDate
) {

  if (!endDate) {

    return 0;

  }


  const today =
    new Date();

  const end =
    new Date(
      endDate
    );


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


// ============================================================
// STATIC STYLES
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

      marginBottom: 12,
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

      marginLeft: 10,

      alignItems:
        "flex-end",
    },

    summaryRightText: {
      fontSize: 8,
      fontWeight: "700",
      textAlign:
        "right",
    },


    // ========================================================
    // SEARCH
    // ========================================================

    searchContainer: {
      height: 50,

      borderWidth: 1,
      borderRadius: 16,

      paddingHorizontal: 14,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 12,
    },

    searchInput: {
      flex: 1,

      marginLeft: 9,

      fontSize: 13,
      fontWeight: "600",
    },


    // ========================================================
    // FILTERS
    // ========================================================

    filters: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      marginBottom: 4,
    },

    filterButton: {
      flex: 1,

      borderWidth: 1,
      borderRadius: 14,

      paddingVertical: 9,

      alignItems:
        "center",

      marginHorizontal: 3,
    },

    filterText: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.5,
    },


    // ========================================================
    // LIST
    // ========================================================

    list: {
      paddingHorizontal: 18,
      paddingTop: 9,
      paddingBottom: 40,
    },

    emptyList: {
      flexGrow: 1,
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

    refreshButton: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    refreshText: {
      fontSize: 10,
      fontWeight: "800",
      marginLeft: 4,
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

    paymentIcon: {
      width: 42,
      height: 42,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",
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

  });