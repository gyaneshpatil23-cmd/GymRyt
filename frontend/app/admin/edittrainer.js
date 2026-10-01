import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
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

const API_URL =
  "http://192.168.1.43:8000/api/members";


export default function EditTrainerScreen() {
  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();

  const { id } = useLocalSearchParams();

  // ============================================================
  // STATE
  // ============================================================

  const [trainer, setTrainer] = useState(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [specialization, setSpecialization] =
    useState("");

  const [experience, setExperience] =
    useState("");

  const [isActive, setIsActive] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);


  // ============================================================
  // FETCH TRAINER
  // ============================================================

  const fetchTrainer = useCallback(
    async () => {
      try {
        setLoading(true);

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
          "EDIT TRAINER RESPONSE:",
          data
        );

        // --------------------------------------------------------
        // SESSION EXPIRED
        // --------------------------------------------------------

        if (response.status === 401) {
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

        // --------------------------------------------------------
        // ERROR
        // --------------------------------------------------------

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.message ||
              "Unable to load trainer."
          );
        }

        // --------------------------------------------------------
        // TRAINER DATA
        // --------------------------------------------------------

        const trainerData =
          data.trainer || data;

        setTrainer(trainerData);

        // PERSONAL INFORMATION

        setName(
          trainerData.name || ""
        );

        setUsername(
          trainerData.username || ""
        );

        setEmail(
          trainerData.email || ""
        );

        setPhone(
          trainerData.phone || ""
        );

        // TRAINER INFORMATION

        setSpecialization(
          trainerData.specialization || ""
        );

        setExperience(
          String(
            trainerData.experience_years ??
              0
          )
        );

        setIsActive(
          trainerData.is_active !== false
        );

      } catch (error) {
        console.log(
          "EDIT TRAINER LOAD ERROR:",
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


  // ============================================================
  // REFRESH WHEN SCREEN OPENS
  // ============================================================

  useFocusEffect(
    useCallback(() => {
      fetchTrainer();
    }, [fetchTrainer])
  );


  // ============================================================
  // SAVE TRAINER
  // ============================================================

  const saveTrainer = async () => {

    // ----------------------------------------------------------
    // NAME
    // ----------------------------------------------------------

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      Alert.alert(
        "Missing Information",
        "Please enter the trainer's full name."
      );
      return;
    }


    // ----------------------------------------------------------
    // USERNAME
    // ----------------------------------------------------------

    const trimmedUsername =
      username.trim();

    if (!trimmedUsername) {
      Alert.alert(
        "Missing Information",
        "Please enter a username."
      );
      return;
    }


    // ----------------------------------------------------------
    // EMAIL
    // ----------------------------------------------------------

    const trimmedEmail =
      email.trim();

    if (!trimmedEmail) {
      Alert.alert(
        "Missing Information",
        "Please enter the trainer's email."
      );
      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address."
      );
      return;
    }


    // ----------------------------------------------------------
    // PHONE
    // ----------------------------------------------------------

    const trimmedPhone =
      phone.trim();

    const phoneDigits =
      trimmedPhone.replace(
        /\D/g,
        ""
      );

    if (
      !trimmedPhone ||
      phoneDigits.length < 10
    ) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid phone number."
      );
      return;
    }


    // ----------------------------------------------------------
    // SPECIALIZATION
    // ----------------------------------------------------------

    const trimmedSpecialization =
      specialization.trim();

    if (!trimmedSpecialization) {
      Alert.alert(
        "Missing Information",
        "Please enter the trainer's specialization."
      );
      return;
    }


    // ----------------------------------------------------------
    // EXPERIENCE
    // ----------------------------------------------------------

    const experienceNumber =
      Number(experience);

    if (
      experience.trim() === "" ||
      !Number.isInteger(
        experienceNumber
      ) ||
      experienceNumber < 0 ||
      experienceNumber > 60
    ) {
      Alert.alert(
        "Invalid Experience",
        "Enter experience between 0 and 60 years."
      );
      return;
    }


    // ==========================================================
    // SAVE REQUEST
    // ==========================================================

    try {
      setSaving(true);

      const token =
        await AsyncStorage.getItem(
          "adminToken"
        );

      if (!token) {
        router.replace("/");
        return;
      }

      const payload = {
        name: trimmedName,

        username:
          trimmedUsername,

        email:
          trimmedEmail,

        phone:
          trimmedPhone,

        specialization:
          trimmedSpecialization,

        experience_years:
          experienceNumber,

        is_active:
          isActive,
      };

      console.log(
        "UPDATING TRAINER:",
        payload
      );

      const response =
        await fetch(
          `${API_URL}/trainers/${id}/`,
          {
            method: "PATCH",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",

              Authorization:
                `Token ${token}`,
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        await response.json();

      console.log(
        "UPDATE TRAINER RESPONSE:",
        data
      );


      // --------------------------------------------------------
      // SESSION EXPIRED
      // --------------------------------------------------------

      if (response.status === 401) {
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


      // --------------------------------------------------------
      // UPDATE ERROR
      // --------------------------------------------------------

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            "Unable to update trainer."
        );
      }


      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      Alert.alert(
        "Changes Saved",
        "Trainer details have been updated successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              router.replace({
                pathname:
                  "/admin/trainerdetails",
                params: {
                  id: String(id),
                },
              });
            },
          },
        ]
      );

    } catch (error) {
      console.log(
        "UPDATE TRAINER ERROR:",
        error
      );

      Alert.alert(
        "Update Failed",
        error.message ||
          "Could not update trainer."
      );

    } finally {
      setSaving(false);
    }
  };


  // ============================================================
  // LOADING
  // ============================================================

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


  // ============================================================
  // TRAINER NOT FOUND
  // ============================================================

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

        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={15}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.backButtonText
            }
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }


  // ============================================================
  // MAIN UI
  // ============================================================

  const trainerInitials =
    (trainer.name ||
      trainer.username ||
      "T")
      .split(" ")
      .filter(Boolean)
      .map(
        (word) =>
          word[0]
      )
      .join("")
      .substring(0, 2)
      .toUpperCase();


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
            Edit Trainer
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


      {/* ======================================================
          FORM
      ====================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.content
        }
      >

        {/* ====================================================
            TRAINER PREVIEW
        ==================================================== */}

        <View
          style={[
            styles.previewCard,
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
              styles.previewAvatar,
              {
                backgroundColor:
                  colors.iconBackground,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.previewInitials,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              {trainerInitials}
            </Text>
          </View>

          <View
            style={
              styles.previewInfo
            }
          >
            <Text
              style={[
                styles.previewLabel,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              TRAINER
            </Text>

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
              {trainer.name ||
                "Unnamed Trainer"}
            </Text>

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
              @{trainer.username ||
                "username"}
            </Text>
          </View>
        </View>


        {/* ====================================================
            PERSONAL INFORMATION
        ==================================================== */}

        <View
          style={[
            styles.section,
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
              styles.sectionEyebrow,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            PERSONAL INFORMATION
          </Text>

          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Account Details
          </Text>


          {/* FULL NAME */}

          <Field
            icon="person-outline"
            label="FULL NAME"
            colors={colors}
          >
            <TextInput
              style={[
                styles.input,
                {
                  color:
                    colors.text,
                },
              ]}
              value={name}
              onChangeText={
                setName
              }
              placeholder="Enter full name"
              placeholderTextColor={
                colors.mutedText
              }
              autoCapitalize="words"
            />
          </Field>


          {/* USERNAME */}

          <Field
            icon="at-outline"
            label="USERNAME"
            colors={colors}
          >
            <TextInput
              style={[
                styles.input,
                {
                  color:
                    colors.text,
                },
              ]}
              value={username}
              onChangeText={
                setUsername
              }
              placeholder="Enter username"
              placeholderTextColor={
                colors.mutedText
              }
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>


          {/* EMAIL */}

          <Field
            icon="mail-outline"
            label="EMAIL"
            colors={colors}
          >
            <TextInput
              style={[
                styles.input,
                {
                  color:
                    colors.text,
                },
              ]}
              value={email}
              onChangeText={
                setEmail
              }
              placeholder="trainer@gmail.com"
              placeholderTextColor={
                colors.mutedText
              }
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>


          {/* PHONE */}

          <Field
            icon="call-outline"
            label="PHONE NUMBER"
            colors={colors}
          >
            <TextInput
              style={[
                styles.input,
                {
                  color:
                    colors.text,
                },
              ]}
              value={phone}
              onChangeText={
                setPhone
              }
              placeholder="Enter phone number"
              placeholderTextColor={
                colors.mutedText
              }
              keyboardType="phone-pad"
              maxLength={15}
            />
          </Field>

        </View>


        {/* ====================================================
            TRAINER INFORMATION
        ==================================================== */}

        <View
          style={[
            styles.section,
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
              styles.sectionEyebrow,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            TRAINER INFORMATION
          </Text>

          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Training Profile
          </Text>


          {/* SPECIALIZATION */}

          <Field
            icon="barbell-outline"
            label="SPECIALIZATION"
            colors={colors}
          >
            <TextInput
              style={[
                styles.input,
                {
                  color:
                    colors.text,
                },
              ]}
              value={
                specialization
              }
              onChangeText={
                setSpecialization
              }
              placeholder="e.g. Personal Training"
              placeholderTextColor={
                colors.mutedText
              }
            />
          </Field>


          {/* EXPERIENCE */}

          <Field
            icon="trophy-outline"
            label="EXPERIENCE"
            colors={colors}
          >
            <TextInput
              style={[
                styles.input,
                {
                  color:
                    colors.text,
                },
              ]}
              value={
                experience
              }
              onChangeText={(text) =>
                setExperience(
                  text.replace(
                    /[^0-9]/g,
                    ""
                  )
                )
              }
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={
                colors.mutedText
              }
              maxLength={2}
            />

            <Text
              style={[
                styles.yearsText,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              YEARS
            </Text>
          </Field>


          {/* ====================================================
              STATUS
          ==================================================== */}

          <Text
            style={[
              styles.label,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            STATUS
          </Text>

          <View
            style={
              styles.statusOptions
            }
          >

            {/* ACTIVE */}

            <TouchableOpacity
              style={[
                styles.statusOption,
                {
                  backgroundColor:
                    isActive
                      ? "#45E0A518"
                      : colors.background,
                  borderColor:
                    isActive
                      ? "#45E0A5"
                      : colors.border,
                },
              ]}
              onPress={() =>
                setIsActive(true)
              }
            >
              <Ionicons
                name={
                  isActive
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={19}
                color={
                  isActive
                    ? "#45E0A5"
                    : colors.secondaryText
                }
              />

              <Text
                style={[
                  styles.statusOptionText,
                  {
                    color:
                      isActive
                        ? "#45E0A5"
                        : colors.text,
                  },
                ]}
              >
                ACTIVE
              </Text>
            </TouchableOpacity>


            {/* INACTIVE */}

            <TouchableOpacity
              style={[
                styles.statusOption,
                {
                  backgroundColor:
                    !isActive
                      ? "#FF587018"
                      : colors.background,
                  borderColor:
                    !isActive
                      ? "#FF5870"
                      : colors.border,
                },
              ]}
              onPress={() =>
                setIsActive(false)
              }
            >
              <Ionicons
                name={
                  !isActive
                    ? "close-circle"
                    : "ellipse-outline"
                }
                size={19}
                color={
                  !isActive
                    ? "#FF5870"
                    : colors.secondaryText
                }
              />

              <Text
                style={[
                  styles.statusOptionText,
                  {
                    color:
                      !isActive
                        ? "#FF5870"
                        : colors.text,
                  },
                ]}
              >
                INACTIVE
              </Text>
            </TouchableOpacity>

          </View>

        </View>


        {/* ====================================================
            SAVE BUTTON
        ==================================================== */}

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor:
                colors.primary,
              opacity:
                saving ? 0.7 : 1,
            },
          ]}
          activeOpacity={0.8}
          disabled={saving}
          onPress={
            saveTrainer
          }
        >
          {saving ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.saveText
                }
              >
                SAVE CHANGES
              </Text>
            </>
          )}
        </TouchableOpacity>


        {/* ====================================================
            CANCEL
        ==================================================== */}

        <TouchableOpacity
          style={
            styles.cancelButton
          }
          disabled={saving}
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={[
              styles.cancelText,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            CANCEL
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}


// ============================================================
// FIELD
// ============================================================

function Field({
  icon,
  label,
  colors,
  children,
}) {
  return (
    <View
      style={
        styles.inputGroup
      }
    >
      <Text
        style={[
          styles.label,
          {
            color:
              colors.secondaryText,
          },
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor:
              colors.background,
            borderColor:
              colors.border,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={
            colors.primaryLight
          }
        />

        {children}
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


  // ============================================================
  // ERROR
  // ============================================================

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

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 16,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 6,
  },


  // ============================================================
  // HEADER
  // ============================================================

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
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  headerButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },


  // ============================================================
  // CONTENT
  // ============================================================

  content: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 40,
  },


  // ============================================================
  // PREVIEW
  // ============================================================

  previewCard: {
    minHeight: 84,
    borderWidth: 1,
    borderRadius: 21,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  previewAvatar: {
    width: 54,
    height: 54,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  previewInitials: {
    fontSize: 18,
    fontWeight: "900",
  },

  previewInfo: {
    flex: 1,
    marginLeft: 12,
  },

  previewLabel: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  trainerName: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },

  trainerUsername: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },


  // ============================================================
  // SECTION
  // ============================================================

  section: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
    paddingBottom: 4,
    marginBottom: 12,
  },

  sectionEyebrow: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 3,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
  },


  // ============================================================
  // INPUTS
  // ============================================================

  inputGroup: {
    marginBottom: 14,
  },

  label: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 7,
  },

  inputRow: {
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "600",
  },

  yearsText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginRight: 14,
  },


  // ============================================================
  // STATUS
  // ============================================================

  statusOptions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },

  statusOption: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  statusOptionText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginLeft: 7,
  },


  // ============================================================
  // SAVE
  // ============================================================

  saveButton: {
    height: 54,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },


  // ============================================================
  // CANCEL
  // ============================================================

  cancelButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  cancelText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

});