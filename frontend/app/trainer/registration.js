import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

// ============================================================
// API
// ============================================================

const API_URL =
  "http://192.168.1.43:8000/api/members/trainer-applications/";

// ============================================================
// TRAINER REGISTRATION
// ============================================================

export default function TrainerRegisterScreen() {
  const { colors, isDark, toggleTheme } = useTheme();

  // ============================================================
  // QR TOKEN
  // ============================================================

  const { qrToken: rawQrToken } = useLocalSearchParams();

  /*
   * Expo Router parameters can sometimes be returned as
   * string | string[].
   *
   * Normalize it to a single string before sending it to Django.
   */
  const qrToken = Array.isArray(rawQrToken)
    ? rawQrToken[0]
    : rawQrToken;

  // ============================================================
  // FORM DATA
  // ============================================================

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState("");

  // ============================================================
  // PASSWORD VISIBILITY
  // ============================================================

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  // ============================================================
  // LOADING
  // ============================================================

  const [loading, setLoading] = useState(false);

  // ============================================================
  // FOCUS STATES
  // ============================================================

  const [fullNameFocused, setFullNameFocused] =
    useState(false);

  const [emailFocused, setEmailFocused] =
    useState(false);

  const [phoneFocused, setPhoneFocused] =
    useState(false);

  const [usernameFocused, setUsernameFocused] =
    useState(false);

  const [passwordFocused, setPasswordFocused] =
    useState(false);

  const [confirmPasswordFocused, setConfirmPasswordFocused] =
    useState(false);

  // ============================================================
  // SUBMIT TRAINER APPLICATION
  // ============================================================

  const handleRegister = async () => {
    // ==========================================================
    // NORMALIZE QR TOKEN
    // ==========================================================

    const scannedPayload =
      typeof qrToken === "string"
        ? qrToken.trim()
        : "";

    const trainerPrefix = "GYMRYT:TRAINER:";
    const extractedToken = scannedPayload.startsWith(trainerPrefix)
      ? scannedPayload.slice(trainerPrefix.length).trim()
      : scannedPayload.startsWith("GYMRYT_TRAINER_")
        ? scannedPayload
        : "";

    // Always send the canonical payload. Expo Router supplies decoded params,
    // so the colon separators are not altered during scanner navigation.
    const normalizedToken = extractedToken
      ? `${trainerPrefix}${extractedToken}`
      // A scanner only passes this through after identifying its signed
      // TRAINER payload. Django verifies that signature before use.
      : scannedPayload.split(":").length === 3
        ? scannedPayload
        : "";

    console.log(
      "===================================="
    );

    console.log(
      "TRAINER QR PARAM:",
      rawQrToken
    );

    console.log(
      "TRAINER QR PARAM TYPE:",
      typeof rawQrToken
    );

    console.log(
      "TRAINER QR TOKEN SENT:",
      normalizedToken
    );

    console.log(
      "TRAINER API URL:",
      API_URL
    );

    console.log(
      "===================================="
    );

    // ==========================================================
    // QR TOKEN VALIDATION
    // ==========================================================

    if (!normalizedToken) {
      Alert.alert(
        "Invalid Registration",
        "No trainer registration QR code was detected. Please scan the gym's trainer QR code again."
      );

      return;
    }

    // ==========================================================
    // FULL NAME
    // ==========================================================

    if (!fullName.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter your full name."
      );

      return;
    }

    // ==========================================================
    // EMAIL
    // ==========================================================

    if (!email.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter your email address."
      );

      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address."
      );

      return;
    }

    // ==========================================================
    // PHONE
    // ==========================================================

    if (!phone.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter your phone number."
      );

      return;
    }

    const cleanedPhone =
      phone.replace(/\D/g, "");

    if (cleanedPhone.length !== 10) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid 10-digit phone number."
      );

      return;
    }

    // ==========================================================
    // USERNAME
    // ==========================================================

    const cleanedUsername =
      username.trim();

    if (!cleanedUsername) {
      Alert.alert(
        "Missing Information",
        "Please create a username."
      );

      return;
    }

    // ==========================================================
    // PASSWORD
    // ==========================================================

    if (!password) {
      Alert.alert(
        "Missing Information",
        "Please create a password."
      );

      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Password Error",
        "Password must be at least 6 characters."
      );

      return;
    }

    // ==========================================================
    // CONFIRM PASSWORD
    // ==========================================================

    if (!confirmPassword) {
      Alert.alert(
        "Missing Information",
        "Please confirm your password."
      );

      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Password Error",
        "Passwords do not match."
      );

      return;
    }

    // ==========================================================
    // API REQUEST
    // ==========================================================

    try {
      setLoading(true);

      const requestBody = {
        qr_payload: normalizedToken,

        name: fullName.trim(),

        email: email
          .trim()
          .toLowerCase(),

        phone: cleanedPhone,

        username: cleanedUsername,

        password: password,

        confirm_password: confirmPassword,

        specialization: specialization.trim(),

        experience_years: experienceYears.trim() || "0",
      };

      // ========================================================
      // DEBUG
      // ========================================================

      console.log(
        "TRAINER REGISTRATION REQUEST:"
      );

      console.log(
        JSON.stringify(
          {
            ...requestBody,
            password: "***HIDDEN***",
            confirm_password: "***HIDDEN***",
          },
          null,
          2
        )
      );

      // ========================================================
      // REQUEST
      // ========================================================

      const response = await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify(
            requestBody
          ),
        }
      );

      // ========================================================
      // RESPONSE
      // ========================================================

      let data = {};

      try {
        data = await response.json();
      } catch (error) {
        console.log(
          "Could not parse trainer registration response:",
          error
        );
      }

      console.log(
        "TRAINER REGISTRATION STATUS:",
        response.status
      );

      console.log(
        "TRAINER REGISTRATION RESPONSE:",
        data
      );

      // ========================================================
      // SUCCESS
      // ========================================================

      if (
        response.ok &&
        data?.success
      ) {
        Alert.alert(
          "Application Submitted 🎉",
          "Your trainer application has been submitted successfully.\n\nPlease wait for the gym owner's approval.",
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

      // ========================================================
      // BACKEND ERROR
      // ========================================================

      let errorMessage =
        data?.detail ||
        data?.message ||
        "Could not submit your trainer application.";

      // ========================================================
      // HANDLE DJANGO REST FRAMEWORK VALIDATION ERRORS
      // ========================================================

      if (
        typeof data === "object" &&
        data !== null &&
        !data.detail &&
        !data.message
      ) {
        const messages = [];

        Object.keys(data).forEach(
          (key) => {
            const value =
              data[key];

            if (
              Array.isArray(value)
            ) {
              messages.push(
                `${key}: ${value.join(
                  ", "
                )}`
              );
            } else if (
              typeof value ===
              "string"
            ) {
              messages.push(
                `${key}: ${value}`
              );
            } else if (
              value !== null &&
              value !== undefined
            ) {
              messages.push(
                `${key}: ${JSON.stringify(
                  value
                )}`
              );
            }
          }
        );

        if (
          messages.length > 0
        ) {
          errorMessage =
            messages.join("\n");
        }
      }

      // ========================================================
      // DISPLAY ERROR
      // ========================================================

      Alert.alert(
        "Application Failed",
        errorMessage
      );

    } catch (error) {
      // ========================================================
      // NETWORK ERROR
      // ========================================================

      console.log(
        "TRAINER REGISTRATION ERROR:",
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

  // ============================================================
  // UI
  // ============================================================

  return (
    <View
      style={[
        styles.background,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        keyboardVerticalOffset={
          Platform.OS === "ios"
            ? 0
            : 20
        }
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.scrollContainer
          }
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="none"
        >
          <View style={styles.content}>

            {/* ==================================================
                HEADER
            ================================================== */}

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text
                  style={[
                    styles.eyebrow,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  JOIN GYMRYT
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
                  Create Account
                </Text>

                <Text
                  style={[
                    styles.subtitle,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  Create your trainer account
                </Text>
              </View>

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
                onPress={toggleTheme}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={
                    isDark
                      ? "sunny-outline"
                      : "moon-outline"
                  }
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            {/* ==================================================
                QR CONNECTION
            ================================================== */}

            <View
              style={[
                styles.qrConnectedBox,
                {
                  backgroundColor:
                    colors.card,
                  borderColor:
                    "#45E0A555",
                },
              ]}
            >
              <View
                style={
                  styles.qrIconCircle
                }
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="#45E0A5"
                />
              </View>

              <View
                style={
                  styles.qrConnectedTextContainer
                }
              >
                <Text
                  style={[
                    styles.qrConnectedTitle,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  Gym Connected
                </Text>

                <Text
                  style={[
                    styles.qrConnectedSubtitle,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  Your trainer application is
                  linked to this gym
                </Text>
              </View>
            </View>

            {/* ==================================================
                REGISTRATION CARD
            ================================================== */}

            <View
              style={[
                styles.card,
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
                  styles.cardEyebrow,
                  {
                    color:
                      colors.primaryLight,
                  },
                ]}
              >
                TRAINER DETAILS
              </Text>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Your Information
              </Text>

              {/* ==================================================
                  FULL NAME
              ================================================== */}

              <FormField
                icon="person-outline"
                label="FULL NAME"
                focused={fullNameFocused}
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
                  value={fullName}
                  onChangeText={
                    setFullName
                  }
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                  onFocus={() =>
                    setFullNameFocused(
                      true
                    )
                  }
                  onBlur={() =>
                    setFullNameFocused(
                      false
                    )
                  }
                  selectionColor={
                    colors.primaryLight
                  }
                />
              </FormField>

              {/* ==================================================
                  EMAIL
              ================================================== */}

              <FormField
                icon="mail-outline"
                label="EMAIL"
                focused={emailFocused}
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
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                  onFocus={() =>
                    setEmailFocused(
                      true
                    )
                  }
                  onBlur={() =>
                    setEmailFocused(
                      false
                    )
                  }
                  selectionColor={
                    colors.primaryLight
                  }
                />
              </FormField>

              {/* ==================================================
                  PHONE
              ================================================== */}

              <FormField
                icon="call-outline"
                label="PHONE NUMBER"
                focused={phoneFocused}
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
                  onChangeText={(text) => {
                    const numbersOnly =
                      text.replace(
                        /\D/g,
                        ""
                      );

                    if (
                      numbersOnly.length <=
                      10
                    ) {
                      setPhone(
                        numbersOnly
                      );
                    }
                  }}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                  onFocus={() =>
                    setPhoneFocused(
                      true
                    )
                  }
                  onBlur={() =>
                    setPhoneFocused(
                      false
                    )
                  }
                  selectionColor={
                    colors.primaryLight
                  }
                />
              </FormField>

              {/* ==================================================
                  SPECIALIZATION
              ================================================== */}

              <FormField
                icon="barbell-outline"
                label="SPECIALIZATION"
                focused={false}
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
                  value={specialization}
                  onChangeText={setSpecialization}
                  autoCapitalize="words"
                  editable={!loading}
                  returnKeyType="next"
                  selectionColor={
                    colors.primaryLight
                  }
                />
              </FormField>

              {/* ==================================================
                  EXPERIENCE
              ================================================== */}

              <FormField
                icon="trophy-outline"
                label="EXPERIENCE (YEARS)"
                focused={false}
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
                  value={experienceYears}
                  onChangeText={(value) => setExperienceYears(value.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  editable={!loading}
                  returnKeyType="next"
                  selectionColor={
                    colors.primaryLight
                  }
                />
              </FormField>

              {/* ==================================================
                  USERNAME
              ================================================== */}

              <FormField
                icon="at-outline"
                label="USERNAME"
                focused={usernameFocused}
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
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                  onFocus={() =>
                    setUsernameFocused(
                      true
                    )
                  }
                  onBlur={() =>
                    setUsernameFocused(
                      false
                    )
                  }
                  selectionColor={
                    colors.primaryLight
                  }
                />
              </FormField>

              {/* ==================================================
                  PASSWORD
              ================================================== */}

              <FormField
                icon="lock-closed-outline"
                label="PASSWORD"
                focused={passwordFocused}
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
                  value={password}
                  onChangeText={
                    setPassword
                  }
                  secureTextEntry={
                    !showPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() =>
                    setPasswordFocused(
                      true
                    )
                  }
                  onBlur={() =>
                    setPasswordFocused(
                      false
                    )
                  }
                  selectionColor={
                    colors.primaryLight
                  }
                />

                <TouchableOpacity
                  style={
                    styles.showButton
                  }
                  onPress={() =>
                    setShowPassword(
                      (value) =>
                        !value
                    )
                  }
                  disabled={loading}
                  activeOpacity={0.7}
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
              </FormField>

              {/* ==================================================
                  CONFIRM PASSWORD
              ================================================== */}

              <FormField
                icon="shield-checkmark-outline"
                label="CONFIRM PASSWORD"
                focused={confirmPasswordFocused}
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
                    confirmPassword
                  }
                  onChangeText={
                    setConfirmPassword
                  }
                  secureTextEntry={
                    !showConfirmPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onFocus={() =>
                    setConfirmPasswordFocused(
                      true
                    )
                  }
                  onBlur={() =>
                    setConfirmPasswordFocused(
                      false
                    )
                  }
                  selectionColor={
                    colors.primaryLight
                  }
                  onSubmitEditing={
                    handleRegister
                  }
                />

                <TouchableOpacity
                  style={
                    styles.showButton
                  }
                  onPress={() =>
                    setShowConfirmPassword(
                      (value) =>
                        !value
                    )
                  }
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={
                      showConfirmPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={19}
                    color={
                      colors.secondaryText
                    }
                  />
                </TouchableOpacity>
              </FormField>

              {/* ==================================================
                  SUBMIT APPLICATION
              ================================================== */}

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  {
                    backgroundColor:
                      colors.primary,
                  },
                  loading &&
                    styles.buttonDisabled,
                ]}
                onPress={
                  handleRegister
                }
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="send-outline"
                      size={17}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.registerButtonText
                      }
                    >
                      SUBMIT TRAINER APPLICATION
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* ==================================================
                  BACK TO LOGIN
              ================================================== */}

              <TouchableOpacity
                style={
                  styles.backToLoginButton
                }
                onPress={() =>
                  router.replace("/")
                }
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.backToLoginText,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  Already have an account?{" "}
                  <Text
                    style={[
                      styles.loginLink,
                      {
                        color:
                          colors.primaryLight,
                      },
                    ]}
                  >
                    LOGIN
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* ==================================================
                PENDING INFORMATION
            ================================================== */}

            <View
              style={[
                styles.pendingBox,
                {
                  backgroundColor:
                    "#FFB21C12",
                  borderColor:
                    "#FFB21C55",
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color="#FFB21C"
              />

              <Text
                style={[
                  styles.pendingText,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                Your application will remain
                pending until the gym owner
                approves your trainer account.
              </Text>
            </View>

            {/* ==================================================
                FOOTER
            ================================================== */}

            <View style={styles.footerRow}>
              <View
                style={[
                  styles.footerIcon,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >
                <Ionicons
                  name="fitness-outline"
                  size={15}
                  color={
                    colors.primaryLight
                  }
                />
              </View>

              <Text
                style={[
                  styles.footer,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                GYMRYT • TRAIN • TRACK • TRANSFORM
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ============================================================
// FORM FIELD
// ============================================================

function FormField({
  icon,
  label,
  focused,
  colors,
  children,
}) {
  return (
    <View
      style={
        styles.inputContainer
      }
    >
      <Text
        style={[
          styles.floatingLabel,
          {
            color: focused
              ? colors.primaryLight
              : colors.secondaryText,
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
            borderColor: focused
              ? colors.primaryLight
              : colors.border,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={
            focused
              ? colors.primaryLight
              : colors.secondaryText
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

  background: {
    flex: 1,
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop:
      Platform.OS === "ios"
        ? 54
        : 44,
    paddingBottom: 40,
  },

  content: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },

  // ============================================================
  // HEADER
  // ============================================================

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
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
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },

  subtitle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
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
  // QR CONNECTION
  // ============================================================

  qrConnectedBox: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 21,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  qrIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#45E0A518",
    alignItems: "center",
    justifyContent: "center",
  },

  qrConnectedTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  qrConnectedTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  qrConnectedSubtitle: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
  },

  // ============================================================
  // CARD
  // ============================================================

  card: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
  },

  cardEyebrow: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 3,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
  },

  // ============================================================
  // INPUT
  // ============================================================

  inputContainer: {
    marginBottom: 14,
  },

  floatingLabel: {
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

  showButton: {
    height: "100%",
    paddingHorizontal: 14,
    justifyContent: "center",
  },

  // ============================================================
  // REGISTER BUTTON
  // ============================================================

  registerButton: {
    height: 54,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // ============================================================
  // BACK TO LOGIN
  // ============================================================

  backToLoginButton: {
    alignItems: "center",
    paddingVertical: 16,
  },

  backToLoginText: {
    fontSize: 11,
    fontWeight: "600",
  },

  loginLink: {
    fontWeight: "900",
  },

  // ============================================================
  // PENDING INFORMATION
  // ============================================================

  pendingBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    marginTop: 12,
  },

  pendingText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 15,
    marginLeft: 10,
  },

  // ============================================================
  // FOOTER
  // ============================================================

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
  },

  footerIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  footer: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
});
