import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../context/ThemeContext";


// ============================================================
// API
// ============================================================

const API_URL =
  "http://192.168.1.52:8000/api/members";


export default function TrainerDetailsScreen() {

  const { colors } = useTheme();

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
                        "/admin/trainer"
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


        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
          onPress={() =>
            router.replace(
              "/admin/trainer"
            )
          }
        >

          <Text
            style={
              styles.backButtonText
            }
          >
            Back to Trainers
          </Text>

        </TouchableOpacity>

      </View>
    );
  }


  // ==========================================================
  // DATA
  // ==========================================================

  const isActive =
    trainer.is_active !== false;


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

        <TouchableOpacity
          style={[
            styles.headerBack,
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
              styles.backIcon,
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
              styles.smallTitle,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            GYM STAFF
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

          {trainer.profile_picture ? (

            <Image
              source={{
                uri:
                  trainer.profile_picture,
              }}
              style={
                styles.profileImage
              }
            />

          ) : (

            <View
              style={[
                styles.profileImage,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >

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

            </View>

          )}


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


          {/* ROLE */}

          <Text
            style={[
              styles.profileRole,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            TRAINER
          </Text>


          {/* WORKSPACE */}

          <Text
            style={[
              styles.profileWorkspace,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            {trainer.workspace_name ||
              "GymRyt"}
          </Text>


          {/* STATUS */}

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  isActive
                    ? colors.successBackground
                    : colors.dangerBackground,
              },
            ]}
          >

            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    isActive
                      ? colors.success
                      : colors.danger,
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    isActive
                      ? colors.success
                      : colors.danger,
                },
              ]}
            >
              {isActive
                ? "ACTIVE"
                : "INACTIVE"}
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
                colors.primaryLight,
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

          {/* USERNAME */}

          <View
            style={
              styles.infoRow
            }
          >

            <Text
              style={[
                styles.infoLabel,
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
                styles.infoValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              @{trainerUsername}
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


          {/* EMAIL */}

          <View
            style={
              styles.infoRow
            }
          >

            <Text
              style={[
                styles.infoLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Email
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
              {trainerEmail}
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


          {/* PHONE */}

          <View
            style={
              styles.infoRow
            }
          >

            <Text
              style={[
                styles.infoLabel,
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
                styles.infoValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {trainerPhone}
            </Text>

          </View>

        </View>


        {/* ==================================================
            TRAINER INFORMATION
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.primaryLight,
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

          {/* SPECIALIZATION */}

          <View
            style={
              styles.infoRow
            }
          >

            <Text
              style={[
                styles.infoLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Specialization
            </Text>

            <Text
              style={[
                styles.infoValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {specialization}
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


          {/* EXPERIENCE */}

          <View
            style={
              styles.infoRow
            }
          >

            <Text
              style={[
                styles.infoLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Experience
            </Text>

            <Text
              style={[
                styles.infoValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {experience}{" "}
              {experience === 1
                ? "year"
                : "years"}
            </Text>

          </View>

        </View>


        {/* ==================================================
            ACTIONS
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.primaryLight,
            },
          ]}
        >
          MANAGE TRAINER
        </Text>


        {/* EDIT BUTTON */}

        <TouchableOpacity
          style={[
            styles.editButton,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
          activeOpacity={0.8}
          onPress={
            openEditTrainer
          }
          disabled={deleting}
        >

          <Text
            style={
              styles.editButtonText
            }
          >
            Edit Trainer
          </Text>

        </TouchableOpacity>


        {/* DELETE BUTTON */}

        <TouchableOpacity
          style={[
            styles.deleteButton,
            {
              backgroundColor:
                colors.dangerBackground,

              borderColor:
                colors.danger,

              opacity:
                deleting ? 0.6 : 1,
            },
          ]}
          activeOpacity={0.8}
          onPress={
            deleteTrainer
          }
          disabled={deleting}
        >

          {deleting ? (

            <ActivityIndicator
              color={
                colors.danger
              }
            />

          ) : (

            <Text
              style={[
                styles.deleteButtonText,
                {
                  color:
                    colors.danger,
                },
              ]}
            >
              Delete Trainer
            </Text>

          )}

        </TouchableOpacity>


        {/* CANCEL / BACK */}

        <TouchableOpacity
          style={
            styles.cancelButton
          }
          disabled={deleting}
          onPress={() =>
            router.back()
          }
        >

          <Text
            style={[
              styles.cancelText,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            Back
          </Text>

        </TouchableOpacity>

      </ScrollView>

    </View>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    paddingHorizontal: 20,
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
    marginTop: 14,
    fontSize: 13,
  },


  // ==========================================================
  // ERROR
  // ==========================================================

  errorTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 20,
  },

  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },


  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    marginTop: 55,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
  },

  headerBack: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  backIcon: {
    fontSize: 30,
    lineHeight: 30,
    marginTop: -3,
  },

  headerText: {
    flex: 1,
  },

  smallTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  title: {
    fontSize: 27,
    fontWeight: "900",
    marginTop: 4,
  },


  // ==========================================================
  // CONTENT
  // ==========================================================

  content: {
    paddingBottom: 50,
  },


  // ==========================================================
  // PROFILE
  // ==========================================================

  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 28,
  },

  profileImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
  },

  profileInitials: {
    fontSize: 24,
    fontWeight: "900",
  },

  profileName: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 12,
  },

  profileRole: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginTop: 4,
  },

  profileWorkspace: {
    fontSize: 12,
    marginTop: 5,
  },


  // ==========================================================
  // STATUS
  // ==========================================================

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 13,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },


  // ==========================================================
  // SECTION
  // ==========================================================

  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.7,
    marginBottom: 13,
  },


  // ==========================================================
  // INFO CARD
  // ==========================================================

  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 27,
  },

  infoRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    flex: 0.8,
  },

  infoValue: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
    flex: 1.2,
  },

  divider: {
    height: 1,
    width: "100%",
  },


  // ==========================================================
  // EDIT BUTTON
  // ==========================================================

  editButton: {
    height: 52,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  editButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },


  // ==========================================================
  // DELETE BUTTON
  // ==========================================================

  deleteButton: {
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  deleteButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },


  // ==========================================================
  // BACK
  // ==========================================================

  cancelButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: 13,
    fontWeight: "700",
  },

});