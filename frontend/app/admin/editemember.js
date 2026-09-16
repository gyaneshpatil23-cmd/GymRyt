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
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../context/ThemeContext";

// ============================================================
// API
// ============================================================

const API_BASE_URL =
  "http://192.168.1.52:8000/api/members";

// ============================================================
// EDIT MEMBER
// ============================================================

export default function EditMember() {
  const { colors } = useTheme();

  const params = useLocalSearchParams();

  // IMPORTANT:
  // Convert ID into a normal string
  const memberId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [name, setName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [status, setStatus] =
    useState("ACTIVE");

  // ==========================================================
  // SESSION EXPIRED
  // ==========================================================

  const handleSessionExpired = async () => {
    console.log(
      "ADMIN SESSION EXPIRED"
    );

    await AsyncStorage.multiRemove([
      "adminToken",
      "adminUsername",
      "adminId",
      "userRole",
    ]);

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
  };

  // ==========================================================
  // GET ADMIN SESSION
  // ==========================================================

  const getAdminSession = async () => {
    const token =
      await AsyncStorage.getItem(
        "adminToken"
      );

    const username =
      await AsyncStorage.getItem(
        "adminUsername"
      );

    const adminId =
      await AsyncStorage.getItem(
        "adminId"
      );

    console.log(
      "================================"
    );

    console.log(
      "EDIT MEMBER ADMIN SESSION"
    );

    console.log(
      "ADMIN ID:",
      adminId
    );

    console.log(
      "ADMIN USERNAME:",
      username
    );

    console.log(
      "TOKEN EXISTS:",
      !!token
    );

    console.log(
      "================================"
    );

    return {
      token,
      username,
      adminId,
    };
  };

  // ==========================================================
  // FETCH MEMBER
  // ==========================================================

  const fetchMember = async () => {
    console.log(
      "EDIT MEMBER ID:",
      memberId
    );

    if (!memberId) {
      setLoading(false);

      Alert.alert(
        "Error",
        "Member ID is missing."
      );

      return;
    }

    try {
      setLoading(true);

      // ======================================================
      // GET ADMIN SESSION
      // ======================================================

      const session =
        await getAdminSession();

      const token =
        session.token;

      // ======================================================
      // TOKEN NOT FOUND
      // ======================================================

      if (!token) {
        setLoading(false);

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
      // MEMBER URL
      // ======================================================

      const url =
        `${API_BASE_URL}/${memberId}/`;

      console.log(
        "FETCH MEMBER URL:",
        url
      );

      // ======================================================
      // AUTHENTICATED REQUEST
      // ======================================================

      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              "Content-Type":
                "application/json",

              "Accept":
                "application/json",

              Authorization:
                `Token ${token}`,
            },
          }
        );

      console.log(
        "FETCH MEMBER STATUS:",
        response.status
      );

      // ======================================================
      // SESSION EXPIRED
      // ======================================================

      if (
        response.status === 401
      ) {
        await handleSessionExpired();

        return;
      }

      // ======================================================
      // READ RESPONSE
      // ======================================================

      const responseText =
        await response.text();

      console.log(
        "MEMBER RESPONSE:",
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
          "Member response was not JSON."
        );
      }

      // ======================================================
      // OTHER ERROR
      // ======================================================

      if (!response.ok) {
        throw new Error(
          data.detail ||
          data.message ||
          "Could not load member."
        );
      }

      // ======================================================
      // FILL FORM
      // ======================================================

      setName(
        data.name || ""
      );

      setPhone(
        data.phone || ""
      );

      setEmail(
        data.email || ""
      );

      setUsername(
        data.username || ""
      );

      setStartDate(
        data.membership_start || ""
      );

      setEndDate(
        data.membership_end || ""
      );

      setStatus(
        data.status || "ACTIVE"
      );

      console.log(
        "MEMBER FORM LOADED"
      );
    } catch (error) {
      console.log(
        "FETCH MEMBER ERROR:",
        error
      );

      Alert.alert(
        "Error",
        error.message ||
          "Could not load member information."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // LOAD MEMBER
  // ==========================================================

  useEffect(() => {
    fetchMember();
  }, [memberId]);

  // ==========================================================
  // SAVE
  // ==========================================================

  const handleSave = async () => {
    // --------------------------------------------------------
    // MEMBER ID
    // --------------------------------------------------------

    if (!memberId) {
      Alert.alert(
        "Error",
        "Member ID is missing."
      );

      return;
    }

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!name.trim()) {
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

    if (phone.trim().length !== 10) {
      Alert.alert(
        "Invalid Phone",
        "Phone number must contain 10 digits."
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

    if (!username.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter username."
      );

      return;
    }

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

    // --------------------------------------------------------
    // DATE VALIDATION
    // --------------------------------------------------------

    const dateRegex =
      /^\d{4}-\d{2}-\d{2}$/;

    if (
      !dateRegex.test(
        startDate.trim()
      )
    ) {
      Alert.alert(
        "Invalid Date",
        "Start date must be YYYY-MM-DD."
      );

      return;
    }

    if (
      !dateRegex.test(
        endDate.trim()
      )
    ) {
      Alert.alert(
        "Invalid Date",
        "End date must be YYYY-MM-DD."
      );

      return;
    }

    // --------------------------------------------------------
    // CHECK START / END DATE
    // --------------------------------------------------------

    const start =
      new Date(
        `${startDate.trim()}T00:00:00`
      );

    const end =
      new Date(
        `${endDate.trim()}T00:00:00`
      );

    if (
      isNaN(start.getTime()) ||
      isNaN(end.getTime())
    ) {
      Alert.alert(
        "Invalid Date",
        "Please enter valid membership dates."
      );

      return;
    }

    if (end < start) {
      Alert.alert(
        "Invalid Membership",
        "Membership end date cannot be before the start date."
      );

      return;
    }

    try {
      setSaving(true);

      // ======================================================
      // GET ADMIN SESSION
      // ======================================================

      const session =
        await getAdminSession();

      const token =
        session.token;

      // ======================================================
      // TOKEN NOT FOUND
      // ======================================================

      if (!token) {
        setSaving(false);

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
      // UPDATE URL
      // ======================================================

      const url =
        `${API_BASE_URL}/${memberId}/`;

      // ======================================================
      // DATA SENT TO DJANGO
      // ======================================================

      const updateData = {
        name:
          name.trim(),

        phone:
          phone.trim(),

        email:
          email.trim(),

        username:
          username.trim(),

        membership_start:
          startDate.trim(),

        membership_end:
          endDate.trim(),
      };

      console.log(
        "================================"
      );

      console.log(
        "UPDATING MEMBER"
      );

      console.log(
        "ADMIN:",
        session.username
      );

      console.log(
        "ADMIN ID:",
        session.adminId
      );

      console.log(
        "MEMBER ID:",
        memberId
      );

      console.log(
        "UPDATE URL:",
        url
      );

      console.log(
        "UPDATE DATA:",
        updateData
      );

      console.log(
        "================================"
      );

      // ======================================================
      // PATCH DJANGO
      // ======================================================

      const response =
        await fetch(
          url,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              "Accept":
                "application/json",

              Authorization:
                `Token ${token}`,
            },

            body:
              JSON.stringify(
                updateData
              ),
          }
        );

      console.log(
        "DJANGO STATUS:",
        response.status
      );

      // ======================================================
      // SESSION EXPIRED
      // ======================================================

      if (
        response.status === 401
      ) {
        await handleSessionExpired();

        return;
      }

      // ======================================================
      // READ RESPONSE
      // ======================================================

      const responseText =
        await response.text();

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
      // ERROR
      // ======================================================

      if (!response.ok) {
        let message =
          "Could not update member.";

        if (data.username) {
          message =
            `Username: ${
              Array.isArray(
                data.username
              )
                ? data.username.join(" ")
                : data.username
            }`;
        }

        else if (data.phone) {
          message =
            `Phone: ${
              Array.isArray(
                data.phone
              )
                ? data.phone.join(" ")
                : data.phone
            }`;
        }

        else if (data.email) {
          message =
            `Email: ${
              Array.isArray(
                data.email
              )
                ? data.email.join(" ")
                : data.email
            }`;
        }

        else if (
          data.membership_start
        ) {
          message =
            `Start Date: ${
              Array.isArray(
                data.membership_start
              )
                ? data.membership_start.join(" ")
                : data.membership_start
            }`;
        }

        else if (
          data.membership_end
        ) {
          message =
            `End Date: ${
              Array.isArray(
                data.membership_end
              )
                ? data.membership_end.join(" ")
                : data.membership_end
            }`;
        }

        else if (data.detail) {
          message =
            data.detail;
        }

        else if (data.message) {
          message =
            data.message;
        }

        Alert.alert(
          "Update Failed",
          message
        );

        return;
      }

      // ======================================================
      // SUCCESS
      // ======================================================

      console.log(
        "MEMBER UPDATED SUCCESSFULLY:",
        data
      );

      Alert.alert(
        "Updated Successfully",
        `${name.trim()}'s information has been updated.`,
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
    } catch (error) {
      console.log(
        "SAVE MEMBER ERROR:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Could not connect to GymRyt server.\n\nMake sure Django is running and your phone is connected to the same Wi-Fi."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                colors.mutedText,
            },
          ]}
        >
          Loading member...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // SCREEN
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
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={
            styles.header
          }
        >
          <TouchableOpacity
            style={[
              styles.backButton,
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
            disabled={saving}
          >
            <Text
              style={[
                styles.backText,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              ‹
            </Text>
          </TouchableOpacity>

          <View
            style={
              styles.headerText
            }
          >
            <Text
              style={[
                styles.smallTitle,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              GYMRyt MANAGEMENT
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
              Edit Member
            </Text>
          </View>
        </View>

        {/* ==================================================
            PROFILE
        ================================================== */}

        <View
          style={
            styles.profileSection
          }
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor:
                  colors.iconBackground,
                borderColor:
                  colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              {getInitials(name)}
            </Text>
          </View>

          <Text
            style={[
              styles.profileName,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {name}
          </Text>

          <Text
            style={[
              styles.profileSubtitle,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            Update member information
          </Text>
        </View>

        {/* ==================================================
            PERSONAL INFORMATION
        ================================================== */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            PERSONAL INFORMATION
          </Text>

          <InputField
            label="FULL NAME"
            value={name}
            onChangeText={setName}
            placeholder="Enter full name"
            colors={colors}
          />

          <InputField
            label="PHONE NUMBER"
            value={phone}
            onChangeText={(text) =>
              setPhone(
                text.replace(
                  /[^0-9]/g,
                  ""
                )
              )
            }
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            maxLength={10}
            colors={colors}
          />

          <InputField
            label="EMAIL ADDRESS"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email"
            keyboardType="email-address"
            colors={colors}
          />
        </View>

        {/* ==================================================
            ACCOUNT INFORMATION
        ================================================== */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            ACCOUNT INFORMATION
          </Text>

          <InputField
            label="USERNAME"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            colors={colors}
          />

          <View
            style={[
              styles.infoBox,
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
                styles.infoIcon,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              🔒
            </Text>

            <Text
              style={[
                styles.infoText,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Password changes are handled separately.
            </Text>
          </View>
        </View>

        {/* ==================================================
            MEMBERSHIP
        ================================================== */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            MEMBERSHIP
          </Text>

          <InputField
            label="MEMBERSHIP START"
            value={startDate}
            onChangeText={
              setStartDate
            }
            placeholder="YYYY-MM-DD"
            colors={colors}
          />

          <InputField
            label="MEMBERSHIP END"
            value={endDate}
            onChangeText={
              setEndDate
            }
            placeholder="YYYY-MM-DD"
            colors={colors}
          />
        </View>

        {/* ==================================================
            SAVE
        ================================================== */}

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor:
                colors.primary,
            },
            saving &&
              styles.saveButtonDisabled,
          ]}
          onPress={
            handleSave
          }
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <>
              <Text
                style={
                  styles.saveText
                }
              >
                SAVE CHANGES
              </Text>

              <Text
                style={
                  styles.arrow
                }
              >
                →
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
          disabled={saving}
        >
          <Text
            style={[
              styles.cancelText,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            CANCEL
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// INPUT FIELD
// ============================================================

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
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

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor:
              colors.input,
            borderColor:
              colors.border,
            color:
              colors.text,
          },
        ]}
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
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
        autoCorrect={false}
      />
    </View>
  );
}

// ============================================================
// INITIALS
// ============================================================

function getInitials(name) {
  if (!name) {
    return "?";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word[0]
    )
    .join("")
    .substring(
      0,
      2
    )
    .toUpperCase();
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ========================================================
  // LOADING
  // ========================================================

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 15,
    fontSize: 13,
  },

  // ========================================================
  // SCROLL
  // ========================================================

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },

  // ========================================================
  // HEADER
  // ========================================================

  header: {
    marginTop: 55,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: 34,
    marginTop: -4,
  },

  headerText: {
    marginLeft: 15,
  },

  smallTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    marginTop: 3,
  },

  // ========================================================
  // PROFILE
  // ========================================================

  profileSection: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },

  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 25,
    fontWeight: "900",
  },

  profileName: {
    fontSize: 19,
    fontWeight: "900",
    marginTop: 12,
  },

  profileSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },

  // ========================================================
  // SECTION
  // ========================================================

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 14,
  },

  // ========================================================
  // INPUT
  // ========================================================

  inputGroup: {
    marginBottom: 15,
  },

  label: {
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 7,
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 14,
  },

  // ========================================================
  // INFO BOX
  // ========================================================

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },

  infoIcon: {
    fontSize: 18,
  },

  infoText: {
    flex: 1,
    fontSize: 11,
    marginLeft: 10,
  },

  // ========================================================
  // STATUS
  // ========================================================

  statusButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  statusButton: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 3,
  },

  statusButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  statusButtonText: {
    fontSize: 9,
    fontWeight: "900",
  },

  statusButtonTextSelected: {
    color: "#FFFFFF",
  },

  // ========================================================
  // SAVE
  // ========================================================

  saveButton: {
    height: 58,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },

  arrow: {
    color: "#FFFFFF",
    fontSize: 22,
    marginLeft: 12,
  },

  // ========================================================
  // CANCEL
  // ========================================================

  cancelButton: {
    alignItems: "center",
    paddingVertical: 18,
  },

  cancelText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
