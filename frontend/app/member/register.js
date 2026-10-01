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

const API_URL =
  "http://192.168.1.43:8000/api/members/register/";

export default function MemberRegisterScreen() {
  const { colors, isDark, toggleTheme } = useTheme();

  // ============================================================
  // QR TOKEN
  // ============================================================

  const { qrToken } = useLocalSearchParams();

  // ============================================================
  // FORM DATA
  // ============================================================

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  // ============================================================
  // PASSWORD VISIBILITY
  // ============================================================

  const [showPassword, setShowPassword] =
    useState(false);

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
  // REGISTER
  // ============================================================

  const handleRegister = async () => {
    // ==========================================================
    // QR TOKEN
    // ==========================================================

    if (!qrToken) {
      Alert.alert(
        "Invalid Registration",
        "No gym QR code was detected. Please scan the gym's QR code again."
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

    if (!username.trim()) {
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

      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          qr_token: qrToken,

          name: fullName.trim(),

          email: email
            .trim()
            .toLowerCase(),

          phone: cleanedPhone,

          username: username.trim(),

          password: password,

          confirm_password:
            confirmPassword,
        }),
      });

      let data = {};

      try {
        data = await response.json();
      } catch (error) {
        console.log(
          "Could not parse registration response:",
          error
        );
      }

      console.log(
        "MEMBER REGISTRATION STATUS:",
        response.status
      );

      console.log(
        "MEMBER REGISTRATION RESPONSE:",
        data
      );

      // ========================================================
      // SUCCESS
      // ========================================================

      if (
        response.ok &&
        data.success
      ) {
        Alert.alert(
          "Registration Successful 🎉",
          "Your GymRyt member account has been created successfully.\n\nYou can now login using the username and password you created.",
          [
            {
              text: "LOGIN",
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
        data.detail ||
        data.message ||
        "Could not complete registration.";

      if (
        typeof data === "object" &&
        !data.detail &&
        !data.message
      ) {
        const messages = [];

        Object.keys(data).forEach(
          (key) => {
            const value = data[key];

            if (Array.isArray(value)) {
              messages.push(
                `${key}: ${value.join(", ")}`
              );
            } else if (
              typeof value === "string"
            ) {
              messages.push(
                `${key}: ${value}`
              );
            }
          }
        );

        if (messages.length > 0) {
          errorMessage =
            messages.join("\n");
        }
      }

      Alert.alert(
        "Registration Failed",
        errorMessage
      );
    } catch (error) {
      console.log(
        "MEMBER REGISTRATION ERROR:",
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
                  Create your member account
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
                  Your registration is linked
                  to this gym
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
                MEMBER DETAILS
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
                  REGISTER
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
                      name="person-add-outline"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.registerButtonText
                      }
                    >
                      CREATE MEMBER ACCOUNT
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
