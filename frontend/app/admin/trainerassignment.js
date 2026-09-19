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
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  useTheme,
} from "../../context/ThemeContext";


// ============================================================
// API CONFIG
// ============================================================

const BASE_URL =
  "http://192.168.1.52:8000/api/members";

const MEMBERS_API =
  `${BASE_URL}/`;

const TRAINERS_API =
  `${BASE_URL}/trainers/`;

const ASSIGN_API =
  `${BASE_URL}/trainer/assign/`;

const BACKEND_BASE_URL =
  "http://192.168.1.52:8000";


// ============================================================
// TRAINER ASSIGNMENT SCREEN
// ============================================================

export default function TrainerAssignment() {

  const { colors } =
    useTheme();


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
              styles.summaryItem
            }
          >

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


          <View
            style={
              styles.summaryItem
            }
          >

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


          <View
            style={
              styles.summaryItem
            }
          >

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
                  (member) =>
                    !member.trainer
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


        {/* ====================================================
            SECTION TITLE
        ==================================================== */}

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
                    {
                      member.trainer
                        ? `TRAINER • ${getTrainerLabel(member)}`
                        : "UNASSIGNED"
                    }
                  </Text>

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
            style={
              styles.assignmentSheet
            }
          >

            {/* ==================================================
                DRAG HANDLE
            ================================================== */}

            <View
              style={
                styles.dragHandle
              }
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
                  style={
                    styles.modalHeaderIcon
                  }
                >

                  <Text
                    style={
                      styles.modalHeaderIconText
                    }
                  >
                    👤
                  </Text>

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
                    style={
                      styles.modalTitle
                    }
                  >
                    Assign Trainer
                  </Text>


                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Choose a trainer for{" "}

                    <Text
                      style={
                        styles.modalMemberName
                      }
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
                style={
                  styles.modalCloseButton
                }

                onPress={
                  closeAssignmentModal
                }

                disabled={
                  !!savingId
                }

                activeOpacity={0.8}
              >

                <Text
                  style={
                    styles.modalCloseText
                  }
                >
                  ×
                </Text>

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

                  styles.unassignOption,

                  selectedTrainerId ===
                    null &&
                    styles.selectedUnassignOption,
                ]}
              >

                {/* ==============================================
                    ICON
                ============================================== */}

                <View
                  style={[
                    styles.optionIcon,
                    styles.unassignIcon,
                  ]}
                >

                  <Text
                    style={
                      styles.unassignIconText
                    }
                  >
                    ⊘
                  </Text>

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
                    style={
                      styles.optionTitle
                    }
                  >
                    Unassign Trainer
                  </Text>


                  <Text
                    style={
                      styles.optionSubtitle
                    }
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

                <View
                  style={[
                    styles.radioOuter,

                    selectedTrainerId ===
                      null &&
                      styles.radioOuterSelected,
                  ]}
                >

                  {selectedTrainerId ===
                    null && (

                    <View
                      style={
                        styles.radioInner
                      }
                    />

                  )}

                </View>

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

                        isSelected &&
                          styles.selectedTrainerOption,
                      ]}
                    >

                      {/* ========================================
                          TRAINER AVATAR
                      ======================================== */}

                      <View
                        style={
                          styles.trainerAvatar
                        }
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
                            style={
                              styles.trainerAvatarText
                            }
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
                          style={
                            styles.optionTitle
                          }

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

                          <Text
                            style={
                              styles.dumbbellIcon
                            }
                          >
                            🏋
                          </Text>


                          <Text
                            style={
                              styles.optionSubtitle
                            }

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

                      <View
                        style={[
                          styles.radioOuter,

                          isSelected &&
                            styles.radioOuterSelected,
                        ]}
                      >

                        {isSelected && (

                          <View
                            style={
                              styles.radioInner
                            }
                          />

                        )}

                      </View>

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
                style={
                  styles.modalCancelButton
                }

                onPress={
                  closeAssignmentModal
                }

                disabled={
                  !!savingId
                }

                activeOpacity={0.8}
              >

                <Text
                  style={
                    styles.modalCancelText
                  }
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
    // CONTENT
    // ========================================================

    content: {
      paddingHorizontal: 20,

      paddingTop: 55,

      paddingBottom: 50,
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 24,
    },


    back: {
      width: 45,
      height: 45,

      borderRadius: 14,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
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


    // ========================================================
    // SUMMARY
    // ========================================================

    summary: {
      borderWidth: 1,

      borderRadius: 18,

      padding: 17,

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      marginBottom: 28,
    },


    summaryItem: {
      flex: 1,

      alignItems:
        "flex-start",
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


    // ========================================================
    // SECTION
    // ========================================================

    section: {
      fontSize: 10,

      fontWeight: "900",

      letterSpacing: 1.3,

      marginBottom: 12,
    },


    // ========================================================
    // MEMBER CARD
    // ========================================================

    memberCard: {
      minHeight: 84,

      borderWidth: 1,

      borderRadius: 17,

      padding: 12,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 10,
    },


    avatar: {
      width: 48,
      height: 48,

      borderRadius: 15,

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


    // ========================================================
    // ASSIGN BUTTON
    // ========================================================

    assignButton: {
      minWidth: 68,

      height: 38,

      borderRadius: 11,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 8,
    },


    assignText: {
      fontSize: 8,

      fontWeight: "900",

      letterSpacing: 0.6,
    },


    // ========================================================
    // EMPTY STATE
    // ========================================================

    empty: {
      borderWidth: 1,

      borderRadius: 18,

      padding: 30,

      alignItems:
        "center",
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

      textAlign:
        "center",
    },


    // ========================================================
    // MODAL ROOT
    // ========================================================

    modalRoot: {
      flex: 1,

      justifyContent:
        "flex-end",
    },


    // ========================================================
    // MODAL BACKDROP
    // ========================================================

    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,

      backgroundColor:
        "rgba(0, 0, 0, 0.78)",
    },


    // ========================================================
    // ASSIGNMENT SHEET
    // ========================================================

    assignmentSheet: {
      backgroundColor:
        "#0B1424",

      borderTopLeftRadius: 32,

      borderTopRightRadius: 32,

      borderWidth: 1,

      borderBottomWidth: 0,

      borderColor:
        "#173A70",

      paddingHorizontal: 22,

      paddingTop: 13,

      paddingBottom: 28,

      maxHeight: "82%",

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,
        height: -8,
      },

      shadowOpacity:
        0.45,

      shadowRadius: 25,

      elevation: 25,
    },


    // ========================================================
    // DRAG HANDLE
    // ========================================================

    dragHandle: {
      alignSelf:
        "center",

      width: 82,

      height: 7,

      borderRadius: 10,

      backgroundColor:
        "#71809A",

      marginBottom: 20,

      opacity: 0.85,
    },


    // ========================================================
    // MODAL HEADER
    // ========================================================

    modalHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 20,
    },


    modalHeaderLeft: {
      flexDirection:
        "row",

      alignItems:
        "center",

      flex: 1,
    },


    modalHeaderIcon: {
      width: 70,
      height: 70,

      borderRadius: 21,

      backgroundColor:
        "#193D88",

      borderWidth: 1,

      borderColor:
        "#2D65D4",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 15,
    },


    modalHeaderIconText: {
      fontSize: 31,
    },


    modalHeaderText: {
      flex: 1,
    },


    modalTitle: {
      color:
        "#FFFFFF",

      fontSize: 25,

      fontWeight: "900",

      letterSpacing: 0.2,
    },


    modalSubtitle: {
      color:
        "#8D9CB2",

      fontSize: 13,

      marginTop: 5,

      lineHeight: 18,
    },


    modalMemberName: {
      color:
        "#4DA3FF",

      fontWeight: "900",
    },


    // ========================================================
    // CLOSE BUTTON
    // ========================================================

    modalCloseButton: {
      width: 49,
      height: 49,

      borderRadius: 25,

      backgroundColor:
        "#172235",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginLeft: 10,
    },


    modalCloseText: {
      color:
        "#B7C1D0",

      fontSize: 35,

      fontWeight: "300",

      lineHeight: 37,

      marginTop: -3,
    },


    // ========================================================
    // TRAINER OPTIONS SCROLL
    // ========================================================

    trainerOptionsScroll: {
      marginBottom: 12,
    },


    // ========================================================
    // TRAINER OPTION
    // ========================================================

    trainerOption: {
      minHeight: 91,

      borderRadius: 21,

      borderWidth: 1,

      borderColor:
        "#183762",

      backgroundColor:
        "#101D31",

      flexDirection:
        "row",

      alignItems:
        "center",

      paddingHorizontal: 15,

      paddingVertical: 12,

      marginBottom: 11,
    },


    selectedTrainerOption: {
      backgroundColor:
        "#142C4E",

      borderColor:
        "#2F80FF",

      borderWidth: 1.5,
    },


    // ========================================================
    // UNASSIGN OPTION
    // ========================================================

    unassignOption: {
      backgroundColor:
        "#241B29",

      borderColor:
        "#5A2840",
    },


    selectedUnassignOption: {
      backgroundColor:
        "#2D1C2A",

      borderColor:
        "#FF4D67",

      borderWidth: 1.5,
    },


    // ========================================================
    // OPTION ICON
    // ========================================================

    optionIcon: {
      width: 58,
      height: 58,

      borderRadius: 29,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 14,
    },


    unassignIcon: {
      backgroundColor:
        "#3A1D2D",

      borderWidth: 1,

      borderColor:
        "#713149",
    },


    unassignIconText: {
      color:
        "#FF5069",

      fontSize: 30,

      fontWeight: "500",
    },


    // ========================================================
    // TRAINER AVATAR
    // ========================================================

    trainerAvatar: {
      width: 58,
      height: 58,

      borderRadius: 29,

      backgroundColor:
        "#203E7C",

      borderWidth: 1,

      borderColor:
        "#315D9D",

      alignItems:
        "center",

      justifyContent:
        "center",

      overflow: "hidden",

      marginRight: 14,
    },


    trainerAvatarImage: {
      width: "100%",

      height: "100%",

      resizeMode:
        "cover",
    },


    trainerAvatarText: {
      color:
        "#FFFFFF",

      fontSize: 21,

      fontWeight: "900",
    },


    // ========================================================
    // OPTION INFORMATION
    // ========================================================

    optionInfo: {
      flex: 1,

      justifyContent:
        "center",

      marginRight: 10,
    },


    optionTitle: {
      color:
        "#FFFFFF",

      fontSize: 16,

      fontWeight: "900",
    },


    optionSubtitle: {
      color:
        "#8292AA",

      fontSize: 12,

      marginTop: 4,
    },


    // ========================================================
    // SPECIALIZATION
    // ========================================================

    specializationRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 2,
    },


    dumbbellIcon: {
      fontSize: 15,

      marginRight: 7,

      opacity: 0.9,
    },


    // ========================================================
    // RADIO
    // ========================================================

    radioOuter: {
      width: 27,
      height: 27,

      borderRadius: 14,

      borderWidth: 3,

      borderColor:
        "#687992",

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    radioOuterSelected: {
      borderColor:
        "#4DA3FF",
    },


    radioInner: {
      width: 13,
      height: 13,

      borderRadius: 7,

      backgroundColor:
        "#4DA3FF",
    },


    // ========================================================
    // MODAL BUTTONS
    // ========================================================

    modalButtons: {
      flexDirection:
        "row",

      gap: 12,

      marginTop: 5,
    },


    // ========================================================
    // CANCEL BUTTON
    // ========================================================

    modalCancelButton: {
      flex: 1,

      height: 60,

      borderRadius: 17,

      backgroundColor:
        "#0D1625",

      borderWidth: 2,

      borderColor:
        "#67758A",

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    modalCancelText: {
      color:
        "#B5BFCE",

      fontSize: 15,

      fontWeight: "800",
    },


    // ========================================================
    // ASSIGN BUTTON
    // ========================================================

    modalAssignButton: {
      flex: 1,

      height: 60,

      borderRadius: 17,

      backgroundColor:
        "#1976E8",

      borderWidth: 1,

      borderColor:
        "#318EFF",

      alignItems:
        "center",

      justifyContent:
        "center",

      shadowColor:
        "#1677FF",

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity:
        0.28,

      shadowRadius:
        10,

      elevation: 8,
    },


    modalAssignButtonDisabled: {
      opacity: 0.55,
    },


    modalAssignText: {
      color:
        "#FFFFFF",

      fontSize: 14,

      fontWeight: "900",

      letterSpacing: 0.4,

      textAlign:
        "center",
    },

  });