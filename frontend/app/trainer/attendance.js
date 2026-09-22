
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  router,
  useFocusEffect,
} from "expo-router";

import { useTheme } from "../../context/ThemeContext";


// ============================================================
// API CONFIG
// ============================================================

const API_BASE_URL =
  "http://192.168.1.52:8000/api/members";


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TrainerAttendanceScreen() {

  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();


  // ==========================================================
  // STATE
  // ==========================================================

  const [attendance, setAttendance] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [selectedFilter, setSelectedFilter] =
    useState("ALL");

  const [selectedDate, setSelectedDate] =
    useState("ALL");


  // ==========================================================
  // GET TOKEN
  // ==========================================================

  const getToken = async () => {

    try {

      return await AsyncStorage.getItem(
        "adminToken"
      );

    } catch (error) {

      console.log(
        "TRAINER ATTENDANCE TOKEN ERROR:",
        error
      );

      return null;
    }
  };


  // ==========================================================
  // LOAD ATTENDANCE
  // ==========================================================

  const loadAttendance = async (
    showLoader = true
  ) => {

    try {

      if (showLoader) {
        setLoading(true);
      }

      const token = await getToken();


      // ------------------------------------------------------
      // TOKEN CHECK
      // ------------------------------------------------------

      if (!token) {

        console.log(
          "TRAINER ATTENDANCE: No adminToken found."
        );

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


      // ------------------------------------------------------
      // API REQUEST
      // ------------------------------------------------------

      const url =
        `${API_BASE_URL}/attendance/`;

      console.log(
        "TRAINER ATTENDANCE REQUEST:",
        url
      );

      const response =
        await fetch(
          url,
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


      // ------------------------------------------------------
      // RESPONSE CONTENT TYPE
      // ------------------------------------------------------

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";


      let data;


      // ------------------------------------------------------
      // JSON RESPONSE
      // ------------------------------------------------------

      if (
        contentType.includes(
          "application/json"
        )
      ) {

        data =
          await response.json();

      } else {

        const text =
          await response.text();

        console.log(
          "TRAINER ATTENDANCE RAW RESPONSE:",
          text
        );

        throw new Error(
          `Server returned HTTP ${response.status}`
        );
      }


      // ------------------------------------------------------
      // DEBUG LOGGING
      // ------------------------------------------------------

      console.log(
        "TRAINER ATTENDANCE STATUS:",
        response.status
      );

      console.log(
        "TRAINER ATTENDANCE RESPONSE:",
        data
      );


      // ------------------------------------------------------
      // AUTH FAILURE
      // ------------------------------------------------------

      if (
        response.status === 401
      ) {

        Alert.alert(
          "Session Expired",
          "Your trainer session has expired. Please login again.",
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


      // ------------------------------------------------------
      // PERMISSION FAILURE
      // ------------------------------------------------------

      if (
        response.status === 403
      ) {

        throw new Error(
          data?.detail ||
          data?.message ||
          "You do not have permission to view attendance."
        );
      }


      // ------------------------------------------------------
      // OTHER SERVER ERRORS
      // ------------------------------------------------------

      if (!response.ok) {

        throw new Error(
          data?.detail ||
          data?.message ||
          data?.error ||
          `Attendance request failed (${response.status})`
        );
      }


      // ------------------------------------------------------
      // NORMALIZE RESPONSE
      // ------------------------------------------------------

      let records = [];


      if (Array.isArray(data)) {

        records = data;

      } else if (
        Array.isArray(data?.results)
      ) {

        records = data.results;

      } else if (
        Array.isArray(data?.attendance)
      ) {

        records = data.attendance;

      } else if (
        Array.isArray(data?.records)
      ) {

        records = data.records;

      } else if (
        Array.isArray(data?.data)
      ) {

        records = data.data;

      }


      console.log(
        "TRAINER ATTENDANCE RECORD COUNT:",
        records.length
      );


      setAttendance(records);

    } catch (error) {

      console.log(
        "TRAINER ATTENDANCE ERROR:",
        error
      );

      Alert.alert(
        "Attendance Error",
        error?.message ||
        "Unable to load attendance."
      );

    } finally {

      setLoading(false);
      setRefreshing(false);
    }
  };


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    loadAttendance();

  }, []);


  // ==========================================================
  // RELOAD WHEN SCREEN FOCUSES
  // ==========================================================

  useFocusEffect(
    useCallback(() => {

      loadAttendance(false);

    }, [])
  );


  // ==========================================================
  // PULL TO REFRESH
  // ==========================================================

  const handleRefresh = async () => {

    setRefreshing(true);

    await loadAttendance(false);
  };


  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (dateValue) => {

    if (!dateValue) {
      return "Date unavailable";
    }

    try {

      const date =
        new Date(dateValue);

      if (Number.isNaN(date.getTime())) {
        return String(dateValue);
      }

      return date.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );

    } catch {

      return String(dateValue);
    }
  };


  // ==========================================================
  // FORMAT TIME
  // ==========================================================

  const formatTime = (dateValue) => {

    if (!dateValue) {
      return "—";
    }

    try {

      const date =
        new Date(dateValue);

      if (Number.isNaN(date.getTime())) {
        return "—";
      }

      return date.toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );

    } catch {

      return "—";
    }
  };


  // ==========================================================
  // NORMALIZE STATUS
  // ==========================================================

  const normalizeStatus = (status) => {

    return String(
      status || "PRESENT"
    ).toUpperCase();
  };


  // ==========================================================
  // STATUS COLOR
  // ==========================================================

  const getStatusColor = (status) => {

    switch (
      normalizeStatus(status)
    ) {

      case "PRESENT":
        return "#2ECC71";

      case "LATE":
        return "#F5A623";

      case "ABSENT":
        return "#FF4D5E";

      default:
        return colors.primaryLight;
    }
  };


  // ==========================================================
  // FILTERED ATTENDANCE
  // ==========================================================

  const filteredAttendance =
    useMemo(() => {

      let records =
        [...attendance];


      // ------------------------------------------------------
      // STATUS FILTER
      // ------------------------------------------------------

      if (
        selectedFilter !== "ALL"
      ) {

        records =
          records.filter(
            (item) =>
              normalizeStatus(
                item.status
              ) === selectedFilter
          );
      }


      // ------------------------------------------------------
      // DATE FILTER
      // ------------------------------------------------------

      if (
        selectedDate !== "ALL"
      ) {

        records =
          records.filter(
            (item) =>
              String(
                item.date || ""
              ) === selectedDate
          );
      }


      return records;

    }, [
      attendance,
      selectedFilter,
      selectedDate,
    ]);


  // ==========================================================
  // UNIQUE DATES
  // ==========================================================

  const availableDates =
    useMemo(() => {

      const dates =
        attendance
          .map(
            (item) =>
              item.date
          )
          .filter(Boolean);


      return [
        ...new Set(dates),
      ];

    }, [attendance]);


  // ==========================================================
  // SUMMARY
  // ==========================================================

  const summary =
    useMemo(() => {

      const present =
        attendance.filter(
          (item) =>
            normalizeStatus(
              item.status
            ) === "PRESENT"
        ).length;


      const absent =
        attendance.filter(
          (item) =>
            normalizeStatus(
              item.status
            ) === "ABSENT"
        ).length;


      const late =
        attendance.filter(
          (item) =>
            normalizeStatus(
              item.status
            ) === "LATE"
        ).length;


      return {
        total: attendance.length,
        present,
        absent,
        late,
      };

    }, [attendance]);


  // ==========================================================
  // CLEAR FILTERS
  // ==========================================================

  const clearFilters = () => {

    setSelectedFilter("ALL");
    setSelectedDate("ALL");
  };


  // ==========================================================
  // LOADING SCREEN
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
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                colors.secondaryText ||
                colors.mutedText,
            },
          ]}
        >
          Loading attendance...
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

      {/* ====================================================
          HEADER
      ==================================================== */}

      <View
        style={styles.header}
      >

        <View
          style={styles.headerLeft}
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
            GYMRYT • TRAINER
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
            Attendance
          </Text>

        </View>


        <View
          style={styles.headerActions}
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
            onPress={toggleTheme}
          >

            <Ionicons
              name={
                isDark
                  ? "sunny-outline"
                  : "moon-outline"
              }
              size={20}
              color={colors.text}
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
              color={colors.text}
            />

          </Pressable>

        </View>

      </View>


      {/* ====================================================
          CONTENT
      ==================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={false}

        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }

        contentContainerStyle={
          styles.scrollContent
        }
      >


        {/* ==================================================
            SUMMARY CARD
        ================================================== */}

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

          <View
            style={styles.summaryHeader}
          >

            <View>

              <Text
                style={[
                  styles.summaryEyebrow,
                  {
                    color:
                      colors.primaryLight,
                  },
                ]}
              >
                ATTENDANCE OVERVIEW
              </Text>

              <Text
                style={[
                  styles.summaryTitle,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Member Activity
              </Text>

            </View>

            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >

              <Ionicons
                name="checkmark-circle-outline"
                size={23}
                color={
                  colors.primaryLight
                }
              />

            </View>

          </View>


          <View
            style={styles.summaryStats}
          >

            <SummaryStat
              label="TOTAL"
              value={summary.total}
              color={colors.primaryLight}
              colors={colors}
            />

            <SummaryStat
              label="PRESENT"
              value={summary.present}
              color="#2ECC71"
              colors={colors}
            />

            <SummaryStat
              label="LATE"
              value={summary.late}
              color="#F5A623"
              colors={colors}
            />

            <SummaryStat
              label="ABSENT"
              value={summary.absent}
              color="#FF4D5E"
              colors={colors}
            />

          </View>

        </View>


        {/* ==================================================
            STATUS FILTER
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          FILTER BY STATUS
        </Text>


        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.filterRow
          }
        >

          {[
            "ALL",
            "PRESENT",
            "LATE",
            "ABSENT",
          ].map((status) => {

            const active =
              selectedFilter === status;

            return (

              <Pressable
                key={status}
                onPress={() =>
                  setSelectedFilter(
                    status
                  )
                }
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      active
                        ? colors.primaryLight
                        : colors.card,

                    borderColor:
                      active
                        ? colors.primaryLight
                        : colors.border,
                  },
                ]}
              >

                <Text
                  style={[
                    styles.filterText,
                    {
                      color:
                        active
                          ? "#FFFFFF"
                          : colors.secondaryText ||
                            colors.mutedText,
                    },
                  ]}
                >
                  {status}
                </Text>

              </Pressable>
            );
          })}

        </ScrollView>


        {/* ==================================================
            DATE FILTER
        ================================================== */}

        {availableDates.length > 0 && (

          <>

            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              FILTER BY DATE
            </Text>


            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.filterRow
              }
            >

              <Pressable
                onPress={() =>
                  setSelectedDate("ALL")
                }
                style={[
                  styles.dateChip,
                  {
                    backgroundColor:
                      selectedDate === "ALL"
                        ? colors.primaryLight
                        : colors.card,

                    borderColor:
                      selectedDate === "ALL"
                        ? colors.primaryLight
                        : colors.border,
                  },
                ]}
              >

                <Text
                  style={[
                    styles.dateChipText,
                    {
                      color:
                        selectedDate === "ALL"
                          ? "#FFFFFF"
                          : colors.secondaryText ||
                            colors.mutedText,
                    },
                  ]}
                >
                  All Dates
                </Text>

              </Pressable>


              {availableDates.map(
                (date) => {

                  const active =
                    selectedDate ===
                    date;

                  return (

                    <Pressable
                      key={date}
                      onPress={() =>
                        setSelectedDate(
                          date
                        )
                      }
                      style={[
                        styles.dateChip,
                        {
                          backgroundColor:
                            active
                              ? colors.primaryLight
                              : colors.card,

                          borderColor:
                            active
                              ? colors.primaryLight
                              : colors.border,
                        },
                      ]}
                    >

                      <Text
                        style={[
                          styles.dateChipText,
                          {
                            color:
                              active
                                ? "#FFFFFF"
                                : colors.secondaryText ||
                                  colors.mutedText,
                          },
                        ]}
                      >
                        {formatDate(
                          date
                        )}
                      </Text>

                    </Pressable>
                  );
                }
              )}

            </ScrollView>

          </>
        )}


        {/* ==================================================
            ACTIVE FILTERS
        ================================================== */}

        {(
          selectedFilter !== "ALL" ||
          selectedDate !== "ALL"
        ) && (

          <Pressable
            onPress={clearFilters}
            style={[
              styles.clearFilterButton,
              {
                backgroundColor:
                  colors.iconBackground,

                borderColor:
                  colors.border,
              },
            ]}
          >

            <Ionicons
              name="close-circle-outline"
              size={17}
              color={
                colors.primaryLight
              }
            />

            <Text
              style={[
                styles.clearFilterText,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              Clear Filters
            </Text>

          </Pressable>
        )}


        {/* ==================================================
            RECORDS HEADER
        ================================================== */}

        <View
          style={styles.recordsHeader}
        >

          <View>

            <Text
              style={[
                styles.sectionTitle,
                styles.recordsTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              ATTENDANCE RECORDS
            </Text>

            <Text
              style={[
                styles.recordsCount,
                {
                  color:
                    colors.secondaryText ||
                    colors.mutedText,
                },
              ]}
            >
              {filteredAttendance.length} record
              {filteredAttendance.length === 1
                ? ""
                : "s"}
            </Text>

          </View>

        </View>


        {/* ==================================================
            EMPTY STATE
        ================================================== */}

        {filteredAttendance.length === 0 ? (

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
                name="calendar-outline"
                size={30}
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
              No Attendance Records
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color:
                    colors.secondaryText ||
                    colors.mutedText,
                },
              ]}
            >
              {attendance.length === 0
                ? "No attendance records are available for your assigned members yet."
                : "No attendance records match the selected filters."}
            </Text>

          </View>

        ) : (

          /* ==================================================
             ATTENDANCE LIST
          ================================================== */

          filteredAttendance.map(
            (item, index) => {

              const status =
                normalizeStatus(
                  item.status
                );

              const statusColor =
                getStatusColor(
                  status
                );

              return (

                <AttendanceCard
                  key={
                    item.id
                      ? String(item.id)
                      : `${item.member}-${item.date}-${index}`
                  }
                  item={item}
                  status={status}
                  statusColor={statusColor}
                  colors={colors}
                  formatDate={formatDate}
                  formatTime={formatTime}
                />

              );
            }
          )
        )}


        {/* BOTTOM SPACE */}

        <View
          style={{
            height: 120,
          }}
        />

      </ScrollView>


      {/* ====================================================
          BOTTOM NAVIGATION
      ==================================================== */}

      <TrainerBottomNav
        active="attendance"
        colors={colors}
      />

    </View>
  );
}


// ============================================================
// SUMMARY STAT
// ============================================================

function SummaryStat({
  label,
  value,
  color,
  colors,
}) {

  return (

    <View
      style={styles.summaryStat}
    >

      <Text
        style={[
          styles.summaryValue,
          {
            color,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.summaryLabel,
          {
            color:
              colors.secondaryText ||
              colors.mutedText,
          },
        ]}
      >
        {label}
      </Text>

    </View>
  );
}


// ============================================================
// ATTENDANCE CARD
// ============================================================

function AttendanceCard({
  item,
  status,
  statusColor,
  colors,
  formatDate,
  formatTime,
}) {

  const memberName =
    item.member_name ||
    item.member?.name ||
    item.name ||
    item.member_username ||
    item.member ||
    "Member";


  const memberUsername =
    item.member_username ||
    item.member?.username ||
    "";


  return (

    <View
      style={[
        styles.attendanceCard,
        {
          backgroundColor:
            colors.card,

          borderColor:
            colors.border,
        },
      ]}
    >

      {/* ==================================================
          TOP
      ================================================== */}

      <View
        style={styles.cardTop}
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
            {getInitials(
              memberName
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
            {memberName}
          </Text>

          {memberUsername ? (

            <Text
              style={[
                styles.memberUsername,
                {
                  color:
                    colors.secondaryText ||
                    colors.mutedText,
                },
              ]}
              numberOfLines={1}
            >
              @{memberUsername}
            </Text>

          ) : null}

        </View>


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
            {status}
          </Text>

        </View>

      </View>


      {/* ==================================================
          DIVIDER
      ================================================== */}

      <View
        style={[
          styles.cardDivider,
          {
            backgroundColor:
              colors.border,
          },
        ]}
      />


      {/* ==================================================
          DETAILS
      ================================================== */}

      <View
        style={styles.detailsGrid}
      >

        <DetailItem
          icon="calendar-outline"
          label="Date"
          value={
            formatDate(
              item.date
            )
          }
          colors={colors}
        />


        <DetailItem
          icon="log-in-outline"
          label="Check In"
          value={
            formatTime(
              item.check_in
            )
          }
          colors={colors}
        />


        <DetailItem
          icon="log-out-outline"
          label="Check Out"
          value={
            formatTime(
              item.check_out
            )
          }
          colors={colors}
        />


        <DetailItem
          icon="business-outline"
          label="Gym"
          value={
            item.workspace_name ||
            item.workspace?.name ||
            "Your Gym"
          }
          colors={colors}
        />

      </View>


      {/* ==================================================
          NOTES
      ================================================== */}

      {item.notes ? (

        <View
          style={[
            styles.notesBox,
            {
              backgroundColor:
                colors.iconBackground,
            },
          ]}
        >

          <Ionicons
            name="document-text-outline"
            size={15}
            color={
              colors.primaryLight
            }
          />

          <Text
            style={[
              styles.notesText,
              {
                color:
                  colors.secondaryText ||
                  colors.mutedText,
              },
            ]}
          >
            {item.notes}
          </Text>

        </View>

      ) : null}

    </View>
  );
}


// ============================================================
// DETAIL ITEM
// ============================================================

function DetailItem({
  icon,
  label,
  value,
  colors,
}) {

  return (

    <View
      style={styles.detailItem}
    >

      <View
        style={[
          styles.detailIcon,
          {
            backgroundColor:
              colors.iconBackground,
          },
        ]}
      >

        <Ionicons
          name={icon}
          size={16}
          color={
            colors.primaryLight
          }
        />

      </View>

      <View
        style={styles.detailText}
      >

        <Text
          style={[
            styles.detailLabel,
            {
              color:
                colors.secondaryText ||
                colors.mutedText,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.detailValue,
            {
              color:
                colors.text,
            },
          ]}
          numberOfLines={1}
        >
          {value || "—"}
        </Text>

      </View>

    </View>
  );
}


// ============================================================
// GET INITIALS
// ============================================================

function getInitials(name) {

  return String(
    name || "M"
  )
    .split(" ")
    .filter(Boolean)
    .map(
      (part) =>
        part[0]
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}


// ============================================================
// TRAINER BOTTOM NAVIGATION
// ============================================================

function TrainerBottomNav({
  active,
  colors,
}) {

  const goTo = (screen) => {

    if (screen === active) {
      return;
    }


    if (screen === "home") {

      router.replace(
        "/trainer/dashboard"
      );

    } else if (
      screen === "members"
    ) {

      router.replace(
        "/trainer/members"
      );

    } else if (
      screen === "workouts"
    ) {

      // IMPORTANT:
      // Keep existing working route.
      router.replace(
        "/trainer/workout"
      );

    } else if (
      screen === "attendance"
    ) {

      router.replace(
        "/trainer/attendance"
      );

    } else if (
      screen === "profile"
    ) {

      router.replace(
        "/trainer/profile"
      );
    }
  };


  return (

    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor:
            colors.card,

          borderColor:
            colors.border,
        },
      ]}
    >

      <NavItem
        icon="home-outline"
        label="Home"
        active={
          active === "home"
        }
        onPress={() =>
          goTo("home")
        }
        colors={colors}
      />


      <NavItem
        icon="people-outline"
        label="Members"
        active={
          active === "members"
        }
        onPress={() =>
          goTo("members")
        }
        colors={colors}
      />


      <NavItem
        icon="barbell-outline"
        label="Workouts"
        active={
          active === "workouts"
        }
        onPress={() =>
          goTo("workouts")
        }
        colors={colors}
      />


      <NavItem
        icon="checkmark-circle-outline"
        label="Attendance"
        active={
          active === "attendance"
        }
        onPress={() =>
          goTo("attendance")
        }
        colors={colors}
      />


      <NavItem
        icon="person-outline"
        label="Profile"
        active={
          active === "profile"
        }
        onPress={() =>
          goTo("profile")
        }
        colors={colors}
      />

    </View>
  );
}


// ============================================================
// NAV ITEM
// ============================================================

function NavItem({
  icon,
  label,
  active,
  onPress,
  colors,
}) {

  return (

    <Pressable
      style={styles.navItem}
      onPress={onPress}
      android_ripple={{
        color:
          colors.iconBackground,
      }}
    >

      <View
        style={[
          styles.navIconBox,
          active && {
            backgroundColor:
              colors.iconBackground,
          },
        ]}
      >

        <Ionicons
          name={icon}
          size={21}
          color={
            active
              ? colors.primaryLight
              : colors.secondaryText
          }
        />

      </View>


      <Text
        style={[
          styles.navLabel,
          {
            color:
              active
                ? colors.primaryLight
                : colors.secondaryText,
          },
        ]}
      >
        {label}
      </Text>


      {active && (

        <View
          style={[
            styles.navIndicator,
            {
              backgroundColor:
                colors.primaryLight,
            },
          ]}
        />

      )}

    </Pressable>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    // ========================================================
    // MAIN
    // ========================================================

    container: {
      flex: 1,
    },


    scrollContent: {
      paddingHorizontal: 18,

      paddingTop: 8,

      paddingBottom: 125,
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

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },


    headerLeft: {
      flex: 1,
    },


    eyebrow: {
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
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,

      marginLeft: 10,
    },


    headerButton: {
      width: 43,

      height: 43,

      borderRadius: 14,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    // ========================================================
    // SUMMARY
    // ========================================================

    summaryCard: {
      borderWidth: 1,

      borderRadius: 24,

      padding: 17,

      marginBottom: 4,
    },


    summaryHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },


    summaryEyebrow: {
      fontSize: 8,

      fontWeight: "900",

      letterSpacing: 1.2,
    },


    summaryTitle: {
      fontSize: 17,

      fontWeight: "900",

      marginTop: 4,
    },


    summaryIcon: {
      width: 43,

      height: 43,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    summaryStats: {
      flexDirection:
        "row",

      marginTop: 17,

      paddingTop: 14,

      borderTopWidth: 1,
    },


    summaryStat: {
      flex: 1,

      alignItems:
        "center",
    },


    summaryValue: {
      fontSize: 21,

      fontWeight: "900",
    },


    summaryLabel: {
      fontSize: 7,

      fontWeight: "800",

      letterSpacing: 0.8,

      marginTop: 3,
    },


    // ========================================================
    // SECTION
    // ========================================================

    sectionTitle: {
      fontSize: 10,

      fontWeight: "900",

      letterSpacing: 1.2,

      marginTop: 20,

      marginBottom: 9,
    },


    // ========================================================
    // FILTERS
    // ========================================================

    filterRow: {
      gap: 8,

      paddingRight: 5,
    },


    filterChip: {
      minHeight: 36,

      borderRadius: 13,

      borderWidth: 1,

      paddingHorizontal: 14,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    filterText: {
      fontSize: 9,

      fontWeight: "900",

      letterSpacing: 0.7,
    },


    dateChip: {
      minHeight: 36,

      borderRadius: 13,

      borderWidth: 1,

      paddingHorizontal: 13,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    dateChipText: {
      fontSize: 9,

      fontWeight: "800",
    },


    clearFilterButton: {
      alignSelf:
        "flex-start",

      flexDirection:
        "row",

      alignItems:
        "center",

      minHeight: 34,

      paddingHorizontal: 11,

      borderRadius: 11,

      borderWidth: 1,

      marginTop: 10,
    },


    clearFilterText: {
      fontSize: 9,

      fontWeight: "900",

      marginLeft: 5,
    },


    // ========================================================
    // RECORD HEADER
    // ========================================================

    recordsHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "flex-end",
    },


    recordsTitle: {
      marginBottom: 3,
    },


    recordsCount: {
      fontSize: 9,

      fontWeight: "600",
    },


    // ========================================================
    // ATTENDANCE CARD
    // ========================================================

    attendanceCard: {
      borderWidth: 1,

      borderRadius: 21,

      paddingHorizontal: 14,

      paddingVertical: 14,

      marginBottom: 10,
    },


    cardTop: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },


    memberAvatar: {
      width: 44,

      height: 44,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 10,
    },


    memberAvatarText: {
      fontSize: 14,

      fontWeight: "900",
    },


    memberInfo: {
      flex: 1,

      minWidth: 0,
    },


    memberName: {
      fontSize: 13,

      fontWeight: "900",
    },


    memberUsername: {
      fontSize: 9,

      fontWeight: "600",

      marginTop: 3,
    },


    statusBadge: {
      flexDirection:
        "row",

      alignItems:
        "center",

      borderRadius: 10,

      borderWidth: 1,

      paddingHorizontal: 8,

      paddingVertical: 6,

      marginLeft: 7,
    },


    statusDot: {
      width: 6,

      height: 6,

      borderRadius: 3,

      marginRight: 5,
    },


    statusText: {
      fontSize: 7,

      fontWeight: "900",

      letterSpacing: 0.5,
    },


    cardDivider: {
      height: 1,

      marginTop: 13,

      marginBottom: 12,
    },


    // ========================================================
    // DETAILS
    // ========================================================

    detailsGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      rowGap: 12,
    },


    detailItem: {
      width: "50%",

      flexDirection:
        "row",

      alignItems:
        "center",

      paddingRight: 7,
    },


    detailIcon: {
      width: 34,

      height: 34,

      borderRadius: 11,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 8,
    },


    detailText: {
      flex: 1,

      minWidth: 0,
    },


    detailLabel: {
      fontSize: 7,

      fontWeight: "700",

      marginBottom: 2,
    },


    detailValue: {
      fontSize: 10,

      fontWeight: "800",
    },


    // ========================================================
    // NOTES
    // ========================================================

    notesBox: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      paddingHorizontal: 10,

      paddingVertical: 9,

      borderRadius: 11,

      marginTop: 13,
    },


    notesText: {
      flex: 1,

      fontSize: 9,

      lineHeight: 14,

      fontWeight: "600",

      marginLeft: 7,
    },


    // ========================================================
    // EMPTY
    // ========================================================

    emptyCard: {
      borderWidth: 1,

      borderRadius: 21,

      minHeight: 190,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 25,

      paddingVertical: 25,
    },


    emptyIcon: {
      width: 58,

      height: 58,

      borderRadius: 18,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 12,
    },


    emptyTitle: {
      fontSize: 15,

      fontWeight: "900",

      textAlign:
        "center",
    },


    emptyText: {
      fontSize: 10,

      lineHeight: 16,

      fontWeight: "600",

      textAlign:
        "center",

      marginTop: 6,
    },


    // ========================================================
    // BOTTOM NAV
    // ========================================================

    bottomNav: {
      position:
        "absolute",

      left: 0,

      right: 0,

      bottom: 0,

      height: 82,

      borderTopWidth: 1,

      borderTopLeftRadius: 27,

      borderTopRightRadius: 27,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      justifyContent:
        "space-around",

      paddingTop: 8,

      elevation: 20,

      shadowOffset: {
        width: 0,
        height: -4,
      },

      shadowOpacity: 0.12,

      shadowRadius: 12,
    },


    navItem: {
      flex: 1,

      height: 70,

      alignItems:
        "center",

      justifyContent:
        "flex-start",

      position:
        "relative",
    },


    navIconBox: {
      width: 42,

      height: 35,

      borderRadius: 13,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    navLabel: {
      fontSize: 7.5,

      fontWeight: "800",

      marginTop: 2,
    },


    navIndicator: {
      width: 25,

      height: 3,

      borderRadius: 3,

      marginTop: 4,
    },


    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    loadingText: {
      fontSize: 12,

      fontWeight: "700",

      marginTop: 12,
    },

  });