import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";

export default function TrainerDashboard() {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text
              style={[
                styles.brand,
                { color: colors.primaryLight },
              ]}
            >
              GYMRyt
            </Text>

            <Text
              style={[
                styles.welcome,
                { color: colors.mutedText },
              ]}
            >
              TRAINER
            </Text>

            <Text
              style={[
                styles.title,
                { color: colors.text },
              ]}
            >
              Dashboard
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.profileButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() =>
              router.push("/trainer/profile")
            }
          >
            <Text
              style={[
                styles.profileText,
                { color: colors.primaryLight },
              ]}
            >
              G
            </Text>
          </TouchableOpacity>
        </View>

        {/* OVERVIEW */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.primaryLight },
          ]}
        >
          TODAY
        </Text>

        <View style={styles.statsGrid}>
          <Stat
            value="42"
            label="Members"
            colors={colors}
          />

          <Stat
            value="18"
            label="Attendance"
            colors={colors}
          />

          <Stat
            value="6"
            label="Sessions"
            colors={colors}
          />

          <Stat
            value="3"
            label="Pending"
            colors={colors}
          />
        </View>

        {/* TRAINER ACTIONS */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.primaryLight },
          ]}
        >
          QUICK ACTIONS
        </Text>

        <Action
          title="My Members"
          subtitle="View members assigned to you"
          onPress={() => router.push("/trainer/members")}
          colors={colors}
        />

        <Action
          title="Mark Attendance"
          subtitle="Record today's attendance"
          colors={colors}
        />

        <Action
          title="Training Sessions"
          subtitle="View and manage sessions"
          colors={colors}
        />

        <Action
          title="Member Progress"
          subtitle="Track member progress"
          colors={colors}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* BOTTOM NAV */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Nav
          label="HOME"
          active
          colors={colors}
        />

        <Nav
          label="MEMBERS"
          colors={colors}
        />

        <Nav
          label="ATTENDANCE"
          colors={colors}
        />

        <Nav
          label="PROFILE"
          onPress={() =>
            router.push("/trainer/profile")
          }
          colors={colors}
        />
      </View>
    </View>
  );
}

function Stat({
  value,
  label,
  colors,
}) {
  return (
    <View
      style={[
        styles.stat,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.statValue,
          { color: colors.text },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.statLabel,
          { color: colors.mutedText },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function Action({
  title,
  subtitle,
  onPress,
  colors,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.action,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.actionTitle,
            { color: colors.text },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.actionSubtitle,
            { color: colors.mutedText },
          ]}
        >
          {subtitle}
        </Text>
      </View>

      <Text
        style={[
          styles.arrow,
          { color: colors.primaryLight },
        ]}
      >
        →
      </Text>
    </TouchableOpacity>
  );
}

function Nav({
  label,
  active,
  onPress,
  colors,
}) {
  return (
    <TouchableOpacity
      style={styles.nav}
      onPress={onPress}
    >
      <Text
        style={[
          styles.navText,
          {
            color: active
              ? colors.primaryLight
              : colors.mutedText,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 100,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },

  brand: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
  },

  welcome: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 12,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
  },

  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  profileText: {
    fontSize: 18,
    fontWeight: "900",
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 14,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  stat: {
    width: "48%",
    height: 100,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: "center",
    marginBottom: 12,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "900",
  },

  statLabel: {
    fontSize: 10,
    marginTop: 5,
  },

  action: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 17,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  actionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  actionSubtitle: {
    fontSize: 10,
    marginTop: 4,
  },

  arrow: {
    fontSize: 22,
    marginLeft: 10,
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },

  nav: {
    alignItems: "center",
    justifyContent: "center",
  },

  navText: {
    fontSize: 8,
    fontWeight: "800",
  },
});
