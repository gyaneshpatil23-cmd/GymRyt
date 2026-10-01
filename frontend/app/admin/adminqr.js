import React, { useEffect, useRef, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";

import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../context/ThemeContext";

const API_URL =
  "http://192.168.1.43:8000/api/members/registration-qr/";

export default function AdminQRScreen() {
  const router = useRouter();
  const {
    colors,
    isDark,
    toggleTheme,
  } = useTheme();
  const insets = useSafeAreaInsets();

  const qrRef = useRef(null);

  const [qrToken, setQrToken] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  // ============================================================
  // FETCH ADMIN QR
  // ============================================================

  const fetchQRCode = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("adminToken");
      const username = await AsyncStorage.getItem("adminUsername");

      if (!token) {
        Alert.alert(
          "Session Expired",
          "Please login again.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/"),
            },
          ]
        );

        return;
      }

      setAdminUsername(username || "Admin");

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Token ${token}`,
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        await AsyncStorage.multiRemove([
          "adminToken",
          "adminUsername",
          "adminId",
          "userRole",
        ]);

        Alert.alert(
          "Session Expired",
          "Please login again.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/"),
            },
          ]
        );

        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to generate QR code."
        );
      }

      setQrToken(data.token);

    } catch (error) {
      console.error("QR generation error:", error);

      Alert.alert(
        "Error",
        error.message || "Unable to generate QR code."
      );

    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchQRCode();
  }, []);

  // ============================================================
  // CREATE QR IMAGE FILE
  // ============================================================

  const createQRFile = async () => {
    return new Promise((resolve, reject) => {
      if (!qrRef.current) {
        reject(
          new Error("QR code is not ready yet.")
        );
        return;
      }

      qrRef.current.toDataURL(async (data) => {
        try {
          const fileUri =
            `${FileSystem.cacheDirectory}` +
            "gymryt-registration-qr.png";

          await FileSystem.writeAsStringAsync(
            fileUri,
            data,
            {
              encoding:
                FileSystem.EncodingType.Base64,
            }
          );

          resolve(fileUri);

        } catch (error) {
          reject(error);
        }
      });
    });
  };

  // ============================================================
  // DOWNLOAD QR
  // ============================================================

  const handleDownload = async () => {
    if (!qrToken || downloading || sharing) {
      return;
    }

    try {
      setDownloading(true);

      const fileUri = await createQRFile();

      // --------------------------------------------------------
      // ANDROID
      // --------------------------------------------------------

      if (Platform.OS === "android") {
        const permissions =
          await FileSystem.StorageAccessFramework
            .requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
          Alert.alert(
            "Download Cancelled",
            "Please select a folder to save your QR code."
          );

          return;
        }

        const directoryUri =
          permissions.directoryUri;

        const fileName =
          `GymRyt_Registration_QR_${Date.now()}.png`;

        const destinationUri =
          await FileSystem.StorageAccessFramework
            .createFileAsync(
              directoryUri,
              fileName,
              "image/png"
            );

        const base64 =
          await FileSystem.readAsStringAsync(
            fileUri,
            {
              encoding:
                FileSystem.EncodingType.Base64,
            }
          );

        await FileSystem.writeAsStringAsync(
          destinationUri,
          base64,
          {
            encoding:
              FileSystem.EncodingType.Base64,
          }
        );

        Alert.alert(
          "QR Code Downloaded",
          "Your GymRyt registration QR code has been saved successfully."
        );

        return;
      }

      // --------------------------------------------------------
      // IOS
      // --------------------------------------------------------

      const available =
        await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert(
          "Download Unavailable",
          "File saving is not available on this device."
        );

        return;
      }

      await Sharing.shareAsync(
        fileUri,
        {
          mimeType: "image/png",
          dialogTitle:
            "Save GymRyt Registration QR",
          UTI: "public.png",
        }
      );

    } catch (error) {
      console.error(
        "QR download error:",
        error
      );

      Alert.alert(
        "Download Failed",
        "Unable to save the QR code. Please try again."
      );

    } finally {
      setDownloading(false);
    }
  };

  // ============================================================
  // SHARE QR
  // ============================================================

  const handleShare = async () => {
    if (!qrToken || downloading || sharing) {
      return;
    }

    try {
      setSharing(true);

      const fileUri =
        await createQRFile();

      const available =
        await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert(
          "Sharing Unavailable",
          "Sharing is not available on this device."
        );

        return;
      }

      await Sharing.shareAsync(
        fileUri,
        {
          mimeType: "image/png",
          dialogTitle:
            "Share GymRyt Registration QR",
          UTI: "public.png",
        }
      );

    } catch (error) {
      console.error(
        "QR sharing error:",
        error
      );

      Alert.alert(
        "Share Failed",
        "Unable to share the QR code. Please try again."
      );

    } finally {
      setSharing(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >

      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <View style={styles.header}>

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
              GYMRYT • MEMBER REGISTRATION
            </Text>

            <Text
              style={[
                styles.headerTitle,
                {
                  color:
                    colors.text,
                },
              ]}
              numberOfLines={1}
            >
              Registration QR
            </Text>

          </View>


          <View
            style={
              styles.headerActions
            }
          >

            {/* THEME */}

            <TouchableOpacity
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
              activeOpacity={0.8}
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
            </TouchableOpacity>


            {/* BACK */}

            <TouchableOpacity
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
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={
                  colors.text
                }
              />
            </TouchableOpacity>

          </View>

        </View>


        {/* ====================================================
            SCROLLABLE CONTENT
        ==================================================== */}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >

          {/* ==================================================
              TITLE
          ================================================== */}

          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}
          >
            Scan to Join
          </Text>


          <Text
            style={[
              styles.description,
              {
                color: colors.secondaryText,
              },
            ]}
          >
            Ask your member to scan this QR code to register
            with your gym.
          </Text>


          {/* ==================================================
              QR CARD
          ================================================== */}

          <View
            style={[
              styles.qrCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >

            {loading ? (

              <View style={styles.loadingContainer}>

                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                />

                <Text
                  style={[
                    styles.loadingText,
                    {
                      color: colors.secondaryText,
                    },
                  ]}
                >
                  Generating QR code...
                </Text>

              </View>

            ) : qrToken ? (

              <View style={styles.qrContainer}>

                <View style={styles.qrBackground}>

                  <QRCode
                    value={qrToken}
                    size={220}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                    quietZone={8}
                    getRef={(ref) => {
                      qrRef.current = ref;
                    }}
                  />

                </View>

              </View>

            ) : (

              <View style={styles.loadingContainer}>

                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={colors.danger}
                />

                <Text
                  style={[
                    styles.errorText,
                    {
                      color: colors.danger,
                    },
                  ]}
                >
                  QR code could not be generated.
                </Text>


                <TouchableOpacity
                  style={[
                    styles.retryButton,
                    {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={fetchQRCode}
                  activeOpacity={0.8}
                >

                  <Text
                    style={styles.retryButtonText}
                  >
                    Try Again
                  </Text>

                </TouchableOpacity>

              </View>

            )}

          </View>


          {/* ==================================================
              DOWNLOAD + SHARE
          ================================================== */}

          {qrToken && !loading && (

            <View style={styles.actionRow}>

              {/* DOWNLOAD */}

              <TouchableOpacity
                style={[
                  styles.downloadButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleDownload}
                disabled={downloading || sharing}
                activeOpacity={0.8}
              >

                {downloading ? (

                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                  />

                ) : (

                  <Ionicons
                    name="download-outline"
                    size={21}
                    color={colors.primaryLight}
                  />

                )}

                <Text
                  style={[
                    styles.downloadText,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  {downloading
                    ? "Saving..."
                    : "Download"}
                </Text>

              </TouchableOpacity>


              {/* SHARE */}

              <TouchableOpacity
                style={[
                  styles.shareButton,
                  {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={handleShare}
                disabled={downloading || sharing}
                activeOpacity={0.8}
              >

                {sharing ? (

                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                ) : (

                  <Ionicons
                    name="share-social-outline"
                    size={21}
                    color="#FFFFFF"
                  />

                )}

                <Text style={styles.shareText}>
                  {sharing
                    ? "Sharing..."
                    : "Share QR"}
                </Text>

              </TouchableOpacity>

            </View>

          )}


          {/* ==================================================
              ADMIN INFORMATION
          ================================================== */}

          <View
            style={[
              styles.adminCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >

            <View
              style={[
                styles.adminIcon,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >

              <Ionicons
                name="business-outline"
                size={22}
                color={colors.primaryLight}
              />

            </View>


            <View style={styles.adminInfo}>

              <Text
                style={[
                  styles.adminLabel,
                  {
                    color: colors.mutedText,
                  },
                ]}
              >
                GYM ADMIN
              </Text>


              <Text
                style={[
                  styles.adminName,
                  {
                    color: colors.text,
                  },
                ]}
                numberOfLines={1}
              >
                {adminUsername || "Admin"}
              </Text>

            </View>

          </View>


          {/* ==================================================
              HOW IT WORKS
          ================================================== */}

          <View
            style={[
              styles.instructionsCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >

            <View style={styles.instructionHeader}>

              <Ionicons
                name="information-circle-outline"
                size={22}
                color={colors.primaryLight}
              />

              <Text
                style={[
                  styles.instructionTitle,
                  {
                    color: colors.text,
                  },
                ]}
              >
                How it works
              </Text>

            </View>


            {/* STEP 1 */}

            <View style={styles.instructionRow}>

              <View
                style={[
                  styles.stepNumber,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >

                <Text
                  style={[
                    styles.stepNumberText,
                    {
                      color: colors.primaryLight,
                    },
                  ]}
                >
                  1
                </Text>

              </View>


              <Text
                style={[
                  styles.instructionText,
                  {
                    color: colors.secondaryText,
                  },
                ]}
              >
                Show this QR code to your member.
              </Text>

            </View>


            {/* STEP 2 */}

            <View style={styles.instructionRow}>

              <View
                style={[
                  styles.stepNumber,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >

                <Text
                  style={[
                    styles.stepNumberText,
                    {
                      color: colors.primaryLight,
                    },
                  ]}
                >
                  2
                </Text>

              </View>


              <Text
                style={[
                  styles.instructionText,
                  {
                    color: colors.secondaryText,
                  },
                ]}
              >
                The member scans the QR code.
              </Text>

            </View>


            {/* STEP 3 */}

            <View style={styles.instructionRow}>

              <View
                style={[
                  styles.stepNumber,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >

                <Text
                  style={[
                    styles.stepNumberText,
                    {
                      color: colors.primaryLight,
                    },
                  ]}
                >
                  3
                </Text>

              </View>


              <Text
                style={[
                  styles.instructionText,
                  {
                    color: colors.secondaryText,
                  },
                ]}
              >
                The member completes the registration form.
              </Text>

            </View>


            {/* STEP 4 */}

            <View
              style={[
                styles.instructionRow,
                {
                  marginBottom: 0,
                },
              ]}
            >

              <View
                style={[
                  styles.stepNumber,
                  {
                    backgroundColor:
                      colors.successBackground,
                  },
                ]}
              >

                <Ionicons
                  name="checkmark"
                  size={18}
                  color={colors.success}
                />

              </View>


              <Text
                style={[
                  styles.instructionText,
                  {
                    color: colors.secondaryText,
                  },
                ]}
              >
                The member is automatically linked to your gym.
              </Text>

            </View>

          </View>


          {/* ==================================================
              GENERATE NEW QR
          ================================================== */}

          <TouchableOpacity
            style={[
              styles.refreshButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={fetchQRCode}
            activeOpacity={0.8}
          >

            <Ionicons
              name="refresh"
              size={19}
              color={colors.primaryLight}
            />

            <Text
              style={[
                styles.refreshText,
                {
                  color: colors.primaryLight,
                },
              ]}
            >
              Generate New QR
            </Text>

          </TouchableOpacity>


          <View style={styles.bottomSpacing} />

        </ScrollView>

      </View>

    </View>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },


  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
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

  headerTitle: {
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


  // ==========================================================
  // SCROLL
  // ==========================================================

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 24,
  },


  // ==========================================================
  // TITLE
  // ==========================================================

  title: {
    width: "100%",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 4,
  },

  description: {
    width: "100%",
    maxWidth: 360,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    textAlign: "center",
    marginTop: 6,
  },


  // ==========================================================
  // QR
  // ==========================================================

  qrCard: {
    width: "100%",
    maxWidth: 380,
    minHeight: 280,
    borderRadius: 26,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  qrContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  qrBackground: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingContainer: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  loadingText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },

  errorText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
  },

  retryButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },


  // ==========================================================
  // DOWNLOAD / SHARE
  // ==========================================================

  actionRow: {
    width: "100%",
    maxWidth: 380,
    flexDirection: "row",
    marginTop: 12,
  },

  downloadButton: {
    flex: 1,
    height: 54,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginRight: 5,
  },

  shareButton: {
    flex: 1,
    height: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginLeft: 5,
  },

  downloadText: {
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 8,
  },

  shareText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 8,
  },


  // ==========================================================
  // ADMIN
  // ==========================================================

  adminCard: {
    width: "100%",
    maxWidth: 380,
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 13,
    marginTop: 12,
  },

  adminIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  adminInfo: {
    marginLeft: 11,
    flex: 1,
  },

  adminLabel: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  adminName: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },


  // ==========================================================
  // INSTRUCTIONS
  // ==========================================================

  instructionsCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 21,
    borderWidth: 1,
    padding: 15,
    marginTop: 12,
  },

  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  instructionTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginLeft: 7,
  },

  instructionRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  stepNumberText: {
    fontSize: 12,
    fontWeight: "900",
  },

  instructionText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginLeft: 10,
  },


  // ==========================================================
  // REFRESH
  // ==========================================================

  refreshButton: {
    width: "100%",
    maxWidth: 380,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 12,
  },

  refreshText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    marginLeft: 8,
  },

  bottomSpacing: {
    height: 20,
  },

});
