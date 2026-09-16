import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";

import { router } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../context/ThemeContext";

// ============================================================
// API
// ============================================================

const API_URL =
  "http://192.168.1.52:8000/api/members/";

// ============================================================
// ADD MEMBER
// ============================================================

export default function AddMembers() {
  const { colors } = useTheme();

  // ==========================================================
  // PASSWORD
  // ==========================================================

  const [showPassword, setShowPassword] =
    useState(false);

  // ==========================================================
  // MEMBER INFORMATION
  // ==========================================================

  const [fullName, setFullName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  // ==========================================================
  // MEMBERSHIP
  // ==========================================================

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  // ==========================================================
  // TRAINER
  // ==========================================================

  const [trainers, setTrainers] =
    useState([]);

  const [selectedTrainer, setSelectedTrainer] =
    useState(null);

  const [trainerModalVisible, setTrainerModalVisible] =
    useState(false);

  const [loadingTrainers, setLoadingTrainers] =
    useState(false);

  // ==========================================================
  // CREATE
  // ==========================================================

  const [creating, setCreating] =
    useState(false);

  // ==========================================================
  // LOAD TRAINERS
  // ==========================================================

  useEffect(() => {
    loadTrainers();
  }, []);

  const loadTrainers = async () => {
    try {
      setLoadingTrainers(true);

      const token =
        await AsyncStorage.getItem(
          "adminToken"
        );

      if (!token) {
        return;
      }

      const response =
        await fetch(
          `${API_URL}trainers/`,
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

      const responseText =
        await response.text();

      console.log(
        "TRAINERS STATUS:",
        response.status
      );

      console.log(
        "TRAINERS RESPONSE:",
        responseText
      );

      let data = {};

      try {
        data =
          JSON.parse(
            responseText
          );
      } catch {
        console.log(
          "Trainer response was not JSON."
        );
      }

      // ========================================================
      // SESSION EXPIRED
      // ========================================================

      if (
        response.status === 401
      ) {
        await AsyncStorage.removeItem(
          "adminToken"
        );

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

        return;
      }

      // ========================================================
      // ERROR
      // ========================================================

      if (!response.ok) {
        console.log(
          "TRAINER LOAD ERROR:",
          data
        );

        return;
      }

      // ========================================================
      // TRAINER DATA
      // ========================================================

      if (
        Array.isArray(
          data.trainers
        )
      ) {
        setTrainers(
          data.trainers
        );
      } else if (
        Array.isArray(data)
      ) {
        setTrainers(data);
      } else {
        setTrainers([]);
      }
    } catch (error) {
      console.log(
        "LOAD TRAINERS ERROR:",
        error
      );
    } finally {
      setLoadingTrainers(false);
    }
  };

  // ==========================================================
  // CREATE MEMBER
  // ==========================================================

  const handleCreateMember = async () => {
    // ========================================================
    // BASIC VALIDATION
    // ========================================================

    if (!fullName.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter member name."
      );

      return;
    }

    if (!phone.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter phone number."
      );

      return;
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      Alert.alert(
        "Invalid Phone",
        "Phone number must contain exactly 10 digits."
      );

      return;
    }

    if (!email.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter email address."
      );

      return;
    }

    // ========================================================
    // EMAIL VALIDATION
    // ========================================================

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address."
      );

      return;
    }

    // ========================================================
    // USERNAME
    // ========================================================

    if (!username.trim()) {
      Alert.alert(
        "Missing Information",
        "Please create a username."
      );

      return;
    }

    // ========================================================
    // PASSWORD
    // ========================================================

    if (!password.trim()) {
      Alert.alert(
        "Missing Information",
        "Please create a password."
      );

      return;
    }

    if (password.trim().length < 6) {
      Alert.alert(
        "Weak Password",
        "Password must contain at least 6 characters."
      );

      return;
    }

    // ========================================================
    // MEMBERSHIP DATES
    // ========================================================

    if (!startDate.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter membership start date."
      );

      return;
    }

    if (!endDate.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter membership end date."
      );

      return;
    }

    // ========================================================
    // DATE FORMAT
    // ========================================================

    const dateRegex =
      /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(startDate.trim())) {
      Alert.alert(
        "Invalid Date",
        "Membership start date must be in YYYY-MM-DD format."
      );

      return;
    }

    if (!dateRegex.test(endDate.trim())) {
      Alert.alert(
        "Invalid Date",
        "Membership end date must be in YYYY-MM-DD format."
      );

      return;
    }

    // ========================================================
    // CHECK ACTUAL DATES
    // ========================================================

    const start =
      new Date(
        `${startDate.trim()}T00:00:00`
      );

    const end =
      new Date(
        `${endDate.trim()}T00:00:00`
      );

    if (isNaN(start.getTime())) {
      Alert.alert(
        "Invalid Date",
        "Please enter a valid membership start date."
      );

      return;
    }

    if (isNaN(end.getTime())) {
      Alert.alert(
        "Invalid Date",
        "Please enter a valid membership end date."
      );

      return;
    }

    if (end < start) {
      Alert.alert(
        "Invalid Membership",
        "Membership end date cannot be before start date."
      );

      return;
    }

    // ========================================================
    // START CREATING
    // ========================================================

    try {
      setCreating(true);

      // ======================================================
      // GET ADMIN TOKEN
      // ======================================================

      const token =
        await AsyncStorage.getItem(
          "adminToken"
        );

      console.log(
        "ADMIN TOKEN EXISTS:",
        !!token
      );

      // ======================================================
      // TOKEN NOT FOUND
      // ======================================================

      if (!token) {
        Alert.alert(
          "Authentication Error",
          "Admin login session not found. Please login again.",
          [
            {
              text: "OK",

              onPress: () => {
                router.replace("/");
              },
            },
          ]
        );

        return;
      }

      // ======================================================
      // DATA TO DJANGO
      // ======================================================

      const memberData = {
        name:
          fullName.trim(),

        phone:
          phone.trim(),

        email:
          email.trim(),

        username:
          username.trim(),

        password:
          password,

        membership_start:
          startDate.trim(),

        membership_end:
          endDate.trim(),

        status:
          "ACTIVE",

        id_verified:
          false,

        trainer:
          selectedTrainer
            ? selectedTrainer.id
            : null,
      };

      console.log(
        "================================"
      );

      console.log(
        "CREATING MEMBER"
      );

      console.log(
        "API URL:",
        API_URL
      );

      console.log(
        "SELECTED TRAINER:",
        selectedTrainer
      );

      console.log(
        "MEMBER DATA:",
        {
          ...memberData,
          password:
            "********",
        }
      );

      console.log(
        "================================"
      );

      // ======================================================
      // POST REQUEST
      // ======================================================

      const response =
        await fetch(
          API_URL,
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

            body:
              JSON.stringify(
                memberData
              ),
          }
        );

      // ======================================================
      // READ RESPONSE
      // ======================================================

      const responseText =
        await response.text();

      console.log(
        "DJANGO STATUS:",
        response.status
      );

      console.log(
        "DJANGO RESPONSE:",
        responseText
      );

      let data = {};

      try {
        data =
          JSON.parse(
            responseText
          );
      } catch {
        console.log(
          "Response was not JSON."
        );
      }

      // ======================================================
      // UNAUTHORIZED
      // ======================================================

      if (
        response.status === 401
      ) {
        await AsyncStorage.removeItem(
          "adminToken"
        );

        Alert.alert(
          "Session Expired",
          "Your admin session has expired. Please login again.",
          [
            {
              text: "OK",

              onPress: () => {
                router.replace("/");
              },
            },
          ]
        );

        return;
      }

      // ======================================================
      // FORBIDDEN
      // ======================================================

      if (
        response.status === 403
      ) {
        Alert.alert(
          "Permission Denied",
          data.detail ||
            "You do not have permission to create members."
        );

        return;
      }

      // ======================================================
      // DJANGO VALIDATION ERROR
      // ======================================================

      if (!response.ok) {
        console.log(
          "DJANGO CREATE ERROR:",
          data
        );

        let errorMessage =
          "Unable to create member.";

        // ----------------------------------------------------
        // USERNAME
        // ----------------------------------------------------

        if (data.username) {
          errorMessage =
            `Username: ${
              Array.isArray(
                data.username
              )
                ? data.username.join(" ")
                : data.username
            }`;
        }

        // ----------------------------------------------------
        // PHONE
        // ----------------------------------------------------

        else if (data.phone) {
          errorMessage =
            `Phone: ${
              Array.isArray(
                data.phone
              )
                ? data.phone.join(" ")
                : data.phone
            }`;
        }

        // ----------------------------------------------------
        // EMAIL
        // ----------------------------------------------------

        else if (data.email) {
          errorMessage =
            `Email: ${
              Array.isArray(
                data.email
              )
                ? data.email.join(" ")
                : data.email
            }`;
        }

        // ----------------------------------------------------
        // PASSWORD
        // ----------------------------------------------------

        else if (data.password) {
          errorMessage =
            `Password: ${
              Array.isArray(
                data.password
              )
                ? data.password.join(" ")
                : data.password
            }`;
        }

        // ----------------------------------------------------
        // TRAINER
        // ----------------------------------------------------

        else if (data.trainer) {
          errorMessage =
            `Trainer: ${
              Array.isArray(
                data.trainer
              )
                ? data.trainer.join(" ")
                : data.trainer
            }`;
        }

        // ----------------------------------------------------
        // START DATE
        // ----------------------------------------------------

        else if (
          data.membership_start
        ) {
          errorMessage =
            `Start Date: ${
              Array.isArray(
                data.membership_start
              )
                ? data.membership_start.join(" ")
                : data.membership_start
            }`;
        }

        // ----------------------------------------------------
        // END DATE
        // ----------------------------------------------------

        else if (
          data.membership_end
        ) {
          errorMessage =
            `End Date: ${
              Array.isArray(
                data.membership_end
              )
                ? data.membership_end.join(" ")
                : data.membership_end
            }`;
        }

        // ----------------------------------------------------
        // DETAIL
        // ----------------------------------------------------

        else if (data.detail) {
          errorMessage =
            data.detail;
        }

        Alert.alert(
          "Could Not Create Member",
          errorMessage
        );

        return;
      }

      // ======================================================
      // SUCCESS
      // ======================================================

      console.log(
        "MEMBER CREATED SUCCESSFULLY:",
        data
      );

      Alert.alert(
        "Member Created",
        `${fullName.trim()} has been successfully added to GymRyt.`,
        [
          {
            text: "OK",

            onPress: () => {
              router.replace(
                "/admin/members"
              );
            },
          },
        ]
      );
    }

    // ========================================================
    // CONNECTION ERROR
    // ========================================================

    catch (error) {
      console.log(
        "CREATE MEMBER ERROR:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Could not connect to GymRyt server.\n\nMake sure Django is running and your phone is connected to the same Wi-Fi."
      );
    }

    finally {
      setCreating(false);
    }
  };

  // ==========================================================
  // SELECT TRAINER
  // ==========================================================

  const handleSelectTrainer = (
    trainer
  ) => {
    setSelectedTrainer(
      trainer
    );

    setTrainerModalVisible(
      false
    );
  };

  // ==========================================================
  // TRAINER NAME
  // ==========================================================

  const getTrainerName = (
    trainer
  ) => {
    if (!trainer) {
      return "No Trainer Assigned";
    }

    return (
      trainer.name ||
      trainer.username ||
      "Trainer"
    );
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={
            styles.header
          }
        >
          <TouchableOpacity
            style={[
              styles.backButton,
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
            disabled={
              creating
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
                styles.smallTitle,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              GYMRyt MANAGEMENT
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
              Add Member
            </Text>
          </View>
        </View>

        {/* ==================================================
            PROFILE
        ================================================== */}

        <View
          style={
            styles.profileSection
          }
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor:
                  colors.iconBackground,
                borderColor:
                  colors.primary,
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
              +
            </Text>
          </View>

          <Text
            style={[
              styles.profileName,
              {
                color:
                  colors.text,
              },
            ]}
          >
            New Gym Member
          </Text>

          <Text
            style={[
              styles.profileSubtitle,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            Enter member information
          </Text>
        </View>

        {/* ==================================================
            PERSONAL INFORMATION
        ================================================== */}

        <View
          style={
            styles.section
          }
        >
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

          <InputField
            label="FULL NAME"
            value={
              fullName
            }
            onChangeText={
              setFullName
            }
            colors={
              colors
            }
          />

          <InputField
            label="PHONE NUMBER"
            value={
              phone
            }
            onChangeText={(
              text
            ) =>
              setPhone(
                text.replace(
                  /[^0-9]/g,
                  ""
                )
              )
            }
            keyboardType="phone-pad"
            maxLength={10}
            colors={
              colors
            }
          />

          <InputField
            label="EMAIL ADDRESS"
            value={
              email
            }
            onChangeText={
              setEmail
            }
            keyboardType="email-address"
            colors={
              colors
            }
          />
        </View>

        {/* ==================================================
            ACCOUNT INFORMATION
        ================================================== */}

        <View
          style={
            styles.section
          }
        >
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

          <InputField
            label="USERNAME"
            value={
              username
            }
            onChangeText={
              setUsername
            }
            colors={
              colors
            }
          />

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
              PASSWORD
            </Text>

            <View
              style={[
                styles.passwordContainer,
                {
                  backgroundColor:
                    colors.input,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    color:
                      colors.text,
                  },
                ]}
                value={
                  password
                }
                onChangeText={
                  setPassword
                }
                placeholderTextColor={
                  colors.mutedText
                }
                secureTextEntry={
                  !showPassword
                }
                autoCapitalize="none"
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                <Text
                  style={[
                    styles.showPassword,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  {showPassword
                    ? "HIDE"
                    : "SHOW"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[
              styles.infoBox,
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
                styles.infoIcon,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              🔒
            </Text>

            <Text
              style={[
                styles.infoText,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              The member will use this username and password to log in.
            </Text>
          </View>
        </View>

        {/* ==================================================
            MEMBERSHIP
        ================================================== */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            MEMBERSHIP
          </Text>

          {/* ==================================================
              TRAINER
          ================================================== */}

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
              TRAINER
            </Text>

            <TouchableOpacity
              style={[
                styles.trainerSelector,
                {
                  backgroundColor:
                    colors.input,
                  borderColor:
                    colors.border,
                },
              ]}
              onPress={() =>
                setTrainerModalVisible(
                  true
                )
              }
              disabled={
                creating
              }
              activeOpacity={
                0.8
              }
            >
              <Text
                style={[
                  styles.trainerText,
                  {
                    color:
                      selectedTrainer
                        ? colors.text
                        : colors.mutedText,
                  },
                ]}
              >
                {selectedTrainer
                  ? getTrainerName(
                      selectedTrainer
                    )
                  : "Select trainer"}
              </Text>

              {loadingTrainers ? (
                <ActivityIndicator
                  size="small"
                  color={
                    colors.primaryLight
                  }
                />
              ) : (
                <Text
                  style={[
                    styles.dropdownArrow,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  ▼
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ==================================================
              START DATE
          ================================================== */}

          <InputField
            label="MEMBERSHIP START"
            value={
              startDate
            }
            onChangeText={
              setStartDate
            }
            colors={
              colors
            }
          />

          {/* ==================================================
              END DATE
          ================================================== */}

          <InputField
            label="MEMBERSHIP END"
            value={
              endDate
            }
            onChangeText={
              setEndDate
            }
            colors={
              colors
            }
          />
        </View>

        {/* ==================================================
            VERIFICATION
        ================================================== */}

        <View
          style={[
            styles.infoBox,
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
              styles.infoIcon,
              {
                color:
                  colors.success,
              },
            ]}
          >
            ✓
          </Text>

          <View
            style={
              styles.verificationText
            }
          >
            <Text
              style={[
                styles.verificationTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              ID Verification
            </Text>

            <Text
              style={[
                styles.verificationSubtitle,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Member verification can be completed later.
            </Text>
          </View>
        </View>

        {/* ==================================================
            CREATE BUTTON
        ================================================== */}

        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor:
                colors.primary,
            },
            creating &&
              styles.createButtonDisabled,
          ]}
          onPress={
            handleCreateMember
          }
          activeOpacity={
            0.85
          }
          disabled={
            creating
          }
        >
          {creating ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <>
              <Text
                style={
                  styles.createText
                }
              >
                CREATE MEMBER
              </Text>

              <Text
                style={
                  styles.arrow
                }
              >
                →
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ==================================================
            CANCEL
        ================================================== */}

        <TouchableOpacity
          style={
            styles.cancelButton
          }
          onPress={() =>
            router.back()
          }
          disabled={
            creating
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
            CANCEL
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ======================================================
          TRAINER MODAL
      ====================================================== */}

      <Modal
        visible={
          trainerModalVisible
        }
        transparent={
          true
        }
        animationType="fade"
        onRequestClose={() =>
          setTrainerModalVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={[
              styles.modalContainer,
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
                styles.modalHeader
              }
            >
              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  Select Trainer
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color:
                        colors.mutedText,
                    },
                  ]}
                >
                  Assign this member to a trainer
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setTrainerModalVisible(
                    false
                  )
                }
              >
                <Text
                  style={[
                    styles.closeButton,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            {/* ==================================================
                NO TRAINER
            ================================================== */}

            <TouchableOpacity
              style={[
                styles.trainerOption,
                {
                  borderColor:
                    colors.border,
                  backgroundColor:
                    !selectedTrainer
                      ? colors.iconBackground
                      : "transparent",
                },
              ]}
              onPress={() =>
                handleSelectTrainer(
                  null
                )
              }
            >
              <View
                style={[
                  styles.trainerAvatar,
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
                    styles.trainerAvatarText,
                    {
                      color:
                        colors.mutedText,
                    },
                  ]}
                >
                  —
                </Text>
              </View>

              <View
                style={
                  styles.trainerOptionContent
                }
              >
                <Text
                  style={[
                    styles.trainerOptionName,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  No Trainer Assigned
                </Text>

                <Text
                  style={[
                    styles.trainerOptionUsername,
                    {
                      color:
                        colors.mutedText,
                    },
                  ]}
                >
                  Member can be assigned later
                </Text>
              </View>

              {!selectedTrainer && (
                <Text
                  style={[
                    styles.selectedCheck,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  ✓
                </Text>
              )}
            </TouchableOpacity>

            {/* ==================================================
                TRAINER LIST
            ================================================== */}

            <FlatList
              data={
                trainers
              }
              keyExtractor={(
                item
              ) =>
                String(
                  item.id
                )
              }
              showsVerticalScrollIndicator={
                false
              }
              ListEmptyComponent={
                <View
                  style={
                    styles.emptyTrainer
                  }
                >
                  <Text
                    style={[
                      styles.emptyTrainerTitle,
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
                      styles.emptyTrainerSubtitle,
                      {
                        color:
                          colors.mutedText,
                      },
                    ]}
                  >
                    Add a trainer from Manage Trainers first.
                  </Text>
                </View>
              }
              renderItem={({
                item,
              }) => {
                const isSelected =
                  selectedTrainer &&
                  selectedTrainer.id ===
                    item.id;

                const trainerName =
                  getTrainerName(
                    item
                  );

                const initial =
                  trainerName
                    .charAt(0)
                    .toUpperCase();

                return (
                  <TouchableOpacity
                    style={[
                      styles.trainerOption,
                      {
                        borderColor:
                          colors.border,
                        backgroundColor:
                          isSelected
                            ? colors.iconBackground
                            : "transparent",
                      },
                    ]}
                    onPress={() =>
                      handleSelectTrainer(
                        item
                      )
                    }
                    activeOpacity={
                      0.8
                    }
                  >
                    <View
                      style={[
                        styles.trainerAvatar,
                        {
                          backgroundColor:
                            colors.input,
                          borderColor:
                            colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.trainerAvatarText,
                          {
                            color:
                              colors.primaryLight,
                          },
                        ]}
                      >
                        {initial}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.trainerOptionContent
                      }
                    >
                      <Text
                        style={[
                          styles.trainerOptionName,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        {
                          trainerName
                        }
                      </Text>

                      <Text
                        style={[
                          styles.trainerOptionUsername,
                          {
                            color:
                              colors.mutedText,
                          },
                        ]}
                      >
                        {item.username
                          ? `@${item.username}`
                          : item.email ||
                            "Active trainer"}
                      </Text>
                    </View>

                    {isSelected && (
                      <Text
                        style={[
                          styles.selectedCheck,
                          {
                            color:
                              colors.primaryLight,
                          },
                        ]}
                      >
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// INPUT FIELD
// ============================================================

function InputField({
  label,
  value,
  onChangeText,
  keyboardType,
  maxLength,
  colors,
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
          value
        }
        onChangeText={
          onChangeText
        }
        placeholderTextColor={
          colors.mutedText
        }
        keyboardType={
          keyboardType
        }
        maxLength={
          maxLength
        }
        autoCapitalize="none"
      />
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

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },

  // ========================================================
  // HEADER
  // ========================================================

  header: {
    marginTop: 55,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
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
    marginLeft: 15,
  },

  smallTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    marginTop: 3,
  },

  // ========================================================
  // PROFILE
  // ========================================================

  profileSection: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },

  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 32,
    fontWeight: "900",
  },

  profileName: {
    fontSize: 19,
    fontWeight: "900",
    marginTop: 12,
  },

  profileSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },

  // ========================================================
  // SECTION
  // ========================================================

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 14,
  },

  // ========================================================
  // INPUTS
  // ========================================================

  inputGroup: {
    marginBottom: 15,
  },

  label: {
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 7,
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 14,
  },

  passwordContainer: {
    height: 54,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 15,
    paddingRight: 14,
  },

  passwordInput: {
    flex: 1,
    fontSize: 14,
  },

  showPassword: {
    fontSize: 10,
    fontWeight: "900",
  },

  // ========================================================
  // TRAINER SELECTOR
  // ========================================================

  trainerSelector: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  trainerText: {
    fontSize: 14,
    flex: 1,
  },

  dropdownArrow: {
    fontSize: 12,
    marginLeft: 10,
  },

  // ========================================================
  // INFO BOX
  // ========================================================

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },

  infoIcon: {
    fontSize: 18,
    width: 25,
    textAlign: "center",
  },

  infoText: {
    flex: 1,
    fontSize: 11,
    marginLeft: 10,
    lineHeight: 17,
  },

  verificationText: {
    flex: 1,
    marginLeft: 10,
  },

  verificationTitle: {
    fontSize: 13,
    fontWeight: "800",
  },

  verificationSubtitle: {
    fontSize: 10,
    marginTop: 3,
  },

  // ========================================================
  // CREATE BUTTON
  // ========================================================

  createButton: {
    height: 58,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },

  createButtonDisabled: {
    opacity: 0.6,
  },

  createText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },

  arrow: {
    color: "#FFFFFF",
    fontSize: 22,
    marginLeft: 12,
  },

  // ========================================================
  // CANCEL
  // ========================================================

  cancelButton: {
    alignItems: "center",
    paddingVertical: 18,
  },

  cancelText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // ========================================================
  // TRAINER MODAL
  // ========================================================

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  modalContainer: {
    maxHeight: "75%",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    overflow: "hidden",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
  },

  modalSubtitle: {
    fontSize: 11,
    marginTop: 4,
  },

  closeButton: {
    fontSize: 30,
    fontWeight: "300",
    paddingHorizontal: 5,
  },

  // ========================================================
  // TRAINER OPTION
  // ========================================================

  trainerOption: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 10,
  },

  trainerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  trainerAvatarText: {
    fontSize: 16,
    fontWeight: "900",
  },

  trainerOptionContent: {
    flex: 1,
    marginLeft: 12,
  },

  trainerOptionName: {
    fontSize: 14,
    fontWeight: "800",
  },

  trainerOptionUsername: {
    fontSize: 10,
    marginTop: 4,
  },

  selectedCheck: {
    fontSize: 20,
    fontWeight: "900",
    marginLeft: 8,
  },

  // ========================================================
  // EMPTY TRAINERS
  // ========================================================

  emptyTrainer: {
    alignItems: "center",
    paddingVertical: 30,
  },

  emptyTrainerTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  emptyTrainerSubtitle: {
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },
});