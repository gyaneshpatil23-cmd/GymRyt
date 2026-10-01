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
  Modal,
  Pressable,
  Image,
  Platform,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { Ionicons } from "@expo/vector-icons";

import {
  useTheme,
} from "../../context/ThemeContext";


// ============================================================
// API CONFIG
// ============================================================

const BASE_URL =
  "http://192.168.1.43:8000/api/members";

const MEMBERS_API =
  `${BASE_URL}/`;

const TRAINERS_API =
  `${BASE_URL}/trainers/`;

const ASSIGN_API =
  `${BASE_URL}/trainer/assign/`;

const BACKEND_BASE_URL =
  "http://192.168.1.43:8000";


// ============================================================
// TRAINER ASSIGNMENT SCREEN
// ============================================================

export default function TrainerAssignment() {

  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();


  // ==========================================================
  // DATA
  // ==========================================================

  const [members, setMembers] =
    useState([]);

  const [trainers, setTrainers] =
    useState([]);


  // ==========================================================
  // LOADING
  // ==========================================================

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [savingId, setSavingId] =
    useState(null);


  // ==========================================================
  // ASSIGNMENT MODAL
  // ==========================================================

  const [
    assignmentModalVisible,
    setAssignmentModalVisible,
  ] = useState(false);

  const [
    selectedMember,
    setSelectedMember,
  ] = useState(null);

  const [
    selectedTrainerId,
    setSelectedTrainerId,
  ] = useState(null);


  // ==========================================================
  // SESSION
  // ==========================================================

  const session = async () => {

    return {
      token:
        await AsyncStorage.getItem(
          "adminToken"
        ),
    };
  };


  // ==========================================================
  // SESSION EXPIRED
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

      const {
        token,
      } = await session();


      if (!token) {

        return handleExpired();
      }


      const headers = {
        Accept:
          "application/json",

        Authorization:
          `Token ${token}`,
      };


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


      // ======================================================
      // AUTH ERROR
      // ======================================================

      if (
        membersResponse.status === 401 ||
        trainersResponse.status === 401
      ) {

        return handleExpired();
      }


      // ======================================================
      // MEMBER ERROR
      // ======================================================

      if (!membersResponse.ok) {

        throw new Error(
          "Could not load members."
        );
      }


      // ======================================================
      // TRAINER ERROR
      // ======================================================

      if (!trainersResponse.ok) {

        throw new Error(
          "Could not load trainers."
        );
      }


      // ======================================================
      // RESPONSE DATA
      // ======================================================

      const memberData =
        await membersResponse.json();

      const trainerData =
        await trainersResponse.json();


      console.log(
        "TRAINER ASSIGNMENT MEMBERS:",
        memberData
      );

      console.log(
        "TRAINER ASSIGNMENT TRAINERS:",
        trainerData
      );


      // ======================================================
      // SET MEMBERS
      // ======================================================

      setMembers(
        Array.isArray(memberData)
          ? memberData
          : memberData.results || []
      );


      // ======================================================
      // SET TRAINERS
      // ======================================================

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
  // LOAD WHEN SCREEN FOCUSES
  // ==========================================================

  useFocusEffect(
    useCallback(() => {

      loadData(true);

    }, [])
  );


  // ==========================================================
  // ASSIGN / UNASSIGN TRAINER
  // ==========================================================

  const assignTrainer = async (
    member,
    trainer
  ) => {

    try {

      setSavingId(
        member.id
      );


      const {
        token,
      } = await session();


      if (!token) {

        return handleExpired();
      }


      // ======================================================
      // API REQUEST
      // ======================================================

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


      // ======================================================
      // AUTH ERROR
      // ======================================================

      if (
        response.status === 401
      ) {

        return handleExpired();
      }


      // ======================================================
      // RESPONSE
      // ======================================================

      const data =
        await response.json();


      console.log(
        "TRAINER ASSIGNMENT RESPONSE:",
        data
      );


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.message ||
          "Could not update trainer assignment."
        );
      }


      // ======================================================
      // UPDATE MEMBER LOCALLY
      // ======================================================

      setMembers(
        (current) =>
          current.map(
            (item) =>
              item.id === member.id
                ? data.member
                : item
          )
      );


      // ======================================================
      // SUCCESS MESSAGE
      // ======================================================

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
        error?.message ||
          "Could not update trainer assignment."
      );


    } finally {

      setSavingId(null);
    }
  };


  // ==========================================================
  // OPEN TRAINER ASSIGNMENT MODAL
  // ==========================================================

  const chooseTrainer = (
    member
  ) => {

    setSelectedMember(
      member
    );


    // ========================================================
    // DETERMINE CURRENT TRAINER
    // ========================================================

    const currentTrainerId =
      member?.trainer_id ||
      member?.trainer?.id ||
      null;


    setSelectedTrainerId(
      currentTrainerId
    );


    setAssignmentModalVisible(
      true
    );
  };


  // ==========================================================
  // CLOSE ASSIGNMENT MODAL
  // ==========================================================

  const closeAssignmentModal = () => {

    if (savingId) {
      return;
    }


    setAssignmentModalVisible(
      false
    );

    setSelectedMember(
      null
    );

    setSelectedTrainerId(
      null
    );
  };


  // ==========================================================
  // SELECT TRAINER
  // ==========================================================

  const selectTrainer = (
    trainerId
  ) => {

    setSelectedTrainerId(
      trainerId
    );
  };


  // ==========================================================
  // CONFIRM TRAINER ASSIGNMENT
  // ==========================================================

  const confirmTrainerAssignment =
    async () => {

      if (!selectedMember) {
        return;
      }


      // ======================================================
      // FIND TRAINER
      // ======================================================

      const selectedTrainer =
        trainers.find(
          (trainer) =>
            String(
              trainer.id
            ) ===
            String(
              selectedTrainerId
            )
        ) || null;


      // ======================================================
      // CLOSE MODAL
      // ======================================================

      setAssignmentModalVisible(
        false
      );


      // ======================================================
      // CALL EXISTING API FUNCTION
      // ======================================================

      await assignTrainer(
        selectedMember,
        selectedTrainer
      );


      // ======================================================
      // RESET MODAL STATE
      // ======================================================

      setSelectedMember(
        null
      );

      setSelectedTrainerId(
        null
      );
    };


  // ==========================================================
  // TRAINER LABEL
  // ==========================================================

  const getTrainerLabel = (
    member
  ) => {

    return (
      member?.trainer_name ||
      member?.trainer?.name ||
      "Unassigned"
    );
  };


  // ==========================================================
  // TRAINER IMAGE URL
  // ==========================================================

  const getTrainerImageUrl = (
    image
  ) => {

    if (!image) {
      return null;
    }


    if (
      image.startsWith(
        "http://"
      ) ||
      image.startsWith(
        "https://"
      )
    ) {

      return image;
    }


    if (
      image.startsWith("/")
    ) {

      return (
        `${BACKEND_BASE_URL}${image}`
      );
    }


    return (
      `${BACKEND_BASE_URL}/${image}`
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
          Loading trainer assignments...
        </Text>

      </View>
    );
  }


  // ==========================================================
  // MAIN SCREEN
  // ==========================================================

  const unassignedCount =
    members.filter(
      (member) =>
        !member.trainer
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

      {/* ======================================================
          MAIN SCROLL
      ====================================================== */}

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
              setRefreshing(
                true
              );
              loadData(false);
            }}
            tintColor={
              colors.primary
            }
            colors={[
              colors.primary,
            ]}
          />
        }
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
              GYMRYT • TRAINING TEAM
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

          </View>


          <View
            style={
              styles.headerActions
            }
          >

            {/* THEME */}

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
              onPress={
                toggleTheme
              }
              activeOpacity={0.8}
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
            </TouchableOpacity>


            {/* BACK */}

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
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={
                  colors.text
                }
              />
            </TouchableOpacity>

          </View>

        </View>


        {/* ====================================================
            SUMMARY
        ==================================================== */}

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

          <View
            style={
              styles.summaryHeader
            }
          >

            <View>

              <Text
                style={[
                  styles.summaryEyebrow,
                  {
                    color:
                      colors.primaryLight,
                  },
                ]}
              >
                YOUR TEAM
              </Text>

              <Text
                style={[
                  styles.summaryTitle,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Assignment Overview
              </Text>

            </View>

          </View>


          <View
            style={
              styles.summaryGrid
            }
          >

            <SummaryStat
              value={members.length}
              label="MEMBERS"
              icon="people-outline"
              iconColor="#36B7FF"
              colors={colors}
            />

            <SummaryStat
              value={trainers.length}
              label="TRAINERS"
              icon="barbell-outline"
              iconColor="#45E0A5"
              colors={colors}
            />

            <SummaryStat
              value={unassignedCount}
              label="UNASSIGNED"
              icon="alert-circle-outline"
              iconColor="#FFB21C"
              colors={colors}
            />

          </View>

        </View>


        {/* ====================================================
            SECTION TITLE
        ==================================================== */}

        <View
          style={
            styles.sectionRow
          }
        >

          <Text
            style={[
              styles.section,
              {
                color:
                  colors.text,
              },
            ]}
          >
            MEMBER ASSIGNMENTS
          </Text>

          <Text
            style={[
              styles.sectionCount,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            {members.length}
          </Text>

        </View>


        {/* ====================================================
            EMPTY STATE
        ==================================================== */}

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
            (member) => {

              const assignColor =
                member.trainer
                  ? "#45E0A5"
                  : "#FFB21C";

              return (

                <View
                  key={
                    member.id
                  }
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

                  {/* ==========================================
                      MEMBER AVATAR
                  ========================================== */}

                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor:
                          colors.iconBackground,
                        borderColor:
                          `${assignColor}55`,
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
                        (
                          member.name ||
                          "?"
                        )
                          .charAt(0)
                          .toUpperCase()
                      }
                    </Text>
                  </View>


                  {/* ==========================================
                      MEMBER INFORMATION
                  ========================================== */}

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
                            colors.secondaryText,
                        },
                      ]}
                    >
                      {
                        member.phone ||
                        "No phone"
                      }
                    </Text>

                    <View
                      style={[
                        styles.trainerBadge,
                        {
                          backgroundColor:
                            `${assignColor}18`,
                          borderColor:
                            `${assignColor}55`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.trainerLabel,
                          {
                            color:
                              assignColor,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {
                          member.trainer
                            ? `TRAINER • ${getTrainerLabel(member)}`
                            : "UNASSIGNED"
                        }
                      </Text>
                    </View>

                  </View>


                  {/* ==========================================
                      ASSIGN BUTTON
                  ========================================== */}

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
                    activeOpacity={0.8}
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

                      <>

                        <Ionicons
                          name={
                            member.trainer
                              ? "swap-horizontal"
                              : "add"
                          }
                          size={14}
                          color={
                            colors.primaryLight
                          }
                        />

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

                      </>

                    )}

                  </TouchableOpacity>

                </View>
              );
            }
          )

        )}

      </ScrollView>


      {/* ======================================================
          TRAINER ASSIGNMENT MODAL
      ====================================================== */}

      <Modal
        visible={
          assignmentModalVisible
        }
        transparent={true}
        animationType="fade"
        onRequestClose={
          closeAssignmentModal
        }
      >

        <View
          style={
            styles.modalRoot
          }
        >

          {/* ==================================================
              BACKDROP
          ================================================== */}

          <Pressable
            style={
              styles.modalBackdrop
            }
            onPress={
              closeAssignmentModal
            }
          />


          {/* ==================================================
              ASSIGNMENT SHEET
          ================================================== */}

          <View
            style={[
              styles.assignmentSheet,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >

            {/* ==================================================
                DRAG HANDLE
            ================================================== */}

            <View
              style={[
                styles.dragHandle,
                {
                  backgroundColor:
                    colors.border,
                },
              ]}
            />


            {/* ==================================================
                MODAL HEADER
            ================================================== */}

            <View
              style={
                styles.modalHeader
              }
            >

              <View
                style={
                  styles.modalHeaderLeft
                }
              >

                {/* ============================================
                    HEADER ICON
                ============================================ */}

                <View
                  style={[
                    styles.modalHeaderIcon,
                    {
                      backgroundColor:
                        colors.iconBackground,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={22}
                    color={
                      colors.primaryLight
                    }
                  />
                </View>


                {/* ============================================
                    HEADER TEXT
                ============================================ */}

                <View
                  style={
                    styles.modalHeaderText
                  }
                >

                  <Text
                    style={[
                      styles.modalTitle,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    Assign Trainer
                  </Text>

                  <Text
                    style={[
                      styles.modalSubtitle,
                      {
                        color:
                          colors.secondaryText,
                      },
                    ]}
                  >
                    Choose a trainer for{" "}
                    <Text
                      style={[
                        styles.modalMemberName,
                        {
                          color:
                            colors.primaryLight,
                        },
                      ]}
                    >
                      {
                        selectedMember?.name ||
                        "member"
                      }.
                    </Text>
                  </Text>

                </View>

              </View>


              {/* ============================================
                  CLOSE BUTTON
              ============================================ */}

              <TouchableOpacity
                style={[
                  styles.modalCloseButton,
                  {
                    backgroundColor:
                      colors.background,
                    borderColor:
                      colors.border,
                  },
                ]}
                onPress={
                  closeAssignmentModal
                }
                disabled={
                  !!savingId
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={
                    colors.text
                  }
                />
              </TouchableOpacity>

            </View>


            {/* ==================================================
                TRAINER OPTIONS
            ================================================== */}

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              style={
                styles.trainerOptionsScroll
              }
              contentContainerStyle={{
                paddingBottom: 10,
              }}
            >

              {/* =================================================
                  UNASSIGN TRAINER
              ================================================= */}

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() =>
                  selectTrainer(
                    null
                  )
                }
                style={[
                  styles.trainerOption,
                  {
                    backgroundColor:
                      selectedTrainerId ===
                      null
                        ? "#FF587012"
                        : colors.background,
                    borderColor:
                      selectedTrainerId ===
                      null
                        ? "#FF5870"
                        : colors.border,
                  },
                ]}
              >

                {/* ==============================================
                    ICON
                ============================================== */}

                <View
                  style={[
                    styles.optionIcon,
                    {
                      backgroundColor:
                        "#FF587018",
                    },
                  ]}
                >
                  <Ionicons
                    name="remove-circle-outline"
                    size={22}
                    color="#FF5870"
                  />
                </View>


                {/* ==============================================
                    TEXT
                ============================================== */}

                <View
                  style={
                    styles.optionInfo
                  }
                >

                  <Text
                    style={[
                      styles.optionTitle,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    Unassign Trainer
                  </Text>

                  <Text
                    style={[
                      styles.optionSubtitle,
                      {
                        color:
                          colors.secondaryText,
                      },
                    ]}
                  >
                    Remove current trainer from{" "}
                    {
                      selectedMember?.name ||
                      "member"
                    }.
                  </Text>

                </View>


                {/* ==============================================
                    RADIO
                ============================================== */}

                <Ionicons
                  name={
                    selectedTrainerId ===
                    null
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={22}
                  color={
                    selectedTrainerId ===
                    null
                      ? "#FF5870"
                      : colors.secondaryText
                  }
                />

              </TouchableOpacity>


              {/* =================================================
                  TRAINER LIST
              ================================================= */}

              {trainers.map(
                (trainer) => {

                  const isSelected =
                    String(
                      selectedTrainerId
                    ) ===
                    String(
                      trainer.id
                    );

                  const trainerName =
                    trainer.name ||
                    trainer.full_name ||
                    trainer.username ||
                    "Trainer";

                  const specialization =
                    trainer.specialization ||
                    "Personal Training";

                  const profileImage =
                    trainer.profile_picture ||
                    trainer.profile_image ||
                    trainer.image ||
                    null;

                  const imageUrl =
                    getTrainerImageUrl(
                      profileImage
                    );


                  return (

                    <TouchableOpacity
                      key={
                        trainer.id
                      }
                      activeOpacity={0.82}
                      onPress={() =>
                        selectTrainer(
                          trainer.id
                        )
                      }
                      style={[
                        styles.trainerOption,
                        {
                          backgroundColor:
                            isSelected
                              ? colors.iconBackground
                              : colors.background,
                          borderColor:
                            isSelected
                              ? colors.primaryLight
                              : colors.border,
                        },
                      ]}
                    >

                      {/* ========================================
                          TRAINER AVATAR
                      ======================================== */}

                      <View
                        style={[
                          styles.trainerAvatar,
                          {
                            backgroundColor:
                              colors.iconBackground,
                            borderColor:
                              colors.border,
                          },
                        ]}
                      >

                        {imageUrl ? (

                          <Image
                            source={{
                              uri:
                                imageUrl,
                            }}
                            style={
                              styles.trainerAvatarImage
                            }
                          />

                        ) : (

                          <Text
                            style={[
                              styles.trainerAvatarText,
                              {
                                color:
                                  colors.primaryLight,
                              },
                            ]}
                          >
                            {
                              trainerName
                                .charAt(0)
                                .toUpperCase()
                            }
                          </Text>

                        )}

                      </View>


                      {/* ========================================
                          TRAINER INFORMATION
                      ======================================== */}

                      <View
                        style={
                          styles.optionInfo
                        }
                      >

                        <Text
                          style={[
                            styles.optionTitle,
                            {
                              color:
                                colors.text,
                            },
                          ]}
                          numberOfLines={
                            1
                          }
                        >
                          {
                            trainerName
                          }
                        </Text>

                        <View
                          style={
                            styles.specializationRow
                          }
                        >

                          <Ionicons
                            name="barbell-outline"
                            size={12}
                            color={
                              colors.secondaryText
                            }
                          />

                          <Text
                            style={[
                              styles.optionSubtitle,
                              styles.specializationText,
                              {
                                color:
                                  colors.secondaryText,
                              },
                            ]}
                            numberOfLines={
                              1
                            }
                          >
                            {
                              specialization
                            }
                          </Text>

                        </View>

                      </View>


                      {/* ========================================
                          RADIO
                      ======================================== */}

                      <Ionicons
                        name={
                          isSelected
                            ? "radio-button-on"
                            : "radio-button-off"
                        }
                        size={22}
                        color={
                          isSelected
                            ? colors.primaryLight
                            : colors.secondaryText
                        }
                      />

                    </TouchableOpacity>
                  );
                }
              )}

            </ScrollView>


            {/* ==================================================
                MODAL BUTTONS
            ================================================== */}

            <View
              style={
                styles.modalButtons
              }
            >

              {/* =================================================
                  CANCEL
              ================================================= */}

              <TouchableOpacity
                style={[
                  styles.modalCancelButton,
                  {
                    backgroundColor:
                      colors.background,
                    borderColor:
                      colors.border,
                  },
                ]}
                onPress={
                  closeAssignmentModal
                }
                disabled={
                  !!savingId
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.modalCancelText,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>


              {/* =================================================
                  ASSIGN
              ================================================= */}

              <TouchableOpacity
                style={[
                  styles.modalAssignButton,
                  {
                    backgroundColor:
                      selectedTrainerId ===
                      null
                        ? "#FF5870"
                        : colors.primary,
                  },
                  savingId &&
                    styles.modalAssignButtonDisabled,
                ]}
                onPress={
                  confirmTrainerAssignment
                }
                disabled={
                  !!savingId
                }
                activeOpacity={0.85}
              >

                {savingId ? (

                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                ) : (

                  <Text
                    style={
                      styles.modalAssignText
                    }
                  >
                    {
                      selectedTrainerId ===
                      null
                        ? "Unassign Trainer"
                        : "Assign Trainer"
                    }
                  </Text>

                )}

              </TouchableOpacity>

            </View>

          </View>

        </View>

      </Modal>

    </View>
  );
}


// ============================================================
// SUMMARY STAT
// ============================================================

function SummaryStat({
  value,
  label,
  icon,
  iconColor,
  colors,
}) {

  return (

    <View
      style={[
        styles.summaryItem,
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
          styles.summaryIcon,
          {
            backgroundColor:
              `${iconColor}18`,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={iconColor}
        />
      </View>

      <Text
        style={[
          styles.summaryNumber,
          {
            color:
              colors.text,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.summaryLabel,
          {
            color:
              colors.secondaryText,
          },
        ]}
      >
        {label}
      </Text>

    </View>
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

    content: {
      paddingHorizontal: 18,
      paddingTop:
        Platform.OS === "ios"
          ? 54
          : 44,
      paddingBottom: 40,
    },

    center: {
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
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 18,
    },

    headerText: {
      flex: 1,
      marginRight: 10,
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

    headerActions: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 7,
    },

    back: {
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

    summary: {
      borderWidth: 1,
      borderRadius: 26,
      padding: 16,
      marginBottom: 21,
    },

    summaryHeader: {
      marginBottom: 14,
    },

    summaryEyebrow: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.3,
      marginBottom: 3,
    },

    summaryTitle: {
      fontSize: 18,
      fontWeight: "900",
    },

    summaryGrid: {
      flexDirection:
        "row",
      gap: 8,
    },

    summaryItem: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 18,
      paddingVertical: 12,
      alignItems:
        "center",
    },

    summaryIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    summaryNumber: {
      fontSize: 22,
      fontWeight: "900",
      marginTop: 7,
    },

    summaryLabel: {
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.6,
      marginTop: 2,
    },


    // ========================================================
    // SECTION
    // ========================================================

    sectionRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 11,
    },

    section: {
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    sectionCount: {
      fontSize: 10,
      fontWeight: "800",
    },


    // ========================================================
    // EMPTY
    // ========================================================

    empty: {
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
    // MEMBER CARD
    // ========================================================

    memberCard: {
      minHeight: 84,
      borderWidth: 1,
      borderRadius: 20,
      paddingVertical: 10,
      paddingLeft: 10,
      paddingRight: 10,
      flexDirection:
        "row",
      alignItems:
        "center",
      marginBottom: 8,
    },

    avatar: {
      width: 52,
      height: 52,
      borderRadius: 17,
      borderWidth: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    avatarText: {
      fontSize: 18,
      fontWeight: "900",
    },

    memberInfo: {
      flex: 1,
      marginLeft: 11,
      marginRight: 8,
    },

    memberName: {
      fontSize: 13,
      fontWeight: "900",
    },

    memberMeta: {
      fontSize: 9,
      fontWeight: "600",
      marginTop: 3,
    },

    trainerBadge: {
      alignSelf:
        "flex-start",
      borderWidth: 1,
      borderRadius: 11,
      paddingHorizontal: 7,
      paddingVertical: 4,
      marginTop: 6,
      maxWidth: "100%",
    },

    trainerLabel: {
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.4,
    },

    assignButton: {
      height: 38,
      borderWidth: 1,
      borderRadius: 13,
      paddingHorizontal: 11,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 4,
    },

    assignText: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.8,
    },


    // ========================================================
    // MODAL
    // ========================================================

    modalRoot: {
      flex: 1,
      justifyContent:
        "flex-end",
    },

    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        "rgba(0,0,0,0.6)",
    },

    assignmentSheet: {
      maxHeight: "82%",
      borderWidth: 1,
      borderTopLeftRadius: 27,
      borderTopRightRadius: 27,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom:
        Platform.OS === "ios"
          ? 34
          : 20,
    },

    dragHandle: {
      width: 42,
      height: 4,
      borderRadius: 3,
      alignSelf:
        "center",
      marginBottom: 14,
    },

    modalHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 14,
    },

    modalHeaderLeft: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      marginRight: 10,
    },

    modalHeaderIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    modalHeaderText: {
      flex: 1,
      marginLeft: 11,
    },

    modalTitle: {
      fontSize: 18,
      fontWeight: "900",
    },

    modalSubtitle: {
      fontSize: 10,
      fontWeight: "600",
      marginTop: 3,
    },

    modalMemberName: {
      fontWeight: "900",
    },

    modalCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      borderWidth: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    trainerOptionsScroll: {
      flexGrow: 0,
    },


    // ========================================================
    // OPTIONS
    // ========================================================

    trainerOption: {
      minHeight: 70,
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 11,
      flexDirection:
        "row",
      alignItems:
        "center",
      marginBottom: 8,
    },

    optionIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    trainerAvatar: {
      width: 46,
      height: 46,
      borderRadius: 15,
      borderWidth: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      overflow:
        "hidden",
    },

    trainerAvatarImage: {
      width: "100%",
      height: "100%",
    },

    trainerAvatarText: {
      fontSize: 17,
      fontWeight: "900",
    },

    optionInfo: {
      flex: 1,
      marginLeft: 11,
      marginRight: 8,
    },

    optionTitle: {
      fontSize: 13,
      fontWeight: "900",
    },

    optionSubtitle: {
      fontSize: 9,
      fontWeight: "600",
      marginTop: 3,
    },

    specializationRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 3,
    },

    specializationText: {
      marginTop: 0,
      marginLeft: 4,
    },


    // ========================================================
    // MODAL BUTTONS
    // ========================================================

    modalButtons: {
      flexDirection:
        "row",
      gap: 9,
      marginTop: 8,
    },

    modalCancelButton: {
      flex: 1,
      height: 52,
      borderWidth: 1,
      borderRadius: 17,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    modalCancelText: {
      fontSize: 12,
      fontWeight: "900",
    },

    modalAssignButton: {
      flex: 1.5,
      height: 52,
      borderRadius: 17,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    modalAssignButtonDisabled: {
      opacity: 0.7,
    },

    modalAssignText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
    },

  }); 