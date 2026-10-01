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
  Image,
  Platform,
} from "react-native";

import { router } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../context/ThemeContext";


// ============================================================
// API
// ============================================================

const API_URL =
  "http://192.168.1.43:8000/api/members";


// ============================================================
// TRAINERS SCREEN
// ============================================================

export default function TrainersScreen() {

  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();

  const [trainers, setTrainers] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [selectedFilter, setSelectedFilter] =
    useState("ALL");

  const [loading, setLoading] =
    useState(true);


  // ==========================================================
  // FETCH TRAINERS FROM DJANGO
  // ==========================================================

  const fetchTrainers = async () => {

    try {

      setLoading(true);


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
      // API REQUEST
      // ------------------------------------------------------

      const response =
        await fetch(
          `${API_URL}/trainers/`,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",

              Authorization:
                `Token ${token}`,
            },
          }
        );


      console.log(
        "TRAINERS API STATUS:",
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
      // ACCESS DENIED
      // ------------------------------------------------------

      if (
        response.status === 403
      ) {

        Alert.alert(
          "Access Denied",
          "Only the workspace owner can manage trainers."
        );

        return;
      }


      // ------------------------------------------------------
      // OTHER API ERROR
      // ------------------------------------------------------

      if (!response.ok) {

        const errorText =
          await response.text();

        console.log(
          "TRAINERS API ERROR:",
          errorText
        );


        throw new Error(
          `Failed to fetch trainers (${response.status})`
        );
      }


      // ------------------------------------------------------
      // RESPONSE DATA
      // ------------------------------------------------------

      const data =
        await response.json();


      console.log(
        "TRAINERS FROM DJANGO:",
        data
      );


      // ------------------------------------------------------
      // HANDLE RESPONSE
      // ------------------------------------------------------

      if (
        Array.isArray(data)
      ) {

        setTrainers(data);

      } else if (
        Array.isArray(
          data.trainers
        )
      ) {

        setTrainers(
          data.trainers
        );

      } else {

        console.log(
          "UNEXPECTED TRAINERS RESPONSE:",
          data
        );

        setTrainers([]);
      }


    } catch (error) {

      console.log(
        "FETCH TRAINERS ERROR:",
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
  // LOAD TRAINERS
  // ==========================================================

  useEffect(() => {

    fetchTrainers();

  }, []);


  // ==========================================================
  // SEARCH + FILTER
  // ==========================================================

  const filteredTrainers =
    trainers.filter(
      (trainer) => {

        const searchText =
          search
            .toLowerCase()
            .trim();


        const trainerName =
          trainer.name
            ?.toLowerCase() ||
          "";


        const trainerUsername =
          trainer.username
            ?.toLowerCase() ||
          "";


        const trainerEmail =
          trainer.email
            ?.toLowerCase() ||
          "";


        const matchesSearch =
          trainerName.includes(
            searchText
          ) ||
          trainerUsername.includes(
            searchText
          ) ||
          trainerEmail.includes(
            searchText
          );


        const isActive =
          trainer.is_active !== false;


        const matchesFilter =
          selectedFilter === "ALL" ||
          (
            selectedFilter ===
              "ACTIVE" &&
            isActive
          ) ||
          (
            selectedFilter ===
              "INACTIVE" &&
            !isActive
          );


        return (
          matchesSearch &&
          matchesFilter
        );
      }
    );


  // ==========================================================
  // GET INITIALS
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
  // OPEN ADD TRAINER
  // ==========================================================

  const openAddTrainer = () => {

    router.push(
      "/admin/trainerqr"
    );
  };


  // ==========================================================
  // OPEN TRAINER DETAILS
  // ==========================================================

  const openTrainerDetails = (
    trainerId
  ) => {

    if (!trainerId) {

      Alert.alert(
        "Error",
        "Trainer ID is missing."
      );

      return;
    }


    console.log(
      "OPENING TRAINER DETAILS:",
      trainerId
    );


    router.push({
      pathname:
        "/admin/trainerdetails",

      params: {
        id: String(
          trainerId
        ),
      },
    });
  };


  // ==========================================================
  // TRAINER CARD
  // ==========================================================

  const renderTrainer = ({
    item,
  }) => {

    const isActive =
      item.is_active !== false;

    const statusColor =
      isActive
        ? "#45E0A5"
        : "#FF5870";


    return (

      <Pressable

        style={[
          styles.trainerCard,

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
          openTrainerDetails(
            item.id
          )
        }

      >

        {/* ==================================================
            PROFILE IMAGE
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

          {item.profile_picture ? (

            <Image
              source={{
                uri:
                  item.profile_picture,
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
                    colors.primaryLight,
                },
              ]}
            >
              {getInitials(
                item.name
              )}
            </Text>

          )}

        </View>


        {/* ==================================================
            TRAINER INFORMATION
        ================================================== */}

        <View
          style={
            styles.trainerInfo
          }
        >

          {/* NAME */}

          <Text
            style={[
              styles.trainerName,

              {
                color:
                  colors.text,
              },
            ]}
            numberOfLines={1}
          >
            {item.name ||
              "Unnamed Trainer"}
          </Text>


          {/* USERNAME */}

          <Text
            style={[
              styles.trainerUsername,

              {
                color:
                  colors.primaryLight,
              },
            ]}
            numberOfLines={1}
          >
            @{item.username ||
              "username"}
          </Text>


          {/* EMAIL */}

          <Text
            style={[
              styles.trainerEmail,

              {
                color:
                  colors.secondaryText,
              },
            ]}
            numberOfLines={1}
          >
            {item.email ||
              "No email"}
          </Text>

        </View>


        {/* ==================================================
            STATUS
        ================================================== */}

        <View
          style={
            styles.trainerRight
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
              {isActive
                ? "ACTIVE"
                : "INACTIVE"}
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
          Loading trainers...
        </Text>

      </View>
    );
  }


  // ==========================================================
  // MAIN SCREEN
  // ==========================================================

  const activeTrainers =
    trainers.filter(
      (trainer) =>
        trainer.is_active !== false
    ).length;


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
              GYMRYT • GYM STAFF
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
              Trainers
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


            {/* ADD TRAINER */}

            <Pressable
              style={[
                styles.headerButton,

                {
                  backgroundColor:
                    colors.primary,

                  borderColor:
                    colors.primary,
                },
              ]}

              onPress={
                openAddTrainer
              }
            >

              <Ionicons
                name="add"
                size={23}
                color="#FFFFFF"
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
              name="barbell-outline"
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
              TOTAL TRAINERS
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
              {trainers.length}
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
            >
              {activeTrainers} active
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

            placeholder="Search trainers..."

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
            "INACTIVE",
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
                    {filter}
                  </Text>

                </Pressable>

              );
            }
          )}

        </View>

      </View>


      {/* ====================================================
          TRAINER LIST
      ==================================================== */}

      <FlatList

        data={
          filteredTrainers
        }

        keyExtractor={(
          item
        ) =>
          String(
            item.id
          )
        }

        renderItem={
          renderTrainer
        }

        showsVerticalScrollIndicator={
          false
        }

        contentContainerStyle={[
          styles.list,

          filteredTrainers.length === 0 &&
            styles.emptyList,
        ]}

        keyboardShouldPersistTaps="handled"

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
              {filteredTrainers.length}{" "}
              {
                filteredTrainers.length ===
                1
                  ? "TRAINER"
                  : "TRAINERS"
              }
            </Text>


            <Pressable
              style={
                styles.refreshButton
              }

              onPress={
                fetchTrainers
              }

              disabled={
                loading
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
                name="barbell-outline"
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
              No Trainers Found
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
              Add your first trainer
              to manage your gym
              staff.
            </Text>


            <Pressable
              style={[
                styles.emptyAddButton,

                {
                  backgroundColor:
                    colors.primary,
                },
              ]}

              onPress={
                openAddTrainer
              }
            >

              <Ionicons
                name="add"
                size={16}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.emptyAddButtonText
                }
              >
                Add Trainer
              </Text>

            </Pressable>

          </View>

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
    // TRAINER CARD
    // ========================================================

    trainerCard: {
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

    trainerInfo: {
      flex: 1,

      marginLeft: 11,
      marginRight: 5,
    },

    trainerName: {
      fontSize: 13,
      fontWeight: "900",
    },

    trainerUsername: {
      fontSize: 9,
      fontWeight: "700",
      marginTop: 3,
    },

    trainerEmail: {
      fontSize: 8,
      fontWeight: "600",
      marginTop: 3,
    },

    trainerRight: {
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

    emptyAddButton: {
      flexDirection:
        "row",

      alignItems:
        "center",

      borderRadius: 14,

      paddingHorizontal: 16,
      paddingVertical: 11,

      marginTop: 16,
    },

    emptyAddButtonText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "900",
      marginLeft: 5,
    },

  });