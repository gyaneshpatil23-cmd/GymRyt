import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";

const API_URL =
  "http://192.168.1.49:8000/api/members/register/";

export default function MemberRegisterScreen() {
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
    <ImageBackground
      source={require("../../assets/images/gymryt-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.backgroundOverlay}>

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

                <Text style={styles.title}>
                  JOIN GYMRYT
                </Text>

                <Text style={styles.subtitle}>
                  Create your member account
                </Text>

              </View>

              {/* ==================================================
                  REGISTRATION CARD
              ================================================== */}

              <View style={styles.card}>

                {/* ==================================================
                    QR CONNECTION
                ================================================== */}

                <View style={styles.qrConnectedBox}>

                  <View
                    style={
                      styles.qrIconCircle
                    }
                  >
                    <Text
                      style={
                        styles.qrIcon
                      }
                    >
                      ✓
                    </Text>
                  </View>

                  <View
                    style={
                      styles.qrConnectedTextContainer
                    }
                  >

                    <Text
                      style={
                        styles.qrConnectedTitle
                      }
                    >
                      Gym Connected
                    </Text>

                    <Text
                      style={
                        styles.qrConnectedSubtitle
                      }
                    >
                      Your registration is linked
                      to this gym
                    </Text>

                  </View>

                </View>

                {/* ==================================================
                    FULL NAME
                ================================================== */}

                <View
                  style={
                    styles.inputContainer
                  }
                >

                  <Text
                    style={[
                      styles.floatingLabel,
                      fullNameFocused &&
                        styles.floatingLabelFocused,
                    ]}
                  >
                    Full Name
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      fullNameFocused &&
                        styles.inputFocused,
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
                    selectionColor="#9DBEFF"
                  />

                </View>

                {/* ==================================================
                    EMAIL
                ================================================== */}

                <View
                  style={
                    styles.inputContainer
                  }
                >

                  <Text
                    style={[
                      styles.floatingLabel,
                      emailFocused &&
                        styles.floatingLabelFocused,
                    ]}
                  >
                    Email
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      emailFocused &&
                        styles.inputFocused,
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
                    selectionColor="#9DBEFF"
                  />

                </View>

                {/* ==================================================
                    PHONE
                ================================================== */}

                <View
                  style={
                    styles.inputContainer
                  }
                >

                  <Text
                    style={[
                      styles.floatingLabel,
                      phoneFocused &&
                        styles.floatingLabelFocused,
                    ]}
                  >
                    Phone Number
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      phoneFocused &&
                        styles.inputFocused,
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
                    selectionColor="#9DBEFF"
                  />

                </View>

                {/* ==================================================
                    USERNAME
                ================================================== */}

                <View
                  style={
                    styles.inputContainer
                  }
                >

                  <Text
                    style={[
                      styles.floatingLabel,
                      usernameFocused &&
                        styles.floatingLabelFocused,
                    ]}
                  >
                    Username
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      usernameFocused &&
                        styles.inputFocused,
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
                    selectionColor="#9DBEFF"
                  />

                </View>

                {/* ==================================================
                    PASSWORD
                ================================================== */}

                <View
                  style={
                    styles.inputContainer
                  }
                >

                  <Text
                    style={[
                      styles.floatingLabel,
                      passwordFocused &&
                        styles.floatingLabelFocused,
                    ]}
                  >
                    Password
                  </Text>

                  <View
                    style={
                      styles.passwordWrapper
                    }
                  >

                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordTextInput,
                        passwordFocused &&
                          styles.inputFocused,
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
                      selectionColor="#9DBEFF"
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

                      <Text
                        style={
                          styles.showText
                        }
                      >
                        {showPassword
                          ? "HIDE"
                          : "SHOW"}
                      </Text>

                    </TouchableOpacity>

                  </View>

                </View>

                {/* ==================================================
                    CONFIRM PASSWORD
                ================================================== */}

                <View
                  style={
                    styles.inputContainer
                  }
                >

                  <Text
                    style={[
                      styles.floatingLabel,
                      confirmPasswordFocused &&
                        styles.floatingLabelFocused,
                    ]}
                  >
                    Confirm Password
                  </Text>

                  <View
                    style={
                      styles.passwordWrapper
                    }
                  >

                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordTextInput,
                        confirmPasswordFocused &&
                          styles.inputFocused,
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
                      selectionColor="#9DBEFF"
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

                      <Text
                        style={
                          styles.showText
                        }
                      >
                        {showConfirmPassword
                          ? "HIDE"
                          : "SHOW"}
                      </Text>

                    </TouchableOpacity>

                  </View>

                </View>

                {/* ==================================================
                    REGISTER
                ================================================== */}

                <TouchableOpacity
                  style={[
                    styles.registerButton,
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
                    <Text
                      style={
                        styles.registerButtonText
                      }
                    >
                      CREATE MEMBER ACCOUNT
                    </Text>
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
                    style={
                      styles.backToLoginText
                    }
                  >
                    Already have an account?{" "}

                    <Text
                      style={
                        styles.loginLink
                      }
                    >
                      LOGIN
                    </Text>

                  </Text>

                </TouchableOpacity>

              </View>

              {/* ==================================================
                  FOOTER
              ================================================== */}

              <Text style={styles.footer}>
                GYMRYT • TRAIN • TRACK • TRANSFORM
              </Text>

            </View>

          </ScrollView>

        </KeyboardAvoidingView>

      </View>
    </ImageBackground>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  background: {
    flex: 1,
    backgroundColor: "#050816",
  },

  backgroundOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(2, 8, 23, 0.34)",
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
  },

  content: {
    width: "100%",
    alignItems: "stretch",
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    alignItems: "center",
    marginBottom: 18,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  subtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 5,
  },

  // ==========================================================
  // CARD
  // ==========================================================

  card: {
    backgroundColor:
      "rgba(5, 15, 30, 0.40)",

    borderRadius: 22,

    padding: 18,

    shadowColor: "#006EFF",

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.20,

    shadowRadius: 15,

    elevation: 6,
  },

  // ==========================================================
  // QR CONNECTION
  // ==========================================================

  qrConnectedBox: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor:
      "rgba(34, 197, 94, 0.08)",

    borderWidth: 1,

    borderColor:
      "rgba(34, 197, 94, 0.30)",

    borderRadius: 14,

    padding: 12,

    marginBottom: 22,
  },

  qrIconCircle: {
    width: 34,

    height: 34,

    borderRadius: 17,

    backgroundColor:
      "rgba(34, 197, 94, 0.18)",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 11,
  },

  qrIcon: {
    color: "#22C55E",

    fontSize: 19,

    fontWeight: "800",
  },

  qrConnectedTextContainer: {
    flex: 1,
  },

  qrConnectedTitle: {
    color: "#FFFFFF",

    fontSize: 13,

    fontWeight: "700",

    marginBottom: 2,
  },

  qrConnectedSubtitle: {
    color: "#94A3B8",

    fontSize: 10,

    lineHeight: 14,
  },

  // ==========================================================
  // INPUT
  // ==========================================================

  inputContainer: {
    position: "relative",
    marginBottom: 20,
  },

  floatingLabel: {
    position: "absolute",

    left: 16,

    top: -8,

    zIndex: 10,

    backgroundColor:
      "rgba(4, 14, 28, 0.90)",

    paddingHorizontal: 5,

    color: "#9DBEFF",

    fontSize: 13,

    fontWeight: "500",
  },

  floatingLabelFocused: {
    color: "#A8C7FF",
  },

  input: {
    height: 54,

    backgroundColor:
      "rgba(0, 0, 0, 0.08)",

    borderWidth: 2,

    borderColor: "#64748B",

    borderRadius: 5,

    paddingHorizontal: 16,

    color: "#FFFFFF",

    fontSize: 15,
  },

  inputFocused: {
    borderColor: "#9DBEFF",

    backgroundColor:
      "rgba(0, 0, 0, 0.04)",

    shadowColor: "#258DFF",

    shadowOffset: {
      width: 0,
      height: 0,
    },

    shadowOpacity: 0.25,

    shadowRadius: 6,

    elevation: 3,
  },

  // ==========================================================
  // PASSWORD
  // ==========================================================

  passwordWrapper: {
    position: "relative",

    width: "100%",
  },

  passwordTextInput: {
    paddingRight: 65,
  },

  showButton: {
    position: "absolute",

    right: 16,

    top: 0,

    height: 54,

    justifyContent: "center",

    alignItems: "center",

    zIndex: 20,
  },

  showText: {
    color: "#9DBEFF",

    fontSize: 10,

    fontWeight: "800",

    letterSpacing: 0.8,
  },

  // ==========================================================
  // REGISTER BUTTON
  // ==========================================================

  registerButton: {
    height: 54,

    backgroundColor: "#2563EB",

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    shadowColor: "#2563EB",

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.30,

    shadowRadius: 10,

    elevation: 6,

    marginTop: 2,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  registerButtonText: {
    color: "#FFFFFF",

    fontSize: 13,

    fontWeight: "800",

    letterSpacing: 0.7,
  },

  // ==========================================================
  // BACK TO LOGIN
  // ==========================================================

  backToLoginButton: {
    alignItems: "center",

    marginTop: 18,
  },

  backToLoginText: {
    color: "#94A3B8",

    fontSize: 11,
  },

  loginLink: {
    color: "#60A5FA",

    fontWeight: "800",

    letterSpacing: 0.5,
  },

  // ==========================================================
  // FOOTER
  // ==========================================================

  footer: {
    textAlign: "center",

    color: "#64748B",

    fontSize: 9,

    fontWeight: "700",

    letterSpacing: 1.5,

    marginTop: 18,

    marginBottom: 2,
  },
});
