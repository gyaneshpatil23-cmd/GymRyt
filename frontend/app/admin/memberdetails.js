import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, ActivityIndicator, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";

const BASE_URL = "http://192.168.1.43:8000/api/members";
const MEMBERS_API = `${BASE_URL}/`;
const PAYMENTS_API = `${BASE_URL}/payments/`;

const initials = (name) => (name || "?").split(" ").filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
const daysLeft = (end) => {
  if (!end) return 0;
  const a = new Date(); const b = new Date(end);
  a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
  return Math.max(Math.ceil((b - a) / 86400000), 0);
};

export default function MemberDetails() {
  const { colors, isDark, toggleTheme } = useTheme();
  const params = useLocalSearchParams();
  const memberId = String(params.id || "");

  const [member, setMember] = useState({
    id: memberId,
    name: String(params.name || "Unknown Member"),
    phone: String(params.phone || "Not available"),
    email: String(params.email || "Not available"),
    username: String(params.username || "Not available"),
    membership_start: String(params.membership_start || "Not available"),
    membership_end: String(params.membership_end || "Not available"),
    status: String(params.status || "ACTIVE"),
    id_verified: String(params.id_verified) === "true",
    trainer_name: String(params.trainer_name || ""),
    trainer_profile_id: params.trainer_profile_id ? String(params.trainer_profile_id) : "",
  });
  const [plan, setPlan] = useState("Not available");
  const [paymentMethod, setPaymentMethod] = useState("Not available");
  const [loading, setLoading] = useState(!params.name);
  const [deleting, setDeleting] = useState(false);

  const logout = async () => {
    await AsyncStorage.multiRemove(["adminToken", "adminUsername", "adminId", "userRole"]);
    router.replace("/");
  };

  const load = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("adminToken");
      if (!token) return logout();
      const headers = { Accept: "application/json", Authorization: `Token ${token}` };

      const [memberRes, paymentsRes] = await Promise.all([
        fetch(`${MEMBERS_API}${memberId}/`, { headers }),
        fetch(PAYMENTS_API, { headers }),
      ]);
      if (memberRes.status === 401 || paymentsRes.status === 401) return logout();
      if (memberRes.ok) {
        const data = await memberRes.json();
        setMember(data);
      }
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        const payments = Array.isArray(data) ? data : data.results || [];
        const mine = payments.filter((p) => String(p.member_id ?? p.member) === memberId);
        if (mine.length) {
          setPlan(String(mine[0].plan || "Not available").toUpperCase().replace("ANNUALLY", "ANNUAL"));
          setPaymentMethod(String(mine[0].method || "Not available").toUpperCase().replace("BANK", "BANK TRANSFER"));
        }
      }
    } catch (error) {
      console.log("MEMBER DETAILS ERROR:", error);
      Alert.alert("Connection Error", "Could not load member details.");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const edit = () => router.push({ pathname: "/admin/editemember", params: {
    id: String(member.id), name: member.name || "", phone: member.phone || "", email: member.email || "",
    username: member.username || "", membership_start: member.membership_start || "", membership_end: member.membership_end || "",
    status: member.status || "", id_verified: member.id_verified ? "true" : "false",
  }});

  const deleteMember = () => {
    Alert.alert("Delete Member", `Are you sure you want to delete ${member.name}?`, [
      { text: "CANCEL", style: "cancel" },
      { text: "DELETE", style: "destructive", onPress: async () => {
        try {
          setDeleting(true);
          const token = await AsyncStorage.getItem("adminToken");
          const response = await fetch(`${MEMBERS_API}${member.id}/`, {
            method: "DELETE", headers: { Accept: "application/json", Authorization: `Token ${token}` },
          });
          if (response.status === 401) return logout();
          if (!response.ok) throw new Error("Delete failed");
          Alert.alert("Member Deleted", `${member.name} has been removed.`, [{ text: "OK", onPress: () => router.replace("/admin/members") }]);
        } catch (error) {
          console.log("DELETE MEMBER ERROR:", error);
          Alert.alert("Delete Failed", "Could not delete this member.");
        } finally { setDeleting(false); }
      }}
    ]);
  };

  const statusColor = member.status === "EXPIRED" ? "#FF5870" : member.status === "EXPIRING" ? "#FFB21C" : member.status === "ACTIVE" ? "#45E0A5" : colors.secondaryText;
  const headerButton = [styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }];

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.loading, { color: colors.mutedText }]}>Loading member details...</Text></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}><Text style={[styles.eyebrow, { color: colors.primaryLight }]}>GYMRYT • MEMBER</Text><Text style={[styles.title, { color: colors.text }]}>Member Details</Text></View>
        <View style={styles.headerActions}>
          <Pressable style={headerButton} onPress={toggleTheme}><Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={20} color={colors.text} /></Pressable>
          <Pressable style={headerButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color={colors.text} /></Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* PROFILE CARD */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.iconBackground, borderColor: `${statusColor}88` }]}><Text style={[styles.avatarText, { color: colors.primaryLight }]}>{initials(member.name)}</Text></View>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{member.name}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}55` }]}><View style={[styles.dot, { backgroundColor: statusColor }]} /><Text style={[styles.badgeText, { color: statusColor }]}>{member.status}</Text></View>
            <View style={[styles.badge, { backgroundColor: colors.iconBackground, borderColor: colors.border }]}><Ionicons name="card-outline" size={11} color={colors.primaryLight} /><Text style={[styles.badgeText, styles.badgeTextIcon, { color: colors.primaryLight }]}>#{member.id || "N/A"}</Text></View>
          </View>
        </View>

        {/* PERSONAL INFORMATION */}
        <SectionTitle title="PERSONAL INFORMATION" colors={colors} />
        <Card colors={colors}>
          <Info icon="call-outline" label="Phone Number" value={member.phone} colors={colors} />
          <Divider colors={colors} />
          <Info icon="mail-outline" label="Email Address" value={member.email} colors={colors} />
          <Divider colors={colors} />
          <Info icon="person-outline" label="Username" value={member.username} colors={colors} />
        </Card>

        {/* MEMBERSHIP DETAILS */}
        <SectionTitle title="MEMBERSHIP DETAILS" colors={colors} />
        <View style={[styles.daysCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.daysIcon, { backgroundColor: `${statusColor}18` }]}><Ionicons name={member.status === "EXPIRED" ? "close-circle-outline" : "time-outline"} size={24} color={statusColor} /></View>
          <View style={styles.daysInfo}><Text style={[styles.label, { color: colors.secondaryText }]}>DAYS REMAINING</Text><Text style={[styles.days, { color: member.status === "EXPIRED" ? "#FF5870" : colors.text }]}>{member.status === "EXPIRED" ? "Membership Expired" : `${daysLeft(member.membership_end)} Days`}</Text></View>
        </View>
        <Card colors={colors}>
          <Info icon="ribbon-outline" label="Membership Type" value={plan} colors={colors} />
          <Divider colors={colors} />
          <Info icon="calendar-outline" label="Start Date" value={member.membership_start} colors={colors} />
          <Divider colors={colors} />
          <Info icon="calendar-clear-outline" label="End Date" value={member.membership_end} colors={colors} />
          <Divider colors={colors} />
          <Info icon="wallet-outline" label="Payment Method" value={paymentMethod} colors={colors} />
        </Card>

        {/* TRAINER ASSIGNMENT */}
        <SectionTitle title="TRAINER ASSIGNMENT" colors={colors} />
        <Card colors={colors}>
          <Info icon="barbell-outline" label="Assigned Trainer" value={member.trainer_name || "No trainer assigned"} valueColor={member.trainer_name ? "#45E0A5" : "#FFB21C"} colors={colors} />
          <Pressable style={[styles.secondaryButton, { backgroundColor: colors.iconBackground, borderColor: colors.border }]} onPress={() => router.push("/admin/trainerassignment")}>
            <Text style={[styles.secondaryText, { color: colors.primaryLight }]}>{member.trainer_name ? "CHANGE TRAINER" : "ASSIGN TRAINER"}</Text><Ionicons name="arrow-forward" size={15} color={colors.primaryLight} />
          </Pressable>
        </Card>

        {/* VERIFICATION */}
        <SectionTitle title="VERIFICATION" colors={colors} />
        <Card colors={colors}>
          <Info icon={member.id_verified ? "shield-checkmark-outline" : "shield-outline"} label="ID Verification" value={member.id_verified ? "Verified" : "Verification Pending"} valueColor={member.id_verified ? "#45E0A5" : "#FFB21C"} colors={colors} />
        </Card>

        {/* ACTIONS */}
        <Pressable style={[styles.edit, { backgroundColor: colors.primary }]} onPress={edit} disabled={deleting}><Ionicons name="create-outline" size={19} color="#FFFFFF" /><Text style={styles.editText}>EDIT MEMBER</Text></Pressable>
        <Pressable style={[styles.delete, { backgroundColor: isDark ? "#100D15" : "#FFF5F6", borderColor: "#55202B" }]} onPress={deleteMember} disabled={deleting}>{deleting ? <ActivityIndicator color="#FF4D5E" /> : <><Ionicons name="trash-outline" size={19} color="#FF4D5E" /><Text style={styles.deleteText}>DELETE MEMBER</Text></>}</Pressable>
        <Pressable style={styles.backLink} onPress={() => router.replace("/admin/members")}><View style={[styles.backLinkIcon, { backgroundColor: colors.iconBackground }]}><Ionicons name="people-outline" size={14} color={colors.primaryLight} /></View><Text style={[styles.backLinkText, { color: colors.secondaryText }]}>BACK TO MEMBERS</Text></Pressable>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title, colors }) { return <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>; }
function Divider({ colors }) { return <View style={[styles.divider, { backgroundColor: colors.border }]} />; }
function Info({ icon, label, value, valueColor, colors }) { return <View style={styles.info}><View style={[styles.infoIcon, { backgroundColor: colors.iconBackground }]}><Ionicons name={icon} size={20} color={colors.primaryLight} /></View><View style={styles.infoText}><Text style={[styles.infoLabel, { color: colors.secondaryText }]}>{label}</Text><Text style={[styles.infoValue, { color: valueColor || colors.text }]} numberOfLines={2}>{value || "Not available"}</Text></View></View>; }
function Card({ colors, children }) { return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>; }

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, loading: { marginTop: 12, fontSize: 12, fontWeight: "700" },
  header: { paddingHorizontal: 18, paddingTop: Platform.OS === "ios" ? 54 : 44, paddingBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, headerLeft: { flex: 1 }, eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.4 }, title: { fontSize: 22, fontWeight: "900", marginTop: 4 }, headerActions: { flexDirection: "row", alignItems: "center", gap: 7, marginLeft: 10 }, headerButton: { width: 43, height: 43, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 },
  profileCard: { borderWidth: 1, borderRadius: 26, paddingHorizontal: 18, paddingVertical: 20, alignItems: "center", marginBottom: 4 }, avatar: { width: 100, height: 100, borderRadius: 30, borderWidth: 2, alignItems: "center", justifyContent: "center" }, avatarText: { fontSize: 31, fontWeight: "900" }, name: { fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: 12 }, badgeRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 9 }, badge: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 }, dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 }, badgeText: { fontSize: 7.5, fontWeight: "900", letterSpacing: 1 }, badgeTextIcon: { marginLeft: 4 },
  sectionTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginTop: 20, marginBottom: 9 }, card: { borderWidth: 1, borderRadius: 21, paddingHorizontal: 13, paddingVertical: 3 }, info: { minHeight: 67, flexDirection: "row", alignItems: "center" }, infoIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 11 }, infoText: { flex: 1 }, infoLabel: { fontSize: 8, fontWeight: "700", marginBottom: 3 }, infoValue: { fontSize: 12, fontWeight: "800" }, divider: { height: 1, marginLeft: 54 }, label: { fontSize: 7.5, fontWeight: "900", letterSpacing: 0.8 },
  daysCard: { minHeight: 78, borderWidth: 1, borderRadius: 21, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", marginBottom: 9 }, daysIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" }, daysInfo: { marginLeft: 12, flex: 1 }, days: { fontSize: 22, fontWeight: "900", marginTop: 3 },
  secondaryButton: { height: 44, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 12, marginTop: 2 }, secondaryText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  edit: { height: 54, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 22, marginBottom: 10 }, editText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", letterSpacing: 1 }, delete: { height: 54, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, deleteText: { color: "#FF4D5E", fontSize: 12, fontWeight: "900", letterSpacing: 0.8 },
  backLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingTop: 22, paddingBottom: 8 }, backLinkIcon: { width: 27, height: 27, borderRadius: 9, alignItems: "center", justifyContent: "center", marginRight: 7 }, backLinkText: { fontSize: 8, fontWeight: "800", letterSpacing: 0.7 },
});
