import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../context/ThemeContext";


// ============================================================
// API
// ============================================================

const API_URL =
  "http://192.168.1.43:8000/api/members";


export default function TrainerDetailsScreen() {

  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();

  const { id } =
    useLocalSearchParams();


  // ==========================================================
  // STATE
  // ==========================================================

  const [trainer, setTrainer] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [deleting, setDeleting] =
    useState(false);


  // ==========================================================
  // FETCH TRAINER
  // ==========================================================

  const fetchTrainer = useCallback(
    async () => {

      try {

        setLoading(true);

        const token =
          await AsyncStorage.getItem(
            "adminToken"
          );

        // ------------------------------------------------------
        // NO TOKEN
        // ------------------------------------------------------

        if (!token) {

          router.replace("/");

          return;
        }


        // ------------------------------------------------------
        // NO ID
        // ------------------------------------------------------

        if (!id) {

          throw new Error(
            "Trainer ID is missing."
          );
        }


        console.log(
          "FETCHING TRAINER ID:",
          id
        );


        // ------------------------------------------------------
        // API REQUEST
        // ------------------------------------------------------

        const response =
          await fetch(
            `${API_URL}/trainers/${id}/`,
            {
              method: "GET",

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


        console.log(
          "TRAINER DETAILS RESPONSE:",
          data
        );


        // ------------------------------------------------------
        // SESSION EXPIRED
        // ------------------------------------------------------

        if (
          response.status === 401
        ) {

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
        // NOT FOUND
        // ------------------------------------------------------

        if (
          response.status === 404
        ) {

          setTrainer(null);

          return;
        }


        // ------------------------------------------------------
        // OTHER ERROR
        // ------------------------------------------------------

        if (
          !response.ok ||
          !data?.success
        ) {

          throw new Error(
            data?.message ||
              "Unable to load trainer."
          );
        }


        // ------------------------------------------------------
        // TRAINER DATA
        // ------------------------------------------------------

        const trainerData =
          data.trainer || data;


        setTrainer(
          trainerData
        );

      } catch (error) {

        console.log(
          "TRAINER DETAILS LOAD ERROR:",
          error
        );

        Alert.alert(
          "Error",
          error.message ||
            "Unable to load trainer."
        );

      } finally {

        setLoading(false);
      }

    },
    [id]
  );


  // ==========================================================
  // REFRESH WHEN SCREEN OPENS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {

      fetchTrainer();

    }, [fetchTrainer])
  );


  // ==========================================================
  // OPEN EDIT TRAINER
  // ==========================================================

  const openEditTrainer = () => {

    if (!id) {
      return;
    }

    router.push({
      pathname:
        "/admin/edittrainer",

      params: {
        id: String(id),
      },
    });
  };


  // ==========================================================
  // DELETE TRAINER
  // ==========================================================

  const deleteTrainer = () => {

    if (!trainer) {
      return;
    }


    Alert.alert(
      "Delete Trainer",

      `Are you sure you want to delete ${
        trainer.name ||
        "this trainer"
      }?\n\nThis will permanently remove the trainer account.`,

      [
        // ----------------------------------------------------
        // CANCEL
        // ----------------------------------------------------

        {
          text: "Cancel",
          style: "cancel",
        },


        // ----------------------------------------------------
        // DELETE
        // ----------------------------------------------------

        {
          text: "Delete",
          style: "destructive",

          onPress: async () => {

            try {

              setDeleting(true);


              // ------------------------------------------------
              // TOKEN
              // ------------------------------------------------

              const token =
                await AsyncStorage.getItem(
                  "adminToken"
                );


              if (!token) {

                router.replace("/");

                return;
              }


              if (!id) {

                throw new Error(
                  "Trainer ID is missing."
                );
              }


              console.log(
                "DELETING TRAINER ID:",
                id
              );


              // ------------------------------------------------
              // DELETE REQUEST
              // ------------------------------------------------

              const response =
                await fetch(
                  `${API_URL}/trainers/${id}/`,
                  {
                    method: "DELETE",

                    headers: {
                      Accept:
                        "application/json",

                      Authorization:
                        `Token ${token}`,
                    },
                  }
                );


              // ------------------------------------------------
              // READ RESPONSE
              // ------------------------------------------------

              let data = {};

              try {

                data =
                  await response.json();

              } catch {

                data = {};
              }


              console.log(
                "DELETE TRAINER STATUS:",
                response.status
              );

              console.log(
                "DELETE TRAINER RESPONSE:",
                data
              );


              // ------------------------------------------------
              // SESSION EXPIRED
              // ------------------------------------------------

              if (
                response.status === 401
              ) {

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


              // ------------------------------------------------
              // DELETE FAILED
              // ------------------------------------------------

              if (
                !response.ok ||
                !data?.success
              ) {

                throw new Error(
                  data?.message ||
                    `Unable to delete trainer (${response.status}).`
                );
              }


              // ------------------------------------------------
              // SUCCESS
              // ------------------------------------------------

              console.log(
                "TRAINER DELETED SUCCESSFULLY"
              );


              Alert.alert(
                "Trainer Deleted",

                "The trainer has been removed successfully.",

                [
                  {
                    text: "OK",

                    onPress: () => {

                      /*
                       * Replace the current details
                       * screen with the trainers list.
                       *
                       * This prevents the deleted trainer
                       * screen from remaining in navigation.
                       */

                      router.replace(
                        "/admin/trainers"
                      );
                    },
                  },
                ]
              );


            } catch (error) {

              console.log(
                "DELETE TRAINER ERROR:",
                error
              );


              Alert.alert(
                "Delete Failed",

                error.message ||
                  "Could not delete trainer."
              );


            } finally {

              setDeleting(false);
            }

          },
        },
      ]
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
          Loading trainer...
        </Text>

      </View>
    );
  }


  // ==========================================================
  // TRAINER NOT FOUND
  // ==========================================================

  if (!trainer) {

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

        <View
          style={[
            styles.errorIcon,
            {
              backgroundColor:
                colors.iconBackground,
            },
          ]}
        >
          <Ionicons
            name="person-outline"
            size={28}
            color={
              colors.primaryLight
            }
          />
        </View>

        <Text
          style={[
            styles.errorTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          Trainer Not Found
        </Text>

        <Pressable
          style={[
            styles.errorButton,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
          onPress={() =>
            router.replace(
              "/admin/trainers"
            )
          }
        >
          <Ionicons
            name="arrow-back"
            size={15}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.errorButtonText
            }
          >
            Back to Trainers
          </Text>
        </Pressable>

      </View>
    );
  }


  // ==========================================================
  // DATA
  // ==========================================================

  const isActive =
    trainer.is_active !== false;

  const statusColor =
    isActive
      ? "#45E0A5"
      : "#FF5870";

  const trainerName =
    trainer.name ||
    "Unnamed Trainer";

  const trainerUsername =
    trainer.username ||
    "username";

  const trainerEmail =
    trainer.email ||
    "No email";

  const trainerPhone =
    trainer.phone ||
    "No phone number";

  const specialization =
    trainer.specialization ||
    "Not specified";

  const experience =
    trainer.experience_years ??
    0;


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

      {/* ====================================================
          HEADER
      ==================================================== */}

      <View style={styles.header}>

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
            Trainer Details
          </Text>

        </View>


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


      {/* ====================================================
          CONTENT
      ==================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >

        {/* ==================================================
            PROFILE CARD
        ================================================== */}

        <View
          style={[
            styles.profileCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >

          {/* PROFILE IMAGE */}

          <View
            style={[
              styles.profileImage,
              {
                backgroundColor:
                  colors.iconBackground,
                borderColor:
                  `${statusColor}88`,
              },
            ]}
          >

            {trainer.profile_picture ? (

              <Image
                source={{
                  uri:
                    trainer.profile_picture,
                }}
                style={
                  styles.profilePhoto
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
                {trainerName
                  .split(" ")
                  .filter(Boolean)
                  .map(
                    (word) =>
                      word[0]
                  )
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()}
              </Text>

            )}

          </View>


          {/* NAME */}

          <Text
            style={[
              styles.profileName,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {trainerName}
          </Text>


          {/* ROLE + STATUS */}

          <View
            style={
              styles.badgeRow
            }
          >

            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    colors.iconBackground,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <Ionicons
                name="fitness-outline"
                size={12}
                color={
                  colors.primaryLight
                }
              />

              <Text
                style={[
                  styles.badgeText,
                  styles.badgeTextIcon,
                  {
                    color:
                      colors.primaryLight,
                  },
                ]}
              >
                TRAINER
              </Text>
            </View>


            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    `${statusColor}18`,
                  borderColor:
                    `${statusColor}55`,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      statusColor,
                  },
                ]}
              />

              <Text
                style={[
                  styles.badgeText,
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

          </View>


          {/* WORKSPACE */}

          <View
            style={
              styles.gymRow
            }
          >
            <Ionicons
              name="location-outline"
              size={14}
              color={
                colors.secondaryText
              }
            />

            <Text
              style={[
                styles.profileWorkspace,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
              numberOfLines={1}
            >
              {trainer.workspace_name ||
                "GymRyt"}
            </Text>
          </View>

        </View>


        {/* ==================================================
            ACCOUNT INFORMATION
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          ACCOUNT INFORMATION
        </Text>

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
            icon="person-outline"
            label="Username"
            value={`@${trainerUsername}`}
            colors={colors}
          />

          <Divider colors={colors} />

          <InfoRow
            icon="mail-outline"
            label="Email"
            value={trainerEmail}
            colors={colors}
          />

          <Divider colors={colors} />

          <InfoRow
            icon="call-outline"
            label="Phone"
            value={trainerPhone}
            colors={colors}
          />

        </View>


        {/* ==================================================
            TRAINER INFORMATION
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          TRAINER INFORMATION
        </Text>

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
            icon="barbell-outline"
            label="Specialization"
            value={specialization}
            colors={colors}
          />

          <Divider colors={colors} />

          <InfoRow
            icon="trophy-outline"
            label="Experience"
            value={`${experience} ${
              experience === 1
                ? "year"
                : "years"
            }`}
            colors={colors}
          />

        </View>


        {/* ==================================================
            ACTIONS
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          MANAGE TRAINER
        </Text>


        {/* EDIT BUTTON */}

        <Pressable
          style={[
            styles.editButton,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
          onPress={
            openEditTrainer
          }
          disabled={deleting}
        >
          <Ionicons
            name="create-outline"
            size={19}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.editButtonText
            }
          >
            Edit Trainer
          </Text>
        </Pressable>


        {/* DELETE BUTTON */}

        <Pressable
          style={[
            styles.deleteButton,
            {
              backgroundColor:
                isDark
                  ? "#100D15"
                  : "#FFF5F6",
              borderColor:
                "#55202B",
              opacity:
                deleting ? 0.6 : 1,
            },
          ]}
          onPress={
            deleteTrainer
          }
          disabled={deleting}
        >
          {deleting ? (

            <ActivityIndicator
              color="#FF4D5E"
            />

          ) : (

            <>
              <Ionicons
                name="trash-outline"
                size={19}
                color="#FF4D5E"
              />

              <Text
                style={
                  styles.deleteButtonText
                }
              >
                Delete Trainer
              </Text>
            </>

          )}
        </Pressable>


        {/* CANCEL / BACK */}

        <Pressable
          style={
            styles.cancelButton
          }
          disabled={deleting}
          onPress={() =>
            router.back()
          }
        >
          <View
            style={[
              styles.cancelIcon,
              {
                backgroundColor:
                  colors.iconBackground,
              },
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={14}
              color={
                colors.primaryLight
              }
            />
          </View>

          <Text
            style={[
              styles.cancelText,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            BACK
          </Text>
        </Pressable>

      </ScrollView>

    </View>
  );
}


// ============================================================
// DIVIDER
// ============================================================

function Divider({
  colors,
}) {

  return (
    <View
      style={[
        styles.divider,
        {
          backgroundColor:
            colors.border,
        },
      ]}
    />
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
          size={21}
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
          numberOfLines={2}
        >
          {value}
        </Text>

      </View>

    </View>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
  },


  // ==========================================================
  // LOADING
  // ==========================================================

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "700",
  },


  // ==========================================================
  // ERROR
  // ==========================================================

  errorIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
  },

  errorButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 16,
  },

  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 6,
  },


  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    paddingHorizontal: 18,
    paddingTop:
      Platform.OS === "ios"
        ? 54
        : 44,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerLeft: {
    flex: 1,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginLeft: 10,
  },

  headerButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },


  // ==========================================================
  // CONTENT
  // ==========================================================

  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },


  // ==========================================================
  // PROFILE
  // ==========================================================

  profileCard: {
    borderWidth: 1,
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: "center",
    marginBottom: 4,
  },

  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  profilePhoto: {
    width: "100%",
    height: "100%",
  },

  profileInitials: {
    fontSize: 31,
    fontWeight: "900",
  },

  profileName: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 12,
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 9,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  badgeText: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  badgeTextIcon: {
    marginLeft: 4,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  gymRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
    maxWidth: "90%",
  },

  profileWorkspace: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },


  // ==========================================================
  // SECTION
  // ==========================================================

  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 9,
  },


  // ==========================================================
  // INFO CARD
  // ==========================================================

  infoCard: {
    borderWidth: 1,
    borderRadius: 21,
    paddingHorizontal: 13,
    paddingVertical: 3,
  },

  infoRow: {
    minHeight: 67,
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
    marginLeft: 54,
  },


  // ==========================================================
  // EDIT BUTTON
  // ==========================================================

  editButton: {
    height: 54,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  editButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginLeft: 8,
  },


  // ==========================================================
  // DELETE BUTTON
  // ==========================================================

  deleteButton: {
    height: 54,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButtonText: {
    color: "#FF4D5E",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginLeft: 8,
  },


  // ==========================================================
  // BACK
  // ==========================================================

  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 22,
    paddingBottom: 8,
  },

  cancelIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  cancelText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.7,
  },

});