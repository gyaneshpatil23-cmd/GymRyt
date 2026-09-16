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
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../context/ThemeContext";

const API_URL =
  "http://192.168.1.52:8000/api/members";


export default function EditTrainerScreen() {
  const { colors } = useTheme();

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
            Edit Trainer
          </Text>
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
            styles.readOnlyCard,
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
              styles.readOnlyLabel,
              {
                color:
                  colors.mutedText,
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
          >
            {trainer.name ||
              "Unnamed Trainer"}
          </Text>

          <Text
            style={[
              styles.trainerUsername,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            @{trainer.username ||
              "username"}
          </Text>
        </View>


        {/* ====================================================
            PERSONAL INFORMATION
        ==================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.primaryLight,
            },
          ]}
        >
          PERSONAL INFORMATION
        </Text>


        {/* FULL NAME */}

        <Text
          style={[
            styles.label,
            {
              color:
                colors.text,
            },
          ]}
        >
          Full Name
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor:
                colors.input,
              borderColor:
                colors.border,
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


        {/* USERNAME */}

        <Text
          style={[
            styles.label,
            {
              color:
                colors.text,
            },
          ]}
        >
          Username
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor:
                colors.input,
              borderColor:
                colors.border,
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


        {/* EMAIL */}

        <Text
          style={[
            styles.label,
            {
              color:
                colors.text,
            },
          ]}
        >
          Email
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor:
                colors.input,
              borderColor:
                colors.border,
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


        {/* PHONE */}

        <Text
          style={[
            styles.label,
            {
              color:
                colors.text,
            },
          ]}
        >
          Phone Number
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor:
                colors.input,
              borderColor:
                colors.border,
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


        {/* ====================================================
            TRAINER INFORMATION
        ==================================================== */}

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


        {/* SPECIALIZATION */}

        <Text
          style={[
            styles.label,
            {
              color:
                colors.text,
            },
          ]}
        >
          Specialization
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor:
                colors.input,
              borderColor:
                colors.border,
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


        {/* EXPERIENCE */}

        <Text
          style={[
            styles.label,
            {
              color:
                colors.text,
              },
            ]}
        >
          Experience
        </Text>

        <View
          style={
            styles.experienceRow
          }
        >
          <TextInput
            style={[
              styles.input,
              styles.experienceInput,
              {
                backgroundColor:
                  colors.input,
                borderColor:
                  colors.border,
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
                  colors.mutedText,
              },
            ]}
          >
            years
          </Text>
        </View>


        {/* ====================================================
            STATUS
        ==================================================== */}

        <Text
          style={[
            styles.label,
            {
              color:
                colors.text,
            },
          ]}
        >
          Status
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
                    ? colors.successBackground
                    : colors.card,

                borderColor:
                  isActive
                    ? colors.success
                    : colors.border,
              },
            ]}
            onPress={() =>
              setIsActive(true)
            }
          >
            <View
              style={[
                styles.radio,
                {
                  borderColor:
                    isActive
                      ? colors.success
                      : colors.mutedText,
                },
              ]}
            >
              {isActive && (
                <View
                  style={[
                    styles.radioInner,
                    {
                      backgroundColor:
                        colors.success,
                    },
                  ]}
                />
              )}
            </View>

            <Text
              style={[
                styles.statusOptionText,
                {
                  color:
                    isActive
                      ? colors.success
                      : colors.text,
                },
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>


          {/* INACTIVE */}

          <TouchableOpacity
            style={[
              styles.statusOption,
              {
                backgroundColor:
                  !isActive
                    ? colors.dangerBackground
                    : colors.card,

                borderColor:
                  !isActive
                    ? colors.danger
                    : colors.border,
              },
            ]}
            onPress={() =>
              setIsActive(false)
            }
          >
            <View
              style={[
                styles.radio,
                {
                  borderColor:
                    !isActive
                      ? colors.danger
                      : colors.mutedText,
                },
              ]}
            >
              {!isActive && (
                <View
                  style={[
                    styles.radioInner,
                    {
                      backgroundColor:
                        colors.danger,
                    },
                  ]}
                />
              )}
            </View>

            <Text
              style={[
                styles.statusOptionText,
                {
                  color:
                    !isActive
                      ? colors.danger
                      : colors.text,
                },
              ]}
            >
              Inactive
            </Text>
          </TouchableOpacity>

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
            <Text
              style={
                styles.saveText
              }
            >
              Save Changes
            </Text>
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
                  colors.mutedText,
              },
            ]}
          >
            Cancel
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

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 14,
    fontSize: 13,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
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
  // TRAINER PREVIEW
  // ==========================================================

  readOnlyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 17,
    marginBottom: 24,
  },

  readOnlyLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  trainerName: {
    fontSize: 19,
    fontWeight: "900",
    marginTop: 6,
  },

  trainerUsername: {
    fontSize: 11,
    marginTop: 4,
  },

  // ==========================================================
  // SECTION
  // ==========================================================

  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 15,
  },

  // ==========================================================
  // INPUT
  // ==========================================================

  label: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 15,
    fontSize: 14,
    marginBottom: 20,
  },

  // ==========================================================
  // EXPERIENCE
  // ==========================================================

  experienceRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  experienceInput: {
    width: 100,
    marginBottom: 20,
  },

  yearsText: {
    fontSize: 13,
    marginLeft: 10,
    marginBottom: 20,
  },

  // ==========================================================
  // STATUS
  // ==========================================================

  statusOptions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },

  statusOption: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  statusOptionText: {
    fontSize: 12,
    fontWeight: "800",
  },

  // ==========================================================
  // SAVE
  // ==========================================================

  saveButton: {
    height: 52,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  // ==========================================================
  // CANCEL
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