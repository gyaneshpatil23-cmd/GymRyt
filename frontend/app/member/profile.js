import React, { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// API
// ============================================================

const API_URL = "http://192.168.1.49:8000";

// ============================================================
// PROFILE SCREEN
// ============================================================

export default function MemberProfile() {
  // ==========================================================
  // MEMBER DATA
  // ==========================================================

  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberUsername, setMemberUsername] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberStatus, setMemberStatus] = useState("");
  const [membershipStart, setMembershipStart] = useState("");
  const [membershipEnd, setMembershipEnd] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [memberToken, setMemberToken] = useState("");

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  const loadProfile = useCallback(async () => {
    try {
      const values = await AsyncStorage.multiGet([
        "memberId",
        "memberName",
        "memberUsername",
        "memberEmail",
        "memberPhone",
        "memberStatus",
        "memberMembershipStart",
        "memberMembershipEnd",
        "memberWorkspaceName",
        "memberProfilePicture",
        "memberToken",
      ]);

      const data = Object.fromEntries(values);

      setMemberId(data.memberId || "");
      setMemberName(data.memberName || "");
      setMemberUsername(data.memberUsername || "");
      setMemberEmail(data.memberEmail || "");
      setMemberPhone(data.memberPhone || "");
      setMemberStatus(data.memberStatus || "");
      setMembershipStart(data.memberMembershipStart || "");
      setMembershipEnd(data.memberMembershipEnd || "");
      setWorkspaceName(data.memberWorkspaceName || "");
      setProfilePicture(data.memberProfilePicture || "");
      setMemberToken(data.memberToken || "");

      // ======================================================
      // CHECK FOR CROPPED IMAGE
      // ======================================================

      const pendingUri = await AsyncStorage.getItem(
        "pendingProfilePictureUri"
      );

      if (pendingUri) {
        await AsyncStorage.removeItem(
          "pendingProfilePictureUri"
        );

        console.log(
          "CROPPED IMAGE RECEIVED:",
          pendingUri
        );

        await uploadProfilePicture(
          pendingUri,
          "profile-picture.jpg",
          "image/jpeg"
        );
      }
    } catch (error) {
      console.log("PROFILE LOAD ERROR:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memberToken]);

  // ==========================================================
  // REFRESH WHEN SCREEN OPENS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  // ==========================================================
  // PICK PROFILE PICTURE
  // ==========================================================

  const pickProfilePicture = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow GymRyt to access your photos so you can choose a profile picture."
        );

        return;
      }

      // ======================================================
      // IMPORTANT:
      // Native Android crop is disabled here.
      // This sends the image to our GymRyt crop screen.
      // ======================================================

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.9,
        });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        Alert.alert(
          "Image Error",
          "Could not read the selected image."
        );

        return;
      }

      console.log(
        "SELECTED IMAGE URI:",
        asset.uri
      );

      console.log(
        "SELECTED IMAGE TYPE:",
        asset.mimeType
      );

      console.log(
        "SELECTED IMAGE NAME:",
        asset.fileName
      );

      // ======================================================
      // OPEN CUSTOM GYMRyT CROP SCREEN
      // ======================================================

      router.push({
        pathname: "/member/crop",
        params: {
          uri: asset.uri,
        },
      });
    } catch (error) {
      console.log(
        "IMAGE PICKER ERROR:",
        error
      );

      Alert.alert(
        "Image Error",
        "Something went wrong while selecting the image."
      );
    }
  };

  // ==========================================================
  // UPLOAD PROFILE PICTURE
  // ==========================================================

  const uploadProfilePicture = async (
    uri,
    originalFileName,
    originalMimeType
  ) => {
    // ========================================================
    // GET LATEST TOKEN
    // ========================================================

    let token = memberToken;

    if (!token) {
      token = await AsyncStorage.getItem(
        "memberToken"
      );
    }

    if (!token) {
      Alert.alert(
        "Session Error",
        "Your member session is missing. Please log in again."
      );

      return;
    }

    try {
      setUploading(true);

      // ======================================================
      // FILE INFORMATION
      // ======================================================

      const fileName =
        originalFileName ||
        uri.split("/").pop() ||
        "profile-picture.jpg";

      const extension =
        fileName
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      let mimeType =
        originalMimeType || "image/jpeg";

      if (!originalMimeType) {
        if (extension === "png") {
          mimeType = "image/png";
        } else if (extension === "webp") {
          mimeType = "image/webp";
        } else {
          mimeType = "image/jpeg";
        }
      }

      console.log(
        "UPLOAD FILE NAME:",
        fileName
      );

      console.log(
        "UPLOAD MIME TYPE:",
        mimeType
      );

      // ======================================================
      // CREATE EXPO FILE
      // ======================================================

      const file = new File(uri);

      console.log(
        "FILE URI:",
        file.uri
      );

      console.log(
        "FILE EXISTS:",
        file.exists
      );

      console.log(
        "FILE TYPE:",
        file.type
      );

      console.log(
        "FILE SIZE:",
        file.size
      );

      // ======================================================
      // FORM DATA
      // ======================================================

      const formData = new FormData();

      formData.append(
        "profile_picture",
        file
      );

      // ======================================================
      // UPLOAD
      // ======================================================

      const response = await fetch(
        `${API_URL}/api/members/profile-picture/`,
        {
          method: "POST",

          headers: {
            "X-Member-Token": token,
          },

          body: formData,
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
          "PROFILE UPLOAD RESPONSE PARSE ERROR:",
          error
        );
      }

      console.log(
        "PROFILE UPLOAD STATUS:",
        response.status
      );

      console.log(
        "PROFILE UPLOAD RESPONSE:",
        data
      );

      // ======================================================
      // SUCCESS
      // ======================================================

      if (response.ok) {
        const newPicture =
          data.profile_picture ||
          data.profile_picture_url ||
          data.url ||
          "";

        if (newPicture) {
          let finalPicture =
            String(newPicture);

          if (
            finalPicture.startsWith("/") &&
            !finalPicture.startsWith("//")
          ) {
            finalPicture =
              `${API_URL}${finalPicture}`;
          }

          setProfilePicture(
            finalPicture
          );

          await AsyncStorage.setItem(
            "memberProfilePicture",
            finalPicture
          );
        }

        Alert.alert(
          "Profile Updated",
          "Your profile picture has been updated successfully."
        );

        return;
      }

      // ======================================================
      // SERVER ERROR
      // ======================================================

      Alert.alert(
        "Upload Failed",
        data.message ||
          data.detail ||
          "Could not upload your profile picture."
      );
    } catch (error) {
      console.log(
        "PROFILE UPLOAD ERROR:",
        error
      );

      Alert.alert(
        "Upload Error",
        error?.message ||
          "Something went wrong while uploading the profile picture."
      );
    } finally {
      setUploading(false);
    }
  };

  // ==========================================================
  // DELETE PROFILE PICTURE
  // ==========================================================

  const deleteProfilePicture = () => {
    if (!profilePicture) {
      return;
    }

    Alert.alert(
      "Remove Profile Picture",
      "Are you sure you want to remove your profile picture?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress:
            confirmDeleteProfilePicture,
        },
      ]
    );
  };

  // ==========================================================
  // CONFIRM DELETE
  // ==========================================================

  const confirmDeleteProfilePicture =
    async () => {
      if (!memberToken) {
        Alert.alert(
          "Session Error",
          "Your member session is missing. Please log in again."
        );

        return;
      }

      try {
        setUploading(true);

        const response = await fetch(
          `${API_URL}/api/members/profile-picture/`,
          {
            method: "DELETE",

            headers: {
              "X-Member-Token": memberToken,
            },
          }
        );

        let data = {};

        try {
          data = await response.json();
        } catch (error) {
          console.log(
            "PROFILE DELETE RESPONSE PARSE ERROR:",
            error
          );
        }

        console.log(
          "PROFILE DELETE STATUS:",
          response.status
        );

        console.log(
          "PROFILE DELETE RESPONSE:",
          data
        );

        if (response.ok) {
          setProfilePicture("");

          await AsyncStorage.removeItem(
            "memberProfilePicture"
          );

          Alert.alert(
            "Profile Picture Removed",
            "Your profile picture has been removed."
          );

          return;
        }

        Alert.alert(
          "Delete Failed",
          data.message ||
            data.detail ||
            "Could not remove your profile picture."
        );
      } catch (error) {
        console.log(
          "PROFILE DELETE ERROR:",
          error
        );

        Alert.alert(
          "Connection Error",
          "Could not connect to the GymRyt server."
        );
      } finally {
        setUploading(false);
      }
    };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  };

  // ==========================================================
  // LOGOUT FUNCTION
  // ==========================================================

  const logout = async () => {
    try {
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
        "pendingProfilePictureUri",
      ]);

      router.replace("/");
    } catch (error) {
      console.log(
        "LOGOUT ERROR:",
        error
      );

      router.replace("/");
    }
  };

  // ==========================================================
  // INITIALS
  // ==========================================================

  const getInitials = () => {
    if (!memberName.trim()) {
      return "M";
    }

    const parts = memberName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 1) {
      return parts[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Not available";
    }

    try {
      const date = new Date(dateValue);

      if (Number.isNaN(date.getTime())) {
        return String(dateValue);
      }

      return date.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch (error) {
      return String(dateValue);
    }
  };

  // ==========================================================
  // STATUS
  // ==========================================================

  const getStatusText = () => {
    if (!memberStatus) {
      return "ACTIVE";
    }

    return String(memberStatus).toUpperCase();
  };

  const isActive =
    getStatusText() === "ACTIVE" ||
    getStatusText() === "ACTIVE MEMBER";

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading profile...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // PROFILE SCREEN
  // ==========================================================

  return (
    <View style={styles.container}>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.replace(
              "/member/dashboard"
            )
          }
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            MY PROFILE
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage your personal information
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#60A5FA"
          />
        }
      >

        {/* ====================================================
            PROFILE CARD
        ==================================================== */}

        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>

            {/* ==================================================
                AVATAR + CAMERA BUTTON
            ================================================== */}

            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={pickProfilePicture}
              disabled={uploading}
              activeOpacity={0.85}
            >
              {profilePicture ? (
                <Image
                  source={{
                    uri: profilePicture,
                  }}
                  style={styles.avatarImage}
                />
              ) : (
                <View
                  style={
                    styles.avatarPlaceholder
                  }
                >
                  <Text
                    style={
                      styles.avatarInitials
                    }
                  >
                    {getInitials()}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.onlineDot,
                  !isActive &&
                    styles.offlineDot,
                ]}
              />

              {/* ==================================================
                  CAMERA BADGE
              ================================================== */}

              <View style={styles.cameraBadge}>
                <Text style={styles.cameraIcon}>
                  📷
                </Text>
              </View>

            </TouchableOpacity>

            <Text
              style={styles.memberName}
              numberOfLines={1}
            >
              {memberName || "Member"}
            </Text>

            {memberUsername ? (
              <Text
                style={styles.memberUsername}
              >
                @{memberUsername}
              </Text>
            ) : null}

            <View
              style={[
                styles.statusBadge,
                isActive
                  ? styles.statusActive
                  : styles.statusInactive,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  isActive
                    ? styles.statusDotActive
                    : styles.statusDotInactive,
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  isActive
                    ? styles.statusTextActive
                    : styles.statusTextInactive,
                ]}
              >
                {getStatusText()}
              </Text>
            </View>

            {/* ==================================================
                REMOVE PHOTO
            ================================================== */}

            {profilePicture && !uploading ? (
              <TouchableOpacity
                style={
                  styles.removePhotoButton
                }
                onPress={
                  deleteProfilePicture
                }
                activeOpacity={0.8}
              >
                <Text
                  style={
                    styles.removePhotoText
                  }
                >
                  REMOVE
                </Text>
              </TouchableOpacity>
            ) : null}

          </View>
        </View>

        {/* ====================================================
            PERSONAL INFORMATION
        ==================================================== */}

        <Text
          style={styles.sectionTitle}
        >
          PERSONAL INFORMATION
        </Text>

        <View style={styles.infoCard}>
          <InfoRow
            label="Full Name"
            value={
              memberName ||
              "Not available"
            }
          />

          <InfoDivider />

          <InfoRow
            label="Username"
            value={
              memberUsername
                ? `@${memberUsername}`
                : "Not available"
            }
          />

          <InfoDivider />

          <InfoRow
            label="Email"
            value={
              memberEmail ||
              "Not available"
            }
          />

          <InfoDivider />

          <InfoRow
            label="Mobile Number"
            value={
              memberPhone ||
              "Not available"
            }
          />
        </View>

        {/* ====================================================
            MEMBERSHIP INFORMATION
        ==================================================== */}

        <Text
          style={styles.sectionTitle}
        >
          MEMBERSHIP INFORMATION
        </Text>

        <View style={styles.infoCard}>
          <InfoRow
            label="Gym"
            value={
              workspaceName ||
              "GymRyt Gym"
            }
          />

          <InfoDivider />

          <InfoRow
            label="Member ID"
            value={
              memberId
                ? `#${memberId}`
                : "Not available"
            }
          />

          <InfoDivider />

          <InfoRow
            label="Membership Start"
            value={formatDate(
              membershipStart
            )}
          />

          <InfoDivider />

          <InfoRow
            label="Membership End"
            value={formatDate(
              membershipEnd
            )}
          />
        </View>

        {/* ====================================================
            ACCOUNT
        ==================================================== */}

        <Text
          style={styles.sectionTitle}
        >
          ACCOUNT
        </Text>

        <View style={styles.accountCard}>

          <TouchableOpacity
            style={styles.accountButton}
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Account settings will be available soon."
              )
            }
            activeOpacity={0.8}
          >
            <View style={styles.accountIcon}>
              <Text
                style={
                  styles.accountIconText
                }
              >
                ⚙
              </Text>
            </View>

            <View
              style={
                styles.accountButtonText
              }
            >
              <Text
                style={
                  styles.accountButtonTitle
                }
              >
                Account Settings
              </Text>

              <Text
                style={
                  styles.accountButtonSubtitle
                }
              >
                Manage your account preferences
              </Text>
            </View>

            <Text
              style={styles.chevron}
            >
              ›
            </Text>
          </TouchableOpacity>

          <View
            style={styles.accountDivider}
          />

          <TouchableOpacity
            style={styles.accountButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.accountIcon,
                styles.logoutIcon,
              ]}
            >
              <Text
                style={[
                  styles.accountIconText,
                  styles.logoutIconText,
                ]}
              >
                ↪
              </Text>
            </View>

            <View
              style={
                styles.accountButtonText
              }
            >
              <Text
                style={[
                  styles.accountButtonTitle,
                  styles.logoutTitle,
                ]}
              >
                Logout
              </Text>

              <Text
                style={
                  styles.accountButtonSubtitle
                }
              >
                Sign out of your member account
              </Text>
            </View>

            <Text
              style={[
                styles.chevron,
                styles.logoutChevron,
              ]}
            >
              ›
            </Text>
          </TouchableOpacity>

        </View>

        {/* ====================================================
            BOTTOM SPACE
        ==================================================== */}

        <View
          style={styles.bottomSpace}
        />

      </ScrollView>

      {/* ======================================================
          BOTTOM NAVIGATION
      ====================================================== */}

      <View style={styles.bottomNav}>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.replace(
              "/member/dashboard"
            )
          }
          activeOpacity={0.8}
        >
          <Text style={styles.navIcon}>
            ⌂
          </Text>

          <Text style={styles.navLabel}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            Alert.alert(
              "Attendance",
              "Attendance section is coming soon."
            )
          }
          activeOpacity={0.8}
        >
          <Text style={styles.navIcon}>
            ✓
          </Text>

          <Text style={styles.navLabel}>
            Attendance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            Alert.alert(
              "Payments",
              "Payments section is coming soon."
            )
          }
          activeOpacity={0.8}
        >
          <Text style={styles.navIcon}>
            ₹
          </Text>

          <Text style={styles.navLabel}>
            Payments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem,
            styles.navItemActive,
          ]}
          onPress={() =>
            router.replace(
              "/member/profile"
            )
          }
          activeOpacity={0.8}
        >
          <View style={styles.navAvatar}>
            {profilePicture ? (
              <Image
                source={{
                  uri: profilePicture,
                }}
                style={
                  styles.navAvatarImage
                }
              />
            ) : (
              <Text
                style={
                  styles.navAvatarText
                }
              >
                {getInitials()}
              </Text>
            )}
          </View>

          <Text
            style={[
              styles.navLabel,
              styles.navLabelActive,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

// ============================================================
// INFO ROW
// ============================================================

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        style={styles.infoValue}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================
// INFO DIVIDER
// ============================================================

function InfoDivider() {
  return (
    <View style={styles.infoDivider} />
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  // ==========================================================
  // MAIN
  // ==========================================================

  container: {
    flex: 1,
    backgroundColor: "#050816",
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: "#050816",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    height: 100,
    paddingHorizontal: 20,
    paddingTop: 48,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#172554",
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "300",
    lineHeight: 34,
    marginTop: -3,
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 13,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 1,
  },

  headerSubtitle: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 3,
  },

  headerSpacer: {
    width: 42,
  },

  // ==========================================================
  // SCROLL
  // ==========================================================

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },

  // ==========================================================
  // PROFILE CARD
  // ==========================================================

  profileCard: {
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#172554",
    borderRadius: 24,
    paddingVertical: 25,
    paddingHorizontal: 20,
    marginBottom: 28,
  },

  avatarSection: {
    alignItems: "center",
  },

  avatarWrapper: {
    width: 118,
    height: 118,
    borderRadius: 59,
    position: "relative",
    marginBottom: 14,
  },

  avatarImage: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 3,
    borderColor: "#2563EB",
  },

  avatarPlaceholder: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: "#172554",
    borderWidth: 3,
    borderColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
  },

  onlineDot: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#0B1220",
    right: 3,
    bottom: 5,
  },

  offlineDot: {
    backgroundColor: "#64748B",
  },

  // ==========================================================
  // CAMERA BADGE
  // ==========================================================

  cameraBadge: {
    position: "absolute",
    right: -1,
    bottom: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    borderWidth: 3,
    borderColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
  },

  cameraIcon: {
    fontSize: 13,
  },

  memberName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    maxWidth: "90%",
  },

  memberUsername: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },

  // ==========================================================
  // STATUS
  // ==========================================================

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },

  statusActive: {
    backgroundColor: "#052E16",
  },

  statusInactive: {
    backgroundColor: "#172554",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  statusDotActive: {
    backgroundColor: "#22C55E",
  },

  statusDotInactive: {
    backgroundColor: "#64748B",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },

  statusTextActive: {
    color: "#22C55E",
  },

  statusTextInactive: {
    color: "#94A3B8",
  },

  // ==========================================================
  // REMOVE PHOTO
  // ==========================================================

  removePhotoButton: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },

  removePhotoText: {
    color: "#EF4444",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },

  // ==========================================================
  // SECTIONS
  // ==========================================================

  sectionTitle: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 10,
    marginLeft: 3,
  },

  // ==========================================================
  // INFO CARD
  // ==========================================================

  infoCard: {
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#172554",
    borderRadius: 18,
    paddingHorizontal: 17,
    marginBottom: 25,
  },

  infoRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  infoLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    flex: 0.42,
  },

  infoValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    flex: 0.58,
  },

  infoDivider: {
    height: 1,
    backgroundColor: "#172554",
  },

  // ==========================================================
  // ACCOUNT
  // ==========================================================

  accountCard: {
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#172554",
    borderRadius: 18,
    overflow: "hidden",
  },

  accountButton: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#172554",
    alignItems: "center",
    justifyContent: "center",
  },

  accountIconText: {
    color: "#60A5FA",
    fontSize: 19,
  },

  logoutIcon: {
    backgroundColor: "#450A0A",
  },

  logoutIconText: {
    color: "#EF4444",
  },

  accountButtonText: {
    flex: 1,
    marginLeft: 13,
  },

  accountButtonTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  accountButtonSubtitle: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "500",
    marginTop: 4,
  },

  logoutTitle: {
    color: "#EF4444",
  },

  chevron: {
    color: "#64748B",
    fontSize: 26,
    fontWeight: "300",
  },

  logoutChevron: {
    color: "#7F1D1D",
  },

  accountDivider: {
    height: 1,
    backgroundColor: "#172554",
    marginLeft: 69,
  },

  // ==========================================================
  // BOTTOM SPACE
  // ==========================================================

  bottomSpace: {
    height: 30,
  },

  // ==========================================================
  // BOTTOM NAV
  // ==========================================================

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    backgroundColor: "#080D19",
    borderTopWidth: 1,
    borderTopColor: "#172554",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 5,
  },

  navItem: {
    flex: 1,
    height: 65,
    alignItems: "center",
    justifyContent: "center",
  },

  navItemActive: {
    opacity: 1,
  },

  navIcon: {
    color: "#64748B",
    fontSize: 21,
    height: 27,
    textAlign: "center",
  },

  navLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 3,
  },

  navLabelActive: {
    color: "#60A5FA",
  },

  navAvatar: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#172554",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2563EB",
  },

  navAvatarImage: {
    width: 27,
    height: 27,
    borderRadius: 14,
  },

  navAvatarText: {
    color: "#60A5FA",
    fontSize: 9,
    fontWeight: "900",
  },
});