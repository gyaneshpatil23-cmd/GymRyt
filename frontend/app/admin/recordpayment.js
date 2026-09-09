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
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";


// ============================================================
// API
// ============================================================

const API_BASE_URL =
  "http://192.168.1.49:8000/api/members";

const MEMBERS_API =
  `${API_BASE_URL}/`;

const PAYMENT_API =
  `${API_BASE_URL}/payments/`;


// ============================================================
// RECORD PAYMENT
// ============================================================

export default function RecordPayment() {

  const params = useLocalSearchParams();


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
        style={styles.container}
      >

        <View
          style={styles.selectorContainer}
        >

          {/* HEADER */}

          <View
            style={styles.header}
          >

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >

              <Text
                style={styles.backText}
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
                style={styles.smallTitle}
              >
                GYMRyt MANAGEMENT
              </Text>

              <Text
                style={styles.title}
              >
                Select Member
              </Text>

            </View>

          </View>


          {/* DESCRIPTION */}

          <Text
            style={styles.selectorDescription}
          >
            Select the member for whom you want to record a payment.
          </Text>


          {/* SEARCH */}

          <View
            style={styles.searchContainer}
          >

            <Text
              style={styles.searchIcon}
            >
              ⌕
            </Text>


            <TextInput
              style={styles.searchInput}
              value={memberSearch}
              onChangeText={
                setMemberSearch
              }
              placeholder="Search member..."
              placeholderTextColor="#475569"
              autoCapitalize="none"
            />

          </View>


          {/* COUNT */}

          <View
            style={styles.countRow}
          >

            <Text
              style={styles.countText}
            >
              {filteredMembers.length} Members
            </Text>

          </View>


          {/* MEMBER LIST */}

          {loadingMembers ? (

            <View
              style={styles.loadingContainer}
            >

              <ActivityIndicator
                size="large"
                color="#2563EB"
              />

              <Text
                style={styles.loadingText}
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
                  style={styles.selectMemberCard}
                  activeOpacity={0.8}
                  onPress={() =>
                    selectMember(item)
                  }
                >

                  <View
                    style={
                      styles.memberAvatar
                    }
                  >

                    <Text
                      style={
                        styles.memberAvatarText
                      }
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
                      style={styles.memberName}
                      numberOfLines={1}
                    >
                      {item.name ||
                        "Unnamed Member"}
                    </Text>


                    <Text
                      style={
                        styles.memberDetails
                      }
                    >
                      {item.phone ||
                        "No phone number"}
                    </Text>


                    {item.email ? (

                      <Text
                        style={
                          styles.memberEmail
                        }
                        numberOfLines={1}
                      >
                        {item.email}
                      </Text>

                    ) : null}

                  </View>


                  <Text
                    style={styles.selectArrow}
                  >
                    ›
                  </Text>

                </TouchableOpacity>

              )}
              ListEmptyComponent={

                <View
                  style={
                    styles.emptyContainer
                  }
                >

                  <Text
                    style={
                      styles.emptyIcon
                    }
                  >
                    👥
                  </Text>

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No Members Found
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
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
      style={styles.container}
    >

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* HEADER */}

        <View
          style={styles.header}
        >

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={loading}
          >

            <Text
              style={styles.backText}
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
              style={styles.smallTitle}
            >
              GYMRyt MANAGEMENT
            </Text>

            <Text
              style={styles.title}
            >
              Record Payment
            </Text>

          </View>

        </View>


        {/* MEMBER CARD */}

        <View
          style={styles.memberCard}
        >

          <View
            style={styles.memberAvatar}
          >

            <Text
              style={
                styles.memberAvatarText
              }
            >
              ₹
            </Text>

          </View>


          <View
            style={styles.memberInfo}
          >

            <Text
              style={styles.memberLabel}
            >
              PAYMENT FOR
            </Text>

            <Text
              style={styles.memberName}
              numberOfLines={1}
            >
              {memberName}
            </Text>

            <Text
              style={styles.memberDetails}
            >
              Member ID #{memberId}

              {memberPhone
                ? ` • ${memberPhone}`
                : ""}
            </Text>

          </View>


          {/* CHANGE MEMBER */}

          <TouchableOpacity
            style={styles.changeMemberButton}
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
              style={
                styles.changeMemberText
              }
            >
              CHANGE
            </Text>

          </TouchableOpacity>

        </View>


        {/* PAYMENT INFORMATION */}

        <Text
          style={styles.sectionTitle}
        >
          PAYMENT INFORMATION
        </Text>


        {/* AMOUNT */}

        <View
          style={styles.inputGroup}
        >

          <Text
            style={styles.inputLabel}
          >
            AMOUNT *
          </Text>


          <View
            style={
              styles.amountContainer
            }
          >

            <Text
              style={styles.rupee}
            >
              ₹
            </Text>


            <TextInput
              style={
                styles.amountInput
              }
              value={amount}
              onChangeText={
                setAmount
              }
              placeholder="0"
              placeholderTextColor="#475569"
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
            style={styles.inputLabel}
          >
            PAYMENT DATE *
          </Text>


          <TouchableOpacity
            style={
              styles.datePickerButton
            }
            onPress={() =>
              setShowDatePicker(true)
            }
            disabled={loading}
            activeOpacity={0.8}
          >

            <Text
              style={styles.calendarIcon}
            >
              📅
            </Text>


            <Text
              style={
                styles.datePickerText
              }
            >
              {formatPaymentDate()}
            </Text>


            <Text
              style={
                styles.datePickerArrow
              }
            >
              ›
            </Text>

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
            style={styles.inputLabel}
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

                      selected &&
                        styles.planCardActive,
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
                        style={
                          styles.selectedCheck
                        }
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

                        selected &&
                          styles.planLabelActive,
                      ]}
                    >
                      {
                        membershipPlan.label
                      }
                    </Text>


                    <Text
                      style={[
                        styles.planDuration,

                        selected &&
                          styles.planDurationActive,
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
            style={styles.inputLabel}
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
                    key={method}
                    style={[
                      styles.methodButton,

                      selected &&
                        styles.methodButtonActive,
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

                        selected &&
                          styles.methodTextActive,
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
            style={styles.inputLabel}
          >
            NOTES
          </Text>


          <TextInput
            style={[
              styles.input,
              styles.notesInput,
            ]}
            value={notes}
            onChangeText={
              setNotes
            }
            placeholder="Optional notes"
            placeholderTextColor="#475569"
            multiline
            textAlignVertical="top"
            editable={!loading}
          />

        </View>


        {/* SUMMARY */}

        <View
          style={styles.summaryCard}
        >

          <Text
            style={styles.summaryTitle}
          >
            PAYMENT SUMMARY
          </Text>


          <View
            style={styles.summaryRow}
          >

            <Text
              style={styles.summaryLabel}
            >
              Member
            </Text>


            <Text
              style={styles.summaryValue}
              numberOfLines={1}
            >
              {memberName}
            </Text>

          </View>


          <View
            style={styles.summaryRow}
          >

            <Text
              style={styles.summaryLabel}
            >
              Payment Date
            </Text>


            <Text
              style={styles.summaryValue}
            >
              {formatPaymentDate()}
            </Text>

          </View>


          <View
            style={styles.summaryRow}
          >

            <Text
              style={styles.summaryLabel}
            >
              Plan
            </Text>


            <Text
              style={styles.summaryValue}
            >
              {plan}
            </Text>

          </View>


          <View
            style={styles.summaryRow}
          >

            <Text
              style={styles.summaryLabel}
            >
              Payment Method
            </Text>


            <Text
              style={styles.summaryValue}
            >
              {paymentMethod}
            </Text>

          </View>


          <View
            style={styles.summaryDivider}
          />


          <View
            style={styles.totalRow}
          >

            <Text
              style={styles.totalLabel}
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
          onPress={
            handleBack
          }
          disabled={loading}
        >

          <Text
            style={styles.cancelText}
          >
            CANCEL
          </Text>

        </TouchableOpacity>

      </ScrollView>

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
      backgroundColor: "#050816",
    },


    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 55,
      paddingBottom: 60,
    },


    selectorContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 55,
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
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: "#172554",
      alignItems: "center",
      justifyContent: "center",
    },


    backText: {
      color: "#FFFFFF",
      fontSize: 34,
      fontWeight: "300",
      marginTop: -4,
    },


    headerTextContainer: {
      marginLeft: 15,
      flex: 1,
    },


    smallTitle: {
      color: "#38BDF8",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 2,
    },


    title: {
      color: "#FFFFFF",
      fontSize: 29,
      fontWeight: "900",
      marginTop: 3,
    },


    selectorDescription: {
      color: "#64748B",
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 20,
    },


    // ========================================================
    // SEARCH
    // ========================================================

    searchContainer: {
      height: 54,
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: "#172554",
      borderRadius: 15,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
      marginBottom: 18,
    },


    searchIcon: {
      color: "#64748B",
      fontSize: 25,
      marginRight: 10,
    },


    searchInput: {
      flex: 1,
      color: "#FFFFFF",
      fontSize: 15,
    },


    // ========================================================
    // COUNT
    // ========================================================

    countRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },


    countText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },


    // ========================================================
    // MEMBER SELECTOR LIST
    // ========================================================

    memberList: {
      paddingBottom: 40,
    },


    selectMemberCard: {
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: "#172554",
      borderRadius: 18,
      padding: 14,
      marginBottom: 11,
      flexDirection: "row",
      alignItems: "center",
    },


    memberAvatar: {
      width: 50,
      height: 50,
      borderRadius: 16,
      backgroundColor: "#172554",
      alignItems: "center",
      justifyContent: "center",
    },


    memberAvatarText: {
      color: "#60A5FA",
      fontSize: 14,
      fontWeight: "900",
    },


    memberInfo: {
      flex: 1,
      marginLeft: 14,
    },


    memberLabel: {
      color: "#64748B",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1,
    },


    memberName: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "900",
      marginTop: 3,
    },


    memberDetails: {
      color: "#64748B",
      fontSize: 11,
      marginTop: 4,
    },


    memberEmail: {
      color: "#475569",
      fontSize: 10,
      marginTop: 3,
    },


    selectArrow: {
      color: "#60A5FA",
      fontSize: 28,
      fontWeight: "300",
      marginLeft: 10,
    },


    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },


    loadingText: {
      color: "#64748B",
      fontSize: 13,
      marginTop: 15,
    },


    // ========================================================
    // EMPTY
    // ========================================================

    emptyContainer: {
      alignItems: "center",
      marginTop: 70,
    },


    emptyIcon: {
      fontSize: 42,
      marginBottom: 15,
    },


    emptyTitle: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "800",
    },


    emptyText: {
      color: "#64748B",
      fontSize: 13,
      marginTop: 6,
    },


    // ========================================================
    // MEMBER CARD
    // ========================================================

    memberCard: {
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: "#172554",
      borderRadius: 18,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 30,
    },


    changeMemberButton: {
      backgroundColor: "#172554",
      borderWidth: 1,
      borderColor: "#2563EB",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },


    changeMemberText: {
      color: "#60A5FA",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.5,
    },


    // ========================================================
    // SECTION
    // ========================================================

    sectionTitle: {
      color: "#60A5FA",
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
      color: "#64748B",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
      marginBottom: 9,
    },


    input: {
      height: 54,
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: "#172554",
      borderRadius: 15,
      paddingHorizontal: 15,
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
    },


    // ========================================================
    // AMOUNT
    // ========================================================

    amountContainer: {
      height: 65,
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: "#2563EB",
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
    },


    rupee: {
      color: "#60A5FA",
      fontSize: 25,
      fontWeight: "900",
      marginRight: 10,
    },


    amountInput: {
      flex: 1,
      color: "#FFFFFF",
      fontSize: 25,
      fontWeight: "900",
      height: 65,
    },


    // ========================================================
    // DATE
    // ========================================================

    datePickerButton: {
      height: 54,
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: "#172554",
      borderRadius: 15,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "center",
    },


    calendarIcon: {
      fontSize: 18,
      marginRight: 12,
    },


    datePickerText: {
      flex: 1,
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700",
    },


    datePickerArrow: {
      color: "#64748B",
      fontSize: 26,
      fontWeight: "300",
    },


    // ========================================================
    // PLANS
    // ========================================================

    planContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 9,
    },


    planCard: {
      flex: 1,
      minHeight: 78,
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: "#172554",
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
      position: "relative",
    },


    planCardActive: {
      backgroundColor: "#172554",
      borderColor: "#2563EB",
      borderWidth: 2,
    },


    planLabel: {
      color: "#64748B",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.5,
      textAlign: "center",
    },


    planLabelActive: {
      color: "#60A5FA",
    },


    planDuration: {
      color: "#475569",
      fontSize: 9,
      fontWeight: "700",
      marginTop: 6,
      textAlign: "center",
    },


    planDurationActive: {
      color: "#93C5FD",
    },


    selectedCheck: {
      position: "absolute",
      top: 5,
      right: 5,
      width: 17,
      height: 17,
      borderRadius: 9,
      backgroundColor: "#2563EB",
      alignItems: "center",
      justifyContent: "center",
    },


    selectedCheckText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "900",
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
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: "#172554",
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },


    methodButtonActive: {
      backgroundColor: "#172554",
      borderColor: "#2563EB",
    },


    methodText: {
      color: "#64748B",
      fontSize: 10,
      fontWeight: "900",
    },


    methodTextActive: {
      color: "#60A5FA",
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
      backgroundColor: "#080D19",
      borderWidth: 1,
      borderColor: "#172554",
      borderRadius: 18,
      padding: 17,
      marginTop: 5,
      marginBottom: 20,
    },


    summaryTitle: {
      color: "#64748B",
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
      color: "#64748B",
      fontSize: 12,
    },


    summaryValue: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
      maxWidth: "60%",
      textAlign: "right",
    },


    summaryDivider: {
      height: 1,
      backgroundColor: "#172554",
      marginVertical: 7,
    },


    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },


    totalLabel: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1,
    },


    totalValue: {
      color: "#22C55E",
      fontSize: 22,
      fontWeight: "900",
    },


    // ========================================================
    // RECORD BUTTON
    // ========================================================

    recordButton: {
      height: 58,
      borderRadius: 16,
      backgroundColor: "#2563EB",
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
      color: "#64748B",
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1,
    },

  });