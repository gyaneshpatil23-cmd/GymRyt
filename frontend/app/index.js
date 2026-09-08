import { router } from "expo-router";
import React, { useRef, useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// API
// ============================================================

const API_URL = "http://192.168.1.49:8000";

// ============================================================
// LOGIN SCREEN
// ============================================================

export default function LoginScreen() {
  // ==========================================================
  // MODE
  // ==========================================================

  const [isCreateAccount, setIsCreateAccount] = useState(false);

  // "select_role" | "form"
  const [createAccountStep, setCreateAccountStep] =
    useState("select_role");

  // "OWNER" | "OWNER_TRAINER"
  const [selectedRole, setSelectedRole] = useState(null);

  // ==========================================================
  // LOGIN
  // ==========================================================

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // ==========================================================
  // CREATE ACCOUNT
  // ==========================================================

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ==========================================================
  // PASSWORD VISIBILITY
  // ==========================================================

  const [showPassword, setShowPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  // ==========================================================
  // LOADING
  // ==========================================================

  const [loading, setLoading] = useState(false);

  // ==========================================================
  // FOCUS STATES
  // ==========================================================

  const [usernameFocused, setUsernameFocused] =
    useState(false);

  const [passwordFocused, setPasswordFocused] =
    useState(false);

  const [fullNameFocused, setFullNameFocused] =
    useState(false);

  const [emailFocused, setEmailFocused] =
    useState(false);

  const [createUsernameFocused, setCreateUsernameFocused] =
    useState(false);

  const [createPasswordFocused, setCreatePasswordFocused] =
    useState(false);

  const [confirmPasswordFocused, setConfirmPasswordFocused] =
    useState(false);

  // ==========================================================
  // REFS
  // ==========================================================

  const scrollViewRef = useRef(null);

  const loginUsernameRef = useRef(null);
  const loginPasswordRef = useRef(null);

  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const createUsernameRef = useRef(null);
  const createPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // ==========================================================
  // KEYBOARD AUTO-SCROLL
  // ==========================================================

  const scrollToInput = (ref, extraOffset = 100) => {
    if (!ref?.current || !scrollViewRef.current) {
      return;
    }

    setTimeout(() => {
      ref.current?.measureLayout(
        scrollViewRef.current.getInnerViewNode?.() ||
          scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, y - extraOffset),
            animated: true,
          });
        },
        () => {
          // Fallback if measureLayout is unavailable
          scrollViewRef.current?.scrollToEnd({
            animated: true,
          });
        }
      );
    }, 250);
  };

  // More reliable scrolling method for React Native forms.
  const handleInputFocus = (ref, fallbackY = 0) => {
    setTimeout(() => {
      if (!scrollViewRef.current) {
        return;
      }

      if (ref?.current?.measureInWindow) {
        ref.current.measureInWindow(
          (x, y, width, height) => {
            const screenHeight =
              Platform.OS === "android"
                ? 700
                : 750;

            const keyboardSafetySpace = 180;

            if (
              y + height >
              screenHeight - keyboardSafetySpace
            ) {
              scrollViewRef.current.scrollTo({
                y: Math.max(
                  0,
                  fallbackY + 180
                ),
                animated: true,
              });
            }
          }
        );
      } else {
        scrollViewRef.current.scrollTo({
          y: fallbackY,
          animated: true,
        });
      }
    }, 300);
  };

  // ==========================================================
  // SWITCH MODE
  // ==========================================================

  const switchMode = (createAccount) => {
    Keyboard.dismiss();

    setIsCreateAccount(createAccount);

    if (createAccount) {
      setCreateAccountStep("select_role");
      setSelectedRole(null);
    } else {
      setCreateAccountStep("select_role");
      setSelectedRole(null);
    }

    setShowPassword(false);
    setShowCreatePassword(false);
    setShowConfirmPassword(false);

    setLoading(false);

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 0,
        animated: false,
      });
    }, 150);
  };

  // ==========================================================
  // SELECT ACCOUNT ROLE
  // ==========================================================

  const selectRole = (role) => {
    Keyboard.dismiss();

    setSelectedRole(role);
    setCreateAccountStep("form");

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 0,
        animated: false,
      });
    }, 150);
  };

  // ==========================================================
  // CHANGE ACCOUNT ROLE
  // ==========================================================

  const changeRole = () => {
    Keyboard.dismiss();

    setCreateAccountStep("select_role");
    setSelectedRole(null);

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 0,
        animated: false,
      });
    }, 150);
  };

  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter your username and password."
      );

      return;
    }

    try {
      setLoading(true);

      // ======================================================
      // LOGIN REQUEST
      // ======================================================

      const response = await fetch(
        `${API_URL}/api/members/login/`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username: username.trim(),
            password: password,
          }),
        }
      );

      // ======================================================
      // RESPONSE
      // ======================================================

      let data = {};

      try {
        data = await response.json();
      } catch (error) {
        console.log(
          "Could not parse login response:",
          error
        );
      }

      console.log(
        "LOGIN STATUS:",
        response.status
      );

      console.log(
        "LOGIN RESPONSE:",
        data
      );

      // ======================================================
      // LOGIN SUCCESS
      // ======================================================

      if (response.ok && data.success) {
        const rawRole = String(
          data.role || ""
        ).toUpperCase();

        const role =
          rawRole === "OWNER_TRAINER"
            ? "OWNER_TRAINER"
            : rawRole === "TRAINER"
            ? "TRAINER"
            : rawRole === "MEMBER"
            ? "MEMBER"
            : rawRole === "OWNER" ||
              rawRole === "ADMIN"
            ? "OWNER"
            : rawRole;

        // ====================================================
        // ADMIN / OWNER / TRAINER
        // ====================================================

        if (
          role === "OWNER" ||
          role === "OWNER_TRAINER" ||
          role === "TRAINER"
        ) {
          if (!data.token) {
            Alert.alert(
              "Login Error",
              "Login succeeded but no authentication token was received."
            );

            return;
          }

          // --------------------------------------------------
          // CLEAR OLD STAFF SESSION
          // --------------------------------------------------

          await AsyncStorage.multiRemove([
            "adminToken",
            "adminUsername",
            "adminId",
            "userRole",
            "workspaceId",
            "workspaceName",
          ]);

          // --------------------------------------------------
          // SAVE TOKEN
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "adminToken",
            data.token
          );

          // --------------------------------------------------
          // SAVE USERNAME
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "adminUsername",
            data.username ||
              username.trim()
          );

          // --------------------------------------------------
          // SAVE USER ID
          // --------------------------------------------------

          if (
            data.id !== undefined &&
            data.id !== null
          ) {
            await AsyncStorage.setItem(
              "adminId",
              String(data.id)
            );
          }

          // --------------------------------------------------
          // SAVE ROLE
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "userRole",
            role
          );

          // --------------------------------------------------
          // SAVE WORKSPACE ID
          // --------------------------------------------------

          if (
            data.workspace_id !== undefined &&
            data.workspace_id !== null
          ) {
            await AsyncStorage.setItem(
              "workspaceId",
              String(data.workspace_id)
            );
          }

          // --------------------------------------------------
          // SAVE WORKSPACE NAME
          // --------------------------------------------------

          if (data.workspace_name) {
            await AsyncStorage.setItem(
              "workspaceName",
              String(data.workspace_name)
            );
          }

          // --------------------------------------------------
          // DEBUG
          // --------------------------------------------------

          console.log(
            "================================"
          );

          console.log(
            "STAFF LOGIN SUCCESS"
          );

          console.log(
            "USERNAME:",
            data.username
          );

          console.log(
            "USER ID:",
            data.id
          );

          console.log(
            "ROLE:",
            role
          );

          console.log(
            "WORKSPACE:",
            data.workspace_name
          );

          console.log(
            "TOKEN SAVED:",
            !!data.token
          );

          console.log(
            "================================"
          );

          // --------------------------------------------------
          // DASHBOARD ROUTING
          // --------------------------------------------------

          if (role === "OWNER_TRAINER") {
            router.replace(
              "/owner-trainer/dashboard"
            );
          } else if (role === "TRAINER") {
            router.replace(
              "/trainer/dashboard"
            );
          } else {
            router.replace(
              "/admin/dashboard"
            );
          }

          return;
        }

        // ====================================================
        // MEMBER LOGIN
        // ====================================================

        if (role === "MEMBER") {
          // --------------------------------------------------
          // CLEAR OLD MEMBER SESSION
          // --------------------------------------------------

          await AsyncStorage.multiRemove([
            "memberId",
            "memberName",
            "memberUsername",
            "memberEmail",
            "memberPhone",
            "memberStatus",
            "memberMembershipStart",
            "memberMembershipEnd",
            "memberWorkspaceId",
            "memberWorkspaceName",
            "memberToken",
            "memberProfilePicture",
          ]);

          // --------------------------------------------------
          // SAVE MEMBER ID
          // --------------------------------------------------

          if (
            data.id !== undefined &&
            data.id !== null
          ) {
            await AsyncStorage.setItem(
              "memberId",
              String(data.id)
            );
          }

          // --------------------------------------------------
          // SAVE MEMBER NAME
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberName",
            data.full_name ||
              data.name ||
              data.username ||
              username.trim()
          );

          // --------------------------------------------------
          // SAVE MEMBER USERNAME
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberUsername",
            data.username ||
              username.trim()
          );

          // --------------------------------------------------
          // SAVE MEMBER EMAIL
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberEmail",
            data.email
              ? String(data.email)
              : ""
          );

          // --------------------------------------------------
          // SAVE MEMBER PHONE
          // --------------------------------------------------

          const memberPhone =
            data.phone_number ||
            data.phone ||
            data.contact_number ||
            "";

          await AsyncStorage.setItem(
            "memberPhone",
            String(memberPhone)
          );

          // --------------------------------------------------
          // SAVE MEMBER STATUS
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberStatus",
            data.status
              ? String(data.status)
              : ""
          );

          // --------------------------------------------------
          // SAVE MEMBERSHIP START
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberMembershipStart",
            data.membership_start
              ? String(data.membership_start)
              : ""
          );

          // --------------------------------------------------
          // SAVE MEMBERSHIP END
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberMembershipEnd",
            data.membership_end
              ? String(data.membership_end)
              : ""
          );

          // --------------------------------------------------
          // SAVE WORKSPACE ID
          // --------------------------------------------------

          if (
            data.workspace_id !== undefined &&
            data.workspace_id !== null
          ) {
            await AsyncStorage.setItem(
              "memberWorkspaceId",
              String(data.workspace_id)
            );
          }

          // --------------------------------------------------
          // SAVE WORKSPACE NAME
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberWorkspaceName",
            data.workspace_name
              ? String(data.workspace_name)
              : ""
          );

          // --------------------------------------------------
          // SAVE MEMBER TOKEN
          // --------------------------------------------------

          if (data.member_token) {
            await AsyncStorage.setItem(
              "memberToken",
              String(data.member_token)
            );
          }

          // --------------------------------------------------
          // SAVE PROFILE PICTURE
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberProfilePicture",
            data.profile_picture
              ? String(data.profile_picture)
              : ""
          );

          // --------------------------------------------------
          // DEBUG
          // --------------------------------------------------

          console.log(
            "================================"
          );

          console.log(
            "MEMBER LOGIN SUCCESS"
          );

          console.log(
            "NAME:",
            data.full_name || data.name
          );

          console.log(
            "USERNAME:",
            data.username
          );

          console.log(
            "MEMBER ID:",
            data.id
          );

          console.log(
            "ROLE:",
            data.role
          );

          console.log(
            "WORKSPACE:",
            data.workspace_name
          );

          console.log(
            "MEMBER TOKEN SAVED:",
            !!data.member_token
          );

          console.log(
            "================================"
          );

          router.replace(
            "/member/dashboard"
          );

          return;
        }

        // ====================================================
        // UNKNOWN ROLE
        // ====================================================

        Alert.alert(
          "Login Error",
          "Unknown user role received from the server."
        );

        return;
      }

      // ======================================================
      // LOGIN FAILED
      // ======================================================

      let errorMessage =
        data.message ||
        data.detail ||
        "Invalid username or password.";

      if (
        typeof data === "object"
      ) {
        if (data.non_field_errors) {
          errorMessage =
            Array.isArray(
              data.non_field_errors
            )
              ? data.non_field_errors.join(
                  "\n"
                )
              : String(
                  data.non_field_errors
                );
        }

        if (data.username) {
          errorMessage =
            Array.isArray(data.username)
              ? data.username.join("\n")
              : String(data.username);
        }

        if (data.password) {
          errorMessage =
            Array.isArray(data.password)
              ? data.password.join("\n")
              : String(data.password);
        }
      }

      Alert.alert(
        "Login Failed",
        errorMessage
      );
    } catch (error) {
      console.log(
        "LOGIN ERROR:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Could not connect to GymRyt server.\n\nMake sure your phone and computer are connected to the same Wi-Fi and Django server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // CREATE ACCOUNT
  // ==========================================================

  const handleCreateAccount = async () => {
    if (!selectedRole) {
      Alert.alert(
        "Account Type Required",
        "Please select an account type."
      );

      return;
    }

    if (!fullName.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter your full name."
      );

      return;
    }

    if (!email.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter your email address."
      );

      return;
    }

    if (!createUsername.trim()) {
      Alert.alert(
        "Missing Information",
        "Please create a username."
      );

      return;
    }

    if (!createPassword.trim()) {
      Alert.alert(
        "Missing Information",
        "Please create a password."
      );

      return;
    }

    if (createPassword.length < 6) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 6 characters long."
      );

      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert(
        "Missing Information",
        "Please confirm your password."
      );

      return;
    }

    if (
      createPassword !==
      confirmPassword
    ) {
      Alert.alert(
        "Password Mismatch",
        "Password and confirm password do not match."
      );

      return;
    }

    try {
      setLoading(true);

      Keyboard.dismiss();

      // ======================================================
      // ADMIN REGISTRATION REQUEST
      // ======================================================
      //
      // IMPORTANT:
      // This is NOT /register/
      //
      // Owner registration uses:
      // /admin/register/
      //
      // This prevents the "Registration QR code is required"
      // error that was appearing previously.
      // ======================================================

      const response = await fetch(
        `${API_URL}/api/members/admin/register/`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            full_name:
              fullName.trim(),

            email:
              email.trim(),

            username:
              createUsername.trim(),

            password:
              createPassword,

            confirm_password:
              confirmPassword,

            role:
              selectedRole,
          }),
        }
      );

      // ======================================================
      // RESPONSE
      // ======================================================

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
        "REGISTRATION STATUS:",
        response.status
      );

      console.log(
        "REGISTRATION RESPONSE:",
        data
      );

      // ======================================================
      // REGISTRATION SUCCESS
      // ======================================================

      if (
        response.ok &&
        data.success
      ) {
        const createdRole =
          String(
            data.role ||
              selectedRole
          ).toUpperCase();

        Alert.alert(
          "Account Created",
          data.message ||
            "Your account has been created successfully.",
          [
            {
              text: "LOGIN NOW",

              onPress: () => {
                // --------------------------------------------
                // RESET CREATE ACCOUNT FORM
                // --------------------------------------------

                setFullName("");
                setEmail("");
                setCreateUsername("");
                setCreatePassword("");
                setConfirmPassword("");

                setSelectedRole(null);
                setCreateAccountStep(
                  "select_role"
                );

                setShowCreatePassword(
                  false
                );

                setShowConfirmPassword(
                  false
                );

                // --------------------------------------------
                // SWITCH TO LOGIN
                // --------------------------------------------

                setIsCreateAccount(
                  false
                );

                // --------------------------------------------
                // OPTIONAL:
                // PRE-FILL USERNAME
                // --------------------------------------------

                setUsername(
                  data.username ||
                    createUsername.trim()
                );

                setPassword("");

                // --------------------------------------------
                // DEBUG
                // --------------------------------------------

                console.log(
                  "================================"
                );

                console.log(
                  "ACCOUNT CREATED"
                );

                console.log(
                  "USERNAME:",
                  data.username
                );

                console.log(
                  "ROLE:",
                  createdRole
                );

                console.log(
                  "WORKSPACE:",
                  data.workspace_name
                );

                console.log(
                  "================================"
                );

                setTimeout(() => {
                  scrollViewRef.current?.scrollTo(
                    {
                      y: 0,
                      animated: false,
                    }
                  );
                }, 100);
              },
            },
          ]
        );

        return;
      }

      // ======================================================
      // REGISTRATION FAILED
      // ======================================================

      let errorMessage =
        data.message ||
        data.detail ||
        "Could not create the account.";

      if (
        typeof data === "object"
      ) {
        if (data.email) {
          errorMessage =
            Array.isArray(data.email)
              ? data.email.join("\n")
              : String(data.email);
        }

        if (data.username) {
          errorMessage =
            Array.isArray(
              data.username
            )
              ? data.username.join("\n")
              : String(data.username);
        }

        if (data.password) {
          errorMessage =
            Array.isArray(
              data.password
            )
              ? data.password.join("\n")
              : String(data.password);
        }

        if (data.non_field_errors) {
          errorMessage =
            Array.isArray(
              data.non_field_errors
            )
              ? data.non_field_errors.join(
                  "\n"
                )
              : String(
                  data.non_field_errors
                );
        }
      }

      Alert.alert(
        "Registration Failed",
        errorMessage
      );
    } catch (error) {
      console.log(
        "REGISTRATION ERROR:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Could not connect to GymRyt server.\n\nMake sure your phone and computer are connected to the same Wi-Fi and Django server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // FORGOT PASSWORD
  // ==========================================================

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password",
      "Please contact your gym administrator to reset your password."
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <ImageBackground
      source={require("../assets/images/gymryt-bg.png")}
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
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContainer,
              isCreateAccount &&
                styles.createScrollContainer,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={
              Platform.OS === "ios"
            }
          >
            <View style={styles.content}>

              {/* ==================================================
                  LOGO
              ================================================== */}

              <View style={styles.logoContainer}>
                <Image
                  source={require("../assets/images/gymryt-logo.png")}
                  style={[
                    styles.logo,
                    isCreateAccount &&
                      styles.createLogo,
                  ]}
                  resizeMode="contain"
                />
              </View>

              {/* ==================================================
                  LOGIN / CREATE ACCOUNT SWITCH
              ================================================== */}

              <View style={styles.modeSwitch}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    !isCreateAccount &&
                      styles.modeButtonActive,
                  ]}
                  onPress={() =>
                    switchMode(false)
                  }
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      !isCreateAccount &&
                        styles.modeButtonTextActive,
                    ]}
                  >
                    LOGIN
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    isCreateAccount &&
                      styles.modeButtonActive,
                  ]}
                  onPress={() =>
                    switchMode(true)
                  }
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      isCreateAccount &&
                        styles.modeButtonTextActive,
                    ]}
                  >
                    CREATE ACCOUNT
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ==================================================
                  LOGIN
              ================================================== */}

              {!isCreateAccount ? (
                <View style={styles.loginCard}>

                  {/* USERNAME */}

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
                      ref={
                        loginUsernameRef
                      }
                      value={username}
                      onChangeText={
                        setUsername
                      }
                      style={[
                        styles.input,
                        usernameFocused &&
                          styles.inputFocused,
                      ]}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      selectionColor="#9DBEFF"
                      onFocus={() => {
                        setUsernameFocused(
                          true
                        );

                        handleInputFocus(
                          loginUsernameRef,
                          0
                        );
                      }}
                      onBlur={() =>
                        setUsernameFocused(
                          false
                        )
                      }
                      onSubmitEditing={() =>
                        loginPasswordRef.current?.focus()
                      }
                    />
                  </View>

                  {/* PASSWORD */}

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
                        ref={
                          loginPasswordRef
                        }
                        value={password}
                        onChangeText={
                          setPassword
                        }
                        style={[
                          styles.input,
                          styles.passwordInputDirect,
                          passwordFocused &&
                            styles.inputFocused,
                        ]}
                        secureTextEntry={
                          !showPassword
                        }
                        autoCapitalize="none"
                        autoCorrect={false}
                        selectionColor="#9DBEFF"
                        returnKeyType="done"
                        onFocus={() => {
                          setPasswordFocused(
                            true
                          );

                          handleInputFocus(
                            loginPasswordRef,
                            120
                          );
                        }}
                        onBlur={() =>
                          setPasswordFocused(
                            false
                          )
                        }
                        onSubmitEditing={
                          handleLogin
                        }
                      />

                      <TouchableOpacity
                        style={
                          styles.showButton
                        }
                        onPress={() =>
                          setShowPassword(
                            !showPassword
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

                  {/* FORGOT PASSWORD */}

                  <TouchableOpacity
                    style={
                      styles.forgotButton
                    }
                    onPress={
                      handleForgotPassword
                    }
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={
                        styles.forgotText
                      }
                    >
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>

                  {/* LOGIN BUTTON */}

                  <TouchableOpacity
                    style={[
                      styles.loginButton,
                      loading &&
                        styles.loginButtonDisabled,
                    ]}
                    onPress={
                      handleLogin
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
                          styles.loginButtonText
                        }
                      >
                        LOGIN
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* QR SCANNER */}

                  <TouchableOpacity
                    style={
                      styles.scannerButton
                    }
                    onPress={() =>
                      router.push(
                        "/member/scanner"
                      )
                    }
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={
                        styles.scannerButtonText
                      }
                    >
                      +
                    </Text>
                  </TouchableOpacity>

                  <Text
                    style={
                      styles.scannerHint
                    }
                  >
                    Scan gym QR to register
                  </Text>
                </View>
              ) : (
                <>
                  {/* ==================================================
                      ACCOUNT TYPE SELECTION
                  ================================================== */}

                  {createAccountStep ===
                  "select_role" ? (
                    <View
                      style={
                        styles.roleCard
                      }
                    >
                      <Text
                        style={
                          styles.roleTitle
                        }
                      >
                        ACCOUNT TYPE
                      </Text>

                      <Text
                        style={
                          styles.roleSubtitle
                        }
                      >
                        Choose how you will
                        use GymRyt
                      </Text>

                      {/* OWNER */}

                      <TouchableOpacity
                        style={
                          styles.roleOption
                        }
                        onPress={() =>
                          selectRole(
                            "OWNER"
                          )
                        }
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        <View
                          style={
                            styles.roleIcon
                          }
                        >
                          <Text
                            style={
                              styles.roleIconText
                            }
                          >
                            O
                          </Text>
                        </View>

                        <View
                          style={
                            styles.roleContent
                          }
                        >
                          <Text
                            style={
                              styles.roleName
                            }
                          >
                            Owner
                          </Text>

                          <Text
                            style={
                              styles.roleDescription
                            }
                          >
                            Manage your gym,
                            members, payments
                            and reports.
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.roleArrow
                          }
                        >
                          →
                        </Text>
                      </TouchableOpacity>

                      {/* OWNER + TRAINER */}

                      <TouchableOpacity
                        style={
                          styles.roleOption
                        }
                        onPress={() =>
                          selectRole(
                            "OWNER_TRAINER"
                          )
                        }
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        <View
                          style={
                            styles.roleIcon
                          }
                        >
                          <Text
                            style={
                              styles.roleIconText
                            }
                          >
                            OT
                          </Text>
                        </View>

                        <View
                          style={
                            styles.roleContent
                          }
                        >
                          <Text
                            style={
                              styles.roleName
                            }
                          >
                            Owner + Trainer
                          </Text>

                          <Text
                            style={
                              styles.roleDescription
                            }
                          >
                            Manage your gym
                            and also train
                            your members.
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.roleArrow
                          }
                        >
                          →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* ==================================================
                       CREATE ACCOUNT FORM
                    ================================================== */

                    <View
                      style={[
                        styles.loginCard,
                        styles.createAccountCard,
                      ]}
                    >

                      {/* ACCOUNT TYPE */}

                      <View
                        style={
                          styles.selectedRoleCard
                        }
                      >
                        <View>
                          <Text
                            style={
                              styles.selectedRoleLabel
                            }
                          >
                            ACCOUNT TYPE
                          </Text>

                          <Text
                            style={
                              styles.selectedRoleName
                            }
                          >
                            {selectedRole ===
                            "OWNER_TRAINER"
                              ? "Owner + Trainer"
                              : "Owner"}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={
                            changeRole
                          }
                          disabled={loading}
                          activeOpacity={
                            0.7
                          }
                        >
                          <Text
                            style={
                              styles.changeRoleText
                            }
                          >
                            CHANGE
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* FULL NAME */}

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
                          ref={
                            fullNameRef
                          }
                          value={fullName}
                          onChangeText={
                            setFullName
                          }
                          style={[
                            styles.input,
                            fullNameFocused &&
                              styles.inputFocused,
                          ]}
                          autoCapitalize="words"
                          autoCorrect={false}
                          returnKeyType="next"
                          selectionColor="#9DBEFF"
                          onFocus={() => {
                            setFullNameFocused(
                              true
                            );

                            handleInputFocus(
                              fullNameRef,
                              0
                            );
                          }}
                          onBlur={() =>
                            setFullNameFocused(
                              false
                            )
                          }
                          onSubmitEditing={() =>
                            emailRef.current?.focus()
                          }
                        />
                      </View>

                      {/* EMAIL */}

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
                          ref={
                            emailRef
                          }
                          value={email}
                          onChangeText={
                            setEmail
                          }
                          style={[
                            styles.input,
                            emailFocused &&
                              styles.inputFocused,
                          ]}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="next"
                          selectionColor="#9DBEFF"
                          onFocus={() => {
                            setEmailFocused(
                              true
                            );

                            handleInputFocus(
                              emailRef,
                              100
                            );
                          }}
                          onBlur={() =>
                            setEmailFocused(
                              false
                            )
                          }
                          onSubmitEditing={() =>
                            createUsernameRef.current?.focus()
                          }
                        />
                      </View>

                      {/* USERNAME */}

                      <View
                        style={
                          styles.inputContainer
                        }
                      >
                        <Text
                          style={[
                            styles.floatingLabel,
                            createUsernameFocused &&
                              styles.floatingLabelFocused,
                          ]}
                        >
                          Username
                        </Text>

                        <TextInput
                          ref={
                            createUsernameRef
                          }
                          value={
                            createUsername
                          }
                          onChangeText={
                            setCreateUsername
                          }
                          style={[
                            styles.input,
                            createUsernameFocused &&
                              styles.inputFocused,
                          ]}
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="next"
                          selectionColor="#9DBEFF"
                          onFocus={() => {
                            setCreateUsernameFocused(
                              true
                            );

                            handleInputFocus(
                              createUsernameRef,
                              220
                            );
                          }}
                          onBlur={() =>
                            setCreateUsernameFocused(
                              false
                            )
                          }
                          onSubmitEditing={() =>
                            createPasswordRef.current?.focus()
                          }
                        />
                      </View>

                      {/* PASSWORD */}

                      <View
                        style={
                          styles.inputContainer
                        }
                      >
                        <Text
                          style={[
                            styles.floatingLabel,
                            createPasswordFocused &&
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
                            ref={
                              createPasswordRef
                            }
                            value={
                              createPassword
                            }
                            onChangeText={
                              setCreatePassword
                            }
                            style={[
                              styles.input,
                              styles.passwordInputDirect,
                              createPasswordFocused &&
                                styles.inputFocused,
                            ]}
                            secureTextEntry={
                              !showCreatePassword
                            }
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="next"
                            selectionColor="#9DBEFF"
                            onFocus={() => {
                              setCreatePasswordFocused(
                                true
                              );

                              handleInputFocus(
                                createPasswordRef,
                                360
                              );
                            }}
                            onBlur={() =>
                              setCreatePasswordFocused(
                                false
                              )
                            }
                            onSubmitEditing={() =>
                              confirmPasswordRef.current?.focus()
                            }
                          />

                          <TouchableOpacity
                            style={
                              styles.showButton
                            }
                            onPress={() =>
                              setShowCreatePassword(
                                !showCreatePassword
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
                              {showCreatePassword
                                ? "HIDE"
                                : "SHOW"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* CONFIRM PASSWORD */}

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
                            ref={
                              confirmPasswordRef
                            }
                            value={
                              confirmPassword
                            }
                            onChangeText={
                              setConfirmPassword
                            }
                            style={[
                              styles.input,
                              styles.passwordInputDirect,
                              confirmPasswordFocused &&
                                styles.inputFocused,
                            ]}
                            secureTextEntry={
                              !showConfirmPassword
                            }
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                            selectionColor="#9DBEFF"
                            onFocus={() => {
                              setConfirmPasswordFocused(
                                true
                              );

                              handleInputFocus(
                                confirmPasswordRef,
                                500
                              );
                            }}
                            onBlur={() =>
                              setConfirmPasswordFocused(
                                false
                              )
                            }
                            onSubmitEditing={
                              handleCreateAccount
                            }
                            blurOnSubmit={true}
                          />

                          <TouchableOpacity
                            style={
                              styles.showButton
                            }
                            onPress={() =>
                              setShowConfirmPassword(
                                !showConfirmPassword
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

                      {/* CREATE ACCOUNT */}

                      <TouchableOpacity
                        style={[
                          styles.loginButton,
                          loading &&
                            styles.loginButtonDisabled,
                        ]}
                        onPress={
                          handleCreateAccount
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
                              styles.loginButtonText
                            }
                          >
                            CREATE ACCOUNT
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* ==================================================
                  FOOTER
              ================================================== */}

              <Text
                style={
                  styles.footer
                }
              >
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
  // ==========================================================
  // BACKGROUND
  // ==========================================================

  background: {
    flex: 1,
    backgroundColor: "#050816",
  },

  backgroundOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(2, 8, 23, 0.34)",
  },

  // ==========================================================
  // KEYBOARD
  // ==========================================================

  keyboardContainer: {
    flex: 1,
  },

  // ==========================================================
  // SCROLL
  // ==========================================================

  scrollView: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 100,
  },

  createScrollContainer: {
    justifyContent: "flex-start",
    paddingTop: 20,
    paddingBottom: 160,
  },

  // ==========================================================
  // CONTENT
  // ==========================================================

  content: {
    width: "100%",
    alignItems: "stretch",
    justifyContent: "center",
  },

  // ==========================================================
  // LOGO
  // ==========================================================

  logoContainer: {
    alignItems: "center",
    marginBottom: 6,
  },

  logo: {
    width: 190,
    height: 190,
  },

  createLogo: {
    width: 120,
    height: 120,
  },

  // ==========================================================
  // MODE SWITCH
  // ==========================================================

  modeSwitch: {
    height: 46,
    flexDirection: "row",
    backgroundColor:
      "rgba(5, 15, 30, 0.45)",
    borderRadius: 14,
    padding: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor:
      "rgba(157, 190, 255, 0.25)",
  },

  modeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },

  modeButtonActive: {
    backgroundColor: "#2563EB",

    shadowColor: "#2563EB",

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  modeButtonText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  modeButtonTextActive: {
    color: "#FFFFFF",
  },

  // ==========================================================
  // CARD
  // ==========================================================

  loginCard: {
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

  createAccountCard: {
    padding: 16,
    borderRadius: 20,
  },

  // ==========================================================
  // ACCOUNT TYPE SELECTION
  // ==========================================================

  roleCard: {
    backgroundColor:
      "rgba(5, 15, 30, 0.48)",

    borderRadius: 22,

    padding: 18,

    borderWidth: 1,

    borderColor:
      "rgba(157, 190, 255, 0.20)",

    shadowColor: "#006EFF",

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.20,

    shadowRadius: 15,

    elevation: 6,
  },

  roleTitle: {
    color: "#9DBEFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  roleSubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 6,
    marginBottom: 18,
  },

  roleOption: {
    minHeight: 88,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor:
      "rgba(15, 30, 55, 0.55)",

    borderWidth: 1,

    borderColor:
      "rgba(157, 190, 255, 0.22)",

    borderRadius: 16,

    paddingHorizontal: 14,

    paddingVertical: 13,

    marginBottom: 12,
  },

  roleIcon: {
    width: 46,
    height: 46,

    borderRadius: 23,

    backgroundColor:
      "rgba(37, 99, 235, 0.20)",

    borderWidth: 1,

    borderColor:
      "rgba(157, 190, 255, 0.40)",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 13,
  },

  roleIconText: {
    color: "#9DBEFF",
    fontSize: 11,
    fontWeight: "900",
  },

  roleContent: {
    flex: 1,
  },

  roleName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  roleDescription: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  roleArrow: {
    color: "#9DBEFF",
    fontSize: 22,
    marginLeft: 8,
  },

  // ==========================================================
  // SELECTED ROLE
  // ==========================================================

  selectedRoleCard: {
    minHeight: 78,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    backgroundColor:
      "rgba(15, 30, 55, 0.50)",

    borderRadius: 16,

    borderWidth: 1,

    borderColor:
      "rgba(157, 190, 255, 0.22)",

    paddingHorizontal: 15,

    paddingVertical: 12,

    marginBottom: 20,
  },

  selectedRoleLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  selectedRoleName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 5,
  },

  changeRoleText: {
    color: "#60A5FA",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  // ==========================================================
  // INPUT CONTAINER
  // ==========================================================

  inputContainer: {
    position: "relative",
    marginBottom: 20,
  },

  // ==========================================================
  // LABEL
  // ==========================================================

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

  // ==========================================================
  // INPUT
  // ==========================================================

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

    height: 54,
  },

  passwordInputDirect: {
    width: "100%",

    height: 54,

    paddingRight: 75,
  },

  // ==========================================================
  // SHOW / HIDE
  // ==========================================================

  showButton: {
    position: "absolute",

    right: 0,

    top: 0,

    height: 54,

    width: 68,

    alignItems: "center",

    justifyContent: "center",

    zIndex: 50,

    elevation: 10,
  },

  showText: {
    color: "#9DBEFF",

    fontSize: 10,

    fontWeight: "800",

    letterSpacing: 0.8,
  },

  // ==========================================================
  // FORGOT PASSWORD
  // ==========================================================

  forgotButton: {
    alignSelf: "flex-end",

    marginTop: -1,

    marginBottom: 18,
  },

  forgotText: {
    color: "#60A5FA",

    fontSize: 11,

    fontWeight: "600",
  },

  // ==========================================================
  // BUTTON
  // ==========================================================

  loginButton: {
    height: 54,

    backgroundColor: "#2563EB",

    borderRadius: 14,

    flexDirection: "row",

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
  },

  loginButtonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
    color: "#FFFFFF",

    fontSize: 15,

    fontWeight: "800",

    letterSpacing: 0.8,
  },

  // ==========================================================
  // QR SCANNER
  // ==========================================================

  scannerButton: {
    width: 48,

    height: 48,

    borderRadius: 24,

    alignSelf: "center",

    marginTop: 18,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(37, 99, 235, 0.18)",

    borderWidth: 1,

    borderColor:
      "rgba(157, 190, 255, 0.45)",
  },

  scannerButtonText: {
    color: "#9DBEFF",

    fontSize: 30,

    fontWeight: "300",

    lineHeight: 32,
  },

  scannerHint: {
    textAlign: "center",

    color: "#64748B",

    fontSize: 9,

    fontWeight: "600",

    marginTop: 7,
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

    marginBottom: 10,
  },
});