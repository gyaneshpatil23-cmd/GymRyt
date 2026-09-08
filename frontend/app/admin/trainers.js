import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";

import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../context/ThemeContext";

const API_URL = "http://192.168.1.49:8000/api/members/";

export default function TrainersScreen() {
  const { colors } = useTheme();

  const [trainers, setTrainers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // ========================================
  // FETCH TRAINERS FROM DJANGO
  // ========================================

  const fetchTrainers = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("adminToken");

      console.log("ADMIN TOKEN EXISTS:", !!token);

      if (!token) {
        Alert.alert(
          "Authentication Error",
          "Admin authentication token was not found. Please login again."
        );

        router.replace("/");
        return;
      }

      const response = await fetch(
        `${API_URL}trainers/`,
        {
          method: "GET",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
        }
      );

      console.log("TRAINERS API STATUS:", response.status);

      if (response.status === 401) {
        Alert.alert(
          "Session Expired",
          "Your admin session has expired. Please login again."
        );

        await AsyncStorage.removeItem("adminToken");
        await AsyncStorage.removeItem("adminUsername");
        await AsyncStorage.removeItem("adminId");

        router.replace("/");
        return;
      }

      if (response.status === 403) {
        Alert.alert(
          "Access Denied",
          "Only the workspace owner can manage trainers."
        );

        return;
      }

      if (!response.ok) {
        const errorText = await response.text();

        console.log("TRAINERS API ERROR:", errorText);

        throw new Error(
          `Failed to fetch trainers (${response.status})`
        );
      }

      const data = await response.json();

      console.log("TRAINERS FROM DJANGO:", data);

      if (Array.isArray(data)) {
        setTrainers(data);
      } else if (Array.isArray(data.trainers)) {
        setTrainers(data.trainers);
      } else {
        console.log("UNEXPECTED TRAINERS RESPONSE:", data);

        setTrainers([]);
      }
    } catch (error) {
      console.log("FETCH TRAINERS ERROR:", error);

      Alert.alert(
        "Connection Error",
        "Could not connect to GymRyt server.\n\nMake sure Django is running and your phone is connected to the same Wi-Fi."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // LOAD TRAINERS
  // ========================================

  useEffect(() => {
    fetchTrainers();
  }, []);

  // ========================================
  // SEARCH + FILTER
  // ========================================

  const filteredTrainers = trainers.filter((trainer) => {
    const searchText = search.toLowerCase().trim();

    const trainerName =
      trainer.name?.toLowerCase() || "";

    const trainerUsername =
      trainer.username?.toLowerCase() || "";

    const trainerEmail =
      trainer.email?.toLowerCase() || "";

    const matchesSearch =
      trainerName.includes(searchText) ||
      trainerUsername.includes(searchText) ||
      trainerEmail.includes(searchText);

    const isActive =
      trainer.is_active !== false;

    const matchesFilter =
      selectedFilter === "ALL" ||
      (selectedFilter === "ACTIVE" && isActive) ||
      (selectedFilter === "INACTIVE" && !isActive);

    return matchesSearch && matchesFilter;
  });

  // ========================================
  // INITIALS
  // ========================================

  const getInitials = (name) => {
    if (!name) {
      return "?";
    }

    return name
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // ========================================
  // OPEN ADD TRAINER
  // ========================================

  const openAddTrainer = () => {
    router.push("/admin/trainerqr");
  };

  // ========================================
  // TRAINER CARD
  // ========================================

  const renderTrainer = ({ item }) => {
    const isActive = item.is_active !== false;

    return (
      <TouchableOpacity
        style={[
          styles.trainerCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        activeOpacity={0.8}
      >
        {/* AVATAR */}

        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.iconBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              {
                color: colors.primaryLight,
              },
            ]}
          >
            {getInitials(item.name)}
          </Text>
        </View>

        {/* TRAINER INFORMATION */}

        <View style={styles.trainerInfo}>
          <Text
            style={[
              styles.trainerName,
              {
                color: colors.text,
              },
            ]}
          >
            {item.name || "Unnamed Trainer"}
          </Text>

          <Text
            style={[
              styles.trainerUsername,
              {
                color: colors.mutedText,
              },
            ]}
          >
            @{item.username || "username"}
          </Text>

          <Text
            style={[
              styles.trainerEmail,
              {
                color: colors.mutedText,
              },
            ]}
          >
            {item.email || "No email"}
          </Text>
        </View>

        {/* STATUS */}

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isActive
                ? colors.successBackground
                : colors.dangerBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: isActive
                  ? colors.success
                  : colors.danger,
              },
            ]}
          >
            {isActive ? "ACTIVE" : "INACTIVE"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor: colors.background,
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
              color: colors.mutedText,
            },
          ]}
        >
          Loading trainers...
        </Text>
      </View>
    );
  }

  // ========================================
  // MAIN SCREEN
  // ========================================

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text
            style={[
              styles.smallTitle,
              {
                color: colors.mutedText,
              },
            ]}
          >
            GYM STAFF
          </Text>

          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}
          >
            Trainers
          </Text>
        </View>

        {/* ADD TRAINER */}

        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: colors.primary,
            },
          ]}
          onPress={openAddTrainer}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>
            + Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}

      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.input,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.searchIcon,
            {
              color: colors.mutedText,
            },
          ]}
        >
          ⌕
        </Text>

        <TextInput
          style={[
            styles.searchInput,
            {
              color: colors.text,
            },
          ]}
          placeholder="Search trainers..."
          placeholderTextColor={colors.mutedText}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {/* FILTERS */}

      <View style={styles.filters}>
        {[
          "ALL",
          "ACTIVE",
          "INACTIVE",
        ].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
              selectedFilter === filter && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: colors.mutedText,
                },
                selectedFilter === filter && {
                  color: "#FFFFFF",
                },
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* COUNT + REFRESH */}

      <View style={styles.countRow}>
        <Text
          style={[
            styles.countText,
            {
              color: colors.text,
            },
          ]}
        >
          {filteredTrainers.length}{" "}
          {filteredTrainers.length === 1
            ? "Trainer"
            : "Trainers"}
        </Text>

        <TouchableOpacity
          onPress={fetchTrainers}
          disabled={loading}
        >
          <Text
            style={[
              styles.refreshText,
              {
                color: colors.primaryLight,
              },
            ]}
          >
            ↻ Refresh
          </Text>
        </TouchableOpacity>
      </View>

      {/* TRAINER LIST */}

      <FlatList
        data={filteredTrainers}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTrainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>
              🏋️
            </Text>

            <Text
              style={[
                styles.emptyTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              No Trainers Found
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.mutedText,
                },
              ]}
            >
              Add your first trainer to manage your
              gym staff.
            </Text>

            <TouchableOpacity
              style={[
                styles.emptyAddButton,
                {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={openAddTrainer}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyAddButtonText}>
                + Add Trainer
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

// ========================================
// STATIC STYLES
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 15,
    fontSize: 13,
  },

  // ========================================
  // HEADER
  // ========================================

  header: {
    marginTop: 55,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTextContainer: {
    flex: 1,
  },

  smallTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },

  title: {
    fontSize: 32,
    fontWeight: "900",
    marginTop: 5,
  },

  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 10,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  // ========================================
  // SEARCH
  // ========================================

  searchContainer: {
    height: 54,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },

  searchIcon: {
    fontSize: 25,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
  },

  // ========================================
  // FILTERS
  // ========================================

  filters: {
    flexDirection: "row",
    marginTop: 18,
    marginBottom: 20,
  },

  filterButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    marginRight: 8,
  },

  filterText: {
    fontSize: 10,
    fontWeight: "800",
  },

  // ========================================
  // COUNT
  // ========================================

  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  countText: {
    fontSize: 14,
    fontWeight: "800",
  },

  refreshText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ========================================
  // LIST
  // ========================================

  list: {
    paddingBottom: 30,
  },

  // ========================================
  // TRAINER CARD
  // ========================================

  trainerCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 11,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 13,
    fontWeight: "900",
  },

  trainerInfo: {
    flex: 1,
    marginLeft: 13,
    marginRight: 8,
  },

  trainerName: {
    fontSize: 15,
    fontWeight: "800",
  },

  trainerUsername: {
    fontSize: 11,
    marginTop: 3,
  },

  trainerEmail: {
    fontSize: 10,
    marginTop: 3,
  },

  // ========================================
  // STATUS
  // ========================================

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "900",
  },

  // ========================================
  // EMPTY STATE
  // ========================================

  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 20,
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  emptyText: {
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 19,
  },

  emptyAddButton: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },

  emptyAddButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});

// ========================================
  // ns ncsjhvbjhascvv ashbchj 
  // ========================================
