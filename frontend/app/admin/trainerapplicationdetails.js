import React, {
  useCallback,
  useState,
} from "react";

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

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../context/ThemeContext";


// ============================================================
// API
// ============================================================

const API_BASE_URL =
  "http://192.168.1.43:8000/api/members";

const TRAINER_APPLICATIONS_API =
  API_BASE_URL + "/trainer-applications/list/";

const TRAINER_APPLICATION_ACTION_API =
  API_BASE_URL + "/trainer-applications/";


// ============================================================
// TRAINER APPLICATION DETAILS
// ============================================================

export default function TrainerApplicationDetails() {

  const {
    applicationId,
  } = useLocalSearchParams();

  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();


  // ==========================================================
  // STATE
  // ==========================================================

  const [application, setApplication] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);


  // ==========================================================
  // GET TOKEN
  // ==========================================================

  const getToken = async () => {

    return await AsyncStorage.getItem(
      "adminToken"
    );

  };


  // ==========================================================
  // FETCH APPLICATION
  // ==========================================================

  const fetchApplication =
    useCallback(async () => {

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
            TRAINER_APPLICATIONS_API,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",

                Authorization:
                  "Token " + token,
              },
            }
          );


        console.log(
          "TRAINER APPLICATION LIST STATUS:",
          response.status
        );


        if (!response.ok) {

          const errorText =
            await response.text();

          console.log(
            "TRAINER APPLICATION LIST ERROR:",
            errorText
          );

          throw new Error(
            "Failed to fetch trainer applications"
          );

        }


        const data =
          await response.json();


        console.log(
          "TRAINER APPLICATION DATA:",
          data
        );


        let applications = [];


        if (
          Array.isArray(data)
        ) {

          applications =
            data;

        } else if (
          Array.isArray(
            data.results
          )
        ) {

          applications =
            data.results;

        } else if (
          Array.isArray(
            data.applications
          )
        ) {

          applications =
            data.applications;

        }


        const foundApplication =
          applications.find(
            (item) =>
              String(item.id) ===
              String(applicationId)
          );


        if (!foundApplication) {

          Alert.alert(
            "Application Not Found",
            "This trainer application could not be found.",
            [
              {
                text: "Go Back",
                onPress: () =>
                  router.back(),
              },
            ]
          );

          return;

        }


        setApplication(
          foundApplication
        );


      } catch (error) {

        console.log(
          "FETCH APPLICATION ERROR:",
          error
        );


        Alert.alert(
          "Error",
          "Could not load the trainer application."
        );


      } finally {

        setLoading(false);

      }

    }, [applicationId]);


  // ==========================================================
  // LOAD SCREEN
  // ==========================================================

  React.useEffect(() => {

    fetchApplication();

  }, [fetchApplication]);


  // ==========================================================
  // APPROVE APPLICATION
  // ==========================================================

  const approveApplication = () => {

    if (!application) {
      return;
    }


    Alert.alert(

      "Approve Trainer",

      "Are you sure you want to approve this trainer application?",

      [

        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Approve",
          onPress:
            confirmApproveApplication,
        },

      ]

    );

  };


  // ==========================================================
  // CONFIRM APPROVE
  // ==========================================================

  const confirmApproveApplication =
    async () => {

      try {

        setProcessing(true);


        const token =
          await getToken();


        if (!token) {

          Alert.alert(
            "Session Expired",
            "Please login again."
          );

          return;

        }


        const response =
          await fetch(

            TRAINER_APPLICATION_ACTION_API +
            application.id +
            "/action/",

            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",

                Authorization:
                  "Token " + token,

              },

              body: JSON.stringify({

                action:
                  "APPROVE",

              }),

            }

          );


        console.log(
          "APPROVE STATUS:",
          response.status
        );


        const data =
          await response.json();


        console.log(
          "APPROVE RESPONSE:",
          data
        );


        if (!response.ok) {

          throw new Error(
            data.detail ||
            data.message ||
            "Failed to approve trainer"
          );

        }


        Alert.alert(

          "Trainer Approved",

          "The trainer application has been approved successfully.",

          [

            {

              text: "OK",

              onPress: () => {

                router.replace(
                  "/admin/trainers"
                );

              },

            },

          ]

        );


      } catch (error) {

        console.log(
          "APPROVE ERROR:",
          error
        );


        Alert.alert(
          "Approval Failed",
          error.message ||
          "Could not approve the trainer."
        );


      } finally {

        setProcessing(false);

      }

    };


  // ==========================================================
  // REJECT APPLICATION
  // ==========================================================

  const rejectApplication = () => {

    if (!application) {
      return;
    }


    Alert.prompt(

      "Reject Trainer",

      "Enter a reason for rejecting this application.",

      [

        {
          text: "Cancel",
          style: "cancel",
        },

        {

          text: "Reject",

          style: "destructive",

          onPress:
            (reason) =>
              confirmRejectApplication(
                reason
              ),

        },

      ],

      "plain-text",

      "",

      "default"

    );

  };


  // ==========================================================
  // CONFIRM REJECT
  // ==========================================================

  const confirmRejectApplication =
    async (reason) => {

      try {

        setProcessing(true);


        const token =
          await getToken();


        if (!token) {

          Alert.alert(
            "Session Expired",
            "Please login again."
          );

          return;

        }


        const response =
          await fetch(

            TRAINER_APPLICATION_ACTION_API +
            application.id +
            "/action/",

            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",

                Authorization:
                  "Token " + token,

              },

              body: JSON.stringify({

                action:
                  "REJECT",

                rejection_reason:
                  reason ||
                  "Application rejected by owner.",

              }),

            }

          );


        console.log(
          "REJECT STATUS:",
          response.status
        );


        const data =
          await response.json();


        console.log(
          "REJECT RESPONSE:",
          data
        );


        if (!response.ok) {

          throw new Error(
            data.detail ||
            data.message ||
            "Failed to reject trainer"
          );

        }


        Alert.alert(

          "Application Rejected",

          "The trainer application has been rejected.",

          [

            {

              text: "OK",

              onPress: () => {

                router.back();

              },

            },

          ]

        );


      } catch (error) {

        console.log(
          "REJECT ERROR:",
          error
        );


        Alert.alert(
          "Rejection Failed",
          error.message ||
          "Could not reject the trainer."
        );


      } finally {

        setProcessing(false);

      }

    };


  // ==========================================================
  // GET INITIALS
  // ==========================================================

  const getInitials = (
    name
  ) => {

    if (!name) {
      return "T";
    }


    const parts =
      name
        .trim()
        .split(" ")
        .filter(Boolean);


    if (parts.length === 1) {

      return parts[0]
        .substring(0, 2)
        .toUpperCase();

    }


    return (

      parts[0][0] +
      parts[parts.length - 1][0]

    ).toUpperCase();

  };


  // ==========================================================
  // STATUS COLOR
  // ==========================================================

  const getStatusColor = (
    status
  ) => {

    if (
      status === "APPROVED"
    ) {
      return "#45E0A5";
    }

    if (
      status === "REJECTED"
    ) {
      return "#FF5870";
    }

    return "#FFB21C";
  };


  // ==========================================================
  // HEADER
  // ==========================================================

  const renderHeader = () => (

    <View
      style={
        styles.header
      }
    >

      <View
        style={
          styles.headerContent
        }
      >

        <Text
          style={[
            styles.headerSmallTitle,
            {
              color:
                colors.primaryLight,
            },
          ]}
        >
          GYMRYT • TRAINER APPLICATION
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
          Application Details
        </Text>

      </View>


      <View
        style={
          styles.headerActions
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
          onPress={
            toggleTheme
          }
          activeOpacity={0.75}
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
        </TouchableOpacity>


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
          activeOpacity={0.75}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={
              colors.text
            }
          />
        </TouchableOpacity>

      </View>

    </View>
  );


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

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

        <View
          style={
            styles.loadingContainer
          }
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
                  colors.mutedText,
              },
            ]}
          >
            Loading application...
          </Text>

        </View>

      </View>
    );
  }


  // ==========================================================
  // APPLICATION NOT FOUND
  // ==========================================================

  if (!application) {

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

        {renderHeader()}

        <View
          style={
            styles.loadingContainer
          }
        >

          <View
            style={[
              styles.errorIcon,
              {
                backgroundColor:
                  colors.iconBackground,
              },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={28}
              color={
                colors.primaryLight
              }
            />
          </View>

          <Text
            style={[
              styles.errorTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Application Not Found
          </Text>

          <Text
            style={[
              styles.errorText,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            The trainer application may
            have been removed or is no
            longer available.
          </Text>

        </View>

      </View>
    );
  }


  // ==========================================================
  // MAIN SCREEN
  // ==========================================================

  const statusColor =
    getStatusColor(
      application.status
    );


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

      {/* =====================================================
          HEADER
      ===================================================== */}

      {renderHeader()}


      {/* =====================================================
          CONTENT
      ===================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* ===================================================
            PROFILE CARD
        =================================================== */}

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

          {/* =================================================
              PROFILE IMAGE
          ================================================= */}

          {application.profile_picture ? (

            <Image
              source={{
                uri:
                  application.profile_picture,
              }}
              style={[
                styles.profileImage,
                {
                  borderColor:
                    `${statusColor}88`,
                },
              ]}
            />

          ) : (

            <View
              style={[
                styles.profilePlaceholder,
                {
                  backgroundColor:
                    colors.iconBackground,
                  borderColor:
                    `${statusColor}88`,
                },
              ]}
            >
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
                  application.name
                )}
              </Text>
            </View>

          )}


          {/* =================================================
              NAME
          ================================================= */}

          <Text
            style={[
              styles.profileName,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {application.name ||
              "Trainer"}
          </Text>


          {/* =================================================
              SPECIALIZATION
          ================================================= */}

          <View
            style={
              styles.specializationRow
            }
          >
            <Ionicons
              name="barbell-outline"
              size={13}
              color={
                colors.secondaryText
              }
            />

            <Text
              style={[
                styles.profileSpecialization,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              {application.specialization ||
                "Fitness Trainer"}
            </Text>
          </View>


          {/* =================================================
              STATUS
          ================================================= */}

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
              {application.status ||
                "PENDING"}
            </Text>
          </View>

        </View>


        {/* ===================================================
            PERSONAL INFORMATION
        =================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          PERSONAL INFORMATION
        </Text>

        <View
          style={[
            styles.sectionCard,
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
            label="Full Name"
            value={application.name}
            colors={colors}
          />

          <Divider colors={colors} />

          <InfoRow
            icon="mail-outline"
            label="Email"
            value={application.email}
            colors={colors}
          />

          <Divider colors={colors} />

          <InfoRow
            icon="call-outline"
            label="Phone"
            value={application.phone}
            colors={colors}
          />

          <Divider colors={colors} />

          <InfoRow
            icon="at-outline"
            label="Username"
            value={application.username}
            colors={colors}
          />

        </View>


        {/* ===================================================
            PROFESSIONAL INFORMATION
        =================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          PROFESSIONAL INFORMATION
        </Text>

        <View
          style={[
            styles.sectionCard,
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
            label="Specialization"
            value={application.specialization}
            colors={colors}
          />

          <Divider colors={colors} />

          <InfoRow
            icon="trophy-outline"
            label="Experience"
            value={
              application.experience_years !==
              undefined &&
              application.experience_years !==
              null
                ? application.experience_years +
                  " years"
                : "—"
            }
            colors={colors}
          />

        </View>


        {/* ===================================================
            BIO
        =================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          ABOUT TRAINER
        </Text>

        <View
          style={[
            styles.bioCard,
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
              styles.bioText,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            {application.bio ||
              "No bio was provided by the applicant."}
          </Text>
        </View>


        {/* ===================================================
            APPLICATION STATUS
        =================================================== */}

        {application.status !==
          "PENDING" ? (

          <View
            style={[
              styles.statusCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  `${statusColor}55`,
              },
            ]}
          >

            <View
              style={
                styles.statusCardHeader
              }
            >
              <Ionicons
                name={
                  application.status ===
                    "APPROVED"
                    ? "checkmark-circle"
                    : "close-circle"
                }
                size={20}
                color={
                  statusColor
                }
              />

              <Text
                style={[
                  styles.statusCardTitle,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Application Status
              </Text>
            </View>

            <Text
              style={[
                styles.statusDescription,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              This application has already been{" "}
              {application.status ===
                "APPROVED"
                ? "approved."
                : "rejected."}
            </Text>

            {application.rejection_reason ? (

              <View
                style={[
                  styles.rejectionBox,
                  {
                    backgroundColor:
                      "#FF587012",
                    borderColor:
                      "#FF587044",
                  },
                ]}
              >

                <Text
                  style={
                    styles.rejectionLabel
                  }
                >
                  REJECTION REASON
                </Text>

                <Text
                  style={[
                    styles.rejectionText,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {
                    application.rejection_reason
                  }
                </Text>

              </View>

            ) : null}

          </View>

        ) : null}


        {/* ===================================================
            ACTION BUTTONS
        =================================================== */}

        {application.status ===
          "PENDING" ? (

          <View
            style={
              styles.actionContainer
            }
          >

            {/* =================================================
                REJECT
            ================================================= */}

            <TouchableOpacity
              style={[
                styles.rejectButton,
                {
                  backgroundColor:
                    isDark
                      ? "#100D15"
                      : "#FFF5F6",
                },
              ]}
              onPress={
                rejectApplication
              }
              disabled={
                processing
              }
              activeOpacity={0.8}
            >

              {processing ? (

                <ActivityIndicator
                  color="#FF4D5E"
                />

              ) : (

                <>

                  <Ionicons
                    name="close-circle-outline"
                    size={19}
                    color="#FF4D5E"
                  />

                  <Text
                    style={
                      styles.rejectButtonText
                    }
                  >
                    Reject
                  </Text>

                </>

              )}

            </TouchableOpacity>


            {/* =================================================
                APPROVE
            ================================================= */}

            <TouchableOpacity
              style={[
                styles.approveButton,
                {
                  backgroundColor:
                    colors.primary,
                },
              ]}
              onPress={
                approveApplication
              }
              disabled={
                processing
              }
              activeOpacity={0.8}
            >

              {processing ? (

                <ActivityIndicator
                  color="#FFFFFF"
                />

              ) : (

                <>

                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.approveButtonText
                    }
                  >
                    Accept Trainer
                  </Text>

                </>

              )}

            </TouchableOpacity>

          </View>

        ) : null}


        <View
          style={
            styles.bottomSpace
          }
        />

      </ScrollView>

    </View>
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
          size={20}
          color={
            colors.primaryLight
          }
        />
      </View>


      <View
        style={
          styles.infoText
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
          {value || "—"}
        </Text>

      </View>

    </View>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    // ========================================================
    // CONTAINER
    // ========================================================

    container: {
      flex: 1,
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },

    loadingText: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: "700",
    },

    errorIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },

    errorTitle: {
      fontSize: 16,
      fontWeight: "900",
      marginTop: 12,
    },

    errorText: {
      fontSize: 10,
      fontWeight: "600",
      lineHeight: 15,
      textAlign: "center",
      marginTop: 5,
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    headerContent: {
      flex: 1,
      marginRight: 10,
    },

    headerSmallTitle: {
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

    backButton: {
      width: 43,
      height: 43,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },


    // ========================================================
    // CONTENT
    // ========================================================

    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 4,
      paddingBottom: 30,
    },


    // ========================================================
    // PROFILE
    // ========================================================

    profileCard: {
      borderWidth: 1,
      borderRadius: 26,
      paddingHorizontal: 18,
      paddingVertical: 20,
      alignItems: "center",
    },

    profileImage: {
      width: 100,
      height: 100,
      borderRadius: 30,
      borderWidth: 2,
    },

    profilePlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 30,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },

    profileInitials: {
      fontSize: 31,
      fontWeight: "900",
    },

    profileName: {
      fontSize: 22,
      fontWeight: "900",
      textAlign: "center",
      marginTop: 12,
    },

    specializationRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 6,
    },

    profileSpecialization: {
      fontSize: 10,
      fontWeight: "600",
      marginLeft: 4,
    },

    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginTop: 10,
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


    // ========================================================
    // SECTIONS
    // ========================================================

    sectionTitle: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.2,
      marginTop: 20,
      marginBottom: 9,
    },

    sectionCard: {
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


    // ========================================================
    // BIO
    // ========================================================

    bioCard: {
      minHeight: 80,
      borderWidth: 1,
      borderRadius: 21,
      paddingHorizontal: 16,
      paddingVertical: 15,
      justifyContent: "center",
    },

    bioText: {
      fontSize: 11,
      fontWeight: "600",
      lineHeight: 18,
    },


    // ========================================================
    // STATUS CARD
    // ========================================================

    statusCard: {
      borderWidth: 1,
      borderRadius: 21,
      padding: 15,
      marginTop: 18,
    },

    statusCardHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    statusCardTitle: {
      fontSize: 13,
      fontWeight: "900",
      marginLeft: 7,
    },

    statusDescription: {
      fontSize: 10,
      fontWeight: "600",
      lineHeight: 15,
      marginTop: 7,
    },

    rejectionBox: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      marginTop: 12,
    },

    rejectionLabel: {
      color: "#FF5870",
      fontSize: 7.5,
      fontWeight: "900",
      letterSpacing: 1,
    },

    rejectionText: {
      fontSize: 11,
      fontWeight: "700",
      lineHeight: 16,
      marginTop: 5,
    },


    // ========================================================
    // ACTIONS
    // ========================================================

    actionContainer: {
      flexDirection: "row",
      gap: 9,
      marginTop: 20,
    },

    rejectButton: {
      flex: 1,
      height: 54,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: "#55202B",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    rejectButtonText: {
      color: "#FF4D5E",
      fontSize: 12,
      fontWeight: "900",
      marginLeft: 7,
    },

    approveButton: {
      flex: 1.4,
      height: 54,
      borderRadius: 17,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    approveButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
      marginLeft: 7,
    },

    bottomSpace: {
      height: 30,
    },

  });