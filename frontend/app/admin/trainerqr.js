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

// ============================================================
// API
// ============================================================

const API_URL =
  "http://192.168.1.49:8000/api/members/trainer-registration-qr/";

// ============================================================
// TRAINER QR SCREEN
// ============================================================

export default function TrainerQRScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const qrRef = useRef(null);

  const [qrToken, setQrToken] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  // ============================================================
  // FETCH TRAINER QR
  // ============================================================

  const fetchQRCode = async () => {
    try {
      setLoading(true);

      const token =
        await AsyncStorage.getItem("adminToken");

      const username =
        await AsyncStorage.getItem("adminUsername");

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

      setAdminUsername(username || "Owner");

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
      console.log("TRAINER QR DATA:", data);
      console.log("TRAINER QR TOKEN:", data.token);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to generate trainer QR code."
        );
      }

      if (!data.qr_payload) {
        throw new Error("Trainer QR payload was missing from the server response.");
      }

      // The QR itself contains the canonical payload, not the database token
      // and not a deep-link URL.
      setQrToken(data.qr_payload);

    } catch (error) {
      console.error(
        "TRAINER QR GENERATION ERROR:",
        error
      );

      Alert.alert(
        "Error",
        error.message ||
          "Unable to generate trainer QR code."
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
          new Error(
            "QR code is not ready yet."
          )
        );

        return;
      }

      qrRef.current.toDataURL(async (data) => {
        try {
          const fileUri =
            `${FileSystem.cacheDirectory}` +
            "gymryt-trainer-registration-qr.png";

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
    if (
      !qrToken ||
      downloading ||
      sharing
    ) {
      return;
    }

    try {
      setDownloading(true);

      const fileUri =
        await createQRFile();

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
            "Please select a folder to save your trainer QR code."
          );

          return;
        }

        const directoryUri =
          permissions.directoryUri;

        const fileName =
          `GymRyt_Trainer_Registration_QR_${Date.now()}.png`;

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
          "Your GymRyt trainer registration QR code has been saved successfully."
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
            "Save GymRyt Trainer Registration QR",
          UTI: "public.png",
        }
      );

    } catch (error) {
      console.error(
        "TRAINER QR DOWNLOAD ERROR:",
        error
      );

      Alert.alert(
        "Download Failed",
        "Unable to save the trainer QR code. Please try again."
      );

    } finally {
      setDownloading(false);
    }
  };

  // ============================================================
  // SHARE QR
  // ============================================================

  const handleShare = async () => {
    if (
      !qrToken ||
      downloading ||
      sharing
    ) {
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
            "Share GymRyt Trainer Registration QR",
          UTI: "public.png",
        }
      );

    } catch (error) {
      console.error(
        "TRAINER QR SHARE ERROR:",
        error
      );

      Alert.alert(
        "Share Failed",
        "Unable to share the trainer QR code. Please try again."
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
          backgroundColor:
            colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >

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

        <View style={styles.header}>

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
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={colors.text}
            />
          </TouchableOpacity>

          <View
            style={styles.headerCenter}
          >
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
              Trainer Registration
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
              numberOfLines={1}
            >
              Your GymRyt Trainer QR
            </Text>
          </View>

          <View
            style={styles.headerRight}
          />

        </View>

        {/* ====================================================
            CONTENT
        ==================================================== */}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.scrollContent
          }
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
                color:
                  colors.text,
              },
            ]}
          >
            Scan to Become a Trainer
          </Text>

          <Text
            style={[
              styles.description,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            Ask your trainer to scan this QR code
            to register with your gym.
          </Text>

          {/* ==================================================
              QR CARD
          ================================================== */}

          <View
            style={[
              styles.qrCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >

            {loading ? (

              <View
                style={
                  styles.loadingContainer
                }
              >
                <ActivityIndicator
                  size="large"
                  color={
                    colors.primary
                  }
                />

                <Text
                  style={[
                    styles.loadingText,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  Generating trainer QR code...
                </Text>
              </View>

            ) : qrToken ? (

              <View
                style={
                  styles.qrContainer
                }
              >
                <View
                  style={
                    styles.qrBackground
                  }
                >
                  <QRCode
                    value={qrToken}
                    size={220}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                    quietZone={8}
                    getRef={(ref) => {
                      qrRef.current =
                        ref;
                    }}
                  />
                </View>
              </View>

            ) : (

              <View
                style={
                  styles.loadingContainer
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={
                    colors.danger
                  }
                />

                <Text
                  style={[
                    styles.errorText,
                    {
                      color:
                        colors.danger,
                    },
                  ]}
                >
                  Trainer QR code could not
                  be generated.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.retryButton,
                    {
                      backgroundColor:
                        colors.primary,
                    },
                  ]}
                  onPress={
                    fetchQRCode
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={
                      styles.retryButtonText
                    }
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

            <View
              style={
                styles.actionRow
              }
            >

              {/* DOWNLOAD */}

              <TouchableOpacity
                style={[
                  styles.downloadButton,
                  {
                    backgroundColor:
                      colors.card,
                    borderColor:
                      colors.border,
                  },
                ]}
                onPress={
                  handleDownload
                }
                disabled={
                  downloading ||
                  sharing
                }
                activeOpacity={0.8}
              >

                {downloading ? (

                  <ActivityIndicator
                    size="small"
                    color={
                      colors.primary
                    }
                  />

                ) : (

                  <Ionicons
                    name="download-outline"
                    size={21}
                    color={
                      colors.primaryLight
                    }
                  />

                )}

                <Text
                  style={[
                    styles.downloadText,
                    {
                      color:
                        colors.text,
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
                    backgroundColor:
                      colors.primary,
                  },
                ]}
                onPress={
                  handleShare
                }
                disabled={
                  downloading ||
                  sharing
                }
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

                <Text
                  style={
                    styles.shareText
                  }
                >
                  {sharing
                    ? "Sharing..."
                    : "Share QR"}
                </Text>

              </TouchableOpacity>

            </View>
          )}

          {/* ==================================================
              OWNER INFORMATION
          ================================================== */}

          <View
            style={[
              styles.adminCard,
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
                color={
                  colors.primaryLight
                }
              />
            </View>

            <View
              style={
                styles.adminInfo
              }
            >
              <Text
                style={[
                  styles.adminLabel,
                  {
                    color:
                      colors.mutedText,
                  },
                ]}
              >
                GYM OWNER
              </Text>

              <Text
                style={[
                  styles.adminName,
                  {
                    color:
                      colors.text,
                  },
                ]}
                numberOfLines={1}
              >
                {adminUsername ||
                  "Owner"}
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
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >

            <View
              style={
                styles.instructionHeader
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={
                  colors.primaryLight
                }
              />

              <Text
                style={[
                  styles.instructionTitle,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                How it works
              </Text>
            </View>

            {/* STEP 1 */}

            <View
              style={
                styles.instructionRow
              }
            >
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
                      color:
                        colors.primaryLight,
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
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                Show this QR code to your
                trainer.
              </Text>
            </View>

            {/* STEP 2 */}

            <View
              style={
                styles.instructionRow
              }
            >
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
                      color:
                        colors.primaryLight,
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
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                The trainer scans the QR
                code.
              </Text>
            </View>

            {/* STEP 3 */}

            <View
              style={
                styles.instructionRow
              }
            >
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
                      color:
                        colors.primaryLight,
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
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                The trainer completes the
                registration form.
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
                  color={
                    colors.success
                  }
                />
              </View>

              <Text
                style={[
                  styles.instructionText,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                The trainer is automatically
                linked to your gym.
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
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
            onPress={
              fetchQRCode
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh"
              size={19}
              color={
                colors.primaryLight
              }
            />

            <Text
              style={[
                styles.refreshText,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              Generate New QR
            </Text>
          </TouchableOpacity>

          <View
            style={
              styles.bottomSpacing
            }
          />

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
    height: 72,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },

  headerRight: {
    width: 44,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  headerSubtitle: {
    fontSize: 12,
    marginTop: 3,
    textAlign: "center",
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },

  // ==========================================================
  // TITLE
  // ==========================================================

  title: {
    width: "100%",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },

  description: {
    width: "100%",
    maxWidth: 360,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },

  // ==========================================================
  // QR
  // ==========================================================

  qrCard: {
    width: "100%",
    maxWidth: 360,
    minHeight: 280,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 20,
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
    borderRadius: 18,
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
    fontSize: 14,
    marginTop: 14,
    textAlign: "center",
  },

  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },

  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // ==========================================================
  // DOWNLOAD / SHARE
  // ==========================================================

  actionRow: {
    width: "100%",
    maxWidth: 360,
    flexDirection: "row",
    marginTop: 14,
  },

  downloadButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginRight: 6,
  },

  shareButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginLeft: 6,
  },

  downloadText: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },

  shareText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },

  // ==========================================================
  // OWNER
  // ==========================================================

  adminCard: {
    width: "100%",
    maxWidth: 360,
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginTop: 14,
  },

  adminIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  adminInfo: {
    marginLeft: 12,
    flex: 1,
  },

  adminLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  adminName: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 3,
  },

  // ==========================================================
  // INSTRUCTIONS
  // ==========================================================

  instructionsCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 14,
  },

  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  instructionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },

  instructionRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  stepNumberText: {
    fontSize: 13,
    fontWeight: "800",
  },

  instructionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 10,
  },

  // ==========================================================
  // REFRESH
  // ==========================================================

  refreshButton: {
    width: "100%",
    maxWidth: 360,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 14,
  },

  refreshText: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },

  bottomSpacing: {
    height: 20,
  },

});
