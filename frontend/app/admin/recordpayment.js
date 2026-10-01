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
  FlatList,
  Platform,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";

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

const MEMBERS_API =
  `${API_BASE_URL}/`;

const PAYMENT_API =
  `${API_BASE_URL}/payments/`;


// ============================================================
// RECORD PAYMENT
// ============================================================

export default function RecordPayment() {

  const params = useLocalSearchParams();

  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();


  // ==========================================================
  // MEMBER FROM ROUTE
  // ==========================================================

  const [memberId, setMemberId] = useState(
    params.id ? String(params.id) : ""
  );

  const [memberName, setMemberName] = useState(
    params.name ? String(params.name) : ""
  );

  const [memberPhone, setMemberPhone] = useState(
    params.phone ? String(params.phone) : ""
  );


  // ==========================================================
  // MEMBER SELECTION
  // ==========================================================

  const [members, setMembers] = useState([]);

  const [memberSearch, setMemberSearch] =
    useState("");

  const [loadingMembers, setLoadingMembers] =
    useState(false);


  // ==========================================================
  // FORM
  // ==========================================================

  const [amount, setAmount] =
    useState("");

  const [plan, setPlan] =
    useState("Monthly");

  const [paymentMethod, setPaymentMethod] =
    useState("UPI");

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  // ==========================================================
  // PAYMENT DATE
  // ==========================================================

  const [paymentDate, setPaymentDate] =
    useState(new Date());

  const [showDatePicker, setShowDatePicker] =
    useState(false);


  // ==========================================================
  // FETCH MEMBERS
  // ==========================================================

  const fetchMembers = async () => {

    try {

      setLoadingMembers(true);

      const token =
        await AsyncStorage.getItem("adminToken");

      console.log(
        "ADMIN TOKEN EXISTS:",
        !!token
      );


      if (!token) {

        Alert.alert(
          "Authentication Error",
          "Admin authentication token was not found. Please login again."
        );

        router.replace("/");

        return;
      }


      const response =
        await fetch(
          MEMBERS_API,
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


      console.log(
        "MEMBERS API STATUS:",
        response.status
      );


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
          "Please login again."
        );

        router.replace("/");

        return;
      }


      if (!response.ok) {

        const errorText =
          await response.text();

        console.log(
          "MEMBERS API ERROR:",
          errorText
        );

        throw new Error(
          `Failed to fetch members (${response.status})`
        );
      }


      const data =
        await response.json();


      console.log(
        "MEMBERS FOR PAYMENT:",
        data
      );


      if (Array.isArray(data)) {

        setMembers(data);

      } else {

        setMembers([]);

      }

    } catch (error) {

      console.log(
        "FETCH PAYMENT MEMBERS ERROR:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Could not load gym members.\n\nMake sure Django is running and your phone is connected to the same Wi-Fi."
      );

    } finally {

      setLoadingMembers(false);

    }

  };


  // ==========================================================
  // LOAD MEMBER SELECTOR
  // ==========================================================

  useEffect(() => {

    if (!memberId) {

      fetchMembers();

    }

  }, []);


  // ==========================================================
  // SELECT MEMBER
  // ==========================================================

  const selectMember = (member) => {

    console.log(
      "SELECTED MEMBER:",
      member
    );


    setMemberId(
      String(member.id)
    );

    setMemberName(
      member.name || ""
    );

    setMemberPhone(
      member.phone || ""
    );

  };


  // ==========================================================
  // FILTER MEMBERS
  // ==========================================================

  const filteredMembers =
    members.filter((member) => {

      const query =
        memberSearch
          .toLowerCase()
          .trim();


      if (!query) {
        return true;
      }


      return (

        member.name
          ?.toLowerCase()
          .includes(query)

        ||

        member.phone
          ?.toString()
          .includes(query)

        ||

        member.email
          ?.toLowerCase()
          .includes(query)

        ||

        member.username
          ?.toLowerCase()
          .includes(query)

      );

    });


  // ==========================================================
// DATE PICKER
// ==========================================================
const handleDateValueChange = (event, selectedDate) => {
  // Android picker has finished with the user's selection.
  // Hide it immediately so it cannot be mounted again.
  setShowDatePicker(false);

  if (selectedDate) {
    setPaymentDate(selectedDate);
  }
};

const handleDateDismiss = () => {
  // User pressed Cancel / Back.
  setShowDatePicker(false);
};



  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatPaymentDate = () => {

    return paymentDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );

  };


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
  // RECORD PAYMENT
  // ==========================================================

  const handleRecordPayment =
    async () => {

      if (!memberId) {

        Alert.alert(
          "Member Required",
          "Please select a member before recording a payment."
        );

        return;
      }


      const numericAmount =
        Number(amount);


      if (
        !amount ||
        Number.isNaN(numericAmount) ||
        numericAmount <= 0
      ) {

        Alert.alert(
          "Invalid Amount",
          "Please enter a payment amount greater than ₹0."
        );

        return;

      }


      if (!plan) {

        Alert.alert(
          "Plan Required",
          "Please select a membership plan."
        );

        return;

      }


      if (!paymentMethod) {

        Alert.alert(
          "Payment Method Required",
          "Please select a payment method."
        );

        return;

      }


      try {

        setLoading(true);


        const formattedDate =
          paymentDate
            .toISOString()
            .split("T")[0];


        const paymentData = {

          member:
            Number(memberId),

          amount:
            numericAmount,

          plan:
            plan,

          method:
            paymentMethod,

          remark:
            notes.trim(),

          status:
            "PAID",

          date:
            formattedDate,

        };


        console.log(
          "======================================"
        );

        console.log(
          "RECORDING PAYMENT:"
        );

        console.log(
          paymentData
        );

        console.log(
          "PAYMENT URL:"
        );

        console.log(
          PAYMENT_API
        );

        console.log(
          "======================================"
        );


        const token =
          await AsyncStorage.getItem(
            "adminToken"
          );


        const response =
          await fetch(
            PAYMENT_API,
            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",

                ...(token
                  ? {
                      Authorization:
                        `Token ${token}`,
                    }
                  : {}),

              },

              body:
                JSON.stringify(
                  paymentData
                ),

            }
          );


        console.log(
          "PAYMENT RESPONSE STATUS:",
          response.status
        );


        let responseData = {};


        try {

          responseData =
            await response.json();

        } catch (error) {

          responseData = {};

        }


        console.log(
          "PAYMENT RESPONSE:",
          responseData
        );


        if (!response.ok) {

          if (
            response.status === 401
          ) {

            throw new Error(
              "Your admin session has expired. Please login again."
            );

          }


          if (
            response.status === 404
          ) {

            throw new Error(
              "Payment endpoint not found.\n\n" +
              `Expected:\n${PAYMENT_API}`
            );

          }


          if (
            response.status === 400
          ) {

            throw new Error(
              "Django rejected the payment data:\n\n" +
              JSON.stringify(
                responseData,
                null,
                2
              )
            );

          }


          throw new Error(
            responseData.detail ||
            responseData.error ||
            "Could not record payment."
          );

        }


        console.log(
          "PAYMENT CREATED:",
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
          "RECORD PAYMENT ERROR:",
          error
        );


        Alert.alert(
          "Payment Failed",
          error.message ||
            "Could not record payment."
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
  // MEMBER SELECTION SCREEN
  // ==========================================================

  if (!memberId) {

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
          style={styles.selectorContainer}
        >

          {/* HEADER */}

          <ScreenHeader
            title="Select Member"
            onBack={handleBack}
            colors={colors}
            isDark={isDark}
            toggleTheme={toggleTheme}
          />


          {/* SUMMARY */}

          <View
            style={[
              styles.summaryBanner,
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
                styles.bannerIcon,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >
              <Ionicons
                name="wallet-outline"
                size={22}
                color={
                  colors.primaryLight
                }
              />
            </View>

            <Text
              style={[
                styles.selectorDescription,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Select the member for whom you want to record a payment.
            </Text>

          </View>


          {/* SEARCH */}

          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >

            <Ionicons
              name="search-outline"
              size={18}
              color={
                colors.secondaryText
              }
            />

            <TextInput
              style={[
                styles.searchInput,
                {
                  color:
                    colors.text,
                },
              ]}
              value={memberSearch}
              onChangeText={
                setMemberSearch
              }
              placeholder="Search member..."
              placeholderTextColor={
                colors.mutedText
              }
              autoCapitalize="none"
            />

          </View>


          {/* COUNT */}

          <View
            style={styles.countRow}
          >
            <Text
              style={[
                styles.countText,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {filteredMembers.length} MEMBERS
            </Text>
          </View>


          {/* MEMBER LIST */}

          {loadingMembers ? (

            <View
              style={styles.loadingContainer}
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
                Loading members...
              </Text>

            </View>

          ) : (

            <FlatList
              data={filteredMembers}
              keyExtractor={(item) =>
                String(item.id)
              }
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.memberList
              }
              renderItem={({
                item,
              }) => (

                <TouchableOpacity
                  style={[
                    styles.selectMemberCard,
                    {
                      backgroundColor:
                        colors.card,
                      borderColor:
                        colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    selectMember(item)
                  }
                >

                  <View
                    style={[
                      styles.memberAvatar,
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
                        styles.memberAvatarText,
                        {
                          color:
                            colors.primaryLight,
                        },
                      ]}
                    >
                      {getInitials(
                        item.name
                      )}
                    </Text>
                  </View>


                  <View
                    style={styles.memberInfo}
                  >

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
                      {item.name ||
                        "Unnamed Member"}
                    </Text>

                    <Text
                      style={[
                        styles.memberDetails,
                        {
                          color:
                            colors.secondaryText,
                        },
                      ]}
                    >
                      {item.phone ||
                        "No phone number"}
                    </Text>

                    {item.email ? (
                      <Text
                        style={[
                          styles.memberEmail,
                          {
                            color:
                              colors.mutedText,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.email}
                      </Text>
                    ) : null}

                  </View>


                  <View
                    style={[
                      styles.selectIcon,
                      {
                        backgroundColor:
                          colors.iconBackground,
                      },
                    ]}
                  >
                    <Ionicons
                      name="wallet-outline"
                      size={18}
                      color={
                        colors.primaryLight
                      }
                    />
                  </View>

                </TouchableOpacity>

              )}
              ListEmptyComponent={

                <View
                  style={[
                    styles.emptyContainer,
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
                      styles.emptyIcon,
                      {
                        backgroundColor:
                          colors.iconBackground,
                      },
                    ]}
                  >
                    <Ionicons
                      name="people-outline"
                      size={28}
                      color={
                        colors.primaryLight
                      }
                    />
                  </View>

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
                    Try another search.
                  </Text>

                </View>

              }
            />

          )}

        </View>

      </View>
    );
  }


  // ==========================================================
  // PAYMENT FORM
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
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
      >

        {/* HEADER */}

        <ScreenHeader
          title="Record Payment"
          onBack={handleBack}
          disabled={loading}
          colors={colors}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />


        {/* MEMBER CARD */}

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
                  "#45E0A518",
                borderColor:
                  "#45E0A555",
              },
            ]}
          >
            <Ionicons
              name="cash-outline"
              size={24}
              color="#45E0A5"
            />
          </View>


          <View
            style={styles.memberInfo}
          >

            <Text
              style={[
                styles.memberLabel,
                {
                  color:
                    colors.secondaryText,
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
              numberOfLines={1}
            >
              {memberName}
            </Text>

            <Text
              style={[
                styles.memberDetails,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Member ID #{memberId}
              {memberPhone
                ? ` • ${memberPhone}`
                : ""}
            </Text>

          </View>


          {/* CHANGE MEMBER */}

          <TouchableOpacity
            style={[
              styles.changeMemberButton,
              {
                backgroundColor:
                  colors.iconBackground,
                borderColor:
                  colors.border,
              },
            ]}
            onPress={() => {
              if (!loading) {
                setMemberId("");
                setMemberName("");
                setMemberPhone("");
                setMemberSearch("");
                fetchMembers();
              }
            }}
            disabled={loading}
          >
            <Text
              style={[
                styles.changeMemberText,
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


        {/* PAYMENT INFORMATION */}

        <View
          style={[
            styles.section,
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
              styles.sectionEyebrow,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            PAYMENT INFORMATION
          </Text>

          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Payment Details
          </Text>


          {/* AMOUNT */}

          <View
            style={styles.inputGroup}
          >

            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    colors.secondaryText,
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
                    colors.background,
                  borderColor:
                    colors.border,
                },
              ]}
            >

              <View
                style={[
                  styles.rupeeBox,
                  {
                    backgroundColor:
                      colors.iconBackground,
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
              </View>

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


          {/* PAYMENT DATE */}

          <View
            style={styles.inputGroup}
          >

            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              PAYMENT DATE *
            </Text>

            <TouchableOpacity
              style={[
                styles.datePickerButton,
                {
                  backgroundColor:
                    colors.background,
                  borderColor:
                    colors.border,
                },
              ]}
              onPress={() =>
                setShowDatePicker(true)
              }
              disabled={loading}
              activeOpacity={0.8}
            >

              <Ionicons
                name="calendar-outline"
                size={18}
                color={
                  colors.primaryLight
                }
              />

              <Text
                style={[
                  styles.datePickerText,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {formatPaymentDate()}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={
                  colors.secondaryText
                }
              />

            </TouchableOpacity>

            {showDatePicker ? (
              <DateTimePicker
                value={paymentDate}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onValueChange={handleDateValueChange}
                onDismiss={handleDateDismiss}
              />
            ) : null}

          </View>


          {/* MEMBERSHIP PLAN */}

          <View
            style={styles.inputGroup}
          >

            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              MEMBERSHIP PLAN *
            </Text>

            <View
              style={styles.planContainer}
            >

              {membershipPlans.map(
                (membershipPlan) => {

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
                            selected
                              ? colors.iconBackground
                              : colors.background,
                          borderColor:
                            selected
                              ? colors.primaryLight
                              : colors.border,
                        },
                      ]}
                      onPress={() =>
                        setPlan(
                          membershipPlan.value
                        )
                      }
                      disabled={loading}
                      activeOpacity={0.8}
                    >

                      {selected && (
                        <View
                          style={styles.selectedCheck}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={
                              colors.primaryLight
                            }
                          />
                        </View>
                      )}

                      <Text
                        style={[
                          styles.planLabel,
                          {
                            color:
                              selected
                                ? colors.primaryLight
                                : colors.text,
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
                              colors.secondaryText,
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
            style={styles.inputGroup}
          >

            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              PAYMENT METHOD *
            </Text>

            <View
              style={styles.methodContainer}
            >

              {paymentMethods.map(
                (method) => {

                  const selected =
                    paymentMethod ===
                    method;

                  return (

                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodButton,
                        {
                          backgroundColor:
                            selected
                              ? colors.iconBackground
                              : colors.background,
                          borderColor:
                            selected
                              ? colors.primaryLight
                              : colors.border,
                        },
                      ]}
                      onPress={() =>
                        setPaymentMethod(
                          method
                        )
                      }
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.methodText,
                          {
                            color:
                              selected
                                ? colors.primaryLight
                                : colors.secondaryText,
                          },
                        ]}
                      >
                        {method === "BANK"
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
            style={styles.inputGroup}
          >

            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    colors.secondaryText,
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
                    colors.background,
                  borderColor:
                    colors.border,
                  color:
                    colors.text,
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

        </View>


        {/* SUMMARY */}

        <View
          style={[
            styles.summaryCard,
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
              styles.sectionEyebrow,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            PAYMENT SUMMARY
          </Text>

          <SummaryRow
            label="Member"
            value={memberName}
            colors={colors}
          />

          <SummaryRow
            label="Payment Date"
            value={formatPaymentDate()}
            colors={colors}
          />

          <SummaryRow
            label="Plan"
            value={plan}
            colors={colors}
          />

          <SummaryRow
            label="Payment Method"
            value={paymentMethod}
            colors={colors}
          />

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
            style={styles.totalRow}
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
              style={styles.totalValue}
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

              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color="#FFFFFF"
              />

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
          onPress={
            handleBack
          }
          disabled={loading}
        >
          <Text
            style={[
              styles.cancelText,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            CANCEL
          </Text>
        </TouchableOpacity>

      </ScrollView>

    </View>
  );
}


// ============================================================
// SCREEN HEADER
// ============================================================

function ScreenHeader({
  title,
  onBack,
  disabled = false,
  colors,
  isDark,
  toggleTheme,
}) {

  return (

    <View
      style={styles.header}
    >

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
          GYMRYT • PAYMENTS
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
          {title}
        </Text>

      </View>


      <View
        style={styles.headerActions}
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
          onPress={toggleTheme}
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
          onPress={onBack}
          disabled={disabled}
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
}


// ============================================================
// SUMMARY ROW
// ============================================================

function SummaryRow({
  label,
  value,
  colors,
}) {

  return (

    <View
      style={styles.summaryRow}
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
        {label}
      </Text>

      <Text
        style={[
          styles.summaryValue,
          {
            color:
              colors.text,
          },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>

    </View>
  );
}


// ============================================================
// INITIALS
// ============================================================

function getInitials(name) {

  if (!name) {
    return "?";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word[0]
    )
    .join("")
    .substring(0, 2)
    .toUpperCase();
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
    },

    selectorContainer: {
      flex: 1,
      paddingHorizontal: 18,
      paddingTop:
        Platform.OS === "ios"
          ? 54
          : 44,
    },

    scrollContent: {
      paddingHorizontal: 18,
      paddingTop:
        Platform.OS === "ios"
          ? 54
          : 44,
      paddingBottom: 40,
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },

    headerTextContainer: {
      flex: 1,
      marginRight: 10,
    },

    smallTitle: {
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
    // MEMBER SELECTOR
    // ========================================================

    summaryBanner: {
      minHeight: 76,
      borderWidth: 1,
      borderRadius: 21,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },

    bannerIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    selectorDescription: {
      flex: 1,
      fontSize: 10,
      fontWeight: "600",
      lineHeight: 15,
      marginLeft: 11,
    },

    searchContainer: {
      height: 50,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
    },

    searchInput: {
      flex: 1,
      marginLeft: 9,
      fontSize: 13,
      fontWeight: "600",
    },

    countRow: {
      marginTop: 16,
      marginBottom: 10,
    },

    countText: {
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    memberList: {
      paddingBottom: 40,
    },

    selectMemberCard: {
      minHeight: 78,
      borderWidth: 1,
      borderRadius: 20,
      paddingVertical: 10,
      paddingLeft: 10,
      paddingRight: 10,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },

    selectIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },


    // ========================================================
    // LOADING / EMPTY
    // ========================================================

    loadingContainer: {
      paddingTop: 60,
      alignItems: "center",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: "700",
    },

    emptyContainer: {
      borderWidth: 1,
      borderRadius: 21,
      paddingVertical: 31,
      paddingHorizontal: 20,
      alignItems: "center",
    },

    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyTitle: {
      fontSize: 15,
      fontWeight: "900",
      marginTop: 12,
    },

    emptyText: {
      fontSize: 9,
      fontWeight: "600",
      marginTop: 5,
    },


    // ========================================================
    // MEMBER CARD
    // ========================================================

    memberCard: {
      minHeight: 84,
      borderWidth: 1,
      borderRadius: 21,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },

    memberAvatar: {
      width: 52,
      height: 52,
      borderRadius: 17,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    memberAvatarText: {
      fontSize: 16,
      fontWeight: "900",
    },

    memberInfo: {
      flex: 1,
      marginLeft: 11,
      marginRight: 6,
    },

    memberLabel: {
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 1,
    },

    memberName: {
      fontSize: 13,
      fontWeight: "900",
      marginTop: 2,
    },

    memberDetails: {
      fontSize: 9,
      fontWeight: "600",
      marginTop: 3,
    },

    memberEmail: {
      fontSize: 8,
      fontWeight: "600",
      marginTop: 2,
    },

    changeMemberButton: {
      borderWidth: 1,
      borderRadius: 13,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },

    changeMemberText: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.8,
    },


    // ========================================================
    // SECTION
    // ========================================================

    section: {
      borderWidth: 1,
      borderRadius: 26,
      padding: 16,
      paddingBottom: 4,
      marginBottom: 12,
    },

    sectionEyebrow: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.3,
      marginBottom: 3,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 16,
    },

    inputGroup: {
      marginBottom: 15,
    },

    inputLabel: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
      marginBottom: 7,
    },

    input: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 14,
      fontSize: 13,
      fontWeight: "600",
    },

    notesInput: {
      minHeight: 90,
      paddingTop: 13,
    },


    // ========================================================
    // AMOUNT
    // ========================================================

    amountContainer: {
      height: 60,
      borderWidth: 1,
      borderRadius: 16,
      paddingLeft: 8,
      flexDirection: "row",
      alignItems: "center",
    },

    rupeeBox: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },

    rupee: {
      fontSize: 20,
      fontWeight: "900",
    },

    amountInput: {
      flex: 1,
      height: "100%",
      paddingHorizontal: 12,
      fontSize: 24,
      fontWeight: "900",
    },


    // ========================================================
    // DATE
    // ========================================================

    datePickerButton: {
      height: 52,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
    },

    datePickerText: {
      flex: 1,
      marginLeft: 10,
      fontSize: 13,
      fontWeight: "700",
    },


    // ========================================================
    // PLAN
    // ========================================================

    planContainer: {
      flexDirection: "row",
      gap: 8,
    },

    planCard: {
      flex: 1,
      minHeight: 74,
      borderWidth: 1,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
    },

    selectedCheck: {
      position: "absolute",
      top: 6,
      right: 6,
    },

    planLabel: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.6,
    },

    planDuration: {
      fontSize: 8,
      fontWeight: "600",
      marginTop: 4,
    },


    // ========================================================
    // METHOD
    // ========================================================

    methodContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    methodButton: {
      width: "48.5%",
      height: 46,
      borderWidth: 1,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    methodText: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.8,
    },


    // ========================================================
    // SUMMARY
    // ========================================================

    summaryCard: {
      borderWidth: 1,
      borderRadius: 26,
      padding: 16,
      marginBottom: 18,
    },

    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
    },

    summaryLabel: {
      fontSize: 10,
      fontWeight: "700",
    },

    summaryValue: {
      flexShrink: 1,
      marginLeft: 12,
      fontSize: 11,
      fontWeight: "900",
      textAlign: "right",
    },

    summaryDivider: {
      height: 1,
      marginVertical: 13,
    },

    totalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    totalLabel: {
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    totalValue: {
      color: "#45E0A5",
      fontSize: 24,
      fontWeight: "900",
    },


    // ========================================================
    // BUTTONS
    // ========================================================

    recordButton: {
      height: 54,
      borderRadius: 17,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    recordButtonDisabled: {
      opacity: 0.7,
    },

    recordButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1,
    },

    cancelButton: {
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
    },

    cancelText: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },

  });