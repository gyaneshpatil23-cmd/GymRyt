import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";

const BASE_URL = "http://192.168.1.52:8000/api/members";
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
  const { colors } = useTheme();
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

  const statusColor = member.status === "EXPIRED" ? colors.danger : member.status === "EXPIRING" ? colors.warning : colors.success;
  const statusBg = member.status === "EXPIRED" ? colors.dangerBackground : member.status === "EXPIRING" ? colors.warningBackground : colors.successBackground;

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.loading, { color: colors.mutedText }]}>Loading member details...</Text></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}><Text style={[styles.backText, { color: colors.text }]}>‹</Text></TouchableOpacity>
          <View style={styles.headerText}><Text style={[styles.eyebrow, { color: colors.primaryLight }]}>GYMRYT MANAGEMENT</Text><Text style={[styles.title, { color: colors.text }]}>Member Details</Text></View>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileBlock}>
            <View style={[styles.avatar, { backgroundColor: colors.iconBackground, borderColor: colors.primary }]}><Text style={[styles.avatarText, { color: colors.primaryLight }]}>{initials(member.name)}</Text></View>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{member.name}</Text>
            <View style={[styles.badge, { backgroundColor: statusBg }]}><View style={[styles.dot, { backgroundColor: statusColor }]} /><Text style={[styles.badgeText, { color: statusColor }]}>{member.status}</Text></View>
          </View>
          <View style={styles.personal}>
            <Text style={[styles.section, { color: colors.primaryLight }]}>PERSONAL INFORMATION</Text>
            <Info label="PHONE NUMBER" value={member.phone} colors={colors} />
            <Info label="EMAIL ADDRESS" value={member.email} colors={colors} />
            <Info label="USERNAME" value={member.username} colors={colors} />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.primaryLight }]}>MEMBERSHIP DETAILS</Text>
        <Card colors={colors}><Text style={[styles.label, { color: colors.mutedText }]}>MEMBERSHIP TYPE</Text><Text style={[styles.value, { color: colors.text }]}>{plan}</Text></Card>
        <Card colors={colors}><View style={styles.dateRow}><View style={styles.date}><Text style={[styles.label, { color: colors.mutedText }]}>START DATE</Text><Text style={[styles.valueSmall, { color: colors.text }]}>{member.membership_start || "Not available"}</Text></View><View style={[styles.divider, { backgroundColor: colors.border }]} /><View style={styles.date}><Text style={[styles.label, { color: colors.mutedText }]}>END DATE</Text><Text style={[styles.valueSmall, { color: colors.text }]}>{member.membership_end || "Not available"}</Text></View></View></Card>
        <Card colors={colors}><Text style={[styles.label, { color: colors.mutedText }]}>DAYS REMAINING</Text><Text style={[styles.days, { color: member.status === "EXPIRED" ? colors.danger : colors.success }]}>{member.status === "EXPIRED" ? "Membership Expired" : `${daysLeft(member.membership_end)} Days`}</Text></Card>
        <Card colors={colors}><Text style={[styles.label, { color: colors.mutedText }]}>PAYMENT METHOD</Text><Text style={[styles.value, { color: colors.text }]}>{paymentMethod}</Text></Card>

        <Text style={[styles.sectionTitle, { color: colors.primaryLight }]}>TRAINER ASSIGNMENT</Text>
        <Card colors={colors}>
          <Text style={[styles.label, { color: colors.mutedText }]}>ASSIGNED TRAINER</Text>
          <Text style={[styles.trainerValue, { color: member.trainer_name ? colors.success : colors.warning }]}>{member.trainer_name || "No trainer assigned"}</Text>
          <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: colors.iconBackground, borderColor: colors.border }]} onPress={() => router.push("/admin/trainerassignment")}>
            <Text style={[styles.secondaryText, { color: colors.primaryLight }]}>{member.trainer_name ? "CHANGE TRAINER" : "ASSIGN TRAINER"}</Text><Text style={[styles.arrow, { color: colors.primaryLight }]}>→</Text>
          </TouchableOpacity>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.primaryLight }]}>VERIFICATION</Text>
        <Card colors={colors}><Text style={[styles.value, { color: member.id_verified ? colors.success : colors.warning }]}>{member.id_verified ? "✓ VERIFIED" : "! VERIFICATION PENDING"}</Text></Card>

        <View style={[styles.idCard, { backgroundColor: colors.nav, borderColor: colors.border }]}><Text style={[styles.label, { color: colors.mutedText }]}>MEMBER ID</Text><Text style={[styles.idValue, { color: colors.primaryLight }]}>#{member.id || "N/A"}</Text></View>

        <TouchableOpacity style={[styles.edit, { backgroundColor: colors.primary }]} onPress={edit} disabled={deleting}><Text style={styles.editText}>EDIT MEMBER</Text><Text style={styles.editArrow}>→</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.delete, { backgroundColor: colors.dangerBackground, borderColor: colors.danger }]} onPress={deleteMember} disabled={deleting}>{deleting ? <ActivityIndicator color={colors.danger} /> : <Text style={[styles.deleteText, { color: colors.danger }]}>🗑  DELETE MEMBER</Text>}</TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => router.replace("/admin/members")}><Text style={[styles.backLinkText, { color: colors.mutedText }]}>BACK TO MEMBERS</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Info({ label, value, colors }) { return <View style={styles.info}><Text style={[styles.label, { color: colors.mutedText }]}>{label}</Text><Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>{value || "Not available"}</Text></View>; }
function Card({ colors, children }) { return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>; }

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, loading: { marginTop: 12, fontSize: 12, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingTop: 55, paddingBottom: 50 }, header: { flexDirection: "row", alignItems: "center", marginBottom: 28 }, back: { width: 45, height: 45, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, backText: { fontSize: 34, fontWeight: "300", marginTop: -4 }, headerText: { marginLeft: 14 }, eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.5 }, title: { fontSize: 28, fontWeight: "900", marginTop: 3 },
  profileRow: { flexDirection: "row", marginBottom: 27 }, profileBlock: { width: "36%", alignItems: "center", paddingRight: 10 }, avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: "center", justifyContent: "center" }, avatarText: { fontSize: 24, fontWeight: "900" }, name: { fontSize: 15, fontWeight: "900", textAlign: "center", marginTop: 10 }, badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, marginTop: 9 }, dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 }, badgeText: { fontSize: 8, fontWeight: "900" }, personal: { width: "64%", paddingLeft: 8 }, section: { fontSize: 9, fontWeight: "900", letterSpacing: 1.1, marginBottom: 12 }, info: { marginBottom: 11 }, label: { fontSize: 7.5, fontWeight: "900", letterSpacing: .7 }, infoValue: { fontSize: 11.5, fontWeight: "800", marginTop: 3 }, sectionTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 1.4, marginBottom: 12 }, card: { minHeight: 72, borderWidth: 1, borderRadius: 17, padding: 16, marginBottom: 10 }, value: { fontSize: 16, fontWeight: "900", marginTop: 5 }, valueSmall: { fontSize: 13, fontWeight: "900", marginTop: 6 }, dateRow: { flexDirection: "row", alignItems: "center" }, date: { flex: 1 }, divider: { width: 1, height: 38, marginHorizontal: 14 }, days: { fontSize: 23, fontWeight: "900", marginTop: 5 }, trainerValue: { fontSize: 16, fontWeight: "900", marginTop: 5, marginBottom: 12 }, secondaryButton: { height: 43, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" }, secondaryText: { fontSize: 9, fontWeight: "900", letterSpacing: .8 }, arrow: { fontSize: 18, marginLeft: 8 }, idCard: { minHeight: 56, borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, idValue: { fontSize: 14, fontWeight: "900" }, edit: { height: 57, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 11 }, editText: { color: "#fff", fontSize: 12, fontWeight: "900", letterSpacing: 1 }, editArrow: { color: "#fff", fontSize: 21, marginLeft: 11 }, delete: { height: 55, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 4 }, deleteText: { fontSize: 11, fontWeight: "900", letterSpacing: .8 }, backLink: { alignItems: "center", paddingVertical: 18 }, backLinkText: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
});
