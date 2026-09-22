import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import AsyncStorage from
  "@react-native-async-storage/async-storage";

import {
  router,
  useFocusEffect,
} from "expo-router";

import * as ImagePicker from
  "expo-image-picker";

import { File } from
  "expo-file-system";

import {
  useTheme,
} from "../../context/ThemeContext";


// ============================================================
// API CONFIG
// ============================================================

const API_BASE_URL =
  "http://192.168.1.52:8000/api/members";

const BACKEND_BASE_URL =
  "http://192.168.1.52:8000";


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TrainerProfile() {

  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();


  // ==========================================================
  // STATE
  // ==========================================================

  const [trainer, setTrainer] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);


  // ==========================================================
  // GET TOKEN
  // ==========================================================

  const getToken = async () => {

    try {

      return await AsyncStorage.getItem(
        "adminToken"
      );

    } catch (error) {

      console.log(
        "Token error:",
        error
      );

      return null;
    }
  };


  // ==========================================================
  // FULL IMAGE URL
  // ==========================================================

  const getFullImageUrl = (
    image
  ) => {

    if (!image) {
      return null;
    }

    if (
      image.startsWith(
        "http://"
      ) ||
      image.startsWith(
        "https://"
      )
    ) {
      return image;
    }

    if (
      image.startsWith("/")
    ) {
      return `${BACKEND_BASE_URL}${image}`;
    }

    return `${BACKEND_BASE_URL}/${image}`;
  };


  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  const loadTrainerProfile =
    async () => {

      try {

        setLoading(true);

        const token =
          await getToken();


        if (!token) {

          Alert.alert(
            "Session Expired",
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


        const response =
          await fetch(
            `${API_BASE_URL}/trainer/profile/`,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",

                Authorization:
                  `Token ${token}`,
              },
            }
          );


        const contentType =
          response.headers.get(
            "content-type"
          ) || "";


        let data;


        if (
          contentType.includes(
            "application/json"
          )
        ) {

          data =
            await response.json();

        } else {

          const text =
            await response.text();

          console.log(
            "PROFILE SERVER RESPONSE:",
            text
          );

          throw new Error(
            `Server returned HTTP ${response.status}`
          );
        }


        console.log(
          "TRAINER PROFILE:",
          data
        );


        if (!response.ok) {

          throw new Error(
            data?.detail ||
            data?.message ||
            data?.error ||
            "Unable to load trainer profile."
          );
        }


        setTrainer(
          data.trainer ||
          data
        );

      } catch (error) {

        console.log(
          "Trainer profile error:",
          error
        );

        Alert.alert(
          "Profile Error",
          error?.message ||
            "Unable to load trainer profile."
        );

      } finally {

        setLoading(false);
      }
    };


  // ==========================================================
  // LOAD WHEN SCREEN FOCUSES
  // ==========================================================

  useFocusEffect(
    useCallback(() => {

      loadTrainerProfile();

    }, [])
  );


  // ==========================================================
  // TRAINER NAME
  // ==========================================================

  const getTrainerName =
    () => {

      if (!trainer) {
        return "Trainer";
      }

      return (
        trainer.name ||
        trainer.full_name ||
        trainer.username ||
        "Trainer"
      );
    };


  // ==========================================================
  // INITIALS
  // ==========================================================

  const getInitials =
    () => {

      return getTrainerName()
        .split(" ")
        .filter(Boolean)
        .map(
          (part) =>
            part[0]
        )
        .join("")
        .slice(0, 2)
        .toUpperCase();
    };


  // ==========================================================
  // GYM NAME
  // ==========================================================

  const getGymName =
    () => {

      if (!trainer) {
        return "Your Gym";
      }

      return (
        trainer.workspace_name ||
        trainer.gym_name ||
        trainer.workspace?.name ||
        "Your Gym"
      );
    };


  // ==========================================================
  // PROFILE IMAGE
  // ==========================================================

  const getProfileImage =
    () => {

      if (!trainer) {
        return null;
      }

      return getFullImageUrl(
        trainer.profile_picture ||
        trainer.profile_image ||
        trainer.image ||
        null
      );
    };


  // ==========================================================
  // CHANGE PHOTO
  // ==========================================================

  const handleChangePhoto =
    async () => {

      try {

        const permission =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();


        if (
          permission.status !==
          "granted"
        ) {

          Alert.alert(
            "Permission Required",
            "Please allow photo library access to change your profile picture."
          );

          return;
        }


        const result =
          await ImagePicker
            .launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: false,
              quality: 0.9,
            });


        if (
          result.canceled ||
          !result.assets ||
          result.assets.length === 0
        ) {
          return;
        }


        const asset =
          result.assets[0];


        if (!asset?.uri) {

          Alert.alert(
            "Image Error",
            "Could not read the selected image."
          );

          return;
        }


        console.log(
          "TRAINER SELECTED IMAGE:",
          asset.uri
        );


        console.log(
          "TRAINER IMAGE TYPE:",
          asset.mimeType
        );


        console.log(
          "TRAINER IMAGE NAME:",
          asset.fileName
        );


        // ----------------------------------------------------
        // OPEN CUSTOM GYMRyT CROP SCREEN
        // ----------------------------------------------------

        router.push({
          pathname: "/crop",

          params: {
            uri: asset.uri,
          },
        });

      } catch (error) {

        console.log(
          "Image picker error:",
          error
        );

        Alert.alert(
          "Photo Error",
          error?.message ||
            "Unable to select the image."
        );
      }
    };


  // ==========================================================
  // UPLOAD PROFILE PHOTO
  // ==========================================================

  const uploadProfilePhoto =
    async (
      image
    ) => {

      try {

        setUploadingPhoto(true);


        const token =
          await getToken();


        if (!token) {

          Alert.alert(
            "Session Expired",
            "Please login again."
          );

          return;
        }


        if (!image?.uri) {

          throw new Error(
            "Selected image could not be accessed."
          );
        }


        console.log(
          "IMAGE URI:",
          image.uri
        );


        // ----------------------------------------------------
        // CREATE REAL EXPO FILE
        // ----------------------------------------------------

        const file =
          new File(
            image.uri
          );


        console.log(
          "FILE URI:",
          file.uri
        );


        console.log(
          "FILE NAME:",
          file.name
        );


        console.log(
          "FILE TYPE:",
          file.type
        );


        if (!file.exists) {

          throw new Error(
            "The selected image file could not be found."
          );
        }


        // ----------------------------------------------------
        // FORMDATA
        // ----------------------------------------------------

        const formData =
          new FormData();


        formData.append(
          "profile_picture",
          file
        );


        console.log(
          "Uploading profile picture..."
        );


        // ----------------------------------------------------
        // PATCH
        // ----------------------------------------------------

        const response =
          await fetch(
            `${API_BASE_URL}/trainer/profile/`,
            {
              method: "PATCH",

              headers: {
                Accept:
                  "application/json",

                Authorization:
                  `Token ${token}`,
              },

              body: formData,
            }
          );


        const contentType =
          response.headers.get(
            "content-type"
          ) || "";


        let data;


        if (
          contentType.includes(
            "application/json"
          )
        ) {

          data =
            await response.json();

        } else {

          const text =
            await response.text();

          console.log(
            "PHOTO UPLOAD SERVER RESPONSE:",
            text
          );

          throw new Error(
            `Server returned HTTP ${response.status}`
          );
        }


        console.log(
          "PHOTO UPLOAD RESPONSE:",
          data
        );


        if (!response.ok) {

          throw new Error(
            data?.detail ||
            data?.message ||
            data?.error ||
            JSON.stringify(data) ||
            "Unable to upload profile picture."
          );
        }


        // ----------------------------------------------------
        // SUPPORT BOTH RESPONSE FORMATS
        // ----------------------------------------------------

        const updatedTrainer =
          data?.trainer ||
          data;


        setTrainer(
          updatedTrainer
        );


        Alert.alert(
          "Success",
          "Profile picture updated successfully."
        );

      } catch (error) {

        console.log(
          "Profile photo upload error:",
          error
        );

        Alert.alert(
          "Upload Failed",
          error?.message ||
            "Unable to upload profile picture."
        );

      } finally {

        setUploadingPhoto(false);
      }
    };


  // ==========================================================
  // LOGOUT
  // ==========================================================

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


  // ==========================================================
  // PERFORM LOGOUT
  // ==========================================================

  const performLogout =
    async () => {

      try {

        setLoggingOut(true);


        await AsyncStorage.multiRemove([
          "adminToken",
          "adminUsername",
          "adminId",
          "userRole",
          "workspaceId",
          "workspaceName",
          "access_token",
          "refresh_token",
          "token",
          "user",
          "trainer",
          "role",
        ]);


        router.replace("/");

      } catch (error) {

        console.log(
          "Logout error:",
          error
        );

        Alert.alert(
          "Logout Error",
          "Unable to logout. Please try again."
        );

      } finally {

        setLoggingOut(false);
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
          color={
            colors.primary
          }
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                colors.secondaryText ||
                colors.mutedText,
            },
          ]}
        >
          Loading profile...
        </Text>

      </View>
    );
  }


  // ==========================================================
  // MAIN UI
  // ==========================================================

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

      {/* ======================================================
          HEADER
      ====================================================== */}

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
            GYMRYT • TRAINER
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


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }

        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* ====================================================
            PROFILE HERO
        ==================================================== */}

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

            {getProfileImage() ? (

              <Image
                source={{
                  uri:
                    getProfileImage(),
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
                  {getInitials()}
                </Text>

              </View>
            )}


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
                handleChangePhoto
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
            {getTrainerName()}
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
              name="fitness-outline"
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
              TRAINER
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
                    colors.secondaryText ||
                    colors.mutedText,
                },
              ]}

              numberOfLines={1}
            >
              {getGymName()}
            </Text>

          </View>

        </View>


        {/* ====================================================
            ACCOUNT INFORMATION
        ==================================================== */}

        <SectionTitle
          title="ACCOUNT INFORMATION"
          colors={
            colors
          }
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
            iconType="ion"
            label="Username"
            value={
              trainer?.username
                ? `@${trainer.username}`
                : "@trainer"
            }
            colors={
              colors
            }
          />

          <Divider
            colors={
              colors
            }
          />

          <InfoRow
            icon="card-outline"
            iconType="ion"
            label="Trainer ID"
            value={
              trainer?.id
                ? String(
                    trainer.id
                  )
                : "—"
            }
            colors={
              colors
            }
          />

          <Divider
            colors={
              colors
            }
          />

          <InfoRow
            icon="mail-outline"
            iconType="ion"
            label="Email"
            value={
              trainer?.email ||
              "Not provided"
            }
            colors={
              colors
            }
          />

          <Divider
            colors={
              colors
            }
          />

          <InfoRow
            icon="call-outline"
            iconType="ion"
            label="Phone"
            value={
              trainer?.phone ||
              "Not provided"
            }
            colors={
              colors
            }
          />

        </View>


        {/* ====================================================
            TRAINER INFORMATION
        ==================================================== */}

        <SectionTitle
          title="TRAINER INFORMATION"
          colors={
            colors
          }
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
            icon="arm-flex-outline"
            iconType="material"
            label="Specialization"
            value={
              trainer?.specialization ||
              "Not specified"
            }
            colors={
              colors
            }
          />

          <Divider
            colors={
              colors
            }
          />

          <InfoRow
            icon="trophy-outline"
            iconType="material"
            label="Experience"
            value={
              trainer?.experience_years !==
                undefined &&
              trainer?.experience_years !==
                null
                ? `${trainer.experience_years} ${
                    trainer.experience_years ===
                    1
                      ? "Year"
                      : "Years"
                  }`
                : "0 Years"
            }
            colors={
              colors
            }
          />

          <Divider
            colors={
              colors
            }
          />

          <InfoRow
            icon="office-building-outline"
            iconType="material"
            label="Gym"
            value={
              getGymName()
            }
            colors={
              colors
            }
          />

        </View>


        {/* ====================================================
            ABOUT ME
        ==================================================== */}

        <SectionTitle
          title="ABOUT ME"
          colors={
            colors
          }
        />

        <View
          style={[
            styles.aboutCard,
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
              styles.aboutText,
              {
                color:
                  colors.secondaryText ||
                  colors.mutedText,
              },
            ]}
          >
            {trainer?.bio ||
              "No trainer bio added yet."}
          </Text>

        </View>


        {/* ====================================================
            LOGOUT
        ==================================================== */}

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

          disabled={
            loggingOut
          }
        >

          {loggingOut ? (

            <ActivityIndicator
              size="small"
              color="#FF4D5E"
            />

          ) : (

            <Ionicons
              name="log-out-outline"
              size={21}
              color="#FF4D5E"
            />

          )}

          <Text
            style={
              styles.logoutText
            }
          >
            {loggingOut
              ? "Logging out..."
              : "Logout"}
          </Text>

        </Pressable>


        <View
          style={{
            height: 110,
          }}
        />

      </ScrollView>


      {/* ======================================================
          TRAINER BOTTOM NAVIGATION
      ====================================================== */}

      <TrainerBottomNav
        active="profile"
        colors={
          colors
        }
      />

    </View>
  );
}


// ============================================================
// SECTION TITLE
// ============================================================

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


// ============================================================
// DIVIDER
// ============================================================

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


// ============================================================
// INFO ROW
// ============================================================

function InfoRow({
  icon,
  iconType,
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

        {iconType ===
        "material" ? (

          <MaterialCommunityIcons
            name={
              icon
            }

            size={21}

            color={
              colors.primaryLight
            }
          />

        ) : (

          <Ionicons
            name={
              icon
            }

            size={21}

            color={
              colors.primaryLight
            }
          />

        )}

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
                colors.secondaryText ||
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

          numberOfLines={2}
        >
          {value}
        </Text>

      </View>

    </View>
  );
}


// ============================================================
// TRAINER BOTTOM NAVIGATION
// ============================================================

function TrainerBottomNav({
  active,
  colors,
}) {

  const goTo =
    (screen) => {

      if (
        screen === active
      ) {
        return;
      }


      if (
        screen === "home"
      ) {

        router.replace(
          "/trainer/dashboard"
        );

      } else if (
        screen === "members"
      ) {

        router.replace(
          "/trainer/members"
        );

      } else if (
        screen === "workouts"
      ) {

        // Existing working Trainer workout route
        router.replace(
          "/trainer/workout"
        );

      } else if (
        screen === "attendance"
      ) {

        router.replace(
          "/trainer/attendance"
        );

      }
    };


  return (

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

      <NavItem
        icon="home-outline"
        label="Home"
        active={
          active === "home"
        }
        onPress={() =>
          goTo("home")
        }
        colors={
          colors
        }
      />


      <NavItem
        icon="people-outline"
        label="Members"
        active={
          active === "members"
        }
        onPress={() =>
          goTo("members")
        }
        colors={
          colors
        }
      />


      <NavItem
        icon="barbell-outline"
        label="Workouts"
        active={
          active === "workouts"
        }
        onPress={() =>
          goTo("workouts")
        }
        colors={
          colors
        }
      />


      <NavItem
        icon="checkmark-circle-outline"
        label="Attendance"
        active={
          active === "attendance"
        }
        onPress={() =>
          goTo("attendance")
        }
        colors={
          colors
        }
      />


      <NavItem
        icon="person-outline"
        label="Profile"
        active={
          active === "profile"
        }
        onPress={() =>
          goTo("profile")
        }
        colors={
          colors
        }
      />

    </View>
  );
}


// ============================================================
// NAV ITEM
// ============================================================

function NavItem({
  icon,
  label,
  active,
  onPress,
  colors,
}) {

  return (

    <Pressable
      style={
        styles.navItem
      }

      onPress={
        onPress
      }

      android_ripple={{
        color:
          colors.iconBackground,
      }}
    >

      <View
        style={[
          styles.navIconBox,

          active && {
            backgroundColor:
              colors.iconBackground,
          },
        ]}
      >

        <Ionicons
          name={
            icon
          }

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
          styles.navLabel,
          {
            color:
              active
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
            styles.navIndicator,
            {
              backgroundColor:
                colors.primaryLight,
            },
          ]}
        />

      )}

    </Pressable>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    // ========================================================
    // MAIN
    // ========================================================

    container: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 18,

      paddingTop: 8,

      paddingBottom: 125,
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {
      paddingHorizontal: 18,

      paddingTop:
        Platform.OS === "ios"
          ? 54
          : 44,

      paddingBottom: 14,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
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
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,

      marginLeft: 10,
    },

    headerButton: {
      width: 43,
      height: 43,

      borderRadius: 14,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    // ========================================================
    // PROFILE HERO
    // ========================================================

    profileCard: {
      borderWidth: 1,

      borderRadius: 26,

      paddingHorizontal: 18,
      paddingVertical: 20,

      alignItems:
        "center",

      marginBottom: 4,
    },

    avatarWrapper: {
      position:
        "relative",

      marginBottom: 11,
    },

    avatar: {
      width: 100,
      height: 100,

      borderRadius: 30,

      resizeMode:
        "cover",
    },

    avatarPlaceholder: {
      width: 100,
      height: 100,

      borderRadius: 30,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    avatarText: {
      fontSize: 31,
      fontWeight: "900",
    },

    cameraButton: {
      position:
        "absolute",

      right: -3,
      bottom: -2,

      width: 36,
      height: 36,

      borderRadius: 13,

      borderWidth: 3,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    profileName: {
      fontSize: 22,
      fontWeight: "900",

      textAlign:
        "center",

      marginTop: 1,
    },

    roleBadge: {
      flexDirection:
        "row",

      alignItems:
        "center",

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
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 8,

      maxWidth: "90%",
    },

    profileGym: {
      fontSize: 10,
      fontWeight: "600",

      marginLeft: 4,

      textAlign:
        "center",
    },


    // ========================================================
    // SECTION
    // ========================================================

    sectionTitle: {
      fontSize: 10,

      fontWeight: "900",

      letterSpacing: 1.2,

      marginTop: 20,
      marginBottom: 9,
    },


    // ========================================================
    // INFO CARD
    // ========================================================

    infoCard: {
      borderWidth: 1,

      borderRadius: 21,

      paddingHorizontal: 13,
      paddingVertical: 3,
    },

    infoRow: {
      minHeight: 67,

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    infoIcon: {
      width: 43,
      height: 43,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 11,
    },

    infoTextContainer: {
      flex: 1,

      justifyContent:
        "center",
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


    // ========================================================
    // ABOUT
    // ========================================================

    aboutCard: {
      borderWidth: 1,

      borderRadius: 21,

      minHeight: 80,

      paddingHorizontal: 16,
      paddingVertical: 15,

      justifyContent:
        "center",
    },

    aboutText: {
      fontSize: 11,

      lineHeight: 18,

      fontWeight: "600",
    },


    // ========================================================
    // LOGOUT
    // ========================================================

    logoutButton: {
      height: 54,

      marginTop: 18,

      borderRadius: 17,

      borderWidth: 1,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    logoutText: {
      color: "#FF4D5E",

      fontSize: 12,

      fontWeight: "900",

      marginLeft: 8,
    },


    // ========================================================
    // BOTTOM NAV
    // ========================================================

    bottomNav: {
      position:
        "absolute",

      left: 0,
      right: 0,
      bottom: 0,

      height: 82,

      borderTopWidth: 1,

      borderTopLeftRadius: 27,
      borderTopRightRadius: 27,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      justifyContent:
        "space-around",

      paddingTop: 8,

      elevation: 20,

      shadowOffset: {
        width: 0,
        height: -4,
      },

      shadowOpacity: 0.12,

      shadowRadius: 12,
    },

    navItem: {
      flex: 1,

      height: 70,

      alignItems:
        "center",

      justifyContent:
        "flex-start",

      position:
        "relative",
    },

    navIconBox: {
      width: 42,
      height: 35,

      borderRadius: 13,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    navLabel: {
      fontSize: 7.5,

      fontWeight: "800",

      marginTop: 2,
    },

    navIndicator: {
      width: 25,
      height: 3,

      borderRadius: 3,

      marginTop: 4,
    },


    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    loadingText: {
      fontSize: 12,

      fontWeight: "700",

      marginTop: 12,
    },

  });