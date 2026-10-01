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

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../context/ThemeContext";

// ============================================================
// API
// ============================================================

const API_URL =
  "http://192.168.1.43:8000/api/members/";

// ============================================================
// ADD MEMBER
// ============================================================

export default function AddMembers() {
  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();

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
              GYMRYT • MEMBERS
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
              disabled={
                creating
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


        {/* ==================================================
            PROFILE
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

          <View
            style={[
              styles.avatar,
              {
                backgroundColor:
                  colors.iconBackground,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Ionicons
              name="person-add-outline"
              size={26}
              color={
                colors.primaryLight
              }
            />
          </View>


          <View
            style={
              styles.profileInfo
            }
          >

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
                    colors.secondaryText,
                },
              ]}
            >
              Enter member information
            </Text>

          </View>

        </View>


        {/* ==================================================
            PERSONAL INFORMATION
        ================================================== */}

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
            Member Details
          </Text>


          <InputField
            icon="person-outline"
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
            icon="call-outline"
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
            icon="mail-outline"
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
            ACCOUNT INFORMATION
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
            Login Details
          </Text>


          <InputField
            icon="at-outline"
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
                name="lock-closed-outline"
                size={18}
                color={
                  colors.primaryLight
                }
              />

              <TextInput
                style={[
                  styles.input,
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
                style={
                  styles.eyeButton
                }
                onPress={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={19}
                  color={
                    colors.secondaryText
                  }
                />
              </TouchableOpacity>

            </View>

          </View>


          <View
            style={[
              styles.infoBox,
              {
                backgroundColor:
                  colors.iconBackground,
                borderColor:
                  colors.border,
              },
            ]}
          >

            <Ionicons
              name="lock-closed-outline"
              size={17}
              color={
                colors.primaryLight
              }
            />

            <Text
              style={[
                styles.infoText,
                {
                  color:
                    colors.secondaryText,
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
            MEMBERSHIP
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
            Plan & Trainer
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
                styles.inputRow,
                {
                  backgroundColor:
                    colors.background,
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

              <Ionicons
                name="barbell-outline"
                size={18}
                color={
                  colors.primaryLight
                }
              />

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
                  style={
                    styles.dropdownIcon
                  }
                />

              ) : (

                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={
                    colors.primaryLight
                  }
                  style={
                    styles.dropdownIcon
                  }
                />

              )}

            </TouchableOpacity>

          </View>


          {/* ==================================================
              START DATE
          ================================================== */}

          <InputField
            icon="calendar-outline"
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
            icon="calendar-clear-outline"
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
            styles.verificationCard,
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
              styles.verificationIcon
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color="#45E0A5"
            />
          </View>


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
                    colors.secondaryText,
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

              <Ionicons
                name="person-add-outline"
                size={18}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.createText
                }
              >
                CREATE MEMBER
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
                  colors.secondaryText,
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
                    styles.sectionEyebrow,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  ASSIGN TRAINER
                </Text>

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
                        colors.secondaryText,
                    },
                  ]}
                >
                  Assign this member to a trainer
                </Text>

              </View>


              <TouchableOpacity
                style={[
                  styles.headerButton,
                  {
                    backgroundColor:
                      colors.background,
                    borderColor:
                      colors.border,
                  },
                ]}
                onPress={() =>
                  setTrainerModalVisible(
                    false
                  )
                }
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
                NO TRAINER
            ================================================== */}

            <TouchableOpacity
              style={[
                styles.trainerOption,
                {
                  borderColor:
                    !selectedTrainer
                      ? colors.primaryLight
                      : colors.border,
                  backgroundColor:
                    !selectedTrainer
                      ? colors.iconBackground
                      : colors.background,
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
                      colors.card,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="remove-outline"
                  size={18}
                  color={
                    colors.secondaryText
                  }
                />
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
                        colors.secondaryText,
                    },
                  ]}
                >
                  Member can be assigned later
                </Text>

              </View>


              {!selectedTrainer && (

                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={
                    colors.primaryLight
                  }
                />

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

                  <Ionicons
                    name="barbell-outline"
                    size={26}
                    color={
                      colors.primaryLight
                    }
                  />

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
                          colors.secondaryText,
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
                          isSelected
                            ? colors.primaryLight
                            : colors.border,
                        backgroundColor:
                          isSelected
                            ? colors.iconBackground
                            : colors.background,
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
                            colors.iconBackground,
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
                              colors.secondaryText,
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

                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={
                          colors.primaryLight
                        }
                      />

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
  icon,
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

        <TextInput
          style={[
            styles.input,
            {
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
    paddingHorizontal: 18,
    paddingTop:
      Platform.OS === "ios"
        ? 54
        : 44,
    paddingBottom: 40,
  },


  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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


  // ==========================================================
  // PROFILE
  // ==========================================================

  profileCard: {
    minHeight: 84,
    borderWidth: 1,
    borderRadius: 21,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },

  profileName: {
    fontSize: 16,
    fontWeight: "900",
  },

  profileSubtitle: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },


  // ==========================================================
  // SECTION
  // ==========================================================

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


  // ==========================================================
  // INPUTS
  // ==========================================================

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

  eyeButton: {
    height: "100%",
    paddingHorizontal: 14,
    justifyContent: "center",
  },


  // ==========================================================
  // TRAINER SELECTOR
  // ==========================================================

  trainerText: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "600",
  },

  dropdownIcon: {
    marginRight: 14,
  },


  // ==========================================================
  // INFO BOX
  // ==========================================================

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },

  infoText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 15,
    marginLeft: 9,
  },

  verificationCard: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 21,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  verificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#45E0A518",
    alignItems: "center",
    justifyContent: "center",
  },

  verificationText: {
    flex: 1,
    marginLeft: 11,
  },

  verificationTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  verificationSubtitle: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
  },


  // ==========================================================
  // CREATE BUTTON
  // ==========================================================

  createButton: {
    height: 54,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  createButtonDisabled: {
    opacity: 0.7,
  },

  createText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },


  // ==========================================================
  // CANCEL
  // ==========================================================

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


  // ==========================================================
  // TRAINER MODAL
  // ==========================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  modalContainer: {
    maxHeight: "75%",
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
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


  // ==========================================================
  // TRAINER OPTION
  // ==========================================================

  trainerOption: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  trainerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    marginLeft: 11,
  },

  trainerOptionName: {
    fontSize: 13,
    fontWeight: "900",
  },

  trainerOptionUsername: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
  },


  // ==========================================================
  // EMPTY TRAINERS
  // ==========================================================

  emptyTrainer: {
    alignItems: "center",
    paddingVertical: 22,
  },

  emptyTrainerTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 9,
  },

  emptyTrainerSubtitle: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },

});