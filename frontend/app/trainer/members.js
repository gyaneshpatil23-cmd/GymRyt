import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";

const API_URL = "http://192.168.1.52:8000/api/members/";

export default function TrainerMembersScreen() {
  const { colors } = useTheme();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMembers = async () => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      if (!token) return router.replace("/");
      const response = await fetch(API_URL, { headers: { Authorization: `Token ${token}` } });
      const data = await response.json();
      if (response.status === 401) return router.replace("/");
      if (!response.ok) throw new Error(data.message || "Could not load members.");
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) { Alert.alert("Members Error", error.message || "Unable to connect to GymRyt server."); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadMembers(); }, []);
  const renderMember = ({ item }) => {
    const initials = (item.name || "M").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {item.profile_picture ? <Image source={{ uri: item.profile_picture }} style={styles.photo} /> : <View style={[styles.photo, styles.avatar, { backgroundColor: colors.iconBackground }]}><Text style={[styles.avatarText, { color: colors.primaryLight }]}>{initials}</Text></View>}
      <View style={styles.info}><Text style={[styles.name, { color: colors.text }]}>{item.name}</Text><Text style={[styles.detail, { color: colors.mutedText }]}>{item.phone || "Not provided"}</Text><Text style={[styles.detail, { color: colors.mutedText }]}>{item.status || "PENDING"}</Text></View>
    </View>;
  };
  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  return <View style={[styles.container, { backgroundColor: colors.background }]}><TouchableOpacity onPress={() => router.back()}><Text style={[styles.back, { color: colors.primaryLight }]}>‹ Back</Text></TouchableOpacity><Text style={[styles.eyebrow, { color: colors.primaryLight }]}>GYMRYT TRAINER</Text><Text style={[styles.title, { color: colors.text }]}>My Members</Text><FlatList data={members} keyExtractor={(item) => String(item.id)} renderItem={renderMember} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadMembers} tintColor={colors.primary} />} ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedText }]}>No members are assigned to you yet.</Text>} contentContainerStyle={styles.list} /></View>;
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 20, paddingTop: 55 }, center: { flex: 1, justifyContent: "center", alignItems: "center" }, back: { fontWeight: "800", fontSize: 15, marginBottom: 24 }, eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 2 }, title: { fontSize: 30, fontWeight: "900", marginTop: 5, marginBottom: 20 }, list: { paddingBottom: 30 }, card: { borderRadius: 16, borderWidth: 1, padding: 13, marginBottom: 10, flexDirection: "row", alignItems: "center" }, photo: { width: 52, height: 52, borderRadius: 26 }, avatar: { alignItems: "center", justifyContent: "center" }, avatarText: { fontWeight: "900", fontSize: 15 }, info: { marginLeft: 13, flex: 1 }, name: { fontSize: 15, fontWeight: "900" }, detail: { fontSize: 11, marginTop: 3 }, empty: { textAlign: "center", marginTop: 50 }, });
