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
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
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
  "http://192.168.1.49:8000/api/members";

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
  const { colors } = useTheme();

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

    return (
      <View
        key={payment.id}
        style={[
          monthly
            ? styles.monthPaymentCard
            : styles.paymentCard,
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
          >
            {getPlanLabel(
              payment?.plan
            )}

            {" • "}

            {getMethodLabel(
              payment?.method
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
            {formatDate(payment)}
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
              payment?.amount
            )}
          </Text>

          {/* PAID BADGE */}

          {!monthly && (
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
              colors.primaryLight
            }
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
              Revenue Dashboard
            </Text>
          </View>
        </View>

        {/* ==================================================
            REVENUE OVERVIEW
        ================================================== */}

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

        {/* ==================================================
            TOTAL REVENUE CARD
        ================================================== */}

        <TouchableOpacity
          style={[
            styles.totalRevenueCard,
            {
              backgroundColor:
                colors.card,

              borderColor:
                colors.border,
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
          activeOpacity={0.85}
        >
          <View
            style={
              styles.revenueTop
            }
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
              {showRevenueHistory
                ? "tap to close history"
                : "tap to view revenue history"}
            </Text>
          </View>
        </TouchableOpacity>

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
                        styles.historyEyebrow,
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

                  <Text
                    style={[
                      styles.historyHint,
                      {
                        color:
                          colors.mutedText,
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
                      <TouchableOpacity
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
                        activeOpacity={
                          0.8
                        }
                      >
                        <View>
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
                                  colors.mutedText,
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

                        <View
                          style={
                            styles.yearRight
                          }
                        >
                          <Text
                            style={[
                              styles.yearAmount,
                              {
                                color:
                                  colors.success,
                              },
                            ]}
                          >
                            ₹
                            {formatMoney(
                              item.total
                            )}
                          </Text>

                          <Text
                            style={[
                              styles.historyArrow,
                              {
                                color:
                                  colors.primaryLight,
                              },
                            ]}
                          >
                            →
                          </Text>
                        </View>
                      </TouchableOpacity>
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
                  <TouchableOpacity
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
                    <Text
                      style={[
                        styles.historyBackText,
                        {
                          color:
                            colors.primaryLight,
                        },
                      ]}
                    >
                      ‹ ALL YEARS
                    </Text>
                  </TouchableOpacity>

                  <View
                    style={
                      styles.historyHeader
                    }
                  >
                    <View>
                      <Text
                        style={[
                          styles.historyEyebrow,
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
                      style={[
                        styles.yearAmount,
                        {
                          color:
                            colors.success,
                        },
                      ]}
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
                          <TouchableOpacity
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
                            activeOpacity={
                              0.8
                            }
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
                                      ? colors.success
                                      : colors.mutedText,
                                },
                              ]}
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
                                    colors.mutedText,
                                },
                              ]}
                            >
                              {monthData?.count ||
                                0}{" "}
                              paid
                            </Text>
                          </TouchableOpacity>
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

                  <TouchableOpacity
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
                    <Text
                      style={[
                        styles.historyBackText,
                        {
                          color:
                            colors.primaryLight,
                        },
                      ]}
                    >
                      ‹ {selectedYear}
                    </Text>
                  </TouchableOpacity>

                  {/* MONTH HEADER */}

                  <View
                    style={
                      styles.historyHeader
                    }
                  >
                    <View>
                      <Text
                        style={[
                          styles.historyEyebrow,
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
                      style={[
                        styles.yearAmount,
                        {
                          color:
                            colors.success,
                        },
                      ]}
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
                      <TouchableOpacity
                        onPress={() =>
                          setPaymentSearch(
                            ""
                          )
                        }
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

                  {/* RESULT COUNT */}

                  <Text
                    style={[
                      styles.monthResultText,
                      {
                        color:
                          colors.mutedText,
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
            THIS MONTH + THIS YEAR
        ================================================== */}

        <View
          style={
            styles.statsRow
          }
        >
          {/* THIS MONTH */}

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

          {/* THIS YEAR */}

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

        {/* ==================================================
            PAYMENT RECORDS
        ================================================== */}

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
          <TouchableOpacity
            style={[
              styles.seeMoreButton,
              {
                backgroundColor:
                  colors.card,

                borderColor:
                  colors.primary,
              },
            ]}
            onPress={() =>
              setShowAllPayments(
                (value) =>
                  !value
              )
            }
            activeOpacity={0.8}
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

            <Text
              style={[
                styles.seeMoreArrow,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              {showAllPayments
                ? "↑"
                : "→"}
            </Text>
          </TouchableOpacity>
        )}

        {/* ==================================================
            BACK TO DASHBOARD
        ================================================== */}

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
      paddingHorizontal: 20,
      paddingTop: 55,
      paddingBottom: 40,
    },

    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 12,
    },

    // ========================================================
    // HEADER
    // ========================================================

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

    // ========================================================
    // SECTION
    // ========================================================

    sectionTitle: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.7,
      marginBottom: 13,
    },

    // ========================================================
    // TOTAL REVENUE
    // ========================================================

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

    // ========================================================
    // HISTORY
    // ========================================================

    historyCard: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 16,
      marginBottom: 14,
    },

    historyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },

    historyEyebrow: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.4,
    },

    historyTitle: {
      fontSize: 19,
      fontWeight: "900",
      marginTop: 4,
    },

    historyHint: {
      fontSize: 9,
      fontWeight: "800",
    },

    historyBack: {
      alignSelf: "flex-start",
      marginBottom: 12,
    },

    historyBackText: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1,
    },

    // ========================================================
    // YEAR ROW
    // ========================================================

    yearRow: {
      minHeight: 70,
      borderRadius: 15,
      borderWidth: 1,
      paddingHorizontal: 15,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 9,
    },

    yearText: {
      fontSize: 17,
      fontWeight: "900",
    },

    yearSubtext: {
      fontSize: 9,
      marginTop: 4,
    },

    yearRight: {
      flexDirection: "row",
      alignItems: "center",
    },

    yearAmount: {
      fontSize: 13,
      fontWeight: "900",
    },

    historyArrow: {
      fontSize: 18,
      fontWeight: "900",
      marginLeft: 10,
    },

    // ========================================================
    // MONTH GRID
    // ========================================================

    monthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },

    monthTile: {
      width: "48.5%",
      minHeight: 86,
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      marginBottom: 9,
    },

    monthName: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },

    monthAmount: {
      fontSize: 15,
      fontWeight: "900",
      marginTop: 8,
    },

    monthCount: {
      fontSize: 8,
      marginTop: 3,
    },

    // ========================================================
    // SEARCH
    // ========================================================

    searchContainer: {
      height: 46,
      borderRadius: 13,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      marginBottom: 8,
    },

    searchIcon: {
      fontSize: 20,
      marginRight: 7,
    },

    searchInput: {
      flex: 1,
      fontSize: 11,
      paddingVertical: 0,
    },

    clearSearch: {
      fontSize: 23,
      lineHeight: 24,
      paddingLeft: 8,
    },

    monthResultText: {
      fontSize: 9,
      marginBottom: 10,
    },

    // ========================================================
    // MONTH PAYMENT CARD
    // ========================================================

    monthPaymentCard: {
      minHeight: 68,
      borderRadius: 14,
      borderWidth: 1,
      padding: 10,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },

    // ========================================================
    // STATS
    // ========================================================

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

    // ========================================================
    // PAYMENT RECORD HEADER
    // ========================================================

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

    // ========================================================
    // PAYMENT CARD
    // ========================================================

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
      marginRight: 8,
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

    // ========================================================
    // SEE MORE
    // ========================================================

    seeMoreButton: {
      height: 52,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      marginBottom: 8,
    },

    seeMoreText: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },

    seeMoreArrow: {
      fontSize: 17,
      fontWeight: "900",
      marginLeft: 10,
    },

    // ========================================================
    // EMPTY STATE
    // ========================================================

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

    // ========================================================
    // NO HISTORY
    // ========================================================

    noHistoryText: {
      fontSize: 11,
      textAlign: "center",
      paddingVertical: 15,
      lineHeight: 18,
    },

    // ========================================================
    // BACK TO DASHBOARD
    // ========================================================

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