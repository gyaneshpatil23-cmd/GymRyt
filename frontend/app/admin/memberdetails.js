import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  "http://192.168.1.49:8000/api/members";

// ============================================================
// MEMBER DETAILS
// ============================================================

export default function MemberDetails() {
  const { colors } = useTheme();

  const params = useLocalSearchParams();

  // ==========================================================
  // MEMBER DATA
  // ==========================================================

  const memberId = String(params.id || "");

  const name = String(
    params.name || "Unknown Member"
  );

  const phone = String(
    params.phone || "Not available"
  );

  const email = String(
    params.email || "Not available"
  );

  const username = String(
    params.username || "Not available"
  );

  const membershipStart = String(
    params.membership_start || "Not available"
  );

  const membershipEnd = String(
    params.membership_end || "Not available"
  );

  const status = String(
    params.status || "ACTIVE"
  );

  const idVerified =
    String(params.id_verified) === "true";

  // ==========================================================
  // PAYMENT / MEMBERSHIP DATA
  // ==========================================================

  const [membershipPlan, setMembershipPlan] =
    useState("Not available");

  const [paymentMethod, setPaymentMethod] =
    useState("Not available");

  const [loadingPaymentData, setLoadingPaymentData] =
    useState(true);

  const [deleting, setDeleting] =
    useState(false);

  // ==========================================================
  // INITIALS
  // ==========================================================

  const getInitials = (memberName) => {
    if (!memberName) {
      return "?";
    }

    return memberName
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // ==========================================================
  // DAYS REMAINING
  // ==========================================================

  const calculateDaysRemaining = (endDate) => {
    if (
      !endDate ||
      endDate === "Not available"
    ) {
      return 0;
    }

    const today = new Date();
    const end = new Date(endDate);

    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const difference =
      end.getTime() -
      today.getTime();

    const days = Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    );

    return Math.max(days, 0);
  };

  const daysRemaining =
    calculateDaysRemaining(
      membershipEnd
    );

  // ==========================================================
  // FORMAT MEMBERSHIP PLAN
  // ==========================================================

  const formatPlan = (plan) => {
    if (!plan) {
      return "Not available";
    }

    const normalized =
      String(plan)
        .trim()
        .toLowerCase();

    if (normalized === "monthly") {
      return "MONTHLY";
    }

    if (normalized === "quarterly") {
      return "QUARTERLY";
    }

    if (
      normalized === "annually" ||
      normalized === "annual"
    ) {
      return "ANNUAL";
    }

    return String(plan).toUpperCase();
  };

  // ==========================================================
  // FORMAT PAYMENT METHOD
  // ==========================================================

  const formatPaymentMethod = (method) => {
    if (!method) {
      return "Not available";
    }

    const normalized =
      String(method)
        .trim()
        .toUpperCase();

    if (normalized === "CASH") {
      return "CASH";
    }

    if (normalized === "UPI") {
      return "UPI";
    }

    if (normalized === "CARD") {
      return "CARD";
    }

    if (normalized === "BANK") {
      return "BANK TRANSFER";
    }

    return normalized;
  };

  // ==========================================================
  // FETCH MEMBER PAYMENT INFORMATION
  // ==========================================================

  const fetchPaymentInformation =
    async () => {
      try {
        setLoadingPaymentData(true);

        const token =
          await AsyncStorage.getItem(
            "adminToken"
          );

        if (!token) {
          setLoadingPaymentData(false);
          return;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/payments/`,
            {
              method: "GET",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",

                Authorization:
                  `Token ${token}`,
              },
            }
          );

        // ======================================================
        // SESSION EXPIRED
        // ======================================================

        if (
          response.status === 401
        ) {
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

          return;
        }

        if (!response.ok) {
          console.log(
            "PAYMENT API STATUS:",
            response.status
          );

          return;
        }

        const data =
          await response.json();

        console.log(
          "PAYMENTS FOR MEMBER DETAILS:",
          data
        );

        // ======================================================
        // MAKE SURE RESPONSE IS ARRAY
        // ======================================================

        if (!Array.isArray(data)) {
          return;
        }

        // ======================================================
        // FIND PAYMENTS FOR THIS MEMBER
        // ======================================================

        const memberPayments =
          data.filter(
            (payment) =>
              String(
                payment.member_id ||
                  payment.member
              ) === memberId
          );

        if (
          memberPayments.length === 0
        ) {
          setMembershipPlan(
            "Not available"
          );

          setPaymentMethod(
            "Not available"
          );

          return;
        }

        // ======================================================
        // FIRST PAYMENT = LATEST PAYMENT
        // DJANGO RETURNS PAYMENTS BY DATE DESC
        // ======================================================

        const latestPayment =
          memberPayments[0];

        console.log(
          "LATEST MEMBER PAYMENT:",
          latestPayment
        );

        // ======================================================
        // SET PLAN
        // ======================================================

        if (latestPayment.plan) {
          setMembershipPlan(
            formatPlan(
              latestPayment.plan
            )
          );
        }

        // ======================================================
        // SET PAYMENT METHOD
        // ======================================================

        if (latestPayment.method) {
          setPaymentMethod(
            formatPaymentMethod(
              latestPayment.method
            )
          );
        }
      } catch (error) {
        console.log(
          "FETCH PAYMENT INFORMATION ERROR:",
          error
        );
      } finally {
        setLoadingPaymentData(false);
      }
    };

  // ==========================================================
  // LOAD PAYMENT INFORMATION
  // ==========================================================

  useEffect(() => {
    if (memberId) {
      fetchPaymentInformation();
    }
  }, [memberId]);

  // ==========================================================
  // EDIT MEMBER
  // ==========================================================

  const handleEditMember = () => {
    if (!memberId) {
      Alert.alert(
        "Error",
        "Member ID is missing. Cannot edit this member."
      );

      return;
    }

    router.push({
      pathname:
        "/admin/editemember",

      params: {
        id: memberId,

        name,
        phone,
        email,
        username,

        membership_start:
          membershipStart,

        membership_end:
          membershipEnd,

        status,

        id_verified:
          idVerified
            ? "true"
            : "false",
      },
    });
  };

  // ==========================================================
  // DELETE MEMBER
  // ==========================================================

  const handleDeleteMember = () => {
    if (!memberId) {
      Alert.alert(
        "Error",
        "Member ID is missing. Cannot delete this member."
      );

      return;
    }

    Alert.alert(
      "Delete Member",
      `Are you sure you want to delete ${name}? This action cannot be undone.`,
      [
        {
          text: "CANCEL",
          style: "cancel",
        },

        {
          text: "DELETE",
          style: "destructive",
          onPress:
            deleteMemberFromServer,
        },
      ]
    );
  };

  // ==========================================================
  // DELETE FROM DJANGO
  // ==========================================================

  const deleteMemberFromServer =
    async () => {
      try {
        setDeleting(true);

        const token =
          await AsyncStorage.getItem(
            "adminToken"
          );

        if (!token) {
          setDeleting(false);

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
        // DELETE REQUEST
        // ======================================================

        const response =
          await fetch(
            `${API_BASE_URL}/${memberId}/`,
            {
              method: "DELETE",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",

                Authorization:
                  `Token ${token}`,
              },
            }
          );

        // ======================================================
        // SESSION EXPIRED
        // ======================================================

        if (
          response.status === 401
        ) {
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

          return;
        }

        // ======================================================
        // DELETE ERROR
        // ======================================================

        if (!response.ok) {
          let errorData = {};

          try {
            errorData =
              await response.json();
          } catch (error) {
            errorData = {};
          }

          throw new Error(
            errorData.detail ||
              errorData.message ||
              "Could not delete member."
          );
        }

        // ======================================================
        // SUCCESS
        // ======================================================

        Alert.alert(
          "Member Deleted",
          `${name} has been permanently removed from GymRyt.`,
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
          "DELETE MEMBER ERROR:",
          error
        );

        Alert.alert(
          "Delete Failed",
          "Could not delete this member.\n\nMake sure Django is running and your phone is connected to the same Wi-Fi."
        );
      } finally {
        setDeleting(false);
      }
    };

  // ==========================================================
  // BACK
  // ==========================================================

  const handleBack = () => {
    router.back();
  };

  // ==========================================================
  // STATUS COLORS
  // ==========================================================

  const getStatusBackgroundColor =
    () => {
      if (status === "EXPIRED") {
        return colors.dangerBackground;
      }

      if (status === "EXPIRING") {
        return colors.warningBackground;
      }

      return colors.successBackground;
    };

  const getStatusColor = () => {
    if (status === "EXPIRED") {
      return colors.danger;
    }

    if (status === "EXPIRING") {
      return colors.warning;
    }

    return colors.success;
  };

  // ==========================================================
  // SCREEN
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <View style={styles.header}>
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
            onPress={handleBack}
            activeOpacity={0.8}
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
              styles.headerTextContainer
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
              Member Details
            </Text>
          </View>
        </View>

        {/* ==================================================
            PROFILE + PERSONAL INFORMATION
        ================================================== */}

        <View style={styles.topInformation}>

          {/* =================================================
              PROFILE - LEFT

              PROFILE HEADING REMOVED
              @USERNAME REMOVED
          ================================================= */}

          <View
            style={styles.profileColumn}
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
                styles.memberName,
                {
                  color:
                    colors.text,
                },
              ]}
              numberOfLines={1}
            >
              {name}
            </Text>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    getStatusBackgroundColor(),
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      getStatusColor(),
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      getStatusColor(),
                  },
                ]}
              >
                {status}
              </Text>
            </View>
          </View>

          {/* =================================================
              PERSONAL INFORMATION - RIGHT
          ================================================= */}

          <View
            style={
              styles.personalColumn
            }
          >
            <Text
              style={[
                styles.columnTitle,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              PERSONAL INFORMATION
            </Text>

            {/* PHONE */}

            <View
              style={
                styles.personalItem
              }
            >
              <View
                style={[
                  styles.personalIcon,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.personalIconText,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  ☎
                </Text>
              </View>

              <View
                style={
                  styles.personalContent
                }
              >
                <Text
                  style={[
                    styles.personalLabel,
                    {
                      color:
                        colors.mutedText,
                    },
                  ]}
                >
                  PHONE NUMBER
                </Text>

                <Text
                  style={[
                    styles.personalValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {phone}
                </Text>
              </View>
            </View>

            {/* EMAIL */}

            <View
              style={
                styles.personalItem
              }
            >
              <View
                style={[
                  styles.personalIcon,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.personalIconText,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  ✉
                </Text>
              </View>

              <View
                style={
                  styles.personalContent
                }
              >
                <Text
                  style={[
                    styles.personalLabel,
                    {
                      color:
                        colors.mutedText,
                    },
                  ]}
                >
                  EMAIL ADDRESS
                </Text>

                <Text
                  style={[
                    styles.personalValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {email}
                </Text>
              </View>
            </View>

            {/* USERNAME */}

            <View
              style={
                styles.personalItem
              }
            >
              <View
                style={[
                  styles.personalIcon,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.personalIconText,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  @
                </Text>
              </View>

              <View
                style={
                  styles.personalContent
                }
              >
                <Text
                  style={[
                    styles.personalLabel,
                    {
                      color:
                        colors.mutedText,
                    },
                  ]}
                >
                  USERNAME
                </Text>

                <Text
                  style={[
                    styles.personalValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {username}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ==================================================
            MEMBERSHIP DETAILS
        ================================================== */}

        <View
          style={styles.section}
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
            MEMBERSHIP DETAILS
          </Text>

          {/* MEMBERSHIP TYPE */}

          <View
            style={[
              styles.membershipTypeCard,
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
                styles.membershipTypeIcon,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.membershipTypeIconText,
                  {
                    color:
                      colors.primaryLight,
                  },
                ]}
              >
                ♛
              </Text>
            </View>

            <View
              style={
                styles.membershipTypeContent
              }
            >
              <Text
                style={[
                  styles.membershipTypeLabel,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                MEMBERSHIP TYPE
              </Text>

              {loadingPaymentData ? (
                <View
                  style={
                    styles.planLoading
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color={
                      colors.primary
                    }
                  />

                  <Text
                    style={[
                      styles.loadingPlanText,
                      {
                        color:
                          colors.mutedText,
                      },
                    ]}
                  >
                    Loading...
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.membershipTypeValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {membershipPlan}
                </Text>
              )}
            </View>
          </View>

          {/* START + END DATE */}

          <View
            style={[
              styles.membershipCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <View
              style={styles.dateBox}
            >
              <Text
                style={[
                  styles.dateLabel,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                START DATE
              </Text>

              <Text
                style={[
                  styles.dateValue,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {membershipStart}
              </Text>
            </View>

            <View
              style={[
                styles.dateDivider,
                {
                  backgroundColor:
                    colors.border,
                },
              ]}
            />

            <View
              style={styles.dateBox}
            >
              <Text
                style={[
                  styles.dateLabel,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                END DATE
              </Text>

              <Text
                style={[
                  styles.dateValue,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {membershipEnd}
              </Text>
            </View>
          </View>

          {/* DAYS REMAINING */}

          <View
            style={[
              styles.daysCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <View>
              <Text
                style={[
                  styles.daysLabel,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                DAYS REMAINING
              </Text>

              {status ===
              "EXPIRED" ? (
                <Text
                  style={[
                    styles.expiredDays,
                    {
                      color:
                        colors.danger,
                    },
                  ]}
                >
                  Membership Expired
                </Text>
              ) : (
                <Text
                  style={[
                    styles.daysValue,
                    {
                      color:
                        colors.success,
                    },
                  ]}
                >
                  {daysRemaining} Days
                </Text>
              )}
            </View>

            {/* <Text
              style={styles.calendarIcon}
            >
              📅
            </Text> */}
          </View>

          {/* PAYMENT METHOD */}

          <View
            style={[
              styles.paymentMethodCard,
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
                styles.paymentMethodIcon,
                {
                  backgroundColor:
                    colors.successBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.paymentMethodIconText,
                  {
                    color:
                      colors.success,
                  },
                ]}
              >
                ₹
              </Text>
            </View>

            <View
              style={
                styles.paymentMethodContent
              }
            >
              <Text
                style={[
                  styles.paymentMethodLabel,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                PAYMENT METHOD
              </Text>

              {loadingPaymentData ? (
                <Text
                  style={[
                    styles.paymentMethodValue,
                    {
                      color:
                        colors.mutedText,
                    },
                  ]}
                >
                  Loading...
                </Text>
              ) : (
                <Text
                  style={[
                    styles.paymentMethodValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {paymentMethod}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* ==================================================
            VERIFICATION
        ================================================== */}

        <View
          style={styles.section}
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
            VERIFICATION
          </Text>

          <View
            style={[
              styles.verificationCard,
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
                styles.verificationIcon,
                {
                  backgroundColor:
                    idVerified
                      ? colors.successBackground
                      : colors.warningBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.verificationIconText,
                  {
                    color:
                      idVerified
                        ? colors.success
                        : colors.warning,
                  },
                ]}
              >
                {idVerified
                  ? "✓"
                  : "!"}
              </Text>
            </View>

            <View
              style={
                styles.verificationContent
              }
            >
              <Text
                style={[
                  styles.verificationTitle,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                ID Verification
              </Text>

              <Text
                style={[
                  styles.verificationSubtitle,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                {idVerified
                  ? "Member identity has been verified."
                  : "Member verification is pending."}
              </Text>
            </View>

            <Text
              style={[
                styles.verificationStatus,
                {
                  color:
                    idVerified
                      ? colors.success
                      : colors.warning,
                },
              ]}
            >
              {idVerified
                ? "VERIFIED"
                : "PENDING"}
            </Text>
          </View>
        </View>

        {/* ==================================================
            MEMBER ID
        ================================================== */}

        <View
          style={[
            styles.memberIdCard,
            {
              backgroundColor:
                colors.nav,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.memberIdLabel,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            MEMBER ID
          </Text>

          <Text
            style={[
              styles.memberIdValue,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            #{memberId || "N/A"}
          </Text>
        </View>

        {/* ==================================================
            EDIT MEMBER
        ================================================== */}

        <TouchableOpacity
          style={[
            styles.editButton,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
          onPress={
            handleEditMember
          }
          activeOpacity={0.85}
          disabled={deleting}
        >
          <Text
            style={
              styles.editButtonText
            }
          >
            EDIT MEMBER
          </Text>

          <Text
            style={styles.editArrow}
          >
            →
          </Text>
        </TouchableOpacity>

        {/* ==================================================
            DELETE MEMBER
        ================================================== */}

        <TouchableOpacity
          style={[
            styles.deleteButton,
            {
              backgroundColor:
                colors.dangerBackground,
              borderColor:
                colors.danger,
            },
            deleting &&
              styles.deleteButtonDisabled,
          ]}
          onPress={
            handleDeleteMember
          }
          activeOpacity={0.85}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator
              size="small"
              color={
                colors.danger
              }
            />
          ) : (
            <>
              <Text
                style={styles.deleteIcon}
              >
                🗑
              </Text>

              <Text
                style={[
                  styles.deleteButtonText,
                  {
                    color:
                      colors.danger,
                  },
                ]}
              >
                DELETE MEMBER
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ==================================================
            BACK
        ================================================== */}

        <TouchableOpacity
          style={
            styles.cancelButton
          }
          onPress={
            handleBack
          }
          activeOpacity={0.8}
          disabled={deleting}
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
            BACK TO MEMBERS
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    marginTop: 55,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
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
    fontWeight: "300",
    marginTop: -4,
  },

  headerTextContainer: {
    marginLeft: 15,
    flex: 1,
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

  // ==========================================================
  // TOP AREA
  // ==========================================================

  topInformation: {
    flexDirection: "row",
    marginBottom: 32,
  },

  profileColumn: {
    width: "36%",
    alignItems: "center",
    paddingRight: 12,
  },

  personalColumn: {
    width: "64%",
    paddingLeft: 8,
  },

  columnTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 14,
  },

  // ==========================================================
  // PROFILE
  // ==========================================================

  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 25,
    fontWeight: "900",
  },

  memberName: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 11,
    textAlign: "center",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    marginTop: 10,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  // ==========================================================
  // PERSONAL INFORMATION
  // ==========================================================

  personalItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    minHeight: 42,
  },

  personalIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  personalIconText: {
    fontSize: 16,
    fontWeight: "900",
  },

  personalContent: {
    flex: 1,
    marginLeft: 9,
  },

  personalLabel: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  personalValue: {
    fontSize: 11.5,
    fontWeight: "800",
    marginTop: 3,
  },

  // ==========================================================
  // SECTIONS
  // ==========================================================

  section: {
    marginBottom: 27,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 13,
  },

  // ==========================================================
  // MEMBERSHIP TYPE
  // ==========================================================

  membershipTypeCard: {
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 17,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  membershipTypeIcon: {
    width: 47,
    height: 47,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  membershipTypeIconText: {
    fontSize: 20,
    fontWeight: "900",
  },

  membershipTypeContent: {
    flex: 1,
    marginLeft: 12,
  },

  membershipTypeLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  membershipTypeValue: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },

  planLoading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  loadingPlanText: {
    fontSize: 11,
    marginLeft: 7,
  },

  // ==========================================================
  // MEMBERSHIP DATES
  // ==========================================================

  membershipCard: {
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 17,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  dateBox: {
    flex: 1,
  },

  dateLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  dateValue: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 7,
  },

  dateDivider: {
    width: 1,
    height: 42,
    marginHorizontal: 15,
  },

  // ==========================================================
  // DAYS REMAINING
  // ==========================================================

  daysCard: {
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 17,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  daysLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  daysValue: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 5,
  },

  expiredDays: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 5,
  },

  calendarIcon: {
    fontSize: 27,
  },

  // ==========================================================
  // PAYMENT METHOD
  // ==========================================================

  paymentMethodCard: {
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 17,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  paymentMethodIcon: {
    width: 47,
    height: 47,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentMethodIconText: {
    fontSize: 19,
    fontWeight: "900",
  },

  paymentMethodContent: {
    flex: 1,
    marginLeft: 12,
  },

  paymentMethodLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  paymentMethodValue: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 5,
  },

  // ==========================================================
  // VERIFICATION
  // ==========================================================

  verificationCard: {
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 17,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  verificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  verificationIconText: {
    fontSize: 18,
    fontWeight: "900",
  },

  verificationContent: {
    flex: 1,
    marginLeft: 12,
  },

  verificationTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  verificationSubtitle: {
    fontSize: 9.5,
    marginTop: 4,
  },

  verificationStatus: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // ==========================================================
  // MEMBER ID
  // ==========================================================

  memberIdCard: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  memberIdLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  memberIdValue: {
    fontSize: 14,
    fontWeight: "900",
  },

  // ==========================================================
  // EDIT
  // ==========================================================

  editButton: {
    height: 58,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    marginBottom: 12,
  },

  editButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },

  editArrow: {
    color: "#FFFFFF",
    fontSize: 22,
    marginLeft: 12,
  },

  // ==========================================================
  // DELETE
  // ==========================================================

  deleteButton: {
    height: 56,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },

  deleteButtonDisabled: {
    opacity: 0.5,
  },

  deleteIcon: {
    fontSize: 16,
    marginRight: 9,
  },

  deleteButtonText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // ==========================================================
  // BACK
  // ==========================================================

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
