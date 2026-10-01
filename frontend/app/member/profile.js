import React, { useCallback, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";

import { router, useFocusEffect } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import * as ImagePicker from "expo-image-picker";

import { File } from "expo-file-system";

import { fetch as expoFetch } from "expo/fetch";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../context/ThemeContext";

const PROFILE_PICTURE_API =
  "http://192.168.1.43:8000/api/members/profile-picture/";

// Every key the member session is stored under.
const MEMBER_SESSION_KEYS = [
  "memberToken",
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
  "memberProfilePicture",
];

export default function MemberProfile() {
  const { colors, isDark, toggleTheme } = useTheme();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  // ==========================================================
  // SESSION
  // ==========================================================

  const clearSession = async () => {
    await AsyncStorage.multiRemove(
      MEMBER_SESSION_KEYS
    );

    router.replace("/");
  };

  // ==========================================================
  // UPLOAD PROFILE PHOTO
  // ==========================================================

  const uploadProfilePhoto = async (
    uri,
    token
  ) => {
    try {
      setUploadingPhoto(true);

      const formData = new FormData();

      formData.append(
        "profile_picture",
        new File(uri)
      );

      const response = await expoFetch(
        PROFILE_PICTURE_API,
        {
          method: "POST",
          headers: {
            "X-Member-Token": token,
          },
          body: formData,
        }
      );

      if (response.status === 401) {
        return clearSession();
      }

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Upload Failed",
          data.message ||
            "Unable to upload profile picture."
        );
        return;
      }

      if (data.profile_picture) {
        await AsyncStorage.setItem(
          "memberProfilePicture",
          data.profile_picture
        );

        setMember((current) => ({
          ...current,
          profilePicture:
            data.profile_picture,
        }));
      }

      Alert.alert(
        "Success",
        "Profile picture updated successfully."
      );
    } catch (error) {
      console.log(
        "MEMBER PHOTO UPLOAD ERROR:",
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

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const values =
        await AsyncStorage.multiGet(
          MEMBER_SESSION_KEYS
        );

      const session = Object.fromEntries(
        values
      );

      if (!session.memberToken) {
        return clearSession();
      }

      setMember({
        id: session.memberId || "",
        name: session.memberName || "Member",
        username: session.memberUsername || "",
        email: session.memberEmail || "",
        phone: session.memberPhone || "",
        status: session.memberStatus || "ACTIVE",
        membershipStart:
          session.memberMembershipStart || "",
        membershipEnd:
          session.memberMembershipEnd || "",
        workspaceName:
          session.memberWorkspaceName || "My Gym",
        profilePicture:
          session.memberProfilePicture || "",
      });

      // crop.js saves the cropped photo here and
      // returns to this screen.
      const pendingUri =
        await AsyncStorage.getItem(
          "pendingProfilePictureUri"
        );

      if (pendingUri) {
        // Remove first so a refresh can't upload it twice.
        await AsyncStorage.removeItem(
          "pendingProfilePictureUri"
        );

        await uploadProfilePhoto(
          pendingUri,
          session.memberToken
        );
      }
    } catch (error) {
      console.log(
        "MEMBER PROFILE ERROR:",
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

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  // ==========================================================
  // PICK PROFILE PHOTO
  // ==========================================================

  const pickProfilePhoto = async () => {
    if (uploadingPhoto) {
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow photo library access to select a profile picture."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.85,
        });

      if (
        result.canceled ||
        !result.assets?.[0]
      ) {
        return;
      }

      router.push({
        pathname: "/crop",
        params: {
          uri: result.assets[0].uri,
        },
      });
    } catch (error) {
      console.log(
        "MEMBER IMAGE PICKER ERROR:",
        error
      );

      Alert.alert(
        "Photo Error",
        "Unable to select the photo."
      );
    }
  };

  // ==========================================================
  // REMOVE PROFILE PHOTO
  // ==========================================================

  const removeProfilePhoto = () => {
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
          onPress: async () => {
            try {
              setUploadingPhoto(true);

              const token =
                await AsyncStorage.getItem(
                  "memberToken"
                );

              const response = await fetch(
                PROFILE_PICTURE_API,
                {
                  method: "DELETE",
                  headers: {
                    "X-Member-Token":
                      token || "",
                  },
                }
              );

              if (response.status === 401) {
                return clearSession();
              }

              if (!response.ok) {
                throw new Error(
                  "Remove failed"
                );
              }

              await AsyncStorage.removeItem(
                "memberProfilePicture"
              );

              setMember((current) => ({
                ...current,
                profilePicture: "",
              }));
            } catch (error) {
              console.log(
                "MEMBER PHOTO REMOVE ERROR:",
                error
              );

              Alert.alert(
                "Error",
                "Unable to remove profile picture."
              );
            } finally {
              setUploadingPhoto(false);
            }
          },
        },
      ]
    );
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout = () => {
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
          onPress: clearSession,
        },
      ]
    );
  };

  // ==========================================================
  // COMING SOON
  // ==========================================================

  const showComingSoon = (title) => {
    Alert.alert(
      title,
      `${title} will be connected in the next phase.`
    );
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading || !member) {
    return (
      <View
        style={[
          styles.center,
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
          Loading profile...
        </Text>
      </View>
    );
  }

  const statusColor =
    member.status === "EXPIRED"
      ? "#FF5870"
      : member.status === "EXPIRING"
      ? "#FFB21C"
      : "#45E0A5";

  const headerButton = [
    styles.headerButton,
    {
      backgroundColor:
        colors.card,
      borderColor:
        colors.border,
    },
  ];

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

      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text
            style={[
              styles.eyebrow,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            GYMRYT • MEMBER
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
            My Profile
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={headerButton}
            onPress={toggleTheme}
            activeOpacity={0.8}
          >
            <Ionicons
              name={
                isDark
                  ? "sunny-outline"
                  : "moon-outline"
              }
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={headerButton}
            onPress={() =>
              router.back()
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
      >

        {/* PROFILE CARD */}

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
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              onPress={pickProfilePhoto}
              disabled={uploadingPhoto}
              activeOpacity={0.85}
              style={[
                styles.profilePhotoWrapper,
                {
                  backgroundColor:
                    colors.iconBackground,
                  borderColor:
                    `${statusColor}88`,
                },
              ]}
            >
              {member.profilePicture ? (
                <Image
                  source={{
                    uri: member.profilePicture,
                  }}
                  style={
                    styles.profilePhoto
                  }
                />
              ) : (
                <Text
                  style={[
                    styles.profileInitials,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  {getInitials(
                    member.name
                  )}
                </Text>
              )}
            </TouchableOpacity>

            {/* CHANGE PHOTO */}

            <TouchableOpacity
              style={[
                styles.cameraButton,
                {
                  backgroundColor:
                    colors.primaryLight,
                  borderColor:
                    colors.card,
                },
              ]}
              onPress={pickProfilePhoto}
              disabled={uploadingPhoto}
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
            </TouchableOpacity>
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
            {member.name}
          </Text>

          {/* STATUS */}

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  `${statusColor}18`,
                borderColor:
                  `${statusColor}55`,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    statusColor,
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    statusColor,
                },
              ]}
            >
              {member.status}
            </Text>
          </View>

          {/* GYM */}

          <View style={styles.gymRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={
                colors.secondaryText
              }
            />

            <Text
              style={[
                styles.gymText,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
              numberOfLines={1}
            >
              {member.workspaceName}
            </Text>
          </View>

          {/* REMOVE PHOTO */}

          {member.profilePicture &&
            !uploadingPhoto ? (
            <TouchableOpacity
              onPress={removeProfilePhoto}
              style={styles.removePhotoButton}
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
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ACCOUNT INFORMATION */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
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
          <Info
            icon="at-outline"
            label="Username"
            value={
              member.username
                ? `@${member.username}`
                : ""
            }
            colors={colors}
          />

          <Divider colors={colors} />

          <Info
            icon="mail-outline"
            label="Email"
            value={member.email}
            colors={colors}
          />

          <Divider colors={colors} />

          <Info
            icon="call-outline"
            label="Phone"
            value={member.phone}
            colors={colors}
          />

          <Divider colors={colors} />

          <Info
            icon="card-outline"
            label="Member ID"
            value={
              member.id
                ? `#${member.id}`
                : ""
            }
            colors={colors}
          />
        </View>

        {/* MEMBERSHIP */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          MEMBERSHIP
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
          <Info
            icon="calendar-outline"
            label="Start Date"
            value={member.membershipStart}
            colors={colors}
          />

          <Divider colors={colors} />

          <Info
            icon="calendar-clear-outline"
            label="End Date"
            value={member.membershipEnd}
            colors={colors}
          />

          <Divider colors={colors} />

          <Info
            icon="location-outline"
            label="Gym"
            value={member.workspaceName}
            colors={colors}
          />
        </View>

        {/* LOGOUT */}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={logout}
          style={[
            styles.logoutButton,
            {
              backgroundColor:
                isDark
                  ? "#100D15"
                  : "#FFF5F6",
            },
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={21}
            color="#FF4D5E"
          />

          <Text
            style={
              styles.logoutTitle
            }
          >
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MEMBER NAVBAR */}

      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor:
              colors.card,
            borderColor:
              colors.border,
          },
        ]}
      >
        <BottomNavItem
          icon="home"
          label="Home"
          colors={colors}
          onPress={() =>
            router.replace(
              "/member/dashboard"
            )
          }
        />

        <BottomNavItem
          icon="checkmark-circle-outline"
          label="Attendance"
          colors={colors}
          onPress={() =>
            showComingSoon(
              "Attendance"
            )
          }
        />

        <BottomNavItem
          icon="card-outline"
          label="Payments"
          colors={colors}
          onPress={() =>
            showComingSoon(
              "Payments"
            )
          }
        />

        <BottomNavItem
          icon="person-outline"
          label="Profile"
          active
          colors={colors}
          onPress={() => {}}
        />
      </View>
    </View>
  );
}

/* =====================================================
   INITIALS
===================================================== */

function getInitials(name) {
  const parts = String(name || "M")
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
}

/* =====================================================
   DIVIDER
===================================================== */

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

/* =====================================================
   INFO
===================================================== */

function Info({
  icon,
  label,
  value,
  colors,
}) {
  return (
    <View style={styles.infoRow}>
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
          size={20}
          color={
            colors.primaryLight
          }
        />
      </View>

      <View style={styles.infoText}>
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
          {value || "Not available"}
        </Text>
      </View>
    </View>
  );
}

/* =====================================================
   NAV ITEM
===================================================== */

function BottomNavItem({
  icon,
  label,
  active = false,
  colors,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={
        styles.bottomNavItem
      }
    >
      <View
        style={[
          styles.bottomIconContainer,
          active && {
            backgroundColor:
              colors.iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={
            active
              ? colors.primaryLight
              : colors.secondaryText
          }
        />
      </View>

      <Text
        style={[
          styles.bottomLabel,
          {
            color: active
              ? colors.primaryLight
              : colors.secondaryText,
          },
        ]}
      >
        {label}
      </Text>

      {active && (
        <View
          style={[
            styles.activeIndicator,
            {
              backgroundColor:
                colors.primaryLight,
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: "700",
    },

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

    title: {
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

    content: {
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 125,
    },

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

    profilePhotoWrapper: {
      width: 100,
      height: 100,
      borderRadius: 30,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },

    profilePhoto: {
      width: "100%",
      height: "100%",
    },

    profileInitials: {
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

    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 5,
      marginTop: 8,
    },

    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 5,
    },

    statusText: {
      fontSize: 7.5,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    gymRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      maxWidth: "90%",
    },

    gymText: {
      fontSize: 10,
      fontWeight: "600",
      marginLeft: 4,
    },

    removePhotoButton: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#FF4D5E55",
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

    sectionTitle: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.2,
      marginTop: 20,
      marginBottom: 9,
    },

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

    infoText: {
      flex: 1,
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

    logoutButton: {
      height: 54,
      marginTop: 18,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: "#55202B",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    logoutTitle: {
      color: "#FF4D5E",
      fontSize: 12,
      fontWeight: "900",
      marginLeft: 8,
    },

    bottomNav: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 82,
      borderTopWidth: 1,
      borderTopLeftRadius: 27,
      borderTopRightRadius: 27,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-around",
      paddingTop: 8,
      elevation: 20,
      shadowOffset: {
        width: 0,
        height: -4,
      },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },

    bottomNavItem: {
      flex: 1,
      height: 70,
      alignItems: "center",
      justifyContent: "flex-start",
    },

    bottomIconContainer: {
      width: 42,
      height: 35,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },

    bottomLabel: {
      fontSize: 7.5,
      fontWeight: "800",
      marginTop: 2,
    },

    activeIndicator: {
      width: 25,
      height: 3,
      borderRadius: 3,
      marginTop: 4,
    },
  });