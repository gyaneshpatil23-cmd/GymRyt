import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../context/ThemeContext";


// ============================================================
// API
// ============================================================

const API_URL =
  "http://192.168.1.52:8000/api/members/";


// ============================================================
// MEMBERS SCREEN
// ============================================================

export default function MembersScreen() {

  const { colors, isDark } = useTheme();

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
  // MEMBER CARD
  // ==========================================================

  const renderMember = ({
    item,
  }) => {

    const daysRemaining =
      calculateDaysRemaining(
        item.membership_end
      );


    return (

      <TouchableOpacity

        style={[
          styles.memberCard,

          {
            backgroundColor:
              colors.card,

            borderColor:
              colors.border,
          },
        ]}

        activeOpacity={
          0.8
        }

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
            },
          ]}
        >

          <Text
            style={[
              styles.avatarText,

              {
                color:
                  colors.primaryLight,
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
                  colors.mutedText,
              },
            ]}
          >
            {
              item.phone
            }
          </Text>


          <Text
            style={[
              styles.daysText,

              {
                color:
                  item.status ===
                  "EXPIRING"

                    ? colors.warning

                    : item.status ===
                      "EXPIRED"

                    ? colors.danger

                    : colors.success,
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
              styles.paymentArrowContainer,

              {
                backgroundColor:
                  colors.primary,
              },
            ]}
          >

            <Text
              style={
                styles.paymentArrow
              }
            >
              ₹
            </Text>

          </View>

        ) : (

          <View
            style={[
              styles.statusBadge,

              {
                backgroundColor:
                  item.status ===
                  "ACTIVE"

                    ? colors.successBackground

                    : item.status ===
                      "EXPIRING"

                    ? colors.warningBackground

                    : colors.dangerBackground,
              },
            ]}
          >

            <Text
              style={[
                styles.statusText,

                {
                  color:
                    item.status ===
                    "ACTIVE"

                      ? colors.success

                      : item.status ===
                        "EXPIRING"

                      ? colors.warning

                      : colors.danger,
                },
              ]}
            >
              {
                item.status
              }
            </Text>

          </View>

        )}

      </TouchableOpacity>
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

        <View>

          <Text
            style={[
              styles.smallTitle,

              {
                color:
                  colors.mutedText,
              },
            ]}
          >

            {
              selectForPayment
                ? "PAYMENT"
                : "GYM MEMBERS"
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

      </View>


      {/* ====================================================
          PAYMENT MODE INFORMATION
      ==================================================== */}

      {selectForPayment && (

        <View
          style={[
            styles.paymentInfo,

            {
              backgroundColor:
                colors.card,

              borderColor:
                colors.border,
            },
          ]}
        >

          <Text
            style={[
              styles.paymentInfoIcon,

              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            ₹
          </Text>


          <View
            style={
              styles.paymentInfoText
            }
          >

            <Text
              style={[
                styles.paymentInfoTitle,

                {
                  color:
                    colors.text,
                },
              ]}
            >
              Select a member
            </Text>


            <Text
              style={[
                styles.paymentInfoSubtitle,

                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Choose the member for whom
              you want to record a payment.
            </Text>

          </View>

        </View>

      )}


      {/* ====================================================
          SEARCH
      ==================================================== */}

      <View
        style={[
          styles.searchContainer,

          {
            backgroundColor:
              colors.input,

            borderColor:
              colors.border,
          },
        ]}
      >

        <Text
          style={[
            styles.searchIcon,

            {
              color:
                colors.mutedText,
            },
          ]}
        >
          ⌕
        </Text>


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


      {/* ====================================================
          FILTERS
      ==================================================== */}

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
          (filter) => (

            <TouchableOpacity

              key={
                filter
              }

              style={[
                styles.filterButton,

                {
                  backgroundColor:
                    colors.card,

                  borderColor:
                    colors.border,
                },

                selectedFilter ===
                  filter && {

                    backgroundColor:
                      colors.primary,

                    borderColor:
                      colors.primary,
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
                      colors.mutedText,
                  },

                  selectedFilter ===
                    filter && {

                      color:
                        "#FFFFFF",
                    },

                ]}
              >
                {
                  filter
                }
              </Text>

            </TouchableOpacity>

          )
        )}

      </View>


      {/* ====================================================
          COUNT + REFRESH
      ==================================================== */}

      <View
        style={
          styles.countRow
        }
      >

        <Text
          style={[
            styles.countText,

            {
              color:
                colors.text,
            },
          ]}
        >
          {
            filteredMembers.length
          } Members
        </Text>


        <TouchableOpacity
          onPress={
            fetchMembers
          }
        >

          <Text
            style={[
              styles.sortText,

              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            ↻ Refresh
          </Text>

        </TouchableOpacity>

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

        contentContainerStyle={
          styles.list
        }

        ListEmptyComponent={

          <View
            style={
              styles.emptyContainer
            }
          >

            <Text
              style={
                styles.emptyIcon
              }
            >
              👥
            </Text>


            <Text
              style={[
                styles.emptyTitle,

                {
                  color:
                    colors.text,
                },
              ]}
            >

              {
                selectForPayment
                  ? "No Members Found"
                  : "No Members Found"
              }

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

    container: {
      flex: 1,
      paddingHorizontal: 20,
    },


    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
    },


    loadingText: {
      marginTop: 15,
      fontSize: 13,
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {
      marginTop: 55,
      marginBottom: 22,
      flexDirection:
        "row",
      alignItems:
        "center",
    },


    smallTitle: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 2,
    },


    title: {
      fontSize: 32,
      fontWeight: "900",
      marginTop: 5,
    },


    // ========================================================
    // PAYMENT INFORMATION
    // ========================================================

    paymentInfo: {
      flexDirection:
        "row",

      alignItems:
        "center",

      borderWidth: 1,

      borderRadius: 16,

      padding: 14,

      marginBottom: 16,
    },


    paymentInfoIcon: {
      width: 42,
      height: 42,

      borderRadius: 12,

      textAlign:
        "center",

      textAlignVertical:
        "center",

      fontSize: 20,

      fontWeight: "900",

      backgroundColor:
        "#172554",

      overflow:
        "hidden",
    },


    paymentInfoText: {
      flex: 1,
      marginLeft: 12,
    },


    paymentInfoTitle: {
      fontSize: 14,
      fontWeight: "900",
    },


    paymentInfoSubtitle: {
      fontSize: 11,
      marginTop: 3,
      lineHeight: 16,
    },


    // ========================================================
    // SEARCH
    // ========================================================

    searchContainer: {
      height: 54,
      borderRadius: 15,
      borderWidth: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal: 15,
    },


    searchIcon: {
      fontSize: 25,
      marginRight: 10,
    },


    searchInput: {
      flex: 1,
      fontSize: 15,
    },


    // ========================================================
    // FILTERS
    // ========================================================

    filters: {
      flexDirection:
        "row",
      marginTop: 18,
      marginBottom: 20,
    },


    filterButton: {
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      marginRight: 8,
    },


    filterText: {
      fontSize: 10,
      fontWeight: "800",
    },


    // ========================================================
    // COUNT
    // ========================================================

    countRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      marginBottom: 12,
    },


    countText: {
      fontSize: 14,
      fontWeight: "800",
    },


    sortText: {
      fontSize: 11,
      fontWeight: "700",
    },


    // ========================================================
    // LIST
    // ========================================================

    list: {
      paddingBottom: 30,
    },


    // ========================================================
    // MEMBER CARD
    // ========================================================

    memberCard: {
      borderRadius: 18,
      padding: 14,
      marginBottom: 11,
      borderWidth: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
    },


    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent:
        "center",
      alignItems:
        "center",
    },


    avatarText: {
      fontSize: 13,
      fontWeight: "900",
    },


    memberInfo: {
      flex: 1,
      marginLeft: 13,
    },


    memberName: {
      fontSize: 15,
      fontWeight: "800",
    },


    memberPhone: {
      fontSize: 11,
      marginTop: 3,
    },


    daysText: {
      fontSize: 11,
      fontWeight: "700",
      marginTop: 5,
    },


    // ========================================================
    // STATUS
    // ========================================================

    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 8,
    },


    statusText: {
      fontSize: 8,
      fontWeight: "900",
    },


    // ========================================================
    // PAYMENT ARROW
    // ========================================================

    paymentArrowContainer: {
      width: 42,
      height: 42,
      borderRadius: 13,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginLeft: 8,
    },


    paymentArrow: {
      color: "#FFFFFF",
      fontSize: 19,
      fontWeight: "900",
    },


    // ========================================================
    // EMPTY STATE
    // ========================================================

    emptyContainer: {
      alignItems:
        "center",

      marginTop: 80,
    },


    emptyIcon: {
      fontSize: 42,
      marginBottom: 15,
    },


    emptyTitle: {
      fontSize: 18,
      fontWeight: "800",
    },


    emptyText: {
      fontSize: 13,
      marginTop: 6,
    },

  });