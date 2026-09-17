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
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";


// ============================================================
// API
// ============================================================

const API_BASE_URL =
  "http://192.168.1.52:8000/api/members";

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

  const getStatusStyle = (
    status
  ) => {

    if (
      status === "APPROVED"
    ) {

      return styles.statusApproved;

    }


    if (
      status === "REJECTED"
    ) {

      return styles.statusRejected;

    }


    return styles.statusPending;

  };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (

      <View
        style={
          styles.container
        }
      >

        <View
          style={
            styles.loadingContainer
          }
        >

          <ActivityIndicator

            size="large"

            color="#2563EB"

          />


          <Text
            style={
              styles.loadingText
            }
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
        style={
          styles.container
        }
      >

        <View
          style={
            styles.header
          }
        >

          <TouchableOpacity

            style={
              styles.backButton
            }

            onPress={() =>
              router.back()
            }

          >

            <Text
              style={
                styles.backText
              }
            >

              ‹

            </Text>

          </TouchableOpacity>


          <Text
            style={
              styles.headerTitle
            }
          >

            Application

          </Text>

        </View>


        <View
          style={
            styles.loadingContainer
          }
        >

          <Text
            style={
              styles.errorTitle
            }
          >

            Application Not Found

          </Text>


          <Text
            style={
              styles.errorText
            }
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

  return (

    <View
      style={
        styles.container
      }
    >


      {/* =====================================================
          HEADER
      ===================================================== */}

      <View
        style={
          styles.header
        }
      >

        <TouchableOpacity

          style={
            styles.backButton
          }

          onPress={() =>
            router.back()
          }

          activeOpacity={0.75}

        >

          <Text
            style={
              styles.backText
            }
          >

            ‹

          </Text>

        </TouchableOpacity>


        <View
          style={
            styles.headerContent
          }
        >

          <Text
            style={
              styles.headerSmallTitle
            }
          >

            TRAINER MANAGEMENT

          </Text>


          <Text
            style={
              styles.headerTitle
            }
          >

            Application Details

          </Text>

        </View>

      </View>


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
          style={
            styles.profileCard
          }
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

              style={
                styles.profileImage
              }

            />

          ) : (

            <View
              style={
                styles.profilePlaceholder
              }
            >

              <Text
                style={
                  styles.profileInitials
                }
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
            style={
              styles.profileName
            }
          >

            {application.name ||
              "Trainer"}

          </Text>


          {/* =================================================
              SPECIALIZATION
          ================================================= */}

          <Text
            style={
              styles.profileSpecialization
            }
          >

            {application.specialization ||
              "Fitness Trainer"}

          </Text>


          {/* =================================================
              STATUS
          ================================================= */}

          <View
            style={[
              styles.statusBadge,
              getStatusStyle(
                application.status
              ),
            ]}
          >

            <Text
              style={
                styles.statusText
              }
            >

              {application.status ||
                "PENDING"}

            </Text>

          </View>

        </View>


        {/* ===================================================
            PERSONAL INFORMATION
        =================================================== */}

        <View
          style={
            styles.sectionCard
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >

            Personal Information

          </Text>


          <View
            style={
              styles.infoRow
            }
          >

            <Text
              style={
                styles.infoLabel
              }
            >

              Full Name

            </Text>


            <Text
              style={
                styles.infoValue
              }
            >

              {application.name ||
                "—"}

            </Text>

          </View>


          <View
            style={
              styles.divider
            }
          />


          <View
            style={
              styles.infoRow
            }
          >

            <Text
              style={
                styles.infoLabel
              }
            >

              Email

            </Text>


            <Text
              style={
                styles.infoValue
              }
            >

              {application.email ||
                "—"}

            </Text>

          </View>


          <View
            style={
              styles.divider
            }
          />


          <View
            style={
              styles.infoRow
            }
          >

            <Text
              style={
                styles.infoLabel
              }
            >

              Phone

            </Text>


            <Text
              style={
                styles.infoValue
              }
            >

              {application.phone ||
                "—"}

            </Text>

          </View>


          <View
            style={
              styles.divider
            } />


          <View
            style={
              styles.infoRow
            }
          >

            <Text
              style={
                styles.infoLabel
              }
            >

              Username

            </Text>


            <Text
              style={
                styles.infoValue
              }
            >

              {application.username ||
                "—"}

            </Text>

          </View>

        </View>


        {/* ===================================================
            PROFESSIONAL INFORMATION
        =================================================== */}

        <View
          style={
            styles.sectionCard
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >

            Professional Information

          </Text>


          <View
            style={
              styles.infoRow
            }
          >

            <Text
              style={
                styles.infoLabel
              }
            >

              Specialization

            </Text>


            <Text
              style={
                styles.infoValue
              }
            >

              {application.specialization ||
                "—"}

            </Text>

          </View>


          <View
            style={
              styles.divider
            }
          />


          <View
            style={
              styles.infoRow
            }
          >

            <Text
              style={
                styles.infoLabel
              }
            >

              Experience

            </Text>


            <Text
              style={
                styles.infoValue
              }
            >

              {application.experience_years !==
              undefined &&
              application.experience_years !==
              null

                ? application.experience_years +
                  " years"

                : "—"}

            </Text>

          </View>

        </View>


        {/* ===================================================
            BIO
        =================================================== */}

        <View
          style={
            styles.sectionCard
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >

            About Trainer

          </Text>


          <Text
            style={
              styles.bioText
            }
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
            style={
              styles.sectionCard
            }
          >

            <Text
              style={
                styles.sectionTitle
              }
            >

              Application Status

            </Text>


            <Text
              style={
                styles.statusDescription
              }
            >

              This application has already been{" "}

              {application.status ===
                "APPROVED"
                ? "approved."
                : "rejected."}

            </Text>


            {application.rejection_reason ? (

              <View
                style={
                  styles.rejectionBox
                }
              >

                <Text
                  style={
                    styles.rejectionLabel
                  }
                >

                  Rejection Reason

                </Text>


                <Text
                  style={
                    styles.rejectionText
                  }
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

              style={
                styles.rejectButton
              }

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
                  color="#FFFFFF"
                />

              ) : (

                <Text
                  style={
                    styles.rejectButtonText
                  }
                >

                  Reject Application

                </Text>

              )}

            </TouchableOpacity>


            {/* =================================================
                APPROVE
            ================================================= */}

            <TouchableOpacity

              style={
                styles.approveButton
              }

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

                <Text
                  style={
                    styles.approveButtonText
                  }
                >

                  Accept Trainer

                </Text>

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
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    // ========================================================
    // CONTAINER
    // ========================================================

    container: {

      flex: 1,

      backgroundColor:
        "#050816",

    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {

      paddingHorizontal: 20,

      paddingTop: 55,

      paddingBottom: 18,

      flexDirection: "row",

      alignItems: "center",

      borderBottomWidth: 1,

      borderBottomColor:
        "#172554",

    },


    backButton: {

      width: 45,

      height: 45,

      borderRadius: 14,

      backgroundColor:
        "#0B1220",

      borderWidth: 1,

      borderColor:
        "#172554",

      alignItems: "center",

      justifyContent: "center",

    },


    backText: {

      color: "#FFFFFF",

      fontSize: 34,

      fontWeight: "300",

      marginTop: -4,

    },


    headerContent: {

      flex: 1,

      marginLeft: 15,

    },


    headerSmallTitle: {

      color: "#38BDF8",

      fontSize: 9,

      fontWeight: "900",

      letterSpacing: 2,

    },


    headerTitle: {

      color: "#FFFFFF",

      fontSize: 21,

      fontWeight: "900",

      marginTop: 3,

    },


    // ========================================================
    // SCROLL
    // ========================================================

    scrollContent: {

      paddingHorizontal: 20,

      paddingTop: 18,

    },


    // ========================================================
    // PROFILE CARD
    // ========================================================

    profileCard: {

      backgroundColor:
        "#0B1220",

      borderWidth: 1,

      borderColor:
        "#172554",

      borderRadius: 22,

      alignItems: "center",

      paddingVertical: 25,

      paddingHorizontal: 20,

      marginBottom: 15,

    },


    profileImage: {

      width: 105,

      height: 105,

      borderRadius: 52.5,

      borderWidth: 3,

      borderColor:
        "#2563EB",

    },


    profilePlaceholder: {

      width: 105,

      height: 105,

      borderRadius: 52.5,

      backgroundColor:
        "#172554",

      borderWidth: 3,

      borderColor:
        "#2563EB",

      alignItems: "center",

      justifyContent: "center",

    },


    profileInitials: {

      color: "#FFFFFF",

      fontSize: 32,

      fontWeight: "900",

    },


    profileName: {

      color: "#FFFFFF",

      fontSize: 23,

      fontWeight: "900",

      marginTop: 15,

      textAlign: "center",

    },


    profileSpecialization: {

      color: "#64748B",

      fontSize: 12,

      marginTop: 5,

    },


    // ========================================================
    // STATUS
    // ========================================================

    statusBadge: {

      paddingHorizontal: 15,

      paddingVertical: 7,

      borderRadius: 20,

      marginTop: 12,

    },


    statusPending: {

      backgroundColor:
        "#78350F",

    },


    statusApproved: {

      backgroundColor:
        "#14532D",

    },


    statusRejected: {

      backgroundColor:
        "#7F1D1D",

    },


    statusText: {

      color: "#FFFFFF",

      fontSize: 9,

      fontWeight: "900",

      letterSpacing: 1,

    },


    // ========================================================
    // SECTION CARD
    // ========================================================

    sectionCard: {

      backgroundColor:
        "#0B1220",

      borderWidth: 1,

      borderColor:
        "#172554",

      borderRadius: 18,

      padding: 18,

      marginBottom: 15,

    },


    sectionTitle: {

      color: "#FFFFFF",

      fontSize: 15,

      fontWeight: "900",

      marginBottom: 14,

    },


    // ========================================================
    // INFORMATION ROW
    // ========================================================

    infoRow: {

      flexDirection: "row",

      justifyContent: "space-between",

      alignItems: "flex-start",

      paddingVertical: 8,

    },


    infoLabel: {

      color: "#64748B",

      fontSize: 11,

      fontWeight: "700",

      width: "38%",

    },


    infoValue: {

      color: "#E2E8F0",

      fontSize: 12,

      fontWeight: "700",

      textAlign: "right",

      flex: 1,

    },


    divider: {

      height: 1,

      backgroundColor:
        "#172554",

    },


    // ========================================================
    // BIO
    // ========================================================

    bioText: {

      color: "#94A3B8",

      fontSize: 12,

      lineHeight: 20,

    },


    // ========================================================
    // STATUS DESCRIPTION
    // ========================================================

    statusDescription: {

      color: "#94A3B8",

      fontSize: 12,

      lineHeight: 19,

    },


    rejectionBox: {

      backgroundColor:
        "#1C0B0B",

      borderWidth: 1,

      borderColor:
        "#7F1D1D",

      borderRadius: 12,

      padding: 13,

      marginTop: 15,

    },


    rejectionLabel: {

      color: "#F87171",

      fontSize: 10,

      fontWeight: "900",

      marginBottom: 5,

    },


    rejectionText: {

      color: "#CBD5E1",

      fontSize: 12,

      lineHeight: 18,

    },


    // ========================================================
    // ACTIONS
    // ========================================================

    actionContainer: {

      marginTop: 3,

      marginBottom: 10,

    },


    rejectButton: {

      height: 55,

      borderRadius: 16,

      backgroundColor:
        "#7F1D1D",

      alignItems: "center",

      justifyContent: "center",

      marginBottom: 12,

      borderWidth: 1,

      borderColor:
        "#991B1B",

    },


    rejectButtonText: {

      color: "#FFFFFF",

      fontSize: 13,

      fontWeight: "900",

    },


    approveButton: {

      height: 55,

      borderRadius: 16,

      backgroundColor:
        "#2563EB",

      alignItems: "center",

      justifyContent: "center",

    },


    approveButtonText: {

      color: "#FFFFFF",

      fontSize: 13,

      fontWeight: "900",

    },


    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {

      flex: 1,

      alignItems: "center",

      justifyContent: "center",

      paddingHorizontal: 30,

    },


    loadingText: {

      color: "#64748B",

      fontSize: 13,

      marginTop: 15,

    },


    errorTitle: {

      color: "#FFFFFF",

      fontSize: 20,

      fontWeight: "900",

      textAlign: "center",

    },


    errorText: {

      color: "#64748B",

      fontSize: 12,

      lineHeight: 19,

      textAlign: "center",

      marginTop: 10,

    },


    bottomSpace: {

      height: 40,

    },

  });