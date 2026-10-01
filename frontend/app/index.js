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

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../context/ThemeContext";


// ============================================================
// API
// ============================================================

const API_URL = "http://192.168.1.43:8000";


// ============================================================
// LOGIN SCREEN
// ============================================================

export default function LoginScreen() {

  const { colors } = useTheme();

  // ==========================================================
  // MODE
  // ==========================================================

  const [isCreateAccount, setIsCreateAccount] = useState(false);


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


        // ====================================================
        // NORMALIZE ROLE
        // ====================================================

        const normalizedRole =
          String(data.role || "")
            .trim()
            .toUpperCase();


        console.log(
          "NORMALIZED ROLE:",
          normalizedRole
        );


        // ====================================================
        // OWNER / TRAINER / OWNER + TRAINER
        // ====================================================

        if (
          normalizedRole === "ADMIN" ||
          normalizedRole === "OWNER" ||
          normalizedRole === "TRAINER" ||
          normalizedRole === "OWNER_TRAINER"
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

          await AsyncStorage.setItem(
            "adminToken",
            String(data.token)
          );


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
            String(data.role || "")
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
            "ADMIN / STAFF LOGIN SUCCESS"
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
            data.role
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
         // ROLE-BASED DASHBOARD
        // --------------------------------------------------

        if (normalizedRole === "OWNER_TRAINER") {
          
          router.replace(
            "/owner-trainer/dashboard"
          );
        
        } else if (normalizedRole === "TRAINER") {
          router.replace(
            "/trainer/dashboard"
          );
        
        } else if (
          normalizedRole === "OWNER" ||
          normalizedRole === "ADMIN"
        ) {
          
          router.replace(
            "/admin/dashboard"
          );
        
        } else {
          
          Alert.alert(
            "Login Error",
            `Unknown staff role: ${normalizedRole}`
          );
          
          return;
        }
        
        return;

        }


        // ====================================================
        // MEMBER LOGIN
        // ====================================================

        if (normalizedRole === "MEMBER") {


          // --------------------------------------------------
          // MEMBER TOKEN REQUIRED
          // --------------------------------------------------

          if (!data.member_token) {

            console.log(
              "MEMBER LOGIN ERROR: member_token missing"
            );

            Alert.alert(
              "Login Error",
              "Login succeeded but no member authentication token was received."
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
          // SAVE MEMBER AUTH TOKEN
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberToken",
            String(data.member_token)
          );


          // --------------------------------------------------
          // SAVE MEMBER PROFILE PICTURE
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberProfilePicture",
            data.profile_picture
              ? String(data.profile_picture)
              : ""
          );


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
            data.name ||
              data.full_name ||
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

          if (data.email) {

            await AsyncStorage.setItem(
              "memberEmail",
              String(data.email)
            );

          } else {

            await AsyncStorage.setItem(
              "memberEmail",
              ""
            );

          }


          // --------------------------------------------------
          // SAVE MEMBER PHONE
          // --------------------------------------------------

          const memberPhone =
            data.phone ||
            data.phone_number ||
            data.contact_number ||
            "";

          await AsyncStorage.setItem(
            "memberPhone",
            String(memberPhone)
          );


          // --------------------------------------------------
          // SAVE MEMBERSHIP STATUS
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberStatus",
            data.status
              ? String(data.status)
              : "ACTIVE"
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
          // SAVE MEMBER WORKSPACE ID
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
          // SAVE MEMBER WORKSPACE NAME
          // --------------------------------------------------

          await AsyncStorage.setItem(
            "memberWorkspaceName",
            data.workspace_name
              ? String(data.workspace_name)
              : "Your Gym"
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
            "MEMBER ID:",
            data.id
          );

          console.log(
            "MEMBER NAME:",
            data.name ||
              data.full_name
          );

          console.log(
            "MEMBER USERNAME:",
            data.username
          );

          console.log(
            "MEMBER EMAIL:",
            data.email
          );

          console.log(
            "MEMBER PHONE:",
            memberPhone
          );

          console.log(
            "MEMBER STATUS:",
            data.status
          );

          console.log(
            "MEMBERSHIP START:",
            data.membership_start
          );

          console.log(
            "MEMBERSHIP END:",
            data.membership_end
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


          // --------------------------------------------------
          // GO TO MEMBER DASHBOARD
          // --------------------------------------------------

          router.replace(
            "/member/dashboard"
          );

          return;
        }


        // ====================================================
        // UNKNOWN ROLE
        // ====================================================

        console.log(
          "UNKNOWN ROLE RECEIVED:",
          data.role
        );

        Alert.alert(
          "Login Error",
          `Unknown account type received from server.\n\nRole: ${data.role || "Not provided"}`
        );

        return;
      }


      // ======================================================
      // LOGIN FAILED
      // ======================================================

      let errorMessage =
        data.detail ||
        data.message ||
        "Invalid username or password.";


      if (
        typeof data === "object" &&
        data !== null
      ) {

        if (data.non_field_errors) {

          errorMessage =
            Array.isArray(
              data.non_field_errors
            )
              ? data.non_field_errors.join("\n")
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
        "================================"
      );

      console.log(
        "LOGIN ERROR:",
        error
      );

      console.log(
        "================================"
      );


      Alert.alert(
        "Connection Error",
        "Could not connect to GymRyt server.\n\nMake sure Django is running and your phone is connected to the same Wi-Fi."
      );


    } finally {

      setLoading(false);

    }

  };


  // ==========================================================
  // CREATE ADMIN ACCOUNT
  // ==========================================================

  const handleCreateAccount = async () => {

    if (
      !fullName.trim() ||
      !email.trim() ||
      !createUsername.trim() ||
      !createPassword ||
      !confirmPassword
    ) {

      Alert.alert(
        "Missing Information",
        "Please fill in all the required fields."
      );

      return;
    }


    if (
      createPassword !== confirmPassword
    ) {

      Alert.alert(
        "Password Error",
        "Passwords do not match."
      );

      return;
    }


    if (
      createPassword.length < 6
    ) {

      Alert.alert(
        "Password Error",
        "Password must be at least 6 characters."
      );

      return;
    }


    try {

      setLoading(true);


      // ======================================================
      // CREATE ACCOUNT REQUEST
      // ======================================================

      const response = await fetch(
        `${API_URL}/api/members/admin/register/`,
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
      // SUCCESS
      // ======================================================

      if (
        response.ok &&
        data.success
      ) {

        const createdUsername =
          createUsername.trim();


        Alert.alert(
          "Account Created",
          "Your GymRyt admin account has been created successfully. Please login to continue.",
          [
            {
              text: "LOGIN",

              onPress: () => {

                setUsername(
                  createdUsername
                );

                setPassword("");

                setFullName("");

                setEmail("");

                setCreateUsername("");

                setCreatePassword("");

                setConfirmPassword("");

                setIsCreateAccount(false);

              },
            },
          ]
        );


        return;
      }


      // ======================================================
      // FAILED
      // ======================================================

      Alert.alert(
        "Account Creation Failed",
        data.detail ||
          data.message ||
          "Could not create the account."
      );


    } catch (error) {

      console.log(
        "REGISTRATION ERROR:",
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

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <ImageBackground
      source={require(
        "../assets/images/gymryt-bg.png"
      )}
      style={styles.background}
      resizeMode="cover"
    >
      <View
        style={styles.backgroundOverlay}
      >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior="padding"
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
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={
            Platform.OS === "ios"
              ? "interactive"
              : "on-drag"
          }
          showsVerticalScrollIndicator={
            false
          }
          automaticallyAdjustKeyboardInsets={
            true
          }
          contentInsetAdjustmentBehavior="automatic"
          nestedScrollEnabled={true}
        >
          <View
            style={styles.content}
          >

            {/* ==================================================
                LOGO
            ================================================== */}

            <View
              style={styles.logoContainer}
            >
              <Image
                source={require(
                  "../assets/images/gymryt-logo.png"
                )}
                style={[
                  styles.logo,
                  isCreateAccount &&
                    styles.createLogo,
                ]}
                resizeMode="contain"
              />

              <Text
                style={[
                  styles.eyebrow,
                  {
                    color:
                      colors.primaryLight,
                  },
                ]}
              >
                {isCreateAccount
                  ? "GYMRYT • NEW GYM"
                  : "GYMRYT • WELCOME BACK"}
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
                {isCreateAccount
                  ? "Create Account"
                  : "Login to GymRyt"}
              </Text>
            </View>

            {/* ==================================================
                MODE SWITCH
            ================================================== */}

            <View
              style={[
                styles.modeSwitch,
                {
                  backgroundColor:
                    colors.card,
                  borderColor:
                    colors.border,
                },
              ]}
            >

              {/* LOGIN */}

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  !isCreateAccount && {
                    backgroundColor:
                      colors.iconBackground,
                    borderColor:
                      colors.primaryLight,
                  },
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
                    {
                      color:
                        !isCreateAccount
                          ? colors.primaryLight
                          : colors.secondaryText,
                    },
                  ]}
                >
                  LOGIN
                </Text>
              </TouchableOpacity>

              {/* CREATE ACCOUNT */}

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  isCreateAccount && {
                    backgroundColor:
                      colors.iconBackground,
                    borderColor:
                      colors.primaryLight,
                  },
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
                    {
                      color:
                        isCreateAccount
                          ? colors.primaryLight
                          : colors.secondaryText,
                    },
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

              <View
                style={[
                  styles.loginCard,
                  {
                    backgroundColor:
                      colors.card,
                    borderColor:
                      colors.border,
                  },
                ]}
              >

                {/* ==================================================
                    USERNAME
                ================================================== */}

                <FormField
                  icon="person-outline"
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
                    placeholder=""
                    placeholderTextColor="transparent"
                    returnKeyType="next"
                    onFocus={() =>
                      setUsernameFocused(true)
                    }
                    onBlur={() =>
                      setUsernameFocused(false)
                    }
                    selectionColor={
                      colors.primaryLight
                    }
                    blurOnSubmit={false}
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
                    placeholder=""
                    placeholderTextColor="transparent"
                    returnKeyType="done"
                    onFocus={() =>
                      setPasswordFocused(true)
                    }
                    onBlur={() =>
                      setPasswordFocused(false)
                    }
                    selectionColor={
                      colors.primaryLight
                    }
                    onSubmitEditing={
                      handleLogin
                    }
                  />

                  {/* SHOW / HIDE */}

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
                    FORGOT PASSWORD
                ================================================== */}

                <TouchableOpacity
                  style={
                    styles.forgotButton
                  }
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.forgotText,
                      {
                        color:
                          colors.primaryLight,
                      },
                    ]}
                  >
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                {/* ==================================================
                    LOGIN BUTTON
                ================================================== */}

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    {
                      backgroundColor:
                        colors.primary,
                    },
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
                    <>
                      <Ionicons
                        name="log-in-outline"
                        size={19}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.loginButtonText
                        }
                      >
                        LOGIN
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* ==================================================
                    MEMBER QR SCANNER
                ================================================== */}

                <TouchableOpacity
                  style={[
                    styles.scannerButton,
                    {
                      backgroundColor:
                        colors.background,
                      borderColor:
                        colors.border,
                    },
                  ]}
                  onPress={() =>
                    router.push(
                      "/scanner"
                    )
                  }
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.scannerIcon,
                      {
                        backgroundColor:
                          colors.iconBackground,
                      },
                    ]}
                  >
                    <Ionicons
                      name="qr-code-outline"
                      size={21}
                      color={
                        colors.primaryLight
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.scannerTextContainer
                    }
                  >
                    <Text
                      style={[
                        styles.scannerButtonText,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                    >
                      Scan Gym QR
                    </Text>

                    <Text
                      style={[
                        styles.scannerHint,
                        {
                          color:
                            colors.secondaryText,
                        },
                      ]}
                    >
                      Scan gym QR to register
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={
                      colors.secondaryText
                    }
                  />
                </TouchableOpacity>
              </View>

            ) : (

              /* ==================================================
                  CREATE ACCOUNT
              ================================================== */

              <View
                style={[
                  styles.loginCard,
                  {
                    backgroundColor:
                      colors.card,
                    borderColor:
                      colors.border,
                  },
                ]}
              >

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
                    ref={fullNameRef}
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
                    placeholder=""
                    placeholderTextColor="transparent"
                    returnKeyType="next"
                    onFocus={() =>
                      setFullNameFocused(true)
                    }
                    onBlur={() =>
                      setFullNameFocused(false)
                    }
                    selectionColor={
                      colors.primaryLight
                    }
                    onSubmitEditing={() =>
                      emailRef.current?.focus()
                    }
                    blurOnSubmit={false}
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
                    ref={emailRef}
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
                    placeholder=""
                    placeholderTextColor="transparent"
                    returnKeyType="next"
                    onFocus={() =>
                      setEmailFocused(true)
                    }
                    onBlur={() =>
                      setEmailFocused(false)
                    }
                    selectionColor={
                      colors.primaryLight
                    }
                    onSubmitEditing={() =>
                      createUsernameRef.current?.focus()
                    }
                    blurOnSubmit={false}
                  />
                </FormField>

                {/* ==================================================
                    USERNAME
                ================================================== */}

                <FormField
                  icon="at-outline"
                  label="USERNAME"
                  focused={createUsernameFocused}
                  colors={colors}
                >
                  <TextInput
                    ref={
                      createUsernameRef
                    }
                    style={[
                      styles.input,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                    value={
                      createUsername
                    }
                    onChangeText={
                      setCreateUsername
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    placeholder=""
                    placeholderTextColor="transparent"
                    returnKeyType="next"
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
                    selectionColor={
                      colors.primaryLight
                    }
                    onSubmitEditing={() =>
                      createPasswordRef.current?.focus()
                    }
                    blurOnSubmit={false}
                  />
                </FormField>

                {/* ==================================================
                    CREATE PASSWORD
                ================================================== */}

                <FormField
                  icon="lock-closed-outline"
                  label="PASSWORD"
                  focused={createPasswordFocused}
                  colors={colors}
                >
                  <TextInput
                    ref={
                      createPasswordRef
                    }
                    style={[
                      styles.input,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                    value={
                      createPassword
                    }
                    onChangeText={
                      setCreatePassword
                    }
                    secureTextEntry={
                      !showCreatePassword
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    placeholder=""
                    placeholderTextColor="transparent"
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
                    selectionColor={
                      colors.primaryLight
                    }
                    onSubmitEditing={() =>
                      confirmPasswordRef.current?.focus()
                    }
                    blurOnSubmit={false}
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
                    <Ionicons
                      name={
                        showCreatePassword
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
                    ref={
                      confirmPasswordRef
                    }
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
                    placeholder=""
                    placeholderTextColor="transparent"
                    returnKeyType="done"
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
                    CREATE ACCOUNT BUTTON
                ================================================== */}

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    {
                      backgroundColor:
                        colors.primary,
                    },
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
                    <>
                      <Ionicons
                        name="person-add-outline"
                        size={18}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.loginButtonText
                        }
                      >
                        CREATE ACCOUNT
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ==================================================
                FOOTER
            ================================================== */}

            <View
              style={styles.footerRow}
            >
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
    </ImageBackground>
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
      style={styles.inputContainer}
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

  // ==========================================================
  // BACKGROUND
  // ==========================================================

  background: {
    flex: 1,
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
    paddingHorizontal: 18,
    paddingTop:
      Platform.OS === "ios"
        ? 54
        : 44,
    paddingBottom: 40,
  },

  createScrollContainer: {
    justifyContent: "flex-start",
  },

  // ==========================================================
  // CONTENT
  // ==========================================================

  content: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
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
  // LOGO
  // ==========================================================

  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },

  logo: {
    width: 220,
    height: 160,
  },

  createLogo: {
    width: 150,
    height: 110,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginTop: 8,
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },

  // ==========================================================
  // MODE SWITCH
  // ==========================================================

  modeSwitch: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 18,
    padding: 5,
    marginBottom: 14,
  },

  modeButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  modeButtonText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // ==========================================================
  // CARD
  // ==========================================================

  loginCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
  },

  // ==========================================================
  // INPUT
  // ==========================================================

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

  // ==========================================================
  // FORGOT PASSWORD
  // ==========================================================

  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    marginBottom: 12,
  },

  forgotText: {
    fontSize: 10,
    fontWeight: "800",
  },

  // ==========================================================
  // BUTTONS
  // ==========================================================

  loginButton: {
    height: 54,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  loginButtonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },

  scannerButton: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  scannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  scannerTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  scannerButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },

  scannerHint: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
  },

  // ==========================================================
  // FOOTER
  // ==========================================================

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