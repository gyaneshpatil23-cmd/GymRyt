import React, {
  useCallback,
  useMemo,
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
  TextInput,
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
// MONTH NAMES
// ============================================================

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ============================================================
// REVENUE SCREEN
// ============================================================

export default function Revenue() {
  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();

  // ==========================================================
  // STATE
  // ==========================================================

  const [payments, setPayments] = useState([]);

  const [revenue, setRevenue] = useState({
    total_revenue: 0,
    monthly_revenue: 0,
    yearly_revenue: 0,
    payment_count: 0,
    average_payment: 0,
  });

  const [refreshing, setRefreshing] = useState(false);

  const [loading, setLoading] = useState(true);

  // Recent payments
  const [showAllPayments, setShowAllPayments] =
    useState(false);

  // Revenue history
  const [showRevenueHistory, setShowRevenueHistory] =
    useState(false);

  const [selectedYear, setSelectedYear] =
    useState(null);

  const [selectedMonth, setSelectedMonth] =
    useState(null);

  // Monthly payment search
  const [paymentSearch, setPaymentSearch] =
    useState("");

  // ==========================================================
  // CLEAR ADMIN SESSION
  // ==========================================================

  const clearAdminSession = async () => {
    await AsyncStorage.multiRemove([
      "adminToken",
      "adminUsername",
      "adminId",
      "userRole",
    ]);
  };

  // ==========================================================
  // SESSION EXPIRED
  // ==========================================================

  const handleSessionExpired = async () => {
    await clearAdminSession();

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
  };

  // ==========================================================
  // LOAD REVENUE DATA
  // ==========================================================

  const loadRevenue = async () => {
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
        await clearAdminSession();

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

      const authHeaders = {
        "Content-Type":
          "application/json",

        Accept:
          "application/json",

        Authorization:
          `Token ${token}`,
      };

      // ======================================================
      // GET REVENUE STATISTICS
      // ======================================================

      const revenueResponse =
        await fetch(
          `${API_URL}/revenue-stats/`,
          {
            method: "GET",
            headers: authHeaders,
          }
        );

      console.log(
        "REVENUE STATUS:",
        revenueResponse.status
      );

      // ------------------------------------------------------
      // UNAUTHORIZED
      // ------------------------------------------------------

      if (
        revenueResponse.status ===
        401
      ) {
        await handleSessionExpired();
        return;
      }

      // ------------------------------------------------------
      // ERROR
      // ------------------------------------------------------

      if (!revenueResponse.ok) {
        const errorText =
          await revenueResponse.text();

        console.log(
          "REVENUE ERROR:",
          errorText
        );

        throw new Error(
          `Revenue API Error: ${revenueResponse.status}`
        );
      }

      // ------------------------------------------------------
      // REVENUE DATA
      // ------------------------------------------------------

      const revenueData =
        await revenueResponse.json();

      console.log(
        "REVENUE API:",
        revenueData
      );

      // ------------------------------------------------------
      // SET REVENUE
      // ------------------------------------------------------

      setRevenue({
        total_revenue:
          Number(
            revenueData.total_revenue ??
              0
          ),

        monthly_revenue:
          Number(
            revenueData.monthly_revenue ??
              0
          ),

        yearly_revenue:
          Number(
            revenueData.yearly_revenue ??
              0
          ),

        payment_count:
          Number(
            revenueData.payment_count ??
              0
          ),

        average_payment:
          Number(
            revenueData.average_payment ??
              0
          ),
      });

      // ======================================================
      // GET PAYMENT RECORDS
      // ======================================================

      const paymentsResponse =
        await fetch(
          `${API_URL}/payments/`,
          {
            method: "GET",
            headers: authHeaders,
          }
        );

      console.log(
        "PAYMENTS STATUS:",
        paymentsResponse.status
      );

      // ------------------------------------------------------
      // PAYMENT UNAUTHORIZED
      // ------------------------------------------------------

      if (
        paymentsResponse.status ===
        401
      ) {
        await handleSessionExpired();
        return;
      }

      // ------------------------------------------------------
      // PAYMENT ERROR
      // ------------------------------------------------------

      if (!paymentsResponse.ok) {
        const errorText =
          await paymentsResponse.text();

        console.log(
          "PAYMENTS ERROR:",
          errorText
        );

        throw new Error(
          `Payments API Error: ${paymentsResponse.status}`
        );
      }

      // ------------------------------------------------------
      // PAYMENT DATA
      // ------------------------------------------------------

      const paymentsData =
        await paymentsResponse.json();

      console.log(
        "PAYMENTS API:",
        paymentsData
      );

      // ------------------------------------------------------
      // HANDLE PAGINATED RESPONSE
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
      // RESET UI
      // ------------------------------------------------------

      setShowAllPayments(false);

      setSelectedYear(null);

      setSelectedMonth(null);

      setPaymentSearch("");
    } catch (error) {
      console.log(
        "================================"
      );

      console.log(
        "LOAD REVENUE ERROR:",
        error
      );

      console.log(
        "================================"
      );

      setPayments([]);

      Alert.alert(
        "Connection Error",
        "Could not load revenue data.\n\nMake sure Django is running and your phone is connected to the same Wi-Fi."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // REFRESH WHEN SCREEN OPENS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadRevenue();
    }, [])
  );

  // ==========================================================
  // PULL TO REFRESH
  // ==========================================================

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadRevenue();

    setRefreshing(false);
  };

  // ==========================================================
  // MONEY FORMAT
  // ==========================================================

  const formatMoney = (amount) => {
    return Number(
      amount || 0
    ).toLocaleString(
      "en-IN"
    );
  };

  // ==========================================================
  // GET PAYMENT DATE
  // ==========================================================

  const getPaymentDate = (payment) => {
    const rawDate =
      payment?.date ||
      payment?.payment_date ||
      payment?.created_at ||
      payment?.created ||
      null;

    if (!rawDate) {
      return null;
    }

    const date =
      new Date(rawDate);

    if (
      isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date;
  };

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (payment) => {
    const date =
      getPaymentDate(payment);

    if (!date) {
      return "-";
    }

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
  // INITIALS
  // ==========================================================

  const getInitials = (name) => {
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

  const getPlanLabel = (plan) => {
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
  // PAYMENT METHOD
  // ==========================================================

  const getMethodLabel = (method) => {
    if (!method) {
      return "UNKNOWN";
    }

    if (method === "BANK") {
      return "BANK";
    }

    return method;
  };

  // ==========================================================
  // YEAR-WISE REVENUE DATA
  // ==========================================================

  const yearData = useMemo(() => {
    const grouped = {};

    payments.forEach((payment) => {
      const date =
        getPaymentDate(payment);

      const amount =
        Number(
          payment?.amount || 0
        );

      const status =
        String(
          payment?.status ||
            "PAID"
        ).toUpperCase();

      // Only valid paid payments
      if (
        !date ||
        amount <= 0 ||
        status !== "PAID"
      ) {
        return;
      }

      const year =
        date.getFullYear();

      const month =
        date.getMonth();

      // ------------------------------------------------------
      // CREATE YEAR
      // ------------------------------------------------------

      if (!grouped[year]) {
        grouped[year] = {
          year,
          total: 0,
          count: 0,
          months: {},
        };
      }

      // ------------------------------------------------------
      // YEAR TOTAL
      // ------------------------------------------------------

      grouped[year].total +=
        amount;

      grouped[year].count +=
        1;

      // ------------------------------------------------------
      // CREATE MONTH
      // ------------------------------------------------------

      if (
        !grouped[year].months[
          month
        ]
      ) {
        grouped[year].months[
          month
        ] = {
          month,
          total: 0,
          count: 0,
          payments: [],
        };
      }

      // ------------------------------------------------------
      // MONTH TOTAL
      // ------------------------------------------------------

      grouped[year]
        .months[month]
        .total += amount;

      grouped[year]
        .months[month]
        .count += 1;

      grouped[year]
        .months[month]
        .payments.push(
          payment
        );
    });

    return Object.values(
      grouped
    ).sort(
      (a, b) =>
        b.year - a.year
    );
  }, [payments]);

  // ==========================================================
  // SELECTED YEAR DATA
  // ==========================================================

  const selectedYearData =
    useMemo(() => {
      return (
        yearData.find(
          (item) =>
            item.year ===
            selectedYear
        ) || null
      );
    }, [
      yearData,
      selectedYear,
    ]);

  // ==========================================================
  // SELECTED MONTH DATA
  // ==========================================================

  const selectedMonthData =
    useMemo(() => {
      if (
        !selectedYearData ||
        selectedMonth === null
      ) {
        return null;
      }

      return (
        selectedYearData
          .months[
          selectedMonth
        ] || null
      );
    }, [
      selectedYearData,
      selectedMonth,
    ]);

  // ==========================================================
  // MONTHLY PAYMENTS + SEARCH
  // ==========================================================

  const monthlyPayments =
    useMemo(() => {
      if (!selectedMonthData) {
        return [];
      }

      const search =
        paymentSearch
          .trim()
          .toLowerCase();

      const sortedPayments =
        [
          ...selectedMonthData.payments,
        ].sort(
          (a, b) =>
            (
              getPaymentDate(
                b
              )?.getTime() || 0
            ) -
            (
              getPaymentDate(
                a
              )?.getTime() || 0
            )
        );

      if (!search) {
        return sortedPayments;
      }

      return sortedPayments.filter(
        (payment) => {
          const searchableText = [
            payment?.member_name,
            payment?.member_username,
            payment?.username,
            payment?.member,
            payment?.name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            search
          );
        }
      );
    }, [
      selectedMonthData,
      paymentSearch,
    ]);

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
  // PAYMENT CARD
  // ==========================================================

  const renderPayment = (
    payment,
    monthly = false
  ) => {
    const name =
      payment?.member_name ||
      payment?.name ||
      payment?.member_username ||
      payment?.username ||
      "Unknown Member";

    const statusColor =
      getStatusColor(
        payment?.status
      );

    return (
      <View
        key={payment.id}
        style={[
          styles.paymentCard,
          {
            backgroundColor:
              monthly
                ? colors.background
                : colors.card,
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
            {getInitials(name)}
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
            {name}
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
              payment?.plan
            )}
            {" • "}
            {getMethodLabel(
              payment?.method
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
              {formatDate(payment)}
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
              payment?.amount
            )}
          </Text>

          {/* STATUS BADGE */}

          {!monthly && (
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
                {payment?.status ||
                  "PAID"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
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
          No Revenue Yet
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
          Payment records will
          appear here after
          members make payments.
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
                colors.mutedText,
            },
          ]}
        >
          Loading revenue...
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
              Revenue Dashboard
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

          {/* ==================================================
              TOTAL REVENUE (TAP FOR HISTORY)
          ================================================== */}

          <Pressable
            style={[
              styles.totalRow,
              {
                backgroundColor:
                  colors.background,
                borderColor:
                  showRevenueHistory
                    ? colors.primaryLight
                    : colors.border,
              },
            ]}
            onPress={() => {
              setShowRevenueHistory(
                (value) => !value
              );
              setSelectedYear(null);
              setSelectedMonth(null);
              setPaymentSearch("");
            }}
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
                {showRevenueHistory
                  ? "Tap to close history"
                  : "Tap to view revenue history"}
              </Text>
            </View>

            <Ionicons
              name={
                showRevenueHistory
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={20}
              color={
                colors.primaryLight
              }
            />
          </Pressable>

          {/* ==================================================
              THIS MONTH + THIS YEAR
          ================================================== */}

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
          </View>
        </View>

        {/* ==================================================
            REVENUE HISTORY
        ================================================== */}

        {showRevenueHistory && (
          <View
            style={[
              styles.historyCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >

            {/* ==================================================
                YEAR SELECTION
            ================================================== */}

            {!selectedYear && (
              <>
                <View
                  style={
                    styles.historyHeader
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
                      REVENUE HISTORY
                    </Text>

                    <Text
                      style={[
                        styles.historyTitle,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                    >
                      Select a Year
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.countPill,
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
                        styles.countPillText,
                        {
                          color:
                            colors.primaryLight,
                        },
                      ]}
                    >
                      {yearData.length}{" "}
                      {yearData.length ===
                      1
                        ? "Year"
                        : "Years"}
                    </Text>
                  </View>
                </View>

                {yearData.length ===
                0 ? (
                  <Text
                    style={[
                      styles.noHistoryText,
                      {
                        color:
                          colors.secondaryText,
                      },
                    ]}
                  >
                    No paid payment
                    history available.
                  </Text>
                ) : (
                  yearData.map(
                    (item) => (
                      <Pressable
                        key={
                          item.year
                        }
                        style={[
                          styles.yearRow,
                          {
                            backgroundColor:
                              colors.background,
                            borderColor:
                              colors.border,
                          },
                        ]}
                        onPress={() => {
                          setSelectedYear(
                            item.year
                          );
                          setSelectedMonth(
                            null
                          );
                          setPaymentSearch(
                            ""
                          );
                        }}
                      >
                        <View
                          style={[
                            styles.yearIcon,
                            {
                              backgroundColor:
                                colors.iconBackground,
                            },
                          ]}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={18}
                            color={
                              colors.primaryLight
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.yearInfo
                          }
                        >
                          <Text
                            style={[
                              styles.yearText,
                              {
                                color:
                                  colors.text,
                              },
                            ]}
                          >
                            {item.year}
                          </Text>

                          <Text
                            style={[
                              styles.yearSubtext,
                              {
                                color:
                                  colors.secondaryText,
                              },
                            ]}
                          >
                            {item.count}{" "}
                            {item.count ===
                            1
                              ? "payment"
                              : "payments"}
                          </Text>
                        </View>

                        <Text
                          style={styles.yearAmount}
                        >
                          ₹
                          {formatMoney(
                            item.total
                          )}
                        </Text>

                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={
                            colors.secondaryText
                          }
                        />
                      </Pressable>
                    )
                  )
                )}
              </>
            )}

            {/* ==================================================
                MONTH SELECTION
            ================================================== */}

            {selectedYear &&
              !selectedMonthData && (
                <>
                  <Pressable
                    style={
                      styles.historyBack
                    }
                    onPress={() => {
                      setSelectedYear(
                        null
                      );
                      setSelectedMonth(
                        null
                      );
                      setPaymentSearch(
                        ""
                      );
                    }}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={15}
                      color={
                        colors.primaryLight
                      }
                    />

                    <Text
                      style={[
                        styles.historyBackText,
                        {
                          color:
                            colors.primaryLight,
                        },
                      ]}
                    >
                      ALL YEARS
                    </Text>
                  </Pressable>

                  <View
                    style={
                      styles.historyHeader
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
                        {selectedYear}{" "}
                        REVENUE
                      </Text>

                      <Text
                        style={[
                          styles.historyTitle,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        Select a Month
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.yearAmount
                      }
                    >
                      ₹
                      {formatMoney(
                        selectedYearData?.total ||
                          0
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.monthGrid
                    }
                  >
                    {MONTHS.map(
                      (
                        monthName,
                        index
                      ) => {
                        const monthData =
                          selectedYearData
                            ?.months[
                            index
                          ];

                        return (
                          <Pressable
                            key={
                              monthName
                            }
                            disabled={
                              !monthData
                            }
                            style={[
                              styles.monthTile,
                              {
                                backgroundColor:
                                  monthData
                                    ? colors.background
                                    : colors.iconBackground,
                                borderColor:
                                  colors.border,
                                opacity:
                                  monthData
                                    ? 1
                                    : 0.45,
                              },
                            ]}
                            onPress={() => {
                              setSelectedMonth(
                                index
                              );
                              setPaymentSearch(
                                ""
                              );
                            }}
                          >
                            <Text
                              style={[
                                styles.monthName,
                                {
                                  color:
                                    colors.text,
                                },
                              ]}
                            >
                              {monthName
                                .substring(
                                  0,
                                  3
                                )
                                .toUpperCase()}
                            </Text>

                            <Text
                              style={[
                                styles.monthAmount,
                                {
                                  color:
                                    monthData
                                      ? "#45E0A5"
                                      : colors.mutedText,
                                },
                              ]}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                            >
                              ₹
                              {formatMoney(
                                monthData?.total ||
                                  0
                              )}
                            </Text>

                            <Text
                              style={[
                                styles.monthCount,
                                {
                                  color:
                                    colors.secondaryText,
                                },
                              ]}
                            >
                              {monthData?.count ||
                                0}{" "}
                              paid
                            </Text>
                          </Pressable>
                        );
                      }
                    )}
                  </View>
                </>
              )}

            {/* ==================================================
                MONTHLY PAYMENT RECORDS
            ================================================== */}

            {selectedYear &&
              selectedMonthData && (
                <>

                  {/* BACK TO MONTHS */}

                  <Pressable
                    style={
                      styles.historyBack
                    }
                    onPress={() => {
                      setSelectedMonth(
                        null
                      );
                      setPaymentSearch(
                        ""
                      );
                    }}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={15}
                      color={
                        colors.primaryLight
                      }
                    />

                    <Text
                      style={[
                        styles.historyBackText,
                        {
                          color:
                            colors.primaryLight,
                        },
                      ]}
                    >
                      {selectedYear}
                    </Text>
                  </Pressable>

                  {/* MONTH HEADER */}

                  <View
                    style={
                      styles.historyHeader
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
                        MONTHLY REVENUE
                      </Text>

                      <Text
                        style={[
                          styles.historyTitle,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        {
                          MONTHS[
                            selectedMonth
                          ]
                        }{" "}
                        {selectedYear}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.yearAmount
                      }
                    >
                      ₹
                      {formatMoney(
                        selectedMonthData.total
                      )}
                    </Text>
                  </View>

                  {/* ==================================================
                      SEARCH BAR
                  ================================================== */}

                  <View
                    style={[
                      styles.searchContainer,
                      {
                        backgroundColor:
                          colors.background,
                        borderColor:
                          colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="search-outline"
                      size={17}
                      color={
                        colors.secondaryText
                      }
                    />

                    <TextInput
                      value={
                        paymentSearch
                      }
                      onChangeText={
                        setPaymentSearch
                      }
                      placeholder="Search member or username"
                      placeholderTextColor={
                        colors.mutedText
                      }
                      style={[
                        styles.searchInput,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                    />

                    {paymentSearch.length >
                      0 && (
                      <Pressable
                        onPress={() =>
                          setPaymentSearch(
                            ""
                          )
                        }
                      >
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color={
                            colors.mutedText
                          }
                        />
                      </Pressable>
                    )}
                  </View>

                  {/* RESULT COUNT */}

                  <Text
                    style={[
                      styles.monthResultText,
                      {
                        color:
                          colors.secondaryText,
                      },
                    ]}
                  >
                    {
                      monthlyPayments.length
                    }{" "}
                    {monthlyPayments.length ===
                    1
                      ? "payment"
                      : "payments"}
                    {paymentSearch.trim()
                      ? " found"
                      : ""}
                  </Text>

                  {/* MONTH PAYMENTS */}

                  {monthlyPayments.length ===
                  0 ? (
                    <Text
                      style={[
                        styles.noHistoryText,
                        {
                          color:
                            colors.secondaryText,
                        },
                      ]}
                    >
                      {paymentSearch.trim()
                        ? "No payment found for this member."
                        : "No payment records for this month."}
                    </Text>
                  ) : (
                    monthlyPayments.map(
                      (payment) =>
                        renderPayment(
                          payment,
                          true
                        )
                    )
                  )}
                </>
              )}
          </View>
        )}

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

        {/* ==================================================
            PAYMENT LIST
        ================================================== */}

        {payments.length ===
        0 ? (
          renderEmptyState()
        ) : (
          payments
            .slice(
              0,
              showAllPayments
                ? payments.length
                : 3
            )
            .map(
              (payment) =>
                renderPayment(
                  payment
                )
            )
        )}

        {/* ==================================================
            SEE MORE / SHOW RECENT
        ================================================== */}

        {payments.length >
          3 && (
          <Pressable
            style={[
              styles.seeMoreButton,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
            onPress={() =>
              setShowAllPayments(
                (value) =>
                  !value
              )
            }
          >
            <Text
              style={[
                styles.seeMoreText,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              {showAllPayments
                ? "SHOW ONLY RECENT 3"
                : "SEE MORE"}
            </Text>

            <Ionicons
              name={
                showAllPayments
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={15}
              color={
                colors.primaryLight
              }
            />
          </Pressable>
        )}

        {/* ==================================================
            BACK TO DASHBOARD
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

    content: {
      paddingHorizontal: 18,
      paddingTop:
        Platform.OS === "ios"
          ? 54
          : 44,
      paddingBottom: 40,
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
      marginTop: 12,
      fontSize: 12,
      fontWeight: "700",
    },

    // ========================================================
    // HEADER
    // ========================================================

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

    // ========================================================
    // OVERVIEW CARD
    // ========================================================

    overviewCard: {
      borderWidth: 1,
      borderRadius: 26,
      padding: 16,
      marginBottom: 14,
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

    // ========================================================
    // TOTAL REVENUE
    // ========================================================

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
      marginRight: 8,
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

    // ========================================================
    // STATS
    // ========================================================

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

    // ========================================================
    // REVENUE HISTORY
    // ========================================================

    historyCard: {
      borderWidth: 1,
      borderRadius: 26,
      padding: 16,
      marginBottom: 21,
    },

    historyHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 13,
    },

    historyTitle: {
      fontSize: 16,
      fontWeight: "900",
    },

    countPill: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },

    countPillText: {
      fontSize: 8,
      fontWeight: "900",
    },

    noHistoryText: {
      fontSize: 10,
      fontWeight: "600",
      textAlign: "center",
      paddingVertical: 18,
    },

    yearRow: {
      minHeight: 66,
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 11,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },

    yearIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },

    yearInfo: {
      flex: 1,
      marginLeft: 10,
    },

    yearText: {
      fontSize: 15,
      fontWeight: "900",
    },

    yearSubtext: {
      fontSize: 9,
      fontWeight: "600",
      marginTop: 2,
    },

    yearAmount: {
      color: "#45E0A5",
      fontSize: 14,
      fontWeight: "900",
      marginRight: 4,
    },

    historyBack: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      marginBottom: 10,
    },

    historyBackText: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.6,
      marginLeft: 2,
    },

    monthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },

    monthTile: {
      width: "31.5%",
      borderWidth: 1,
      borderRadius: 16,
      paddingVertical: 11,
      paddingHorizontal: 8,
      alignItems: "center",
      marginBottom: 8,
    },

    monthName: {
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.6,
    },

    monthAmount: {
      fontSize: 12,
      fontWeight: "900",
      marginTop: 5,
    },

    monthCount: {
      fontSize: 8,
      fontWeight: "600",
      marginTop: 2,
    },

    searchContainer: {
      height: 48,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },

    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 12,
      fontWeight: "600",
    },

    monthResultText: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.4,
      marginBottom: 8,
    },

    // ========================================================
    // RECORDS HEADER
    // ========================================================

    sectionHeaderSimple: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 11,
      marginTop: 7,
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

    // ========================================================
    // PAYMENT CARD
    // ========================================================

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

    // ========================================================
    // SEE MORE
    // ========================================================

    seeMoreButton: {
      borderWidth: 1,
      borderRadius: 16,
      paddingVertical: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },

    seeMoreText: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.8,
      marginRight: 5,
    },

    // ========================================================
    // EMPTY
    // ========================================================

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

    // ========================================================
    // FOOTER
    // ========================================================

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