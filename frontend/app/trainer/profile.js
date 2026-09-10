import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../context/ThemeContext";

const API_URL = "http://192.168.1.49:8000/api/members/trainer/profile/";

export default function TrainerProfileScreen() {
  const { colors } = useTheme();
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      if (!token) {
        router.replace("/");
        return;
      }
      const response = await fetch(API_URL, { headers: { Authorization: `Token ${token}` } });
      const data = await response.json();
      if (response.status === 401) {
        router.replace("/");
        return;
      }
      if (!response.ok || !data.success) throw new Error(data.message || "Could not load profile.");
      setTrainer(data.trainer);
    } catch (error) {
      Alert.alert("Profile Error", error.message || "Unable to connect to GymRyt server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Allow photo access to set your profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;

    try {
      setUploading(true);
      const token = await AsyncStorage.getItem("adminToken");
      const asset = result.assets[0];
      const form = new FormData();
      form.append("profile_picture", { uri: asset.uri, name: asset.fileName || "trainer-profile.jpg", type: asset.mimeType || "image/jpeg" });
      const response = await fetch(API_URL, { method: "PATCH", headers: { Authorization: `Token ${token}` }, body: form });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not save profile picture.");
      setTrainer(data.trainer);
      Alert.alert("Profile Updated", "Your profile picture has been saved.");
    } catch (error) {
      Alert.alert("Upload Failed", error.message || "Unable to upload the profile picture.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  if (!trainer) return null;
  const initials = (trainer.name || "T").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
    <TouchableOpacity onPress={() => router.back()}><Text style={[styles.back, { color: colors.primaryLight }]}>‹ Back</Text></TouchableOpacity>
    <Text style={[styles.eyebrow, { color: colors.primaryLight }]}>GYMRYT TRAINER</Text>
    <Text style={[styles.title, { color: colors.text }]}>My Profile</Text>
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.photoRow}>
        {trainer.profile_picture ? <Image source={{ uri: trainer.profile_picture }} style={styles.photo} /> : <View style={[styles.photo, styles.avatar, { backgroundColor: colors.iconBackground }]}><Text style={[styles.avatarText, { color: colors.primaryLight }]}>{initials}</Text></View>}
        <TouchableOpacity style={[styles.photoButton, { backgroundColor: colors.primary }]} onPress={choosePhoto} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.photoButtonText}>{trainer.profile_picture ? "CHANGE PHOTO" : "UPLOAD PHOTO"}</Text>}
        </TouchableOpacity>
      </View>
      <Field label="NAME" value={trainer.name} colors={colors} />
      <Field label="USERNAME" value={`@${trainer.username}`} colors={colors} />
      <Field label="EMAIL" value={trainer.email} colors={colors} />
      <Field label="PHONE" value={trainer.phone} colors={colors} />
      <Field label="SPECIALIZATION" value={trainer.specialization} colors={colors} />
      <Field label="EXPERIENCE" value={`${trainer.experience_years || 0} years`} colors={colors} />
      <Field label="GYM / WORKSPACE" value={trainer.workspace_name} colors={colors} />
    </View>
  </ScrollView>;
}

function Field({ label, value, colors }) { return <View style={[styles.field, { borderBottomColor: colors.border }]}><Text style={[styles.label, { color: colors.secondaryText }]}>{label}</Text><Text style={[styles.value, { color: colors.text }]}>{value || "Not provided"}</Text></View>; }

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" }, content: { padding: 20, paddingTop: 55, paddingBottom: 40 },
  back: { fontSize: 15, fontWeight: "800", marginBottom: 25 }, eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 2 }, title: { fontSize: 30, fontWeight: "900", marginTop: 5, marginBottom: 22 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16 }, photoRow: { alignItems: "center", marginBottom: 18 }, photo: { width: 86, height: 86, borderRadius: 43 }, avatar: { alignItems: "center", justifyContent: "center" }, avatarText: { fontSize: 25, fontWeight: "900" },
  photoButton: { marginTop: 12, paddingHorizontal: 16, height: 42, borderRadius: 12, justifyContent: "center" }, photoButtonText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  field: { paddingVertical: 12, borderBottomWidth: 1 }, label: { fontSize: 10, letterSpacing: 1, fontWeight: "900", marginBottom: 4 }, value: { fontSize: 14 },
});
