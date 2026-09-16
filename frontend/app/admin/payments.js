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
  RefreshControl,
  ActivityIndicator,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../context/ThemeContext";

// ============================================================
// API CONFIG
// ============================================================

const API_URL =
  "http://192.168.1.52:8000/api/members";

// ============================================================
// PAYMENTS SCREEN
// ============================================================

export default function Payments() {
  const { colors } = useTheme();

  const [payments, setPayments] =
    useState([]);

  const [revenue, setRevenue] = useState({
    total_revenue: 0,
    monthly_revenue: 0,
    yearly_revenue: 0,
    payment_count: 0,
    average_payment: 0,
  });

  const [refreshing, setRefreshing] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  // ==========================================================
  // LOAD PAYMENTS FROM DJANGO
  // ==========================================================

  const loadPayments = async () => {
    try {
      setLoading(true);

      // ------------------------------------------------------
      // GET ADMIN TOKEN
      // ------------------------------------------------------

      const token =
        await AsyncStorage.getItem(
          "adminToken"
        );

      if (!token) {
        setPayments([]);
        setRevenue({
          total_revenue: 0,
          monthly_revenue: 0,
          yearly_revenue: 0,
          payment_count: 0,
          average_payment: 0,
        });

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

      // ------------------------------------------------------
      // AUTH HEADERS
      // ------------------------------------------------------

      const headers = {
        Accept: "application/json",
        Authorization: `Token ${token}`,
      };

      // ------------------------------------------------------
      // GET PAYMENT RECORDS
      // ------------------------------------------------------

      const paymentsResponse =
        await fetch(
          `${API_URL}/payments/`,
          {
            method: "GET",
            headers,
          }
        );

      console.log(
        "Payments API Status:",
        paymentsResponse.status
      );

      // ------------------------------------------------------
      // SESSION EXPIRED
      // ------------------------------------------------------

      if (
        paymentsResponse.status === 401
      ) {
        await AsyncStorage.multiRemove([
          "adminToken",
          "adminUsername",
          "adminId",
          "userRole",
        ]);

        Alert.alert(
          "Session Expired",
          "Please login again.",
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

      if (
        !paymentsResponse.ok
      ) {
        throw new Error(
          `Payments API Error: ${paymentsResponse.status}`
        );
      }

      const paymentsData =
        await paymentsResponse.json();

      console.log(
        "Payments API:",
        paymentsData
      );

      // ------------------------------------------------------
      // HANDLE PAGINATED OR NORMAL RESPONSE
      // ------------------------------------------------------

      if (
        Array.isArray(
          paymentsData
        )
      ) {
        setPayments(
          paymentsData
        );
      } else if (
        paymentsData &&
        Array.isArray(
          paymentsData.results
        )
      ) {
        setPayments(
          paymentsData.results
        );
      } else {
        setPayments([]);
      }

      // ------------------------------------------------------
      // GET REVENUE STATISTICS
      // ------------------------------------------------------

      const revenueResponse =
        await fetch(
          `${API_URL}/revenue-stats/`,
          {
            method: "GET",
            headers,
          }
        );

      console.log(
        "Revenue API Status:",
        revenueResponse.status
      );

      if (
        revenueResponse.status === 401
      ) {
        await AsyncStorage.multiRemove([
          "adminToken",
          "adminUsername",
          "adminId",
          "userRole",
        ]);

        Alert.alert(
          "Session Expired",
          "Please login again.",
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

      if (
        !revenueResponse.ok
      ) {
        throw new Error(
          `Revenue API Error: ${revenueResponse.status}`
        );
      }

      const revenueData =
        await revenueResponse.json();

      console.log(
        "Revenue API:",
        revenueData
      );

      setRevenue({
        total_revenue:
          Number(
            revenueData.total_revenue ||
              0
          ),

        monthly_revenue:
          Number(
            revenueData.monthly_revenue ||
              0
          ),

        yearly_revenue:
          Number(
            revenueData.yearly_revenue ||
              0
          ),

        payment_count:
          Number(
            revenueData.payment_count ||
              0
          ),

        average_payment:
          Number(
            revenueData.average_payment ||
              0
          ),
      });
    } catch (error) {
      console.log(
        "Load Payments Error:",
        error
      );

      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // REFRESH WHEN SCREEN OPENS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [])
  );

  // ==========================================================
  // PULL TO REFRESH
  // ==========================================================

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadPayments();

    setRefreshing(false);
  };

  // ==========================================================
  // DATE HELPERS
  // ==========================================================

  const getPaymentDate = (
    payment
  ) => {
    if (!payment?.date) {
      return new Date();
    }

    const date =
      new Date(payment.date);

    return isNaN(
      date.getTime()
    )
      ? new Date()
      : date;
  };

  const formatDate = (
    payment
  ) => {
    const date =
      getPaymentDate(payment);

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ==========================================================
  // MONEY FORMAT
  // ==========================================================

  const formatMoney = (
    amount
  ) => {
    return Number(
      amount || 0
    ).toLocaleString(
      "en-IN"
    );
  };

  // ==========================================================
  // INITIALS
  // ==========================================================

  const getInitials = (
    name
  ) => {
    if (!name) {
      return "MB";
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
  };

  // ==========================================================
  // PLAN LABEL
  // ==========================================================

  const getPlanLabel = (
    plan
  ) => {
    if (!plan) {
      return "Membership";
    }

    const formatted =
      plan
        .toString()
        .charAt(0)
        .toUpperCase() +
      plan
        .toString()
        .slice(1)
        .toLowerCase();

    return `${formatted} Membership`;
  };

  // ==========================================================
  // PAYMENT METHOD LABEL
  // ==========================================================

  const getMethodLabel = (
    method
  ) => {
    if (!method) {
      return "UNKNOWN";
    }

    if (method === "BANK") {
      return "BANK";
    }

    return method;
  };

  // ==========================================================
  // EMPTY STATE
  // ==========================================================

  const renderEmptyState = () => {
    return (
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
        <View
          style={[
            styles.emptyIcon,
            {
              backgroundColor:
                colors.iconBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.emptyIconText,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            ₹
          </Text>
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
          No Payments Yet
        </Text>

        <Text
          style={[
            styles.emptySubtitle,
            {
              color:
                colors.secondaryText,
            },
          ]}
        >
          Payments recorded from
          member profiles will
          appear here.
        </Text>

        <TouchableOpacity
          style={[
            styles.emptyButton,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
          onPress={() =>
            router.push(
              "/admin/members"
            )
          }
          activeOpacity={0.8}
        >
          <Text
            style={
              styles.emptyButtonText
            }
          >
            VIEW MEMBERS →
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ==========================================================
  // LOADING STATE
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
          Loading payments...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // UI
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
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor={
              colors.primaryLight
            }
          />
        }
      >

        {/* HEADER */}

        <View
          style={styles.header}
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
            onPress={() =>
              router.back()
            }
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

          <View>
            <Text
              style={[
                styles.smallTitle,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              GYM FINANCE
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
              Revenue & Records
            </Text>
          </View>
        </View>

        {/* REVENUE OVERVIEW */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.mutedText,
            },
          ]}
        >
          REVENUE OVERVIEW
        </Text>

        {/* TOTAL REVENUE */}

        <View
          style={[
            styles.totalRevenueCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          <View
            style={styles.revenueTop}
          >
            <View>
              <Text
                style={[
                  styles.revenueLabel,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                TOTAL REVENUE
              </Text>

              <Text
                style={[
                  styles.totalRevenue,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                ₹
                {formatMoney(
                  revenue.total_revenue
                )}
              </Text>
            </View>

            <View
              style={[
                styles.revenueIcon,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.revenueIconText,
                  {
                    color:
                      colors.primaryLight,
                  },
                ]}
              >
                ₹
              </Text>
            </View>
          </View>

          <View
            style={
              styles.revenueBottom
            }
          >
            <Text
              style={[
                styles.revenueGrowth,
                {
                  color:
                    colors.success,
                },
              ]}
            >
              ● LIVE
            </Text>

            <Text
              style={[
                styles.revenuePeriod,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              based on paid payments
            </Text>
          </View>
        </View>

        {/* MONTH + YEAR */}

        <View
          style={styles.statsRow}
        >
          <View
            style={[
              styles.smallStatCard,
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
                styles.smallStatLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              THIS MONTH
            </Text>

            <Text
              style={[
                styles.smallStatValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              ₹
              {formatMoney(
                revenue.monthly_revenue
              )}
            </Text>

            <Text
              style={[
                styles.smallStatSubtext,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              {new Date().toLocaleDateString(
                "en-IN",
                {
                  month:
                    "long",
                  year:
                    "numeric",
                }
              )}
            </Text>
          </View>

          <View
            style={[
              styles.smallStatCard,
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
                styles.smallStatLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              THIS YEAR
            </Text>

            <Text
              style={[
                styles.smallStatValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              ₹
              {formatMoney(
                revenue.yearly_revenue
              )}
            </Text>

            <Text
              style={[
                styles.smallStatSubtext,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              {new Date().getFullYear()}
            </Text>
          </View>
        </View>

        {/* PAYMENT COUNT + AVERAGE */}

        <View
          style={styles.statsRow}
        >
          <View
            style={[
              styles.smallStatCard,
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
                styles.smallStatLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              PAYMENTS
            </Text>

            <Text
              style={[
                styles.smallStatValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {revenue.payment_count}
            </Text>

            <Text
              style={[
                styles.smallStatSubtext,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Total transactions
            </Text>
          </View>

          <View
            style={[
              styles.smallStatCard,
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
                styles.smallStatLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              AVERAGE
            </Text>

            <Text
              style={[
                styles.smallStatValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              ₹
              {formatMoney(
                Math.round(
                  revenue.average_payment
                )
              )}
            </Text>

            <Text
              style={[
                styles.smallStatSubtext,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Per payment
            </Text>
          </View>
        </View>

        {/* PAYMENT RECORDS */}

        <View
          style={
            styles.recordsHeader
          }
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            PAYMENT RECORDS
          </Text>

          <Text
            style={[
              styles.recordCount,
              {
                color:
                  colors.primaryLight,
              },
            ]}
          >
            {payments.length}{" "}
            {payments.length === 1
              ? "Record"
              : "Records"}
          </Text>
        </View>

        {/* RECORDS */}

        {payments.length === 0 ? (
          renderEmptyState()
        ) : (
          payments.map(
            (payment) => {
              return (
                <TouchableOpacity
                  key={
                    payment.id
                  }
                  style={[
                    styles.paymentCard,
                    {
                      backgroundColor:
                        colors.card,
                      borderColor:
                        colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                >

                  {/* AVATAR */}

                  <View
                    style={[
                      styles.paymentAvatar,
                      {
                        backgroundColor:
                          colors.iconBackground,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentAvatarText,
                        {
                          color:
                            colors.primaryLight,
                        },
                      ]}
                    >
                      {getInitials(
                        payment.member_name
                      )}
                    </Text>
                  </View>

                  {/* INFORMATION */}

                  <View
                    style={
                      styles.paymentInfo
                    }
                  >
                    <Text
                      style={[
                        styles.memberName,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                    >
                      {
                        payment.member_name ||
                        "Unknown Member"
                      }
                    </Text>

                    <Text
                      style={[
                        styles.paymentPlan,
                        {
                          color:
                            colors.secondaryText,
                        },
                      ]}
                    >
                      {getPlanLabel(
                        payment.plan
                      )}

                      {" • "}

                      {getMethodLabel(
                        payment.method
                      )}
                    </Text>

                    <Text
                      style={[
                        styles.paymentDate,
                        {
                          color:
                            colors.mutedText,
                        },
                      ]}
                    >
                      {formatDate(
                        payment
                      )}
                    </Text>
                  </View>

                  {/* AMOUNT */}

                  <View
                    style={
                      styles.paymentAmountContainer
                    }
                  >
                    <Text
                      style={[
                        styles.paymentAmount,
                        {
                          color:
                            colors.success,
                        },
                      ]}
                    >
                      +₹
                      {formatMoney(
                        payment.amount
                      )}
                    </Text>

                    <View
                      style={[
                        styles.paidBadge,
                        {
                          backgroundColor:
                            colors.successBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.paidText,
                          {
                            color:
                              colors.success,
                          },
                        ]}
                      >
                        {payment.status ||
                          "PAID"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }
          )
        )}

        {/* VIEW MORE */}

        {payments.length > 0 && (
          <View
            style={[
              styles.viewMoreButton,
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
                styles.viewMoreText,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              SHOWING ALL{" "}
              {payments.length}{" "}
              RECORDS
            </Text>

            <Text
              style={[
                styles.viewMoreArrow,
                {
                  color:
                    colors.success,
                },
              ]}
            >
              ✓
            </Text>
          </View>
        )}

        {/* BACK */}

        <TouchableOpacity
          style={
            styles.backBottom
          }
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={[
              styles.backBottomText,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            BACK TO DASHBOARD
          </Text>
        </TouchableOpacity>

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

  content: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 30,
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    fontSize: 34,
    marginTop: -4,
  },

  smallTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },

  title: {
    fontSize: 27,
    fontWeight: "900",
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.7,
    marginBottom: 13,
  },

  totalRevenueCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 12,
  },

  revenueTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  revenueLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  totalRevenue: {
    fontSize: 36,
    fontWeight: "900",
    marginTop: 7,
  },

  revenueIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  revenueIconText: {
    fontSize: 25,
    fontWeight: "900",
  },

  revenueBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  revenueGrowth: {
    fontSize: 11,
    fontWeight: "900",
  },

  revenuePeriod: {
    fontSize: 10,
    marginLeft: 7,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  smallStatCard: {
    width: "48.5%",
    borderRadius: 17,
    borderWidth: 1,
    padding: 16,
  },

  smallStatLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  smallStatValue: {
    fontSize: 21,
    fontWeight: "900",
    marginTop: 8,
  },

  smallStatSubtext: {
    fontSize: 9,
    marginTop: 5,
  },

  recordsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 25,
  },

  recordCount: {
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 13,
  },

  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
  },

  paymentAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentAvatarText: {
    fontSize: 12,
    fontWeight: "900",
  },

  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },

  memberName: {
    fontSize: 13,
    fontWeight: "900",
  },

  paymentPlan: {
    fontSize: 9,
    marginTop: 4,
  },

  paymentDate: {
    fontSize: 9,
    marginTop: 4,
  },

  paymentAmountContainer: {
    alignItems: "flex-end",
  },

  paymentAmount: {
    fontSize: 13,
    fontWeight: "900",
  },

  paidBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 5,
  },

  paidText: {
    fontSize: 7,
    fontWeight: "900",
  },

  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 25,
    alignItems: "center",
    marginBottom: 15,
  },

  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyIconText: {
    fontSize: 25,
    fontWeight: "900",
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
  },

  emptySubtitle: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 7,
    marginBottom: 18,
  },

  emptyButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  viewMoreButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  viewMoreText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  viewMoreArrow: {
    fontSize: 15,
    marginLeft: 10,
  },

  backBottom: {
    alignItems: "center",
    paddingVertical: 22,
  },

  backBottomText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
