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
  const [selectedRole, setSelectedRole] = useState(null); // "OWNER" | "OWNER_TRAINER"
  const [createAccountStep, setCreateAccountStep] = useState("select_role"); // "select_role" | "form"

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
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ==========================================================
  // LOADING
  // ==========================================================

  const [loading, setLoading] = useState(false);

  // ==========================================================
  // FOCUS STATES
  // ==========================================================

  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

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

  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const createUsernameRef = useRef(null);
  const createPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // ==========================================================
  // SWITCH MODE
  // ==========================================================

  const switchMode = (createAccount) => {
    setIsCreateAccount(createAccount);
    if (!createAccount) {
      setSelectedRole(null);
      setCreateAccountStep("select_role");
    }

    setShowPassword(false);
    setShowCreatePassword(false);
    setShowConfirmPassword(false);

    setLoading(false);

    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: 0,
          animated: false,
        });
      }
    }, 100);
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

      const response = await fetch(`${API_URL}/api/members/login/`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      // ======================================================
      // RESPONSE
      // ======================================================

      let data = {};

      try {
        data = await response.json();
      } catch (error) {
        console.log("Could not parse login response:", error);
      }

      console.log("LOGIN STATUS:", response.status);
      console.log("LOGIN RESPONSE:", data);

      // ======================================================
      // LOGIN SUCCESS
      // ======================================================

      if (response.ok && data.success) {
        // ====================================================
        // ADMIN / OWNER / TRAINER
        // ====================================================

        const rawRole = String(data.role || "").toUpperCase();
        const role =
          rawRole === "OWNER_TRAINER"
            ? "OWNER_TRAINER"
            : rawRole === "TRAINER"
            ? "TRAINER"
            : rawRole === "MEMBER"
            ? "MEMBER"
            : rawRole === "OWNER" || rawRole === "ADMIN"
            ? "OWNER"
            : rawRole;

        if (
          role === "OWNER" ||
          role === "OWNER_TRAINER" ||
          role === "TRAINER"
        ) {
          // --------------------------------------------------
          // TOKEN REQUIRED
          // --------------------------------------------------

          if (!data.token) {
            Alert.alert(
              "Login Error",
              "Login succeeded but no authentication token was received."
            );

            return;
          }

          // --------------------------------------------------
          // CLEAR OLD ADMIN SESSION
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
          // SAVE ADMIN TOKEN
          // --------------------------------------------------

          await AsyncStorage.setItem("adminToken", data.token);

          // --------------------------------------------------
          // SAVE USERNAME
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "adminUsername",
            data.username || username.trim()
          );

          // --------------------------------------------------
          // SAVE USER ID
          // --------------------------------------------------

          if (data.id !== undefined && data.id !== null) {
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
              data.workspace_name
            );
          }

          // --------------------------------------------------
          // DEBUG
          // --------------------------------------------------

          console.log("================================");
          console.log("STAFF LOGIN SUCCESS");
          console.log("USERNAME:", data.username);
          console.log("USER ID:", data.id);
          console.log("ROLE:", role);
          console.log("WORKSPACE:", data.workspace_name);
          console.log("TOKEN SAVED:", !!data.token);
          console.log("================================");

          // --------------------------------------------------
          // DASHBOARD ROUTING
          // --------------------------------------------------

          if (role === "OWNER_TRAINER") {
            router.replace("/admin/dashboard");
          } else if (role === "TRAINER") {
            router.replace("/trainer/dashboard");
          } else {
            router.replace("/admin/dashboard");
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

          if (data.id !== undefined && data.id !== null) {
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
            data.username || username.trim()
          );

          // --------------------------------------------------
          // SAVE MEMBER EMAIL
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberEmail",
            data.email ? String(data.email) : ""
          );

          // --------------------------------------------------
          // SAVE MEMBER PHONE
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberPhone",
            data.phone_number ||
              data.phone ||
              data.contact_number
              ? String(
                  data.phone_number ||
                    data.phone ||
                    data.contact_number
                )
              : ""
          );

          // --------------------------------------------------
          // SAVE MEMBER STATUS
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberStatus",
            data.status ? String(data.status) : ""
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
          // SAVE MEMBER AUTH TOKEN
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

          console.log("================================");
          console.log("MEMBER LOGIN SUCCESS");
          console.log(
            "NAME:",
            data.full_name || data.name
          );
          console.log("USERNAME:", data.username);
          console.log("MEMBER ID:", data.id);
          console.log("ROLE:", data.role);
          console.log("WORKSPACE:", data.workspace_name);
          console.log(
            "MEMBER TOKEN SAVED:",
            !!data.member_token
          );
          console.log(
            "PROFILE PICTURE:",
            data.profile_picture || "None"
          );
          console.log("================================");

          // --------------------------------------------------
          // MEMBER DASHBOARD
          // --------------------------------------------------

          router.replace("/member/dashboard");

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

      if (typeof data === "object") {
        if (data.non_field_errors) {
          errorMessage = Array.isArray(data.non_field_errors)
            ? data.non_field_errors.join("\n")
            : String(data.non_field_errors);
        }

        if (data.username) {
          errorMessage = Array.isArray(data.username)
            ? data.username.join("\n")
            : String(data.username);
        }

        if (data.password) {
          errorMessage = Array.isArray(data.password)
            ? data.password.join("\n")
            : String(data.password);
        }
      }

      Alert.alert(
        "Login Failed",
        errorMessage
      );
    } catch (error) {
      console.log("LOGIN ERROR:", error);

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

    if (createPassword !== confirmPassword) {
      Alert.alert(
        "Password Mismatch",
        "Password and confirm password do not match."
      );

      return;
    }

    try {
      setLoading(true);

      // ======================================================
      // CREATE ACCOUNT REQUEST
      // ======================================================

      const response = await fetch(
        `${API_URL}/api/members/register/`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim(),
            username: createUsername.trim(),
            password: createPassword,
            confirm_password: confirmPassword,
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

      if (response.ok && data.success) {
        Alert.alert(
          "Account Created",
          data.message ||
            "Your account has been created successfully.",
          [
            {
              text: "OK",

              onPress: () => {
                setFullName("");
                setEmail("");
                setCreateUsername("");
                setCreatePassword("");
                setConfirmPassword("");

                switchMode(false);
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

      if (typeof data === "object") {
        if (data.email) {
          errorMessage = Array.isArray(data.email)
            ? data.email.join("\n")
            : String(data.email);
        }

        if (data.username) {
          errorMessage = Array.isArray(data.username)
            ? data.username.join("\n")
            : String(data.username);
        }

        if (data.password) {
          errorMessage = Array.isArray(data.password)
            ? data.password.join("\n")
            : String(data.password);
        }

        if (data.non_field_errors) {
          errorMessage = Array.isArray(data.non_field_errors)
            ? data.non_field_errors.join("\n")
            : String(data.non_field_errors);
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
              : undefined
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
            showsVerticalScrollIndicator={false}
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
                  onPress={() => switchMode(false)}
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
                  onPress={() => switchMode(true)}
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
                  LOGIN CARD
              ================================================== */}

              {!isCreateAccount ? (
                <View style={styles.loginCard}>
                  {/* USERNAME */}

                  <View style={styles.inputContainer}>
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
                      value={username}
                      onChangeText={setUsername}
                      style={[
                        styles.input,
                        usernameFocused &&
                          styles.inputFocused,
                      ]}
                      placeholder=""
                      placeholderTextColor="#64748B"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      selectionColor="#9DBEFF"
                      onFocus={() =>
                        setUsernameFocused(true)
                      }
                      onBlur={() =>
                        setUsernameFocused(false)
                      }
                      onSubmitEditing={() => {
                        setPasswordFocused(true);
                      }}
                    />
                  </View>

                  {/* PASSWORD */}

                  <View style={styles.inputContainer}>
                    <Text
                      style={[
                        styles.floatingLabel,
                        passwordFocused &&
                          styles.floatingLabelFocused,
                      ]}
                    >
                      Password
                    </Text>

                    <View style={styles.passwordWrapper}>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        style={[
                          styles.input,
                          styles.passwordInputDirect,
                          passwordFocused &&
                            styles.inputFocused,
                        ]}
                        placeholder=""
                        placeholderTextColor="#64748B"
                        secureTextEntry={
                          !showPassword
                        }
                        autoCapitalize="none"
                        autoCorrect={false}
                        selectionColor="#9DBEFF"
                        onFocus={() =>
                          setPasswordFocused(true)
                        }
                        onBlur={() =>
                          setPasswordFocused(false)
                        }
                        onSubmitEditing={
                          handleLogin
                        }
                        returnKeyType="done"
                      />

                      <TouchableOpacity
                        style={styles.showButton}
                        onPress={() =>
                          setShowPassword(
                            !showPassword
                          )
                        }
                        disabled={loading}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={styles.showText}
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
                    style={styles.forgotButton}
                    onPress={handleForgotPassword}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={styles.forgotText}
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
                    onPress={handleLogin}
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

                  {/* QR SCANNER BUTTON */}

                  <TouchableOpacity
                    style={styles.scannerButton}
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
                    style={styles.scannerHint}
                  >
                    Scan gym QR to register
                  </Text>
                </View>
              ) : (
                // ==================================================
                // CREATE ACCOUNT CARD
                // ==================================================

                <View
                  style={[
                    styles.loginCard,
                    styles.createAccountCard,
                  ]}
                >
                  {/* FULL NAME */}

                  <View style={styles.inputContainer}>
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
                      ref={fullNameRef}
                      value={fullName}
                      onChangeText={setFullName}
                      style={[
                        styles.input,
                        fullNameFocused &&
                          styles.inputFocused,
                      ]}
                      placeholder=""
                      placeholderTextColor="#64748B"
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="next"
                      selectionColor="#9DBEFF"
                      onFocus={() =>
                        setFullNameFocused(true)
                      }
                      onBlur={() =>
                        setFullNameFocused(false)
                      }
                      onSubmitEditing={() =>
                        emailRef.current?.focus()
                      }
                    />
                  </View>

                  {/* EMAIL */}

                  <View style={styles.inputContainer}>
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
                      ref={emailRef}
                      value={email}
                      onChangeText={setEmail}
                      style={[
                        styles.input,
                        emailFocused &&
                          styles.inputFocused,
                      ]}
                      placeholder=""
                      placeholderTextColor="#64748B"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      selectionColor="#9DBEFF"
                      onFocus={() =>
                        setEmailFocused(true)
                      }
                      onBlur={() =>
                        setEmailFocused(false)
                      }
                      onSubmitEditing={() =>
                        createUsernameRef.current?.focus()
                      }
                    />
                  </View>

                  {/* USERNAME */}

                  <View style={styles.inputContainer}>
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
                      ref={createUsernameRef}
                      value={createUsername}
                      onChangeText={setCreateUsername}
                      style={[
                        styles.input,
                        createUsernameFocused &&
                          styles.inputFocused,
                      ]}
                      placeholder=""
                      placeholderTextColor="#64748B"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      selectionColor="#9DBEFF"
                      onFocus={() =>
                        setCreateUsernameFocused(
                          true
                        )
                      }
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

                  <View style={styles.inputContainer}>
                    <Text
                      style={[
                        styles.floatingLabel,
                        createPasswordFocused &&
                          styles.floatingLabelFocused,
                      ]}
                    >
                      Password
                    </Text>

                    <View style={styles.passwordWrapper}>
                      <TextInput
                        ref={createPasswordRef}
                        value={createPassword}
                        onChangeText={setCreatePassword}
                        style={[
                          styles.input,
                          styles.passwordInputDirect,
                          createPasswordFocused &&
                            styles.inputFocused,
                        ]}
                        placeholder=""
                        placeholderTextColor="#64748B"
                        secureTextEntry={
                          !showCreatePassword
                        }
                        autoCapitalize="none"
                        autoCorrect={false}
                        selectionColor="#9DBEFF"
                        returnKeyType="next"
                        onFocus={() =>
                          setCreatePasswordFocused(
                            true
                          )
                        }
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
                        style={styles.showButton}
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

                  <View style={styles.inputContainer}>
                    <Text
                      style={[
                        styles.floatingLabel,
                        confirmPasswordFocused &&
                          styles.floatingLabelFocused,
                      ]}
                    >
                      Confirm Password
                    </Text>

                    <View style={styles.passwordWrapper}>
                      <TextInput
                        ref={confirmPasswordRef}
                        value={confirmPassword}
                        onChangeText={
                          setConfirmPassword
                        }
                        style={[
                          styles.input,
                          styles.passwordInputDirect,
                          confirmPasswordFocused &&
                            styles.inputFocused,
                        ]}
                        placeholder=""
                        placeholderTextColor="#64748B"
                        secureTextEntry={
                          !showConfirmPassword
                        }
                        autoCapitalize="none"
                        autoCorrect={false}
                        selectionColor="#9DBEFF"
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
                        onSubmitEditing={
                          handleCreateAccount
                        }
                        blurOnSubmit={true}
                        returnKeyType="done"
                      />

                      <TouchableOpacity
                        style={styles.showButton}
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

                  {/* CREATE ACCOUNT BUTTON */}

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
  // ==========================================================
  // BACKGROUND
  // ==========================================================

  background: {
    flex: 1,
    backgroundColor: "#050816",
  },

  backgroundOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 8, 23, 0.34)",
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
    paddingBottom: 80,
  },

  createScrollContainer: {
    justifyContent: "center",
    paddingTop: 20,
    paddingBottom: 80,
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
    backgroundColor: "rgba(5, 15, 30, 0.45)",
    borderRadius: 14,
    padding: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(157, 190, 255, 0.25)",
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
    backgroundColor: "rgba(5, 15, 30, 0.40)",
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

    backgroundColor: "rgba(4, 14, 28, 0.90)",

    paddingHorizontal: 5,

    color: "#9DBEFF",
    fontSize: 13,
    fontWeight: "500",
  },

  floatingLabelFocused: {
    color: "#A8C7FF",
  },

  // ==========================================================
  // NORMAL INPUT
  // ==========================================================

  input: {
    height: 54,

    backgroundColor: "rgba(0, 0, 0, 0.08)",

    borderWidth: 2,
    borderColor: "#64748B",
    borderRadius: 5,

    paddingHorizontal: 16,

    color: "#FFFFFF",
    fontSize: 15,
  },

  inputFocused: {
    borderColor: "#9DBEFF",

    backgroundColor: "rgba(0, 0, 0, 0.04)",

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
  // PASSWORD WRAPPER
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
  // SHOW / HIDE BUTTON
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
  // LOGIN BUTTON
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
  // QR SCANNER BUTTON
  // ==========================================================

  scannerButton: {
    width: 48,
    height: 48,

    borderRadius: 24,

    alignSelf: "center",

    marginTop: 18,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(37, 99, 235, 0.18)",

    borderWidth: 1,

    borderColor: "rgba(157, 190, 255, 0.45)",
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
    marginBottom: 2,
  },
});