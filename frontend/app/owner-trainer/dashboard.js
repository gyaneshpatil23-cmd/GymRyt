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

export default function OwnerTrainerDashboard() {
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
              OWNER + TRAINER
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
              router.push("/admin/profile")
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
          OVERVIEW
        </Text>

        <View style={styles.statsGrid}>
          <StatCard
            value="248"
            label="Total Members"
            colors={colors}
          />

          <StatCard
            value="₹84,500"
            label="Revenue"
            colors={colors}
          />

          <StatCard
            value="5"
            label="Expired"
            colors={colors}
          />

          <StatCard
            value="42"
            label="Attendance"
            colors={colors}
          />
        </View>

        {/* QUICK ACTIONS */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.primaryLight },
          ]}
        >
          QUICK ACTIONS
        </Text>

        <ActionCard
          title="Manage Members"
          subtitle="View and manage members"
          onPress={() =>
            router.push("/admin/members")
          }
          colors={colors}
        />

        <ActionCard
          title="Manage Trainers"
          subtitle="Add and manage trainers"
          onPress={() =>
            router.push("/admin/trainers")
          }
          colors={colors}
        />

        <ActionCard
          title="Record Payment"
          subtitle="Record member payment"
          onPress={() =>
            router.push("/admin/recordpayment")
          }
          colors={colors}
        />

        <ActionCard
          title="Revenue & Reports"
          subtitle="View gym financial records"
          onPress={() =>
            router.push("/admin/revenue")
          }
          colors={colors}
        />

        <ActionCard
          title="Registration QR"
          subtitle="Let members register"
          onPress={() =>
            router.push("/admin/adminqr")
          }
          colors={colors}
        />

        {/* RECENT MEMBERS */}
        <View style={styles.recentHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.primaryLight },
            ]}
          >
            RECENT MEMBERS
          </Text>

          <TouchableOpacity
            onPress={() =>
              router.push("/admin/members")
            }
          >
            <Text
              style={[
                styles.viewAll,
                { color: colors.primaryLight },
              ]}
            >
              View All
            </Text>
          </TouchableOpacity>
        </View>

        <MemberRow
          name="Rahul Sharma"
          days="24 days remaining"
          colors={colors}
        />

        <MemberRow
          name="Amit Patil"
          days="51 days remaining"
          colors={colors}
        />

        {/* BOTTOM SPACE */}
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
        <NavItem
          label="HOME"
          active
          colors={colors}
        />

        <NavItem
          label="MEMBERS"
          onPress={() =>
            router.push("/admin/members")
          }
          colors={colors}
        />

        <NavItem
          label="+"
          onPress={() =>
            router.push("/admin/addmembers")
          }
          colors={colors}
        />

        <NavItem
          label="REPORTS"
          onPress={() =>
            router.push("/admin/revenue")
          }
          colors={colors}
        />

        <NavItem
          label="PROFILE"
          onPress={() =>
            router.push("/admin/profile")
          }
          colors={colors}
        />
      </View>
    </View>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  value,
  label,
  colors,
}) {
  return (
    <View
      style={[
        styles.statCard,
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

/* ============================================================
   ACTION CARD
============================================================ */

function ActionCard({
  title,
  subtitle,
  onPress,
  colors,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
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
          styles.actionArrow,
          { color: colors.primaryLight },
        ]}
      >
        →
      </Text>
    </TouchableOpacity>
  );
}

/* ============================================================
   MEMBER ROW
============================================================ */

function MemberRow({
  name,
  days,
  colors,
}) {
  return (
    <View
      style={[
        styles.memberRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
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
            { color: colors.primaryLight },
          ]}
        >
          {name.charAt(0)}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.memberName,
            { color: colors.text },
          ]}
        >
          {name}
        </Text>

        <Text
          style={[
            styles.memberDays,
            { color: colors.mutedText },
          ]}
        >
          {days}
        </Text>
      </View>

      <Text style={styles.active}>
        ACTIVE
      </Text>
    </View>
  );
}

/* ============================================================
   NAV ITEM
============================================================ */

function NavItem({
  label,
  active,
  onPress,
  colors,
}) {
  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
      activeOpacity={0.7}
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

/* ============================================================
   STYLES
============================================================ */

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
    textTransform: "uppercase",
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

  statCard: {
    width: "48%",
    minHeight: 105,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    justifyContent: "center",
  },

  statValue: {
    fontSize: 24,
    fontWeight: "900",
  },

  statLabel: {
    fontSize: 11,
    marginTop: 5,
  },

  actionCard: {
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

  actionArrow: {
    fontSize: 23,
    marginLeft: 10,
  },

  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },

  viewAll: {
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 14,
  },

  memberRow: {
    minHeight: 70,
    borderRadius: 15,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  memberAvatarText: {
    fontSize: 15,
    fontWeight: "900",
  },

  memberName: {
    fontSize: 13,
    fontWeight: "800",
  },

  memberDays: {
    fontSize: 10,
    marginTop: 4,
  },

  active: {
    color: "#22C55E",
    fontSize: 9,
    fontWeight: "900",
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

  navItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 55,
  },

  navText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});