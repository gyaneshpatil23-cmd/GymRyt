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

const API_URL = "http://192.168.1.49:8000";

export default function AddTrainer() {
  const router = useRouter();

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Add Trainer</Text>
            <Text style={styles.headerSubtitle}>
              Create a new trainer account
            </Text>
          </View>
        </View>

        {/* FORM CARD */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Trainer Information
          </Text>

          {/* NAME */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>

            <TextInput
              style={styles.input}
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          {/* USERNAME */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>

            <TextInput
              style={styles.input}
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* EMAIL */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>

            <TextInput
              style={styles.input}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* PASSWORD */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>

            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholderTextColor="#999"
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
                <Text style={styles.showButtonText}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>
              Minimum 6 characters
            </Text>
          </View>

          {/* CONFIRM PASSWORD */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Confirm Password
            </Text>

            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholderTextColor="#999"
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
                <Text style={styles.showButtonText}>
                  {showConfirmPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* INFO */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ⓘ</Text>

            <Text style={styles.infoText}>
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
              <Text style={styles.addButtonText}>
                + Add Trainer
              </Text>
            )}
          </TouchableOpacity>

          {/* CANCEL */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>
              Cancel
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
    backgroundColor: "#F5F7FB",
  },

  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 25,
    backgroundColor: "#FFFFFF",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F3F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  backButtonText: {
    fontSize: 36,
    lineHeight: 38,
    color: "#222222",
    fontWeight: "300",
    marginTop: -3,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "700",
    color: "#111111",
  },

  headerSubtitle: {
    fontSize: 14,
    color: "#777777",
    marginTop: 3,
  },

  card: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#171717",
    marginBottom: 22,
  },

  inputContainer: {
    marginBottom: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E0E3E8",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#222222",
    backgroundColor: "#FAFBFC",
  },

  passwordWrapper: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E0E3E8",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBFC",
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#222222",
  },

  showButton: {
    paddingHorizontal: 14,
    height: "100%",
    justifyContent: "center",
  },

  showButtonText: {
    color: "#4F46E5",
    fontSize: 13,
    fontWeight: "700",
  },

  helperText: {
    fontSize: 12,
    color: "#888888",
    marginTop: 6,
  },

  infoBox: {
    flexDirection: "row",
    backgroundColor: "#F2F4FF",
    borderRadius: 12,
    padding: 13,
    marginTop: 2,
    marginBottom: 22,
  },

  infoIcon: {
    fontSize: 18,
    color: "#4F46E5",
    marginRight: 9,
    marginTop: 1,
  },

  infoText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 19,
    color: "#555B78",
  },

  addButton: {
    height: 53,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },

  disabledButton: {
    opacity: 0.7,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  cancelButton: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  cancelButtonText: {
    color: "#666666",
    fontSize: 15,
    fontWeight: "600",
  },
});