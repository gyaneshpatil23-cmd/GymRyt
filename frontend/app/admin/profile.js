import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import AsyncStorage from "@react-native-async-storage/async-storage";

import * as ImagePicker from "expo-image-picker";

import {
  File,
} from "expo-file-system";

import {
  fetch as expoFetch,
} from "expo/fetch";

import {
  router,
  useFocusEffect,
} from "expo-router";

import { useTheme } from "../../context/ThemeContext";

// ======================================================
// API
// ======================================================

const API_BASE_URL =
  "http://192.168.1.43:8000";

// ======================================================
// ADMIN PROFILE
// ======================================================

export default function AdminProfile() {
  // ====================================================
  // THEME
  // ====================================================

  const {
    isDark,
    colors,
    toggleTheme,
  } = useTheme();

  // ====================================================
  // ADMIN STATE
  // ====================================================

  const [admin, setAdmin] = useState({
    id: "",
    username: "",
    workspaceId: "",
    workspaceName: "",
  });

  const [profilePicture, setProfilePicture] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  // ====================================================
  // UPLOAD PROFILE PHOTO
  // ====================================================

  const uploadProfilePhoto =
    async (uri) => {
      try {
        setUploadingPhoto(true);

        const token =
          await AsyncStorage.getItem(
            "adminToken"
          );

        if (!token) {
          Alert.alert(
            "Session Expired",
            "Please login again."
          );

          router.replace("/");

          return;
        }

        // ==================================================
        // CREATE FILE
        // ==================================================

        const file =
          new File(uri);

        // ==================================================
        // FORM DATA
        // ==================================================

        const formData =
          new FormData();

        formData.append(
          "profile_picture",
          file
        );

        // ==================================================
        // UPLOAD TO ADMIN ENDPOINT
        // ==================================================

        const response =
          await expoFetch(
            `${API_BASE_URL}/api/members/admin/profile-picture/`,
            {
              method: "POST",

              headers: {
                Authorization:
                  `Token ${token}`,
              },

              body: formData,
            }
          );

        const data =
          await response.json();

        console.log(
          "ADMIN PROFILE PHOTO UPLOAD RESPONSE:",
          data
        );

        // ==================================================
        // UPLOAD FAILED
        // ==================================================

        if (!response.ok) {
          Alert.alert(
            "Upload Failed",
            data.detail ||
              data.error ||
              "Unable to upload profile picture."
          );

          return;
        }

        // ==================================================
        // SAVE PHOTO URL
        // ==================================================

        if (
          data.profile_picture
        ) {
          setProfilePicture(
            data.profile_picture
          );

          await AsyncStorage.setItem(
            "adminProfilePicture",
            data.profile_picture
          );
        }

        // ==================================================
        // SUCCESS
        // ==================================================

        Alert.alert(
          "Success",
          "Profile picture updated successfully."
        );
      } catch (error) {
        console.log(
          "PROFILE PHOTO UPLOAD ERROR:",
          error
        );

        Alert.alert(
          "Upload Error",
          "Unable to upload profile picture. Please try again."
        );
      } finally {
        setUploadingPhoto(false);
      }
    };

  // ====================================================
  // LOAD ADMIN SESSION
  // ====================================================

  const loadAdminProfile =
    useCallback(async () => {
      try {
        setLoading(true);

        const values =
          await AsyncStorage.multiGet([
            "adminToken",
            "adminId",
            "adminUsername",
            "workspaceId",
            "workspaceName",
            "adminProfilePicture",
          ]);

        const session = {};

        values.forEach(
          ([key, value]) => {
            session[key] = value;
          }
        );

        console.log(
          "=========================================="
        );

        console.log(
          "ADMIN PROFILE SESSION"
        );

        console.log(
          "ADMIN ID:",
          session.adminId
        );

        console.log(
          "ADMIN USERNAME:",
          session.adminUsername
        );

        console.log(
          "TOKEN EXISTS:",
          !!session.adminToken
        );

        console.log(
          "WORKSPACE ID:",
          session.workspaceId
        );

        console.log(
          "WORKSPACE NAME:",
          session.workspaceName
        );

        console.log(
          "PROFILE PICTURE:",
          session.adminProfilePicture
        );

        console.log(
          "=========================================="
        );

        // ==================================================
        // NO ADMIN SESSION
        // ==================================================

        if (
          !session.adminToken &&
          !session.adminId &&
          !session.adminUsername
        ) {
          Alert.alert(
            "Session Not Found",
            "Please login again.",
            [
              {
                text: "OK",
                onPress: () =>
                  router.replace("/"),
              },
            ]
          );

          return;
        }

        // ==================================================
        // SET ADMIN
        // ==================================================

        setAdmin({
          id:
            session.adminId ||
            "",

          username:
            session.adminUsername ||
            "Admin",

          workspaceId:
            session.workspaceId ||
            "",

          workspaceName:
            session.workspaceName ||
            "My Gym",
        });

        // ==================================================
        // LOAD SAVED PHOTO
        // ==================================================

        setProfilePicture(
          session.adminProfilePicture ||
          null
        );

        // ==================================================
        // CHECK FOR CROPPED PHOTO
        //
        // crop.js saves the cropped image here.
        //
        // This happens when:
        //
        // Admin Profile
        //      ↓
        // Select Photo
        //      ↓
        // crop.js
        //      ↓
        // SAVE
        //      ↓
        // Admin Profile
        // ==================================================

        const pendingUri =
          await AsyncStorage.getItem(
            "pendingProfilePictureUri"
          );

        if (pendingUri) {
          console.log(
            "=========================================="
          );

          console.log(
            "CROPPED ADMIN PHOTO FOUND"
          );

          console.log(
            "PENDING URI:",
            pendingUri
          );

          console.log(
            "=========================================="
          );

          // ==================================================
          // REMOVE PENDING URI FIRST
          //
          // This prevents the same cropped image from
          // being uploaded again if the screen refreshes.
          // ==================================================

          await AsyncStorage.removeItem(
            "pendingProfilePictureUri"
          );

          // ==================================================
          // UPLOAD CROPPED IMAGE
          // ==================================================

          await uploadProfilePhoto(
            pendingUri
          );
        }

        // ==================================================
        // LOAD PHOTO FROM BACKEND
        // ==================================================

        if (session.adminToken) {
          try {
            const response =
              await fetch(
                `${API_BASE_URL}/api/members/admin/profile-picture/`,
                {
                  method: "GET",

                  headers: {
                    Authorization:
                      `Token ${session.adminToken}`,
                  },
                }
              );

            if (response.ok) {
              const data =
                await response.json();

              if (
                data.profile_picture
              ) {
                setProfilePicture(
                  data.profile_picture
                );

                await AsyncStorage.setItem(
                  "adminProfilePicture",
                  data.profile_picture
                );
              }
            }
          } catch (photoError) {
            console.log(
              "ADMIN PROFILE PHOTO LOAD ERROR:",
              photoError
            );
          }
        }
      } catch (error) {
        console.log(
          "ADMIN PROFILE ERROR:",
          error
        );

        Alert.alert(
          "Error",
          "Could not load your profile."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  // ====================================================
  // LOAD WHEN SCREEN OPENS / RETURNS FROM CROP
  // ====================================================

  useFocusEffect(
    useCallback(() => {
      loadAdminProfile();
    }, [loadAdminProfile])
  );

  // ====================================================
  // GET INITIALS
  // ====================================================

  const getInitials =
    (name) => {
      if (!name) {
        return "A";
      }

      const parts =
        name
          .trim()
          .split(/\s+/)
          .filter(Boolean);

      if (
        parts.length === 1
      ) {
        return parts[0]
          .charAt(0)
          .toUpperCase();
      }

      return (
        parts[0]
          .charAt(0)
          .toUpperCase() +
        parts[
          parts.length - 1
        ]
          .charAt(0)
          .toUpperCase()
      );
    };

  // ====================================================
  // PICK PROFILE PHOTO
  // ====================================================

  const pickProfilePhoto =
    async () => {
      try {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (
          !permission.granted
        ) {
          Alert.alert(
            "Permission Required",
            "Please allow photo library access to select a profile picture."
          );

          return;
        }

        // ==================================================
        // OPEN IMAGE PICKER
        //
        // IMPORTANT:
        //
        // We DO NOT crop here.
        //
        // crop.js will handle the crop.
        // ==================================================

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: [
                "images",
              ],

              allowsEditing: false,

              quality: 0.85,
            }
          );

        // ==================================================
        // USER CANCELLED
        // ==================================================

        if (
          result.canceled ||
          !result.assets ||
          !result.assets[0]
        ) {
          return;
        }

        const selectedImage =
          result.assets[0];

        console.log(
          "SELECTED ADMIN PHOTO:",
          selectedImage.uri
        );

        // ==================================================
        // OPEN EXISTING CROP SCREEN
        //
        // We intentionally reuse:
        //
        // /member/crop
        //
        // because crop.js contains no member-specific
        // upload logic.
        // ==================================================

        router.push({
          pathname:
            "/crop",

          params: {
            uri:
              selectedImage.uri,
          },
        });
      } catch (error) {
        console.log(
          "IMAGE PICKER ERROR:",
          error
        );

        Alert.alert(
          "Photo Error",
          "Unable to select the photo."
        );
      }
    };

  // ====================================================
  // REMOVE PROFILE PHOTO
  // ====================================================

  const removeProfilePhoto =
    () => {
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
              performRemoveProfilePhoto,
          },
        ]
      );
    };

  // ====================================================
  // PERFORM REMOVE PROFILE PHOTO
  // ====================================================

  const performRemoveProfilePhoto =
    async () => {
      try {
        setUploadingPhoto(true);

        const token =
          await AsyncStorage.getItem(
            "adminToken"
          );

        if (!token) {
          Alert.alert(
            "Session Expired",
            "Please login again."
          );

          router.replace("/");

          return;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/api/members/admin/profile-picture/`,
            {
              method: "DELETE",

              headers: {
                Authorization:
                  `Token ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          Alert.alert(
            "Remove Failed",
            data.detail ||
              data.error ||
              "Unable to remove profile picture."
          );

          return;
        }

        // ==================================================
        // CLEAR PHOTO
        // ==================================================

        setProfilePicture(
          null
        );

        await AsyncStorage.removeItem(
          "adminProfilePicture"
        );

        // ==================================================
        // SUCCESS
        // ==================================================

        Alert.alert(
          "Removed",
          "Profile picture removed successfully."
        );
      } catch (error) {
        console.log(
          "REMOVE PROFILE PHOTO ERROR:",
          error
        );

        Alert.alert(
          "Error",
          "Unable to remove profile picture."
        );
      } finally {
        setUploadingPhoto(false);
      }
    };

  // ====================================================
  // PHOTO OPTIONS
  // ====================================================

  const handleProfilePhoto =
  () => {
    if (uploadingPhoto) {
      return;
    }

    pickProfilePhoto();
  };

  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout =
    () => {
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
            onPress:
              performLogout,
          },
        ]
      );
    };

  // ====================================================
  // PERFORM LOGOUT
  // ====================================================

  const performLogout =
    async () => {
      try {
        await AsyncStorage.multiRemove([
          "adminToken",
          "adminUsername",
          "adminId",
          "adminEmail",
          "userRole",
          "workspaceId",
          "workspaceName",
          "adminProfilePicture",
        ]);

        router.replace("/");
      } catch (error) {
        console.log(
          "ADMIN LOGOUT ERROR:",
          error
        );

        Alert.alert(
          "Logout Error",
          "Unable to logout. Please try again."
        );
      }
    };

  // ====================================================
  // ACCOUNT SETTINGS
  // ====================================================

  const handleAccountSettings =
    () => {
      Alert.alert(
        "Coming Soon",
        "Account settings will be available soon."
      );
    };

  // ====================================================
  // LOADING
  // ====================================================

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
        <StatusBar
          barStyle={
            isDark
              ? "light-content"
              : "dark-content"
          }
          backgroundColor={
            colors.background
          }
        />

        <ActivityIndicator
          size="large"
          color={
            colors.primary
          }
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
          Loading profile...
        </Text>
      </View>
    );
  }

  // ====================================================
  // MAIN SCREEN
  // ====================================================

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <StatusBar
        barStyle={
          isDark
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={
          colors.background
        }
      />

      {/* ==================================================
          HEADER
      ================================================== */}

      <View
        style={
          styles.header
        }
      >
        <View
          style={
            styles.headerLeft
          }
        >
          <Text
            style={[
              styles.eyebrow,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            GYMRYT • OWNER
          </Text>

          <Text
            style={[
              styles.headerTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            My Profile
          </Text>
        </View>

        {/* HEADER ACTIONS */}

        <View
          style={
            styles.headerActions
          }
        >

          {/* THEME */}

          <Pressable
            style={[
              styles.headerButton,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
            onPress={
              toggleTheme
            }
          >
            <Ionicons
              name={
                isDark
                  ? "sunny-outline"
                  : "moon-outline"
              }
              size={20}
              color={
                colors.text
              }
            />
          </Pressable>

          {/* BACK */}

          <Pressable
            style={[
              styles.headerButton,
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
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={
                colors.text
              }
            />
          </Pressable>

        </View>
      </View>

      {/* ==================================================
          CONTENT
      ================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >

        {/* ==================================================
            PROFILE CARD
        ================================================== */}

        <View
          style={[
            styles.profileCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >

          {/* AVATAR */}

          <View
            style={
              styles.avatarWrapper
            }
          >
            <Pressable
              onPress={
                handleProfilePhoto
              }
              disabled={
                uploadingPhoto
              }
            >
              {profilePicture ? (
                <Image
                  source={{
                    uri:
                      profilePicture,
                  }}
                  style={
                    styles.avatar
                  }
                />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    {
                      backgroundColor:
                        colors.iconBackground,
                      borderColor:
                        colors.border,
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
                    {getInitials(
                      admin.username
                    )}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* CAMERA */}

            <Pressable
              style={[
                styles.cameraButton,
                {
                  backgroundColor:
                    colors.primaryLight,
                  borderColor:
                    colors.card,
                },
              ]}
              onPress={
                handleProfilePhoto
              }
              disabled={
                uploadingPhoto
              }
            >
              {uploadingPhoto ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="camera"
                  size={17}
                  color="#FFFFFF"
                />
              )}
            </Pressable>
          </View>

          {/* NAME */}

          <Text
            style={[
              styles.profileName,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {admin.username ||
              "Admin"}
          </Text>

          {/* ROLE */}

          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor:
                  colors.iconBackground,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={12}
              color={
                colors.primaryLight
              }
            />

            <Text
              style={[
                styles.profileRole,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              ADMINISTRATOR
            </Text>
          </View>

          {/* GYM */}

          <View
            style={
              styles.gymRow
            }
          >
            <Ionicons
              name="location-outline"
              size={14}
              color={
                colors.secondaryText
              }
            />

            <Text
              style={[
                styles.profileGym,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
              numberOfLines={1}
            >
              {admin.workspaceName ||
                "My Gym"}
            </Text>
          </View>

          {/* ==================================================
              REMOVE PHOTO
          ================================================== */}

          {profilePicture &&
            !uploadingPhoto && (
              <Pressable
                onPress={
                  removeProfilePhoto
                }
                style={[
                  styles.removePhotoButton,
                  {
                    borderColor:
                      "#FF4D5E55",
                  },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={12}
                  color="#FF4D5E"
                />

                <Text
                  style={
                    styles.removePhotoText
                  }
                >
                  REMOVE PHOTO
                </Text>
              </Pressable>
            )}
        </View>

        {/* ==================================================
            ACCOUNT INFORMATION
        ================================================== */}

        <SectionTitle
          title="ACCOUNT INFORMATION"
          colors={colors}
        />

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          <InfoRow
            icon="person-outline"
            label="Username"
            value={
              admin.username
                ? `@${admin.username}`
                : "--"
            }
            colors={colors}
          />

          <Divider
            colors={colors}
          />

          <InfoRow
            icon="card-outline"
            label="Admin ID"
            value={
              admin.id ||
              "--"
            }
            colors={colors}
          />
        </View>

        {/* ==================================================
            GYM INFORMATION
        ================================================== */}

        <SectionTitle
          title="GYM INFORMATION"
          colors={colors}
        />

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          <InfoRow
            icon="barbell-outline"
            label="Gym Name"
            value={
              admin.workspaceName ||
              "My Gym"
            }
            colors={colors}
          />

          <Divider
            colors={colors}
          />

          <InfoRow
            icon="key-outline"
            label="Workspace ID"
            value={
              admin.workspaceId ||
              "--"
            }
            colors={colors}
          />
        </View>

        {/* ==================================================
            ACCOUNT
        ================================================== */}

        <SectionTitle
          title="ACCOUNT"
          colors={colors}
        />

        <Pressable
          onPress={
            handleAccountSettings
          }
          style={({ pressed }) => [
            styles.settingsButton,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
              opacity:
                pressed
                  ? 0.7
                  : 1,
            },
          ]}
        >
          <View
            style={[
              styles.infoIcon,
              {
                backgroundColor:
                  colors.iconBackground,
              },
            ]}
          >
            <Ionicons
              name="settings-outline"
              size={21}
              color={
                colors.primaryLight
              }
            />
          </View>

          <View
            style={
              styles.infoTextContainer
            }
          >
            <Text
              style={[
                styles.settingsTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              Account Settings
            </Text>

            <Text
              style={[
                styles.infoLabel,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Manage your account settings
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={
              colors.secondaryText
            }
          />
        </Pressable>

        {/* ==================================================
            LOGOUT
        ================================================== */}

        <Pressable
          style={[
            styles.logoutButton,
            {
              backgroundColor:
                isDark
                  ? "#100D15"
                  : "#FFF5F6",
              borderColor:
                "#55202B",
            },
          ]}
          onPress={
            handleLogout
          }
        >
          <Ionicons
            name="log-out-outline"
            size={21}
            color="#FF4D5E"
          />

          <Text
            style={
              styles.logoutText
            }
          >
            Logout
          </Text>
        </Pressable>

        <View
          style={
            styles.bottomSpace
          }
        />
      </ScrollView>
    </View>
  );
}

// ======================================================
// SECTION TITLE
// ======================================================

function SectionTitle({
  title,
  colors,
}) {
  return (
    <Text
      style={[
        styles.sectionTitle,
        {
          color:
            colors.text,
        },
      ]}
    >
      {title}
    </Text>
  );
}

// ======================================================
// DIVIDER
// ======================================================

function Divider({
  colors,
}) {
  return (
    <View
      style={[
        styles.divider,
        {
          backgroundColor:
            colors.border,
        },
      ]}
    />
  );
}

// ======================================================
// INFO ROW
// ======================================================

function InfoRow({
  icon,
  label,
  value,
  colors,
}) {
  return (
    <View
      style={
        styles.infoRow
      }
    >
      <View
        style={[
          styles.infoIcon,
          {
            backgroundColor:
              colors.iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={
            colors.primaryLight
          }
        />
      </View>

      <View
        style={
          styles.infoTextContainer
        }
      >
        <Text
          style={[
            styles.infoLabel,
            {
              color:
                colors.secondaryText,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            {
              color:
                colors.text,
            },
          ]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles =
  StyleSheet.create({

    // ==================================================
    // MAIN
    // ==================================================

    container: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 40,
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: "700",
    },

    // ==================================================
    // HEADER
    // ==================================================

    header: {
      paddingHorizontal: 18,
      paddingTop:
        Platform.OS === "ios"
          ? 54
          : 44,
      paddingBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    headerLeft: {
      flex: 1,
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
      marginLeft: 10,
    },

    headerButton: {
      width: 43,
      height: 43,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    // ==================================================
    // PROFILE CARD
    // ==================================================

    profileCard: {
      borderWidth: 1,
      borderRadius: 26,
      paddingHorizontal: 18,
      paddingVertical: 20,
      alignItems: "center",
      marginBottom: 4,
    },

    avatarWrapper: {
      position: "relative",
      marginBottom: 11,
    },

    avatar: {
      width: 100,
      height: 100,
      borderRadius: 30,
      resizeMode: "cover",
    },

    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 30,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    avatarText: {
      fontSize: 31,
      fontWeight: "900",
    },

    cameraButton: {
      position: "absolute",
      right: -3,
      bottom: -2,
      width: 36,
      height: 36,
      borderRadius: 13,
      borderWidth: 3,
      alignItems: "center",
      justifyContent: "center",
    },

    profileName: {
      fontSize: 22,
      fontWeight: "900",
      textAlign: "center",
      marginTop: 1,
    },

    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 5,
      marginTop: 8,
    },

    profileRole: {
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 1.5,
      marginLeft: 4,
    },

    gymRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      maxWidth: "90%",
    },

    profileGym: {
      fontSize: 10,
      fontWeight: "600",
      marginLeft: 4,
      textAlign: "center",
    },

    removePhotoButton: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginTop: 12,
    },

    removePhotoText: {
      color: "#FF4D5E",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.8,
      marginLeft: 4,
    },

    // ==================================================
    // SECTION
    // ==================================================

    sectionTitle: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.2,
      marginTop: 20,
      marginBottom: 9,
    },

    // ==================================================
    // INFO CARD
    // ==================================================

    infoCard: {
      borderWidth: 1,
      borderRadius: 21,
      paddingHorizontal: 13,
      paddingVertical: 3,
    },

    infoRow: {
      minHeight: 67,
      flexDirection: "row",
      alignItems: "center",
    },

    infoIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    infoTextContainer: {
      flex: 1,
      justifyContent: "center",
    },

    infoLabel: {
      fontSize: 8,
      fontWeight: "700",
      marginBottom: 3,
    },

    infoValue: {
      fontSize: 12,
      fontWeight: "800",
    },

    divider: {
      height: 1,
      marginLeft: 54,
    },

    // ==================================================
    // ACCOUNT SETTINGS
    // ==================================================

    settingsButton: {
      minHeight: 70,
      borderWidth: 1,
      borderRadius: 21,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
    },

    settingsTitle: {
      fontSize: 12,
      fontWeight: "900",
      marginBottom: 3,
    },

    // ==================================================
    // LOGOUT
    // ==================================================

    logoutButton: {
      height: 54,
      marginTop: 18,
      borderRadius: 17,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    logoutText: {
      color: "#FF4D5E",
      fontSize: 12,
      fontWeight: "900",
      marginLeft: 8,
    },

    bottomSpace: {
      height: 30,
    },

  });