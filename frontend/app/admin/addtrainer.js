import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

const API_URL = "http://192.168.1.43:8000";

export default function AddTrainer() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleAddTrainer = async () => {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      Alert.alert("Missing Information", "Please enter trainer name.");
      return;
    }

    if (!trimmedUsername) {
      Alert.alert("Missing Information", "Please enter username.");
      return;
    }

    if (!trimmedEmail) {
      Alert.alert("Missing Information", "Please enter email.");
      return;
    }

    if (!password) {
      Alert.alert("Missing Information", "Please enter password.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Invalid Password",
        "Password must be at least 6 characters."
      );
      return;
    }

    if (!confirmPassword) {
      Alert.alert(
        "Missing Information",
        "Please confirm the password."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Password Mismatch",
        "Password and confirm password do not match."
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address."
      );
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("adminToken");

      if (!token) {
        Alert.alert(
          "Session Expired",
          "Please login again."
        );
        router.replace("/");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/members/trainers/create/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({
            name: trimmedName,
            username: trimmedUsername,
            email: trimmedEmail,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Unable to Add Trainer",
          data.message ||
            "Something went wrong while creating the trainer."
        );
        return;
      }

      Alert.alert(
        "Trainer Added",
        `${trimmedName} has been added successfully.`,
        [
          {
            text: "OK",
            onPress: () => {
              router.back();
            },
          },
        ]
      );

      setName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.log("Add trainer error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to connect to the server. Make sure Django is running and your phone is connected to the same Wi-Fi."
      );
    } finally {
      setLoading(false);
    }
  };

  const headerButton = [
    styles.headerButton,
    { backgroundColor: colors.card, borderColor: colors.border },
  ];

  const inputRow = [
    styles.inputRow,
    { backgroundColor: colors.background, borderColor: colors.border },
  ];

  const labelStyle = [styles.label, { color: colors.secondaryText }];

  const inputStyle = [styles.input, { color: colors.text }];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.eyebrow, { color: colors.primaryLight }]}>
              GYMRYT • GYM STAFF
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Add Trainer
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={headerButton}
              onPress={toggleTheme}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={headerButton}
              onPress={() => router.back()}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* FORM CARD */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionEyebrow, { color: colors.primaryLight }]}>
            NEW ACCOUNT
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Trainer Information
          </Text>

          {/* NAME */}
          <View style={styles.inputContainer}>
            <Text style={labelStyle}>FULL NAME</Text>

            <View style={inputRow}>
              <Ionicons name="person-outline" size={18} color={colors.primaryLight} />
              <TextInput
                style={inputStyle}
                placeholderTextColor={colors.mutedText}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          </View>

          {/* USERNAME */}
          <View style={styles.inputContainer}>
            <Text style={labelStyle}>USERNAME</Text>

            <View style={inputRow}>
              <Ionicons name="at-outline" size={18} color={colors.primaryLight} />
              <TextInput
                style={inputStyle}
                placeholderTextColor={colors.mutedText}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* EMAIL */}
          <View style={styles.inputContainer}>
            <Text style={labelStyle}>EMAIL ADDRESS</Text>

            <View style={inputRow}>
              <Ionicons name="mail-outline" size={18} color={colors.primaryLight} />
              <TextInput
                style={inputStyle}
                placeholderTextColor={colors.mutedText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* PASSWORD */}
          <View style={styles.inputContainer}>
            <Text style={labelStyle}>PASSWORD</Text>

            <View style={inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.primaryLight} />
              <TextInput
                style={inputStyle}
                placeholderTextColor={colors.mutedText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              <TouchableOpacity
                style={styles.showButton}
                onPress={() =>
                  setShowPassword(!showPassword)
                }
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={19}
                  color={colors.secondaryText}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.helperText, { color: colors.mutedText }]}>
              Minimum 6 characters
            </Text>
          </View>

          {/* CONFIRM PASSWORD */}
          <View style={styles.inputContainer}>
            <Text style={labelStyle}>
              CONFIRM PASSWORD
            </Text>

            <View style={inputRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryLight} />
              <TextInput
                style={inputStyle}
                placeholderTextColor={colors.mutedText}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              <TouchableOpacity
                style={styles.showButton}
                onPress={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                disabled={loading}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={19}
                  color={colors.secondaryText}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* INFO */}
          <View
            style={[
              styles.infoBox,
              { backgroundColor: colors.iconBackground, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={colors.primaryLight}
              style={styles.infoIcon}
            />

            <Text style={[styles.infoText, { color: colors.secondaryText }]}>
              This trainer will automatically be added to
              your current gym workspace. You can assign
              members to the trainer after creating the
              account.
            </Text>
          </View>

          {/* BUTTON */}
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: colors.primary },
              loading && styles.disabledButton,
            ]}
            onPress={handleAddTrainer}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text style={styles.addButtonText}>
                  Creating Trainer...
                </Text>
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />

                <Text style={styles.addButtonText}>
                  Add Trainer
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* CANCEL */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: colors.secondaryText }]}>
              CANCEL
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 54 : 44,
    paddingBottom: 14,
  },

  headerTextContainer: {
    flex: 1,
    marginRight: 10,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  headerTitle: {
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

  card: {
    marginHorizontal: 18,
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
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
    marginBottom: 18,
  },

  inputContainer: {
    marginBottom: 15,
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

  showButton: {
    paddingHorizontal: 14,
    height: "100%",
    justifyContent: "center",
  },

  helperText: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 6,
  },

  infoBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    marginTop: 2,
    marginBottom: 18,
  },

  infoIcon: {
    marginRight: 9,
    marginTop: 1,
  },

  infoText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 15,
  },

  addButton: {
    height: 54,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },

  disabledButton: {
    opacity: 0.7,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  cancelButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },

  cancelButtonText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
});