import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../context/ThemeContext";

// ============================================================
// API CONFIG
// ============================================================

const API_URL =
  "http://192.168.1.43:8000/api/members";

// ============================================================
// PAYMENTS SCREEN
// ============================================================

export default function Payments() {
  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();

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
  // PAYMENT STATUS COLOR
  // ==========================================================

  const getStatusColor = (
    paymentStatus
  ) => {
    const value =
      String(
        paymentStatus || "PAID"
      ).toUpperCase();

    if (value === "FAILED") {
      return "#FF5870";
    }

    if (value === "PENDING") {
      return "#FFB21C";
    }

    return "#45E0A5";
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
          <Ionicons
            name="wallet-outline"
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

        <Pressable
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
        >
          <Text
            style={
              styles.emptyButtonText
            }
          >
            VIEW MEMBERS
          </Text>

          <Ionicons
            name="arrow-forward"
            size={14}
            color="#FFFFFF"
          />
        </Pressable>
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
              colors.primary
            }
            colors={[
              colors.primary,
            ]}
          />
        }
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={styles.header}
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
              GYMRYT • GYM FINANCE
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

        {/* ==================================================
            REVENUE OVERVIEW
        ================================================== */}

        <View
          style={[
            styles.overviewCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={[
                  styles.sectionEyebrow,
                  {
                    color:
                      colors.primaryLight,
                  },
                ]}
              >
                REVENUE OVERVIEW
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
                Total Revenue
              </Text>
            </View>

            <View
              style={[
                styles.liveBadge,
                {
                  backgroundColor:
                    "#45E0A518",
                  borderColor:
                    "#45E0A555",
                },
              ]}
            >
              <View
                style={
                  styles.liveDot
                }
              />

              <Text
                style={
                  styles.liveText
                }
              >
                LIVE
              </Text>
            </View>
          </View>

          {/* TOTAL */}

          <View
            style={[
              styles.totalRow,
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
                styles.totalIcon,
                {
                  backgroundColor:
                    "#45E0A518",
                },
              ]}
            >
              <Ionicons
                name="cash-outline"
                size={26}
                color="#45E0A5"
              />
            </View>

            <View
              style={
                styles.totalInfo
              }
            >
              <Text
                style={[
                  styles.totalRevenue,
                  {
                    color:
                      colors.text,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ₹
                {formatMoney(
                  revenue.total_revenue
                )}
              </Text>

              <Text
                style={[
                  styles.totalSubtext,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                Based on paid payments
              </Text>
            </View>
          </View>

          {/* STAT GRID */}

          <View
            style={
              styles.statsGrid
            }
          >
            <FinanceStat
              label="THIS MONTH"
              value={`₹${formatMoney(
                revenue.monthly_revenue
              )}`}
              subtext={new Date().toLocaleDateString(
                "en-IN",
                {
                  month:
                    "long",
                  year:
                    "numeric",
                }
              )}
              icon="calendar-outline"
              iconColor="#36B7FF"
              colors={colors}
            />

            <FinanceStat
              label="THIS YEAR"
              value={`₹${formatMoney(
                revenue.yearly_revenue
              )}`}
              subtext={String(
                new Date().getFullYear()
              )}
              icon="trending-up-outline"
              iconColor="#45E0A5"
              colors={colors}
            />

            <FinanceStat
              label="PAYMENTS"
              value={String(
                revenue.payment_count
              )}
              subtext="Total transactions"
              icon="receipt-outline"
              iconColor="#FFB21C"
              colors={colors}
            />

            <FinanceStat
              label="AVERAGE"
              value={`₹${formatMoney(
                Math.round(
                  revenue.average_payment
                )
              )}`}
              subtext="Per payment"
              icon="analytics-outline"
              iconColor="#A78BFA"
              colors={colors}
            />
          </View>
        </View>

        {/* ==================================================
            PAYMENT RECORDS
        ================================================== */}

        <View
          style={
            styles.sectionHeaderSimple
          }
        >
          <Text
            style={[
              styles.sectionHeading,
              {
                color:
                  colors.text,
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

        {payments.length === 0 ? (
          renderEmptyState()
        ) : (
          payments.map(
            (payment) => {
              const statusColor =
                getStatusColor(
                  payment.status
                );

              return (
                <View
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
                >

                  {/* AVATAR */}

                  <View
                    style={[
                      styles.paymentAvatar,
                      {
                        backgroundColor:
                          colors.iconBackground,
                        borderColor:
                          `${statusColor}55`,
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
                      numberOfLines={1}
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
                      numberOfLines={1}
                    >
                      {getPlanLabel(
                        payment.plan
                      )}
                      {" • "}
                      {getMethodLabel(
                        payment.method
                      )}
                    </Text>

                    <View
                      style={
                        styles.dateRow
                      }
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={10}
                        color={
                          colors.mutedText
                        }
                      />

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
                            statusColor,
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
                        styles.statusBadge,
                        {
                          backgroundColor:
                            `${statusColor}18`,
                          borderColor:
                            `${statusColor}55`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              statusColor,
                          },
                        ]}
                      >
                        {payment.status ||
                          "PAID"}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }
          )
        )}

        {/* ==================================================
            ALL RECORDS SHOWN
        ================================================== */}

        {payments.length > 0 && (
          <View
            style={[
              styles.allShownCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color="#45E0A5"
            />

            <Text
              style={[
                styles.allShownText,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              SHOWING ALL{" "}
              {payments.length}{" "}
              RECORDS
            </Text>
          </View>
        )}

        {/* ==================================================
            FOOTER
        ================================================== */}

        <Pressable
          style={
            styles.footer
          }
          onPress={() =>
            router.back()
          }
        >
          <View
            style={[
              styles.footerIcon,
              {
                backgroundColor:
                  colors.iconBackground,
              },
            ]}
          >
            <Ionicons
              name="home-outline"
              size={14}
              color={
                colors.primaryLight
              }
            />
          </View>

          <Text
            style={[
              styles.footerText,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            BACK TO DASHBOARD
          </Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}

// ============================================================
// FINANCE STAT
// ============================================================

function FinanceStat({
  label,
  value,
  subtext,
  icon,
  iconColor,
  colors,
}) {
  return (
    <View
      style={[
        styles.statCard,
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
          styles.statIcon,
          {
            backgroundColor:
              `${iconColor}18`,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <Text
        style={[
          styles.statLabel,
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
          styles.statValue,
          {
            color:
              colors.text,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text
        style={[
          styles.statSubtext,
          {
            color:
              colors.mutedText,
          },
        ]}
        numberOfLines={1}
      >
        {subtext}
      </Text>
    </View>
  );
}

// ============================================================
// STATIC STYLES
// ============================================================

const styles = StyleSheet.create({

  // ==========================================================
  // CONTAINER
  // ==========================================================

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop:
      Platform.OS === "ios"
        ? 54
        : 44,
    paddingBottom: 40,
  },

  // ==========================================================
  // LOADING
  // ==========================================================

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "700",
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  headerLeft: {
    flex: 1,
    marginRight: 10,
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
  },

  headerButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // ==========================================================
  // OVERVIEW CARD
  // ==========================================================

  overviewCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
    marginBottom: 21,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
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
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#45E0A5",
    marginRight: 5,
  },

  liveText: {
    color: "#45E0A5",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  // ==========================================================
  // TOTAL REVENUE
  // ==========================================================

  totalRow: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  totalIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  totalInfo: {
    flex: 1,
    marginLeft: 12,
  },

  totalRevenue: {
    fontSize: 28,
    fontWeight: "900",
  },

  totalSubtext: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },

  // ==========================================================
  // STATS
  // ==========================================================

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  statCard: {
    width: "48.2%",
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    marginBottom: 9,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  statLabel: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  statValue: {
    fontSize: 19,
    fontWeight: "900",
    marginTop: 3,
  },

  statSubtext: {
    fontSize: 8,
    fontWeight: "600",
    marginTop: 2,
  },

  // ==========================================================
  // RECORDS HEADER
  // ==========================================================

  sectionHeaderSimple: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
    marginTop: 2,
  },

  sectionHeading: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  recordCount: {
    fontSize: 10,
    fontWeight: "800",
  },

  // ==========================================================
  // PAYMENT CARD
  // ==========================================================

  paymentCard: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  paymentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentAvatarText: {
    fontSize: 15,
    fontWeight: "900",
  },

  paymentInfo: {
    flex: 1,
    marginLeft: 11,
    marginRight: 6,
  },

  memberName: {
    fontSize: 13,
    fontWeight: "900",
  },

  paymentPlan: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  paymentDate: {
    fontSize: 8,
    fontWeight: "700",
    marginLeft: 4,
  },

  paymentAmountContainer: {
    alignItems: "flex-end",
  },

  paymentAmount: {
    fontSize: 14,
    fontWeight: "900",
  },

  statusBadge: {
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginTop: 6,
  },

  statusText: {
    fontSize: 6.5,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  // ==========================================================
  // ALL SHOWN
  // ==========================================================

  allShownCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  allShownText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginLeft: 6,
  },

  // ==========================================================
  // EMPTY
  // ==========================================================

  emptyCard: {
    borderWidth: 1,
    borderRadius: 21,
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: "center",
  },

  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 11,
  },

  emptySubtitle: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
    lineHeight: 13,
  },

  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 16,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
    marginRight: 6,
  },

  // ==========================================================
  // FOOTER
  // ==========================================================

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 22,
    paddingBottom: 8,
  },

  footerIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  footerText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.7,
  },

});
