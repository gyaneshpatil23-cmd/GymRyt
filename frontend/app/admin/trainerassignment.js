// ============================================================
// GYMRyt — TRAINER ASSIGNMENT
// ============================================================

import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../context/ThemeContext";


// ============================================================
// API CONFIGURATION
// ============================================================

const BASE_URL =
  "http://192.168.1.52:8000/api/members";

const MEMBERS_API =
  `${BASE_URL}/`;

const TRAINERS_API =
  `${BASE_URL}/trainers/`;

const ASSIGN_API =
  `${BASE_URL}/trainer/assign/`;


// ============================================================
// TRAINER ASSIGNMENT SCREEN
// ============================================================

export default function TrainerAssignment() {

  const { colors } = useTheme();


  // ==========================================================
  // STATE
  // ==========================================================

  const [members, setMembers] =
    useState([]);

  const [trainers, setTrainers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [savingId, setSavingId] =
    useState(null);


  // ==========================================================
  // SESSION
  // ==========================================================

  const session = async () => ({
    token:
      await AsyncStorage.getItem(
        "adminToken"
      ),
  });


  // ==========================================================
  // HANDLE EXPIRED SESSION
  // ==========================================================

  const handleExpired = async () => {

    await AsyncStorage.multiRemove([
      "adminToken",
      "adminUsername",
      "adminId",
      "userRole",
    ]);

    Alert.alert(
      "Session Expired",
      "Please login again.",
      [
        {
          text: "OK",
          onPress: () =>
            router.replace("/"),
        },
      ]
    );
  };


  // ==========================================================
  // LOAD MEMBERS + TRAINERS
  // ==========================================================

  const loadData = async (
    showSpinner = true
  ) => {

    try {

      if (showSpinner) {
        setLoading(true);
      }


      // ------------------------------------------------------
      // GET ADMIN TOKEN
      // ------------------------------------------------------

      const { token } =
        await session();

      if (!token) {
        return handleExpired();
      }


      // ------------------------------------------------------
      // REQUEST HEADERS
      // ------------------------------------------------------

      const headers = {
        Accept:
          "application/json",

        Authorization:
          `Token ${token}`,
      };


      // ------------------------------------------------------
      // FETCH BOTH APIs
      // ------------------------------------------------------

      const [
        membersResponse,
        trainersResponse,
      ] = await Promise.all([

        fetch(
          MEMBERS_API,
          {
            headers,
          }
        ),

        fetch(
          TRAINERS_API,
          {
            headers,
          }
        ),

      ]);


      // ------------------------------------------------------
      // SESSION EXPIRED
      // ------------------------------------------------------

      if (
        membersResponse.status === 401 ||
        trainersResponse.status === 401
      ) {
        return handleExpired();
      }


      // ------------------------------------------------------
      // API ERRORS
      // ------------------------------------------------------

      if (!membersResponse.ok) {

        throw new Error(
          "Could not load members."
        );

      }

      if (!trainersResponse.ok) {

        throw new Error(
          "Could not load trainers."
        );

      }


      // ------------------------------------------------------
      // PARSE RESPONSE
      // ------------------------------------------------------

      const memberData =
        await membersResponse.json();

      const trainerData =
        await trainersResponse.json();


      // ------------------------------------------------------
      // STORE MEMBERS
      // ------------------------------------------------------

      setMembers(
        Array.isArray(memberData)
          ? memberData
          : memberData.results || []
      );


      // ------------------------------------------------------
      // STORE TRAINERS
      // ------------------------------------------------------

      setTrainers(
        Array.isArray(trainerData)
          ? trainerData
          : trainerData.trainers ||
            trainerData.results ||
            []
      );

    } catch (error) {

      console.log(
        "TRAINER ASSIGNMENT LOAD ERROR:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Could not load members and trainers. Make sure Django is running."
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }
  };


  // ==========================================================
  // RELOAD WHEN SCREEN GETS FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {

      loadData(true);

    }, [])
  );


  // ==========================================================
  // ASSIGN / CHANGE / REMOVE TRAINER
  // ==========================================================

  const assignTrainer = async (
    member,
    trainer
  ) => {

    try {

      setSavingId(member.id);


      // ------------------------------------------------------
      // GET TOKEN
      // ------------------------------------------------------

      const { token } =
        await session();

      if (!token) {
        return handleExpired();
      }


      // ------------------------------------------------------
      // SEND ASSIGNMENT REQUEST
      // ------------------------------------------------------

      const response =
        await fetch(
          ASSIGN_API,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              Authorization:
                `Token ${token}`,
            },

            body: JSON.stringify({
              member_id:
                member.id,

              trainer_id:
                trainer
                  ? trainer.id
                  : null,
            }),
          }
        );


      // ------------------------------------------------------
      // SESSION EXPIRED
      // ------------------------------------------------------

      if (
        response.status === 401
      ) {
        return handleExpired();
      }


      // ------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------

      const data =
        await response.json();


      // ------------------------------------------------------
      // ASSIGNMENT ERROR
      // ------------------------------------------------------

      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.message ||
            "Could not update trainer assignment."
        );

      }


      // ------------------------------------------------------
      // UPDATE MEMBER LOCALLY
      // ------------------------------------------------------

      setMembers(
        (current) =>
          current.map(
            (item) =>
              item.id === member.id
                ? data.member
                : item
          )
      );


      // ------------------------------------------------------
      // SUCCESS MESSAGE
      // ------------------------------------------------------

      Alert.alert(

        trainer
          ? "Trainer Assigned"
          : "Trainer Removed",

        trainer
          ? `${trainer.name || trainer.username} is now assigned to ${member.name}.`
          : `${member.name} is now unassigned.`

      );

    } catch (error) {

      console.log(
        "TRAINER ASSIGNMENT ERROR:",
        error
      );

      Alert.alert(
        "Assignment Failed",
        error.message ||
          "Could not update trainer assignment."
      );

    } finally {

      setSavingId(null);

    }
  };


  // ==========================================================
  // CHOOSE TRAINER
  // ==========================================================

  const chooseTrainer = (
    member
  ) => {

    const buttons =
      trainers.map(
        (trainer) => ({

          text:
            `${trainer.name || trainer.username}${
              trainer.specialization
                ? ` • ${trainer.specialization}`
                : ""
            }`,

          onPress: () =>
            assignTrainer(
              member,
              trainer
            ),

        })
      );


    // --------------------------------------------------------
    // UNASSIGN OPTION
    // --------------------------------------------------------

    buttons.push({

      text:
        "Unassign Trainer",

      style:
        "destructive",

      onPress: () =>
        assignTrainer(
          member,
          null
        ),

    });


    // --------------------------------------------------------
    // CANCEL OPTION
    // --------------------------------------------------------

    buttons.push({

      text: "Cancel",

      style: "cancel",

    });


    // --------------------------------------------------------
    // SHOW TRAINER SELECTION
    // --------------------------------------------------------

    Alert.alert(
      "Assign Trainer",
      `Choose a trainer for ${member.name}.`,
      buttons
    );
  };


  // ==========================================================
  // GET CURRENT TRAINER LABEL
  // ==========================================================

  const getTrainerLabel = (
    member
  ) => {

    return (
      member.trainer_name ||
      "Unassigned"
    );

  };


  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (loading) {

    return (

      <View
        style={[
          styles.center,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >

        <ActivityIndicator
          size="large"
          color={colors.primary}
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
          Loading trainer assignments...
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

            onRefresh={() => {

              setRefreshing(true);

              loadData(false);

            }}

          />

        }

      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={styles.header}
        >

          <TouchableOpacity

            style={[
              styles.back,
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

            <Text
              style={[
                styles.backText,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              ‹
            </Text>

          </TouchableOpacity>


          <View
            style={
              styles.headerText
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
              GYMRYT MANAGEMENT
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
              Trainer Assignment
            </Text>


            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Assign members to your training team.
            </Text>

          </View>

        </View>


        {/* ==================================================
            SUMMARY
        ================================================== */}

        <View
          style={[
            styles.summary,
            {
              backgroundColor:
                colors.card,

              borderColor:
                colors.border,
            },
          ]}
        >

          {/* MEMBERS */}

          <View>

            <Text
              style={[
                styles.summaryNumber,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {members.length}
            </Text>

            <Text
              style={[
                styles.summaryLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Members
            </Text>

          </View>


          {/* TRAINERS */}

          <View>

            <Text
              style={[
                styles.summaryNumber,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              {trainers.length}
            </Text>

            <Text
              style={[
                styles.summaryLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Active Trainers
            </Text>

          </View>


          {/* UNASSIGNED */}

          <View>

            <Text
              style={[
                styles.summaryNumber,
                {
                  color:
                    colors.warning,
                },
              ]}
            >
              {
                members.filter(
                  (m) =>
                    !m.trainer
                ).length
              }
            </Text>

            <Text
              style={[
                styles.summaryLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Unassigned
            </Text>

          </View>

        </View>


        {/* ==================================================
            SECTION TITLE
        ================================================== */}

        <Text
          style={[
            styles.section,
            {
              color:
                colors.mutedText,
            },
          ]}
        >
          MEMBER ASSIGNMENTS
        </Text>


        {/* ==================================================
            EMPTY STATE
        ================================================== */}

        {members.length === 0 ? (

          <View
            style={[
              styles.empty,
              {
                borderColor:
                  colors.border,

                backgroundColor:
                  colors.card,
              },
            ]}
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
              No members found
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
              Add members before assigning trainers.
            </Text>

          </View>

        ) : (

          /* ==================================================
             MEMBER LIST
          ================================================== */

          members.map(
            (member) => (

              <View
                key={member.id}
                style={[
                  styles.memberCard,
                  {
                    backgroundColor:
                      colors.card,

                    borderColor:
                      colors.border,
                  },
                ]}
              >

                {/* ------------------------------------------------
                    MEMBER AVATAR
                ------------------------------------------------ */}

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
                    {(member.name || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>

                </View>


                {/* ------------------------------------------------
                    MEMBER INFORMATION
                ------------------------------------------------ */}

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
                      member.name ||
                      "Unknown Member"
                    }
                  </Text>


                  <Text
                    style={[
                      styles.memberMeta,
                      {
                        color:
                          colors.mutedText,
                      },
                    ]}
                  >
                    {
                      member.phone ||
                      "No phone"
                    }
                  </Text>


                  <Text
                    style={[
                      styles.trainerLabel,
                      {
                        color:
                          member.trainer
                            ? colors.success
                            : colors.warning,
                      },
                    ]}
                  >
                    {member.trainer
                      ? `TRAINER • ${getTrainerLabel(member)}`
                      : "UNASSIGNED"}
                  </Text>

                </View>


                {/* ------------------------------------------------
                    ASSIGN / CHANGE BUTTON
                ------------------------------------------------ */}

                <TouchableOpacity

                  style={[
                    styles.assignButton,
                    {
                      backgroundColor:
                        colors.iconBackground,

                      borderColor:
                        colors.border,
                    },
                  ]}

                  disabled={
                    savingId ===
                    member.id
                  }

                  onPress={() =>
                    chooseTrainer(
                      member
                    )
                  }

                >

                  {savingId ===
                  member.id ? (

                    <ActivityIndicator
                      size="small"
                      color={
                        colors.primaryLight
                      }
                    />

                  ) : (

                    <Text
                      style={[
                        styles.assignText,
                        {
                          color:
                            colors.primaryLight,
                        },
                      ]}
                    >
                      {
                        member.trainer
                          ? "CHANGE"
                          : "ASSIGN"
                      }
                    </Text>

                  )}

                </TouchableOpacity>

              </View>

            )
          )

        )}

      </ScrollView>

    </View>

  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    // ==========================================================
    // CONTAINER
    // ==========================================================

    container: {
      flex: 1,
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: "700",
    },


    // ==========================================================
    // CONTENT
    // ==========================================================

    content: {
      paddingHorizontal: 20,
      paddingTop: 55,
      paddingBottom: 50,
    },


    // ==========================================================
    // HEADER
    // ==========================================================

    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },

    back: {
      width: 45,
      height: 45,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    backText: {
      fontSize: 34,
      fontWeight: "300",
      marginTop: -4,
    },

    headerText: {
      flex: 1,
      marginLeft: 14,
    },

    eyebrow: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.5,
    },

    title: {
      fontSize: 27,
      fontWeight: "900",
      marginTop: 3,
    },

    subtitle: {
      fontSize: 10,
      marginTop: 4,
    },


    // ==========================================================
    // SUMMARY
    // ==========================================================

    summary: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 17,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 28,
    },

    summaryNumber: {
      fontSize: 23,
      fontWeight: "900",
    },

    summaryLabel: {
      fontSize: 8,
      fontWeight: "800",
      marginTop: 4,
    },


    // ==========================================================
    // SECTION
    // ==========================================================

    section: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.3,
      marginBottom: 12,
    },


    // ==========================================================
    // MEMBER CARD
    // ==========================================================

    memberCard: {
      minHeight: 84,
      borderWidth: 1,
      borderRadius: 17,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },


    // ==========================================================
    // AVATAR
    // ==========================================================

    avatar: {
      width: 48,
      height: 48,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },

    avatarText: {
      fontSize: 18,
      fontWeight: "900",
    },


    // ==========================================================
    // MEMBER INFORMATION
    // ==========================================================

    memberInfo: {
      flex: 1,
      marginHorizontal: 10,
    },

    memberName: {
      fontSize: 13,
      fontWeight: "900",
    },

    memberMeta: {
      fontSize: 9,
      marginTop: 3,
    },

    trainerLabel: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.4,
      marginTop: 5,
    },


    // ==========================================================
    // ASSIGN BUTTON
    // ==========================================================

    assignButton: {
      minWidth: 68,
      height: 38,
      borderRadius: 11,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },

    assignText: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.6,
    },


    // ==========================================================
    // EMPTY STATE
    // ==========================================================

    empty: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 30,
      alignItems: "center",
    },

    emptyIcon: {
      fontSize: 28,
    },

    emptyTitle: {
      fontSize: 15,
      fontWeight: "900",
      marginTop: 10,
    },

    emptyText: {
      fontSize: 10,
      marginTop: 5,
      textAlign: "center",
    },

  });