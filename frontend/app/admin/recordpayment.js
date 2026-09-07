import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";

import { router } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../context/ThemeContext";

// ============================================================
// API
// ============================================================

const API_BASE_URL =
  "http://192.168.1.49:8000/api/members";

const PAYMENT_API =
  `${API_BASE_URL}/payments/`;

// ============================================================
// RECORD PAYMENT SCREEN
// ============================================================

export default function RecordPayment() {
  const { colors } = useTheme();

  // ==========================================================
  // MEMBERS
  // ==========================================================

  const [members, setMembers] = useState([]);

  const [selectedMember, setSelectedMember] =
    useState(null);

  const [loadingMembers, setLoadingMembers] =
    useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  // ==========================================================
  // FORM
  // ==========================================================

  const [amount, setAmount] = useState("");

  const [plan, setPlan] = useState("Monthly");

  const [paymentMethod, setPaymentMethod] =
    useState("UPI");

  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);

  // ==========================================================
  // MEMBERSHIP PLANS
  // ==========================================================

  const membershipPlans = [
    {
      value: "Monthly",
      label: "MONTHLY",
      duration: "1 Month",
    },
    {
      value: "Quarterly",
      label: "QUARTERLY",
      duration: "3 Months",
    },
    {
      value: "Annually",
      label: "ANNUALLY",
      duration: "12 Months",
    },
  ];

  // ==========================================================
  // PAYMENT METHODS
  // ==========================================================

  const paymentMethods = [
    "CASH",
    "UPI",
    "CARD",
    "BANK",
  ];

  // ==========================================================
  // FETCH MEMBERS
  // ==========================================================

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);

      const token =
        await AsyncStorage.getItem(
          "adminToken"
        );

      if (!token) {
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

      console.log(
        "======================================"
      );

      console.log(
        "FETCHING MEMBERS FOR PAYMENT"
      );

      console.log(
        "MEMBERS URL:",
        API_BASE_URL
      );

      const response = await fetch(
        `${API_BASE_URL}/`,
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

      console.log(
        "MEMBERS RESPONSE STATUS:",
        response.status
      );

      const responseText =
        await response.text();

      let responseData = [];

      try {
        responseData =
          responseText
            ? JSON.parse(
                responseText
              )
            : [];
      } catch (error) {
        console.log(
          "MEMBERS RESPONSE IS NOT JSON"
        );
      }

      // ======================================================
      // SESSION EXPIRED
      // ======================================================

      if (response.status === 401) {
        await AsyncStorage.removeItem(
          "adminToken"
        );

        await AsyncStorage.removeItem(
          "adminUsername"
        );

        await AsyncStorage.removeItem(
          "adminId"
        );

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
      // ERROR
      // ======================================================

      if (!response.ok) {
        console.log(
          "MEMBERS FETCH ERROR:",
          responseData
        );

        Alert.alert(
          "Error",
          "Could not load members."
        );

        return;
      }

      // ======================================================
      // SUCCESS
      // ======================================================

      console.log(
        "MEMBERS FOR PAYMENT:",
        responseData
      );

      if (Array.isArray(responseData)) {
        setMembers(responseData);
      } else if (
        responseData &&
        Array.isArray(
          responseData.results
        )
      ) {
        setMembers(
          responseData.results
        );
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.log(
        "FETCH MEMBERS ERROR:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Could not connect to GymRyt server.\n\nMake sure Django is running and your phone is connected to the same Wi-Fi."
      );
    } finally {
      setLoadingMembers(false);
    }
  };

  // ==========================================================
  // SEARCH MEMBERS
  // ==========================================================

  const filteredMembers = members.filter((member) => {
    const query = searchQuery
      .toLowerCase()
      .trim();

    if (!query) {
      return true;
    }

    return (
      (member.name || "")
        .toLowerCase()
        .includes(query) ||

      (member.phone || "")
        .toLowerCase()
        .includes(query) ||

      (member.username || "")
        .toLowerCase()
        .includes(query)
    );
  });

  // ==========================================================
  // SELECT MEMBER
  // ==========================================================

  const handleSelectMember = (member) => {
    setSelectedMember(member);

    setAmount("");
    setPlan("Monthly");
    setPaymentMethod("UPI");
    setNotes("");
  };

  // ==========================================================
  // CHANGE MEMBER
  // ==========================================================

  const handleChangeMember = () => {
    if (loading) {
      return;
    }

    setSelectedMember(null);
  };

  // ==========================================================
  // RECORD PAYMENT
  // ==========================================================

  const handleRecordPayment = async () => {
    // ========================================================
    // MEMBER
    // ========================================================

    if (!selectedMember) {
      Alert.alert(
        "Select Member",
        "Please select a member first."
      );

      return;
    }

    const memberId =
      selectedMember.id;

    const memberName =
      selectedMember.name ||
      "Unknown Member";

    // ========================================================
    // AMOUNT
    // ========================================================

    const numericAmount =
      Number(amount);

    if (
      !amount.trim() ||
      Number.isNaN(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a payment amount greater than ₹0."
      );

      return;
    }

    // ========================================================
    // PLAN
    // ========================================================

    if (!plan) {
      Alert.alert(
        "Plan Required",
        "Please select a membership plan."
      );

      return;
    }

    // ========================================================
    // PAYMENT METHOD
    // ========================================================

    if (!paymentMethod) {
      Alert.alert(
        "Payment Method Required",
        "Please select a payment method."
      );

      return;
    }

    // ========================================================
    // START REQUEST
    // ========================================================

    try {
      setLoading(true);

      // ======================================================
      // GET ADMIN TOKEN
      // ======================================================

      const token =
        await AsyncStorage.getItem(
          "adminToken"
        );

      console.log(
        "ADMIN TOKEN EXISTS:",
        !!token
      );

      // ======================================================
      // TOKEN NOT FOUND
      // ======================================================

      if (!token) {
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
      // PAYMENT DATA
      // ======================================================

      const paymentData = {
        member: Number(memberId),

        amount: numericAmount,

        plan: plan,

        method: paymentMethod,

        remark: notes.trim(),

        status: "PAID",
      };

      console.log(
        "======================================"
      );

      console.log(
        "RECORDING PAYMENT"
      );

      console.log(
        "MEMBER ID:",
        memberId
      );

      console.log(
        "MEMBER NAME:",
        memberName
      );

      console.log(
        "PAYMENT URL:",
        PAYMENT_API
      );

      console.log(
        "PAYMENT DATA:",
        paymentData
      );

      console.log(
        "======================================"
      );

      // ======================================================
      // POST PAYMENT
      // ======================================================

      const response = await fetch(
        PAYMENT_API,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",

            Authorization:
              `Token ${token}`,
          },

          body:
            JSON.stringify(
              paymentData
            ),
        }
      );

      // ======================================================
      // RESPONSE
      // ======================================================

      console.log(
        "PAYMENT RESPONSE STATUS:",
        response.status
      );

      const responseText =
        await response.text();

      console.log(
        "PAYMENT RAW RESPONSE:",
        responseText
      );

      let responseData = {};

      try {
        responseData =
          responseText
            ? JSON.parse(
                responseText
              )
            : {};
      } catch (error) {
        console.log(
          "PAYMENT RESPONSE IS NOT JSON"
        );
      }

      console.log(
        "PAYMENT RESPONSE DATA:",
        responseData
      );

      // ======================================================
      // UNAUTHORIZED
      // ======================================================

      if (response.status === 401) {
        await AsyncStorage.removeItem(
          "adminToken"
        );

        await AsyncStorage.removeItem(
          "adminUsername"
        );

        await AsyncStorage.removeItem(
          "adminId"
        );

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
      // FORBIDDEN
      // ======================================================

      if (response.status === 403) {
        Alert.alert(
          "Permission Denied",
          responseData.detail ||
            responseData.error ||
            "You do not have permission to record payments."
        );

        return;
      }

      // ======================================================
      // NOT FOUND
      // ======================================================

      if (response.status === 404) {
        Alert.alert(
          "Payment Endpoint Not Found",
          "Django could not find the payment API endpoint.\n\nExpected:\n" +
            PAYMENT_API
        );

        return;
      }

      // ======================================================
      // GENERAL DJANGO ERROR
      // ======================================================

      if (!response.ok) {
        console.log(
          "DJANGO PAYMENT ERROR:",
          responseData
        );

        let errorMessage =
          "Could not record payment.";

        if (responseData.member) {
          errorMessage =
            `Member: ${
              Array.isArray(
                responseData.member
              )
                ? responseData.member.join(
                    " "
                  )
                : responseData.member
            }`;
        } else if (
          responseData.amount
        ) {
          errorMessage =
            `Amount: ${
              Array.isArray(
                responseData.amount
              )
                ? responseData.amount.join(
                    " "
                  )
                : responseData.amount
            }`;
        } else if (
          responseData.plan
        ) {
          errorMessage =
            `Plan: ${
              Array.isArray(
                responseData.plan
              )
                ? responseData.plan.join(
                    " "
                  )
                : responseData.plan
            }`;
        } else if (
          responseData.method
        ) {
          errorMessage =
            `Payment Method: ${
              Array.isArray(
                responseData.method
              )
                ? responseData.method.join(
                    " "
                  )
                : responseData.method
            }`;
        } else if (
          responseData.remark
        ) {
          errorMessage =
            `Notes: ${
              Array.isArray(
                responseData.remark
              )
                ? responseData.remark.join(
                    " "
                  )
                : responseData.remark
            }`;
        } else if (
          responseData.detail
        ) {
          errorMessage =
            responseData.detail;
        } else if (
          responseData.error
        ) {
          errorMessage =
            responseData.error;
        }

        Alert.alert(
          "Payment Failed",
          errorMessage
        );

        return;
      }

      // ======================================================
      // SUCCESS
      // ======================================================

      console.log(
        "PAYMENT CREATED SUCCESSFULLY:",
        responseData
      );

      Alert.alert(
        "Payment Recorded ✓",

        `₹${numericAmount.toLocaleString(
          "en-IN"
        )} payment recorded successfully for ${memberName}.`,

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
        "======================================"
      );

      console.log(
        "RECORD PAYMENT ERROR:",
        error
      );

      console.log(
        "======================================"
      );

      Alert.alert(
        "Connection Error",
        "Could not connect to GymRyt server.\n\nMake sure Django is running and your phone is connected to the same Wi-Fi."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // BACK
  // ==========================================================

  const handleBack = () => {
    if (!loading) {
      router.back();
    }
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

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

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
            disabled={loading}
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
                  color: colors.text,
                },
              ]}
            >
              Record Payment
            </Text>
          </View>

        </View>

        {/* ================================================== */}
        {/* MEMBER SELECTION */}
        {/* ================================================== */}

        {!selectedMember ? (
          <>

            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              SELECT MEMBER
            </Text>

            {/* ================================================== */}
            {/* SEARCH BAR */}
            {/* ================================================== */}

            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor:
                    colors.input,
                  borderColor:
                    colors.inputBorder,
                },
              ]}
            >

              <Text
                style={[
                  styles.searchIcon,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                ⌕
              </Text>

              <TextInput
                style={[
                  styles.searchInput,
                  {
                    color:
                      colors.text,
                  },
                ]}
                placeholder="Search member..."
                placeholderTextColor={
                  colors.mutedText
                }
                value={searchQuery}
                onChangeText={
                  setSearchQuery
                }
                autoCapitalize="none"
                autoCorrect={false}
              />

              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() =>
                    setSearchQuery("")
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.clearSearch,
                      {
                        color:
                          colors.mutedText,
                      },
                    ]}
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              )}

            </View>

            {loadingMembers ? (

              <View
                style={
                  styles.loadingContainer
                }
              >

                <ActivityIndicator
                  size="large"
                  color={
                    colors.primaryLight
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
                  Loading members...
                </Text>

              </View>

            ) : members.length === 0 ? (

              <View
                style={[
                  styles.emptyCard,
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
                    styles.emptyTitle,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  No Members Found
                </Text>

                <Text
                  style={[
                    styles.emptyText,
                    {
                      color:
                        colors.mutedText,
                    },
                  ]}
                >
                  Add a member before recording a payment.
                </Text>

              </View>

            ) : filteredMembers.length === 0 ? (

              <View
                style={[
                  styles.emptyCard,
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
                    styles.emptyTitle,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  No Matching Member
                </Text>

                <Text
                  style={[
                    styles.emptyText,
                    {
                      color:
                        colors.mutedText,
                    },
                  ]}
                >
                  Try searching with a different name, phone number or username.
                </Text>

              </View>

            ) : (

              <View
                style={
                  styles.memberList
                }
              >

                {filteredMembers.map(
                  (member) => (

                    <TouchableOpacity
                      key={
                        member.id
                      }
                      style={[
                        styles.memberSelectCard,
                        {
                          backgroundColor:
                            colors.card,
                          borderColor:
                            colors.border,
                        },
                      ]}
                      onPress={() =>
                        handleSelectMember(
                          member
                        )
                      }
                      activeOpacity={
                        0.8
                      }
                    >

                      <View
                        style={[
                          styles.memberSelectAvatar,
                          {
                            backgroundColor:
                              colors.iconBackground,
                          },
                        ]}
                      >

                        <Text
                          style={[
                            styles.memberSelectAvatarText,
                            {
                              color:
                                colors.primaryLight,
                            },
                          ]}
                        >
                          {member.name
                            ? member.name
                                .charAt(
                                  0
                                )
                                .toUpperCase()
                            : "?"}
                        </Text>

                      </View>

                      <Text
                        style={[
                          styles.memberSelectName,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        {member.name ||
                          "Unnamed Member"}
                      </Text>

                      <Text
                        style={[
                          styles.memberArrow,
                          {
                            color:
                              colors.mutedText,
                          },
                        ]}
                      >
                        ›
                      </Text>

                    </TouchableOpacity>

                  )
                )}

              </View>

            )}

          </>

        ) : (

          <>

            {/* ============================================== */}
            {/* SELECTED MEMBER */}
            {/* ============================================== */}

            <View
              style={[
                styles.memberCard,
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
                  styles.memberAvatar,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >

                <Text
                  style={[
                    styles.memberAvatarText,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  ₹
                </Text>

              </View>

              <View
                style={
                  styles.memberInfo
                }
              >

                <Text
                  style={[
                    styles.memberLabel,
                    {
                      color:
                        colors.mutedText,
                    },
                  ]}
                >
                  PAYMENT FOR
                </Text>

                <Text
                  style={[
                    styles.memberName,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {selectedMember.name}
                </Text>

                <Text
                  style={[
                    styles.memberDetails,
                    {
                      color:
                        colors.mutedText,
                    },
                  ]}
                >
                  Member ID #
                  {selectedMember.id}

                  {selectedMember.phone
                    ? ` • ${selectedMember.phone}`
                    : ""}
                </Text>

              </View>

              <TouchableOpacity
                style={[
                  styles.changeButton,
                  {
                    borderColor:
                      colors.border,
                    backgroundColor:
                      colors.nav,
                  },
                ]}
                onPress={
                  handleChangeMember
                }
                disabled={loading}
              >

                <Text
                  style={[
                    styles.changeButtonText,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  CHANGE
                </Text>

              </TouchableOpacity>

            </View>

            {/* ============================================== */}
            {/* PAYMENT INFORMATION */}
            {/* ============================================== */}

            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              PAYMENT INFORMATION
            </Text>

            {/* AMOUNT */}

            <View
              style={
                styles.inputGroup
              }
            >

              <Text
                style={[
                  styles.inputLabel,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                AMOUNT *
              </Text>

              <View
                style={[
                  styles.amountContainer,
                  {
                    backgroundColor:
                      colors.card,
                    borderColor:
                      colors.primary,
                  },
                ]}
              >

                <Text
                  style={[
                    styles.rupee,
                    {
                      color:
                        colors.primaryLight,
                    },
                  ]}
                >
                  ₹
                </Text>

                <TextInput
                  style={[
                    styles.amountInput,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                  value={amount}
                  onChangeText={
                    setAmount
                  }
                  placeholder="0"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  keyboardType="numeric"
                  editable={!loading}
                />

              </View>

            </View>

            {/* MEMBERSHIP PLAN */}

            <View
              style={
                styles.inputGroup
              }
            >

              <Text
                style={[
                  styles.inputLabel,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                MEMBERSHIP PLAN *
              </Text>

              <View
                style={
                  styles.planContainer
                }
              >

                {membershipPlans.map(
                  (
                    membershipPlan
                  ) => {

                    const selected =
                      plan ===
                      membershipPlan.value;

                    return (

                      <TouchableOpacity
                        key={
                          membershipPlan.value
                        }
                        style={[
                          styles.planCard,
                          {
                            backgroundColor:
                              colors.card,
                            borderColor:
                              colors.border,
                          },
                          selected && {
                            backgroundColor:
                              colors.iconBackground,
                            borderColor:
                              colors.primary,
                            borderWidth: 2,
                          },
                        ]}
                        onPress={() =>
                          setPlan(
                            membershipPlan.value
                          )
                        }
                        disabled={
                          loading
                        }
                        activeOpacity={
                          0.8
                        }
                      >

                        {selected && (
                          <View
                            style={[
                              styles.selectedCheck,
                              {
                                backgroundColor:
                                  colors.primary,
                              },
                            ]}
                          >

                            <Text
                              style={
                                styles.selectedCheckText
                              }
                            >
                              ✓
                            </Text>

                          </View>
                        )}

                        <Text
                          style={[
                            styles.planLabel,
                            {
                              color:
                                colors.mutedText,
                            },
                            selected && {
                              color:
                                colors.primaryLight,
                            },
                          ]}
                        >
                          {
                            membershipPlan.label
                          }
                        </Text>

                        <Text
                          style={[
                            styles.planDuration,
                            {
                              color:
                                colors.mutedText,
                            },
                            selected && {
                              color:
                                colors.primaryLight,
                            },
                          ]}
                        >
                          {
                            membershipPlan.duration
                          }
                        </Text>

                      </TouchableOpacity>

                    );
                  }
                )}

              </View>

            </View>

            {/* PAYMENT METHOD */}

            <View
              style={
                styles.inputGroup
              }
            >

              <Text
                style={[
                  styles.inputLabel,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                PAYMENT METHOD *
              </Text>

              <View
                style={
                  styles.methodContainer
                }
              >

                {paymentMethods.map(
                  (method) => {

                    const selected =
                      paymentMethod ===
                      method;

                    return (

                      <TouchableOpacity
                        key={
                          method
                        }
                        style={[
                          styles.methodButton,
                          {
                            backgroundColor:
                              colors.card,
                            borderColor:
                              colors.border,
                          },
                          selected && {
                            backgroundColor:
                              colors.iconBackground,
                            borderColor:
                              colors.primary,
                          },
                        ]}
                        onPress={() =>
                          setPaymentMethod(
                            method
                          )
                        }
                        disabled={
                          loading
                        }
                        activeOpacity={
                          0.8
                        }
                      >

                        <Text
                          style={[
                            styles.methodText,
                            {
                              color:
                                colors.mutedText,
                            },
                            selected && {
                              color:
                                colors.primaryLight,
                            },
                          ]}
                        >
                          {method ===
                          "BANK"
                            ? "BANK TRANSFER"
                            : method}
                        </Text>

                      </TouchableOpacity>

                    );
                  }
                )}

              </View>

            </View>

            {/* NOTES */}

            <View
              style={
                styles.inputGroup
              }
            >

              <Text
                style={[
                  styles.inputLabel,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                NOTES
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.notesInput,
                  {
                    backgroundColor:
                      colors.card,
                    borderColor:
                      colors.border,
                    color: colors.text,
                  },
                ]}
                value={notes}
                onChangeText={
                  setNotes
                }
                placeholder="Optional notes"
                placeholderTextColor={
                  colors.mutedText
                }
                multiline
                textAlignVertical="top"
                editable={!loading}
              />

            </View>

            {/* SUMMARY */}

            <View
              style={[
                styles.summaryCard,
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
                  styles.summaryTitle,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                PAYMENT SUMMARY
              </Text>

              <View
                style={
                  styles.summaryRow
                }
              >

                <Text
                  style={[
                    styles.summaryLabel,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  Member
                </Text>

                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {selectedMember.name}
                </Text>

              </View>

              <View
                style={
                  styles.summaryRow
                }
              >

                <Text
                  style={[
                    styles.summaryLabel,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  Plan
                </Text>

                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {plan}
                </Text>

              </View>

              <View
                style={
                  styles.summaryRow
                }
              >

                <Text
                  style={[
                    styles.summaryLabel,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  Payment Method
                </Text>

                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {paymentMethod}
                </Text>

              </View>

              <View
                style={[
                  styles.summaryDivider,
                  {
                    backgroundColor:
                      colors.border,
                  },
                ]}
              />

              <View
                style={
                  styles.totalRow
                }
              >

                <Text
                  style={[
                    styles.totalLabel,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  TOTAL
                </Text>

                <Text
                  style={[
                    styles.totalValue,
                    {
                      color:
                        colors.revenue,
                    },
                  ]}
                >
                  ₹
                  {Number(
                    amount || 0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </Text>

              </View>

            </View>

            {/* RECORD PAYMENT */}

            <TouchableOpacity
              style={[
                styles.recordButton,
                {
                  backgroundColor:
                    colors.primary,
                },
                loading &&
                  styles.recordButtonDisabled,
              ]}
              onPress={
                handleRecordPayment
              }
              disabled={loading}
              activeOpacity={0.85}
            >

              {loading ? (

                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

              ) : (

                <>

                  <Text
                    style={
                      styles.recordIcon
                    }
                  >
                    ✓
                  </Text>

                  <Text
                    style={
                      styles.recordButtonText
                    }
                  >
                    RECORD PAYMENT
                  </Text>

                </>

              )}

            </TouchableOpacity>

            {/* CANCEL */}

            <TouchableOpacity
              style={
                styles.cancelButton
              }
              onPress={handleBack}
              disabled={loading}
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

          </>

        )}

      </ScrollView>
    </View>
  );
}

// ============================================================
// STATIC STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 60,
  },

  // ========================================================
  // HEADER
  // ========================================================

  header: {
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
  },

  smallTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },

  title: {
    fontSize: 29,
    fontWeight: "900",
    marginTop: 3,
  },

  // ========================================================
  // MEMBER SELECTION
  // ========================================================

  searchContainer: {
    height: 52,
    borderWidth: 1,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 15,
  },

  searchIcon: {
    fontSize: 17,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 13,
    fontWeight: "600",
  },

  clearSearch: {
    fontSize: 25,
    fontWeight: "300",
    paddingLeft: 8,
  },

  memberList: {
    gap: 10,
  },

  memberSelectCard: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  memberSelectAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  memberSelectAvatarText: {
    fontSize: 18,
    fontWeight: "900",
  },

  memberSelectName: {
    flex: 1,
    marginLeft: 13,
    fontSize: 15,
    fontWeight: "800",
  },

  memberArrow: {
    fontSize: 28,
    fontWeight: "300",
  },

  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },

  loadingText: {
    fontSize: 12,
    marginTop: 12,
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 25,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  emptyText: {
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
  },

  // ========================================================
  // SELECTED MEMBER
  // ========================================================

  memberCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },

  memberAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  memberAvatarText: {
    fontSize: 23,
    fontWeight: "900",
  },

  memberInfo: {
    flex: 1,
    marginLeft: 14,
  },

  memberLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  memberName: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },

  memberDetails: {
    fontSize: 10,
    marginTop: 4,
  },

  changeButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8,
  },

  changeButtonText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  // ========================================================
  // SECTION
  // ========================================================

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
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 9,
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    fontSize: 14,
    fontWeight: "600",
  },

  // ========================================================
  // AMOUNT
  // ========================================================

  amountContainer: {
    height: 65,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  rupee: {
    fontSize: 25,
    fontWeight: "900",
    marginRight: 10,
  },

  amountInput: {
    flex: 1,
    fontSize: 25,
    fontWeight: "900",
    height: 65,
  },

  // ========================================================
  // MEMBERSHIP PLANS
  // ========================================================

  planContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 9,
  },

  planCard: {
    flex: 1,
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    position: "relative",
  },

  selectedCheck: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  selectedCheckText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },

  planLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  planDuration: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
  },

  // ========================================================
  // PAYMENT METHODS
  // ========================================================

  methodContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  methodButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  methodText: {
    fontSize: 10,
    fontWeight: "900",
  },

  // ========================================================
  // NOTES
  // ========================================================

  notesInput: {
    height: 100,
    paddingTop: 14,
  },

  // ========================================================
  // SUMMARY
  // ========================================================

  summaryCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 17,
    marginTop: 5,
    marginBottom: 20,
  },

  summaryTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 15,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
  },

  summaryLabel: {
    fontSize: 12,
  },

  summaryValue: {
    fontSize: 12,
    fontWeight: "800",
    maxWidth: "60%",
    textAlign: "right",
  },

  summaryDivider: {
    height: 1,
    marginVertical: 7,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },

  totalValue: {
    fontSize: 22,
    fontWeight: "900",
  },

  // ========================================================
  // RECORD BUTTON
  // ========================================================

  recordButton: {
    height: 58,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    marginBottom: 10,
  },

  recordButtonDisabled: {
    opacity: 0.55,
  },

  recordIcon: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginRight: 10,
  },

  recordButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
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
    fontWeight: "900",
    letterSpacing: 1,
  },

});
