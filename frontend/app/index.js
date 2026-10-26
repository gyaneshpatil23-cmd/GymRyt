import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";

import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  BackHandler,
  useWindowDimensions,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { crest } from "../constants/brand";
import { SERVER_URL } from "../constants/api";


// ============================================================
// API
// ============================================================

const API_URL = SERVER_URL;


// ============================================================
// LOGIN SCREEN
// ============================================================

export default function LoginScreen() {

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // ==========================================================
  // STAGE
  // ==========================================================

  // "welcome" → intro slides, "choose" → join or register a gym,
  // "form" → login or create account

  const [stage, setStage] = useState("welcome");
  const [slide, setSlide] = useState(0);

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
  // NAVIGATION BETWEEN STAGES
  // ==========================================================

  const openForm = (createAccount) => {
    switchMode(createAccount);
    setStage("form");
  };

  const goBack = () => {
    if (stage === "form" && isCreateAccount) {
      setStage("choose");
    } else {
      setStage("welcome");
    }
  };


  // ==========================================================
  // ANDROID BACK BUTTON
  // ==========================================================

  useEffect(() => {

    if (stage === "welcome") {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setStage(
          stage === "form" && isCreateAccount
            ? "choose"
            : "welcome"
        );
        return true;
      }
    );

    return () => subscription.remove();

  }, [stage, isCreateAccount]);


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View style={styles.screen}>

      <StatusBar style="light" />

      {/* ==================================================
          BACKGROUND
      ================================================== */}

      <Image
        source={require(
          "../assets/images/crest-login-background.jpg"
        )}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <LinearGradient
        colors={[
          "rgba(15, 11, 31, 0)",
          "rgba(15, 11, 31, 0.6)",
          crest.bg,
        ]}
        locations={[0.35, 0.6, 0.9]}
        style={StyleSheet.absoluteFill}
      />

      {stage === "form" && (
        <View style={styles.formDim} />
      )}

      {stage === "form"
        ? renderForm()
        : renderIntro()}
    </View>
  );


  // ==========================================================
  // WELCOME + CHOOSE
  // ==========================================================

  function renderIntro() {
    return (
      <View
        style={[
          styles.introContainer,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 28,
          },
        ]}
      >
        <Wordmark size={22} />

        <View style={styles.introSpacer} />

        {stage === "welcome"
          ? renderWelcome()
          : renderChoose()}
      </View>
    );
  }


  // ==========================================================
  // WELCOME
  // ==========================================================

  function renderWelcome() {
    return (
      <>

        {/* SLIDES */}

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            setSlide(
              Math.round(
                event.nativeEvent.contentOffset.x / width
              )
            )
          }
          style={styles.slides}
        >
          {SLIDES.map((item) => (
            <View
              key={item.title}
              style={[styles.slide, { width }]}
            >
              <Text style={styles.headline}>
                {item.title}
                {"\n"}
                <Text style={styles.headlineAccent}>
                  {item.accent}
                </Text>
              </Text>

              <Text style={styles.slideBody}>
                {item.body}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* PAGER */}

        <View style={styles.pager}>
          {SLIDES.map((item, index) => (
            <View
              key={item.title}
              style={[
                styles.pagerDot,
                index === slide && styles.pagerDotActive,
              ]}
            />
          ))}
        </View>

        {/* ACTIONS */}

        <View style={styles.actions}>
          <CrestButton
            label="Get started"
            onPress={() => setStage("choose")}
          />

          <CrestButton
            label="I have an account"
            variant="outline"
            onPress={() => openForm(false)}
          />
        </View>
      </>
    );
  }


  // ==========================================================
  // CHOOSE: JOIN A GYM OR REGISTER ONE
  // ==========================================================

  function renderChoose() {
    return (
      <View style={styles.chooseContainer}>
        <Text style={styles.chooseTitle}>
          How are you joining?
        </Text>

        <OptionCard
          icon="qr-code-outline"
          title="Join my gym"
          hint="Scan the QR code at your gym to sign up as a member"
          onPress={() => router.push("/scanner")}
        />

        <OptionCard
          icon="business-outline"
          title="Register my gym"
          hint="Create the owner account for your gym"
          onPress={() => openForm(true)}
        />

        <Pressable
          style={styles.textLink}
          onPress={() => setStage("welcome")}
          hitSlop={8}
        >
          <Text style={styles.textLinkMuted}>
            Back
          </Text>
        </Pressable>
      </View>
    );
  }


  // ==========================================================
  // LOGIN / CREATE ACCOUNT FORM
  // ==========================================================

  function renderForm() {
    return (
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
            {
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 32,
            },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={
            Platform.OS === "ios"
              ? "interactive"
              : "on-drag"
          }
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true}
          nestedScrollEnabled={true}
        >
          <View style={styles.content}>

            {/* ==================================================
                TOP BAR
            ================================================== */}

            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
              onPress={goBack}
              disabled={loading}
              hitSlop={6}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={crest.text}
              />
            </Pressable>

            {/* ==================================================
                HEADER
            ================================================== */}

            <View style={styles.header}>
              <Image
                source={require(
                  "../assets/images/crest-logo-small.png"
                )}
                style={styles.crest}
                resizeMode="contain"
              />

              <Text style={styles.formTitle}>
                {isCreateAccount
                  ? "Register your gym"
                  : "Welcome back"}
              </Text>

              <Text style={styles.formSubtitle}>
                {isCreateAccount
                  ? "Create the owner account for your gym."
                  : "Log in to your GymRyt account."}
              </Text>
            </View>

            {/* ==================================================
                LOGIN
            ================================================== */}

            {!isCreateAccount ? (

              <View style={styles.card}>

                <FormField
                  icon="person-outline"
                  label="Username"
                  focused={usernameFocused}
                >
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="next"
                    onFocus={() => setUsernameFocused(true)}
                    onBlur={() => setUsernameFocused(false)}
                    selectionColor={crest.brand}
                    blurOnSubmit={false}
                  />
                </FormField>

                <FormField
                  icon="lock-closed-outline"
                  label="Password"
                  focused={passwordFocused}
                >
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="done"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    selectionColor={crest.brand}
                    onSubmitEditing={handleLogin}
                  />

                  <ShowPasswordToggle
                    visible={showPassword}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  />
                </FormField>

                <Pressable
                  style={styles.forgotButton}
                  disabled={loading}
                  hitSlop={8}
                >
                  <Text style={styles.linkText}>
                    Forgot password?
                  </Text>
                </Pressable>

                <CrestButton
                  label="Log in"
                  onPress={handleLogin}
                  loading={loading}
                />
              </View>

            ) : (

              /* ==================================================
                  CREATE ACCOUNT
              ================================================== */

              <View style={styles.card}>

                <FormField
                  icon="person-outline"
                  label="Full name"
                  focused={fullNameFocused}
                >
                  <TextInput
                    ref={fullNameRef}
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="next"
                    onFocus={() => setFullNameFocused(true)}
                    onBlur={() => setFullNameFocused(false)}
                    selectionColor={crest.brand}
                    onSubmitEditing={() => emailRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </FormField>

                <FormField
                  icon="mail-outline"
                  label="Email"
                  focused={emailFocused}
                >
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="next"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    selectionColor={crest.brand}
                    onSubmitEditing={() =>
                      createUsernameRef.current?.focus()
                    }
                    blurOnSubmit={false}
                  />
                </FormField>

                <FormField
                  icon="at-outline"
                  label="Username"
                  focused={createUsernameFocused}
                >
                  <TextInput
                    ref={createUsernameRef}
                    style={styles.input}
                    value={createUsername}
                    onChangeText={setCreateUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="next"
                    onFocus={() => setCreateUsernameFocused(true)}
                    onBlur={() => setCreateUsernameFocused(false)}
                    selectionColor={crest.brand}
                    onSubmitEditing={() =>
                      createPasswordRef.current?.focus()
                    }
                    blurOnSubmit={false}
                  />
                </FormField>

                <FormField
                  icon="lock-closed-outline"
                  label="Password"
                  focused={createPasswordFocused}
                >
                  <TextInput
                    ref={createPasswordRef}
                    style={styles.input}
                    value={createPassword}
                    onChangeText={setCreatePassword}
                    secureTextEntry={!showCreatePassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="next"
                    onFocus={() => setCreatePasswordFocused(true)}
                    onBlur={() => setCreatePasswordFocused(false)}
                    selectionColor={crest.brand}
                    onSubmitEditing={() =>
                      confirmPasswordRef.current?.focus()
                    }
                    blurOnSubmit={false}
                  />

                  <ShowPasswordToggle
                    visible={showCreatePassword}
                    onPress={() =>
                      setShowCreatePassword(!showCreatePassword)
                    }
                    disabled={loading}
                  />
                </FormField>

                <FormField
                  icon="shield-checkmark-outline"
                  label="Confirm password"
                  focused={confirmPasswordFocused}
                >
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="done"
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    selectionColor={crest.brand}
                    onSubmitEditing={handleCreateAccount}
                    blurOnSubmit={true}
                  />

                  <ShowPasswordToggle
                    visible={showConfirmPassword}
                    onPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    disabled={loading}
                  />
                </FormField>

                <CrestButton
                  label="Create account"
                  onPress={handleCreateAccount}
                  loading={loading}
                />
              </View>
            )}

            {/* ==================================================
                BELOW CARD
            ================================================== */}

            {!isCreateAccount ? (

              <OptionCard
                icon="qr-code-outline"
                title="New member?"
                hint="Scan your gym's QR code to sign up"
                onPress={() => router.push("/scanner")}
                disabled={loading}
              />

            ) : (

              <Pressable
                style={styles.textLink}
                onPress={() => switchMode(false)}
                disabled={loading}
                hitSlop={8}
              >
                <Text style={styles.textLinkMuted}>
                  Already have an account?{" "}
                  <Text style={styles.linkText}>Log in</Text>
                </Text>
              </Pressable>
            )}

            <Text style={styles.tagline}>
              STRONGER EVERY DAY
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
}


// ============================================================
// WELCOME SLIDES
// ============================================================

const SLIDES = [
  {
    title: "Your club.",
    accent: "Your crest.",
    body: "Check in, book classes and track every workout at your gym.",
  },
  {
    title: "Train with",
    accent: "your coach.",
    body: "Get workout plans from your trainer and log every set.",
  },
  {
    title: "Stronger",
    accent: "every day.",
    body: "Attendance, payments and reminders, all in one place.",
  },
];


// ============================================================
// WORDMARK
// ============================================================

function Wordmark({ size }) {
  return (
    <Text
      style={[
        styles.wordmark,
        { fontSize: size },
      ]}
    >
      GYM
      <Text style={styles.wordmarkAccent}>RYT</Text>
    </Text>
  );
}


// ============================================================
// BUTTON
// ============================================================

function CrestButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
}) {
  const outline = variant === "outline";

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        outline ? styles.buttonOutline : styles.buttonPrimary,
        pressed && (
          outline
            ? styles.buttonOutlinePressed
            : styles.buttonPrimaryPressed
        ),
        pressed && styles.buttonPressed,
        loading && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={crest.text}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            outline && styles.buttonOutlineText,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}


// ============================================================
// OPTION CARD
// ============================================================

function OptionCard({
  icon,
  title,
  hint,
  onPress,
  disabled,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.option,
        pressed && styles.optionPressed,
      ]}
    >
      <View style={styles.optionIcon}>
        <Ionicons
          name={icon}
          size={22}
          color={crest.brand}
        />
      </View>

      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionHint}>{hint}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={crest.textMuted}
      />
    </Pressable>
  );
}


// ============================================================
// FORM FIELD
// ============================================================

function FormField({
  icon,
  label,
  focused,
  children,
}) {
  return (
    <View style={styles.inputContainer}>
      <Text
        style={[
          styles.inputLabel,
          focused && { color: crest.brand },
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={focused ? crest.brand : crest.textMuted}
        />

        {children}
      </View>
    </View>
  );
}


// ============================================================
// SHOW / HIDE PASSWORD
// ============================================================

function ShowPasswordToggle({
  visible,
  onPress,
  disabled,
}) {
  return (
    <Pressable
      style={styles.showButton}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
    >
      <Ionicons
        name={visible ? "eye-off-outline" : "eye-outline"}
        size={19}
        color={crest.textSecondary}
      />
    </Pressable>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  // ==========================================================
  // SCREEN
  // ==========================================================

  screen: {
    flex: 1,
    backgroundColor: crest.bg,
  },

  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  formDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 11, 31, 0.82)",
  },

  // ==========================================================
  // WORDMARK
  // ==========================================================

  wordmark: {
    color: crest.text,
    fontWeight: "900",
    letterSpacing: 1.5,
    textAlign: "center",
  },

  wordmarkAccent: {
    color: crest.gold,
  },

  // ==========================================================
  // WELCOME
  // ==========================================================

  introContainer: {
    flex: 1,
  },

  introSpacer: {
    flex: 1,
  },

  slides: {
    flexGrow: 0,
  },

  slide: {
    paddingHorizontal: 24,
  },

  headline: {
    color: crest.text,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  headlineAccent: {
    color: crest.gold,
  },

  slideBody: {
    color: crest.text,
    opacity: 0.85,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 340,
  },

  pager: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 28,
  },

  pagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: crest.textMuted,
  },

  pagerDotActive: {
    width: 22,
    backgroundColor: crest.gold,
  },

  actions: {
    paddingHorizontal: 24,
    gap: 12,
  },

  // ==========================================================
  // CHOOSE
  // ==========================================================

  chooseContainer: {
    paddingHorizontal: 24,
  },

  chooseTitle: {
    color: crest.text,
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 18,
  },

  // ==========================================================
  // BUTTONS
  // ==========================================================

  button: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonPrimary: {
    backgroundColor: crest.primary,
  },

  buttonPrimaryPressed: {
    backgroundColor: crest.primaryHover,
  },

  buttonOutline: {
    borderWidth: 1,
    borderColor: crest.gold,
    backgroundColor: "rgba(15, 11, 31, 0.6)",
  },

  buttonOutlinePressed: {
    backgroundColor: "rgba(233, 185, 73, 0.12)",
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: crest.text,
    fontSize: 16,
    fontWeight: "700",
  },

  buttonOutlineText: {
    color: crest.gold,
  },

  // ==========================================================
  // OPTION CARD
  // ==========================================================

  option: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: crest.border,
    borderRadius: 16,
    backgroundColor: crest.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  optionPressed: {
    backgroundColor: crest.surfaceRaised,
  },

  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: crest.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },

  optionText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  optionTitle: {
    color: crest.text,
    fontSize: 15,
    fontWeight: "700",
  },

  optionHint: {
    color: crest.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },

  // ==========================================================
  // LINKS
  // ==========================================================

  textLink: {
    alignSelf: "center",
    paddingVertical: 10,
  },

  textLinkMuted: {
    color: crest.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },

  linkText: {
    color: crest.brand,
    fontSize: 14,
    fontWeight: "700",
  },

  // ==========================================================
  // FORM LAYOUT
  // ==========================================================

  keyboardContainer: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },

  content: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: crest.border,
    backgroundColor: crest.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonPressed: {
    backgroundColor: crest.surfaceRaised,
  },

  header: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },

  crest: {
    width: 60,
    height: 72,
  },

  formTitle: {
    color: crest.text,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 16,
  },

  formSubtitle: {
    color: crest.textSecondary,
    fontSize: 15,
    marginTop: 6,
  },

  card: {
    borderWidth: 1,
    borderColor: crest.border,
    borderRadius: 20,
    backgroundColor: crest.surface,
    padding: 18,
    marginBottom: 14,
  },

  // ==========================================================
  // INPUT
  // ==========================================================

  inputContainer: {
    marginBottom: 16,
  },

  inputLabel: {
    color: crest.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },

  inputRow: {
    height: 52,
    borderWidth: 1,
    borderColor: crest.border,
    borderRadius: 14,
    backgroundColor: crest.bg,
    paddingLeft: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  inputRowFocused: {
    borderColor: crest.primary,
  },

  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 10,
    color: crest.text,
    fontSize: 15,
  },

  showButton: {
    height: "100%",
    paddingHorizontal: 14,
    justifyContent: "center",
  },

  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 2,
    marginTop: -4,
    marginBottom: 18,
  },

  // ==========================================================
  // FOOTER
  // ==========================================================

  tagline: {
    color: crest.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
    marginTop: 18,
  },
});
