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
} from "react-native";

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
  "http://192.168.1.49:8000";

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
        style={[
          styles.header,
          {
            borderBottomColor:
              colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          style={[
            styles.backButton,
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
              styles.backIcon,
              {
                color:
                  colors.text,
              },
            ]}
          >
            ←
          </Text>
        </Pressable>

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

        <View
          style={
            styles.headerSpacer
          }
        />
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

          {/* ==================================================
              PROFILE AVATAR
          ================================================== */}

          <Pressable
            onPress={
              handleProfilePhoto
            }
            disabled={
              uploadingPhoto
            }
            style={
              styles.avatarPressable
            }
          >

            {profilePicture ? (
              <Image
                source={{
                  uri:
                    profilePicture,
                }}
                style={
                  styles.profileAvatarImage
                }
              />
            ) : (
              <View
                style={[
                  styles.profileAvatar,
                  {
                    backgroundColor:
                      colors.primary,
                  },
                ]}
              >
                <Text
                  style={
                    styles.profileAvatarText
                  }
                >
                  {getInitials(
                    admin.username
                  )}
                </Text>
              </View>
            )}

            {/* ==================================================
                CAMERA BADGE
            ================================================== */}

            <View
              style={[
                styles.cameraBadge,
                {
                  backgroundColor:
                    colors.primary,
                  borderColor:
                    colors.card,
                },
              ]}
            >
              <Text
                style={
                  styles.cameraIcon
                }
              >
                📷
              </Text>
            </View>

            {/* ==================================================
                UPLOAD LOADER
            ================================================== */}

            {uploadingPhoto && (
              <View
                style={[
                  styles.photoLoadingOverlay,
                  {
                    backgroundColor:
                      "rgba(0,0,0,0.55)",
                  },
                ]}
              >
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              </View>
            )}

          </Pressable>

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

          <Text
            style={[
              styles.profileGym,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            {admin.workspaceName ||
              "My Gym"}
          </Text>

          {/* ==================================================
              REMOVE PHOTO
          ================================================== */}

          {profilePicture &&
            !uploadingPhoto && (
              <Pressable
                onPress={
                  removeProfilePhoto
                }
                style={
                  styles.removePhotoButton
                }
              >
                <Text
                  style={[
                    styles.removePhotoText,
                    {
                      color:
                        colors.danger,
                    },
                  ]}
                >
                  REMOVE
                </Text>
              </Pressable>
            )}

        </View>

        {/* ==================================================
            ACCOUNT INFORMATION
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.mutedText,
            },
          ]}
        >
          ACCOUNT INFORMATION
        </Text>

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

          {/* USERNAME */}

          <View
            style={
              styles.infoRow
            }
          >
            <View
              style={
                styles.infoLeft
              }
            >
              <View
                style={[
                  styles.infoIconBox,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >
                <Text
                  style={
                    styles.infoIcon
                  }
                >
                  👤
                </Text>
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
                        colors.mutedText,
                    },
                  ]}
                >
                  Username
                </Text>

                <Text
                  style={[
                    styles.infoValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {admin.username
                    ? `@${admin.username}`
                    : "--"}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          {/* ADMIN ID */}

          <View
            style={
              styles.infoRow
            }
          >
            <View
              style={
                styles.infoLeft
              }
            >
              <View
                style={[
                  styles.infoIconBox,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >
                <Text
                  style={
                    styles.infoIcon
                  }
                >
                  🆔
                </Text>
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
                        colors.mutedText,
                    },
                  ]}
                >
                  Admin ID
                </Text>

                <Text
                  style={[
                    styles.infoValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {admin.id ||
                    "--"}
                </Text>
              </View>
            </View>
          </View>

        </View>

        {/* ==================================================
            GYM INFORMATION
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.mutedText,
            },
          ]}
        >
          GYM INFORMATION
        </Text>

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

          {/* GYM NAME */}

          <View
            style={
              styles.infoRow
            }
          >
            <View
              style={
                styles.infoLeft
              }
            >
              <View
                style={[
                  styles.infoIconBox,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >
                <Text
                  style={
                    styles.infoIcon
                  }
                >
                  🏋️
                </Text>
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
                        colors.mutedText,
                    },
                  ]}
                >
                  Gym Name
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
                  {admin.workspaceName ||
                    "My Gym"}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          {/* WORKSPACE ID */}

          <View
            style={
              styles.infoRow
            }
          >
            <View
              style={
                styles.infoLeft
              }
            >
              <View
                style={[
                  styles.infoIconBox,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >
                <Text
                  style={
                    styles.infoIcon
                  }
                >
                  🔑
                </Text>
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
                        colors.mutedText,
                    },
                  ]}
                >
                  Workspace ID
                </Text>

                <Text
                  style={[
                    styles.infoValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {admin.workspaceId ||
                    "--"}
                </Text>
              </View>
            </View>
          </View>

        </View>

        {/* ==================================================
            ACCOUNT
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.mutedText,
            },
          ]}
        >
          ACCOUNT
        </Text>

        <View
          style={[
            styles.accountCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >

          {/* ACCOUNT SETTINGS */}

          <Pressable
            onPress={
              handleAccountSettings
            }
            style={({ pressed }) => [
              styles.accountButton,
              {
                opacity:
                  pressed
                    ? 0.7
                    : 1,
              },
            ]}
          >
            <View
              style={[
                styles.accountIconContainer,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >
              <Text
                style={
                  styles.accountIcon
                }
              >
                ⚙️
              </Text>
            </View>

            <View
              style={
                styles.accountContent
              }
            >
              <Text
                style={[
                  styles.accountTitle,
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
                  styles.accountSubtitle,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                Manage your account settings
              </Text>
            </View>

            <Text
              style={[
                styles.accountArrow,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              →
            </Text>
          </Pressable>

          <View
            style={[
              styles.accountDivider,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          {/* LOGOUT */}

          <Pressable
            onPress={
              handleLogout
            }
            style={({ pressed }) => [
              styles.accountButton,
              {
                opacity:
                  pressed
                    ? 0.7
                    : 1,
              },
            ]}
          >
            <View
              style={[
                styles.accountIconContainer,
                {
                  backgroundColor:
                    colors.danger,
                },
              ]}
            >
              <Text
                style={
                  styles.logoutIcon
                }
              >
                ↪
              </Text>
            </View>

            <View
              style={
                styles.accountContent
              }
            >
              <Text
                style={[
                  styles.accountTitle,
                  {
                    color:
                      colors.danger,
                  },
                ]}
              >
                Logout
              </Text>

              <Text
                style={[
                  styles.accountSubtitle,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                Sign out of your admin account
              </Text>
            </View>

            <Text
              style={[
                styles.accountArrow,
                {
                  color:
                    colors.danger,
                },
              ]}
            >
              →
            </Text>
          </Pressable>

        </View>

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
// STYLES
// ======================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 15,
      fontSize: 13,
    },

    // ==================================================
    // HEADER
    // ==================================================

    header: {
      height: 76,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      borderBottomWidth: 1,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },

    backIcon: {
      fontSize: 24,
      fontWeight: "500",
    },

    headerTitle: {
      flex: 1,
      fontSize: 21,
      fontWeight: "900",
      marginLeft: 15,
    },

    headerSpacer: {
      width: 42,
    },

    // ==================================================
    // CONTENT
    // ==================================================

    content: {
      paddingHorizontal: 20,
      paddingTop: 25,
      paddingBottom: 40,
    },

    // ==================================================
    // PROFILE CARD
    // ==================================================

    profileCard: {
      borderRadius: 22,
      borderWidth: 1,
      alignItems: "center",
      paddingVertical: 30,
      paddingHorizontal: 20,
      marginBottom: 28,
    },

    avatarPressable: {
      width: 92,
      height: 92,
      borderRadius: 46,
      marginBottom: 15,
      position: "relative",
    },

    profileAvatar: {
      width: 92,
      height: 92,
      borderRadius: 46,
      alignItems: "center",
      justifyContent: "center",
    },

    profileAvatarImage: {
      width: 92,
      height: 92,
      borderRadius: 46,
    },

    profileAvatarText: {
      color: "#FFFFFF",
      fontSize: 34,
      fontWeight: "900",
    },

    // ==================================================
    // CAMERA BADGE
    // ==================================================

    cameraBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 31,
      height: 31,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
    },

    cameraIcon: {
      fontSize: 13,
    },

    photoLoadingOverlay: {
      position: "absolute",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      borderRadius: 46,
      alignItems: "center",
      justifyContent: "center",
    },

    profileName: {
      fontSize: 24,
      fontWeight: "900",
      textAlign: "center",
    },

    profileRole: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.8,
      marginTop: 7,
    },

    profileGym: {
      fontSize: 13,
      marginTop: 7,
      textAlign: "center",
    },

    // ==================================================
    // REMOVE PHOTO
    // ==================================================

    removePhotoButton: {
      marginTop: 14,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },

    removePhotoText: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.7,
    },

    // ==================================================
    // SECTION
    // ==================================================

    sectionTitle: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.8,
      marginBottom: 13,
    },

    // ==================================================
    // INFORMATION CARD
    // ==================================================

    infoCard: {
      borderRadius: 18,
      borderWidth: 1,
      paddingHorizontal: 15,
      marginBottom: 25,
    },

    infoRow: {
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
    },

    infoLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    infoIconBox: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 13,
    },

    infoIcon: {
      fontSize: 18,
    },

    infoTextContainer: {
      flex: 1,
    },

    infoLabel: {
      fontSize: 11,
      marginBottom: 4,
    },

    infoValue: {
      fontSize: 14,
      fontWeight: "800",
    },

    divider: {
      height: 1,
    },

    // ==================================================
    // ACCOUNT
    // ==================================================

    accountCard: {
      borderRadius: 18,
      borderWidth: 1,
      paddingHorizontal: 15,
      marginBottom: 10,
    },

    accountButton: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
    },

    accountIconContainer: {
      width: 45,
      height: 45,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    accountIcon: {
      fontSize: 20,
    },

    logoutIcon: {
      color: "#FFFFFF",
      fontSize: 22,
      fontWeight: "800",
    },

    accountContent: {
      flex: 1,
      marginLeft: 14,
    },

    accountTitle: {
      fontSize: 15,
      fontWeight: "900",
    },

    accountSubtitle: {
      fontSize: 12,
      marginTop: 4,
    },

    accountArrow: {
      fontSize: 22,
      fontWeight: "600",
    },

    accountDivider: {
      height: 1,
    },

    bottomSpace: {
      height: 20,
    },

  });