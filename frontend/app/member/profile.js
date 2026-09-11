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

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../context/ThemeContext";

const API =
  "http://192.168.1.49:8000/api/members/trainer/profile/";

export default function TrainerProfile() {
  const { colors } = useTheme();

  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const token =
        await AsyncStorage.getItem("adminToken");

      if (!token) {
        router.replace("/");
        return;
      }

      const response = await fetch(API, {
        headers: {
          Accept: "application/json",
          Authorization: `Token ${token}`,
        },
      });

      if (response.status === 401) {
        router.replace("/");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Could not load trainer profile."
        );
      }

      setTrainer(data.trainer);
    } catch (error) {
      console.log(
        "TRAINER PROFILE ERROR:",
        error
      );

      Alert.alert(
        "Error",
        error.message ||
          "Could not load trainer profile."
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

  const getInitials = (name) => {
    if (!name) return "T";

    const parts = name
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

  const logout = async () => {
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
          onPress: async () => {
            await AsyncStorage.multiRemove([
              "adminToken",
              "adminUsername",
              "adminId",
              "userRole",
              "workspaceId",
              "workspaceName",
            ]);

            router.replace("/");
          },
        },
      ]
    );
  };

  if (loading) {
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

  const trainerName =
    trainer?.name ||
    trainer?.username ||
    "Trainer";

  const profilePicture =
    trainer?.profile_picture ||
    trainer?.profile_image ||
    null;

  const specialization =
    trainer?.specialization ||
    "Personal Training";

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
      >

        {/* BACK */}

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
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        {/* HEADER */}

        <Text
          style={[
            styles.eyebrow,
            {
              color:
                colors.primaryLight,
            },
          ]}
        >
          GYMRYT • TRAINER
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

          {/* PROFILE PHOTO */}

          <View
            style={[
              styles.profilePhotoWrapper,
              {
                backgroundColor:
                  colors.iconBackground,
                borderColor:
                  colors.primary,
              },
            ]}
          >

            {profilePicture ? (
              <Image
                source={{
                  uri: profilePicture,
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
                  trainerName
                )}
              </Text>
            )}

          </View>

          {/* CHANGE PHOTO */}

          <TouchableOpacity
            style={styles.changePhotoButton}
            onPress={() => {
              Alert.alert(
                "Profile Photo",
                "Photo upload will be connected here."
              );
            }}
          >
            <Ionicons
              name="camera-outline"
              size={14}
              color={
                colors.primaryLight
              }
            />

            <Text
              style={[
                styles.changePhotoText,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              CHANGE PHOTO
            </Text>
          </TouchableOpacity>

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
            {trainerName}
          </Text>

          {/* USERNAME */}

          <Text
            style={[
              styles.username,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            @{trainer?.username || "trainer"}
          </Text>

          {/* SPECIALIZATION */}

          <Text
            style={[
              styles.specialization,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            {specialization}
          </Text>

        </View>

        {/* PERSONAL INFORMATION */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.mutedText,
            },
          ]}
        >
          PERSONAL INFORMATION
        </Text>

        <Info
          label="EMAIL"
          value={trainer?.email}
          colors={colors}
        />

        <Info
          label="PHONE"
          value={trainer?.phone}
          colors={colors}
        />

        <Info
          label="SPECIALIZATION"
          value={
            trainer?.specialization
          }
          colors={colors}
        />

        <Info
          label="EXPERIENCE"
          value={`${trainer?.experience_years || 0} years`}
          colors={colors}
        />

        <Info
          label="GYM"
          value={
            trainer?.workspace_name
          }
          colors={colors}
        />

        {trainer?.bio ? (
          <Info
            label="BIO"
            value={trainer.bio}
            colors={colors}
          />
        ) : null}

        {/* ACCOUNT */}

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

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={logout}
          style={[
            styles.logoutCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >

          <View
            style={[
              styles.logoutIcon,
              {
                backgroundColor:
                  colors.dangerBackground,
              },
            ]}
          >
            <Ionicons
              name="log-out-outline"
              size={24}
              color={colors.danger}
            />
          </View>

          <View
            style={
              styles.logoutContent
            }
          >
            <Text
              style={[
                styles.logoutTitle,
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
                styles.logoutSubtitle,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Sign out of your account
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color={colors.secondaryText}
          />

        </TouchableOpacity>

      </ScrollView>

      {/* CONSTANT NAVBAR */}

      <TrainerBottomNav
        colors={colors}
        active="profile"
      />

    </View>
  );
}

/* =====================================================
   INFO
===================================================== */

function Info({
  label,
  value,
  colors,
}) {
  return (
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

      <Text
        style={[
          styles.infoLabel,
          {
            color:
              colors.mutedText,
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
      >
        {value || "Not available"}
      </Text>

    </View>
  );
}

/* =====================================================
   TRAINER NAVBAR
===================================================== */

function TrainerBottomNav({
  colors,
  active,
}) {
  const goTo = (screen) => {
    if (screen === "home") {
      router.replace(
        "/trainer/dashboard"
      );
    }

    if (screen === "members") {
      router.replace(
        "/trainer/members"
      );
    }

    if (screen === "workouts") {
      router.replace(
        "/trainer/workouts"
      );
    }

    if (screen === "profile") {
      router.replace(
        "/trainer/profile"
      );
    }
  };

  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor:
            colors.nav ||
            colors.card,
          borderTopColor:
            colors.border,
        },
      ]}
    >

      <BottomNavItem
        icon="home"
        label="Home"
        active={
          active === "home"
        }
        colors={colors}
        onPress={() =>
          goTo("home")
        }
      />

      <BottomNavItem
        icon="people-outline"
        label="Members"
        active={
          active === "members"
        }
        colors={colors}
        onPress={() =>
          goTo("members")
        }
      />

      <BottomNavItem
        icon="barbell-outline"
        label="Workouts"
        active={
          active === "workouts"
        }
        colors={colors}
        onPress={() =>
          goTo("workouts")
        }
      />

      <BottomNavItem
        icon="person-outline"
        label="Profile"
        active={
          active === "profile"
        }
        colors={colors}
        onPress={() =>
          goTo("profile")
        }
      />

    </View>
  );
}

/* =====================================================
   NAV ITEM
===================================================== */

function BottomNavItem({
  icon,
  label,
  active,
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
          size={27}
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

    content: {
      paddingHorizontal: 20,
      paddingTop:
        Platform.OS === "ios"
          ? 55
          : 45,
      paddingBottom: 125,
    },

    backButton: {
      width: 45,
      height: 45,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 25,
    },

    eyebrow: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.5,
    },

    title: {
      fontSize: 29,
      fontWeight: "900",
      marginTop: 3,
      marginBottom: 22,
    },

    profileCard: {
      borderWidth: 1,
      borderRadius: 20,
      alignItems: "center",
      paddingVertical: 28,
      paddingHorizontal: 20,
      marginBottom: 27,
    },

    profilePhotoWrapper: {
      width: 110,
      height: 110,
      borderRadius: 55,
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
      fontSize: 34,
      fontWeight: "900",
    },

    changePhotoButton: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 13,
    },

    changePhotoText: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1,
      marginLeft: 5,
    },

    profileName: {
      fontSize: 20,
      fontWeight: "900",
      marginTop: 15,
    },

    username: {
      fontSize: 11,
      marginTop: 4,
    },

    specialization: {
      fontSize: 12,
      fontWeight: "700",
      marginTop: 9,
    },

    sectionTitle: {
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.5,
      marginBottom: 13,
    },

    infoCard: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 15,
      marginBottom: 10,
    },

    infoLabel: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
    },

    infoValue: {
      fontSize: 13,
      fontWeight: "800",
      marginTop: 5,
    },

    logoutCard: {
      minHeight: 80,
      borderWidth: 1,
      borderRadius: 17,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },

    logoutIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    logoutContent: {
      flex: 1,
      marginLeft: 13,
    },

    logoutTitle: {
      fontSize: 14,
      fontWeight: "900",
    },

    logoutSubtitle: {
      fontSize: 10,
      marginTop: 4,
    },

    bottomNav: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 78,
      borderTopWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingHorizontal: 8,
    },

    bottomNavItem: {
      alignItems: "center",
      justifyContent: "center",
      width: 78,
      height: 65,
    },

    bottomIconContainer: {
      width: 48,
      height: 39,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    bottomLabel: {
      fontSize: 9,
      fontWeight: "700",
      marginTop: 2,
    },

    activeIndicator: {
      width: 32,
      height: 4,
      borderRadius: 4,
      marginTop: 6,
    },

  });