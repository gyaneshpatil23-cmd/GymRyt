import { router } from "expo-router";
import React, { useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";

import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

export default function MemberScannerScreen() {
  // ============================================================
  // SCREEN SIZE
  // ============================================================

  const { width, height } = useWindowDimensions();

  // ============================================================
  // CAMERA PERMISSION
  // ============================================================

  const [permission, requestPermission] =
    useCameraPermissions();

  // ============================================================
  // STATES
  // ============================================================

  const [scanned, setScanned] = useState(false);

  const [cameraReady, setCameraReady] =
    useState(false);

  // ============================================================
  // SCANNER SIZE
  // ============================================================

  const FRAME_SIZE = Math.min(
    280,
    width - 70
  );

  // ============================================================
  // SCANNER POSITION
  // ============================================================

  const FRAME_TOP = Math.max(
    310,
    (height - FRAME_SIZE) / 2
  );

  const FRAME_LEFT =
    (width - FRAME_SIZE) / 2;

  // ============================================================
  // CAMERA ERROR
  // ============================================================

  const handleCameraError = (error) => {
    console.log(
      "================================"
    );

    console.log(
      "GYMRYT CAMERA ERROR"
    );

    console.log(error);

    console.log(
      "================================"
    );

    Alert.alert(
      "Camera Error",
      error?.message ||
        "The camera could not be started."
    );
  };

  // ============================================================
  // CAMERA READY
  // ============================================================

  const handleCameraReady = () => {
    console.log(
      "GYMRYT CAMERA READY"
    );

    setCameraReady(true);
  };

  // ============================================================
  // QR CODE SCANNED
  // ============================================================

  const handleBarcodeScanned = ({ data }) => {
    // ----------------------------------------------------------
    // Prevent multiple scans
    // ----------------------------------------------------------

    if (scanned) {
      return;
    }

    console.log(
      "================================"
    );

    console.log(
      "QR CODE DETECTED:"
    );

    console.log(data);

    console.log(
      "================================"
    );

    // ==========================================================
    // VALIDATE GYMRYT QR
    // ==========================================================

    if (
      !data ||
      !data.startsWith("GYMRYT_")
    ) {
      Alert.alert(
        "Invalid QR Code",
        "This is not a valid GymRyt registration QR code.",
        [
          {
            text: "SCAN AGAIN",

            onPress: () => {
              setScanned(false);
            },
          },
        ]
      );

      return;
    }

    // ==========================================================
    // VALID GYMRYT QR
    // ==========================================================

    setScanned(true);

    console.log(
      "VALID GYMRYT QR"
    );

    console.log(
      "Opening member registration..."
    );

    // ==========================================================
    // OPEN REGISTRATION
    // ==========================================================

    router.push({
      pathname: "/member/register",

      params: {
        qrToken: data,
      },
    });
  };

  // ============================================================
  // PERMISSION LOADING
  // ============================================================

  if (!permission) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Checking camera permission...
        </Text>
      </View>
    );
  }

  // ============================================================
  // PERMISSION NOT GRANTED
  // ============================================================

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <View style={styles.permissionIcon}>
          <Text style={styles.permissionIconText}>
            📷
          </Text>
        </View>

        <Text style={styles.permissionTitle}>
          Camera Access Required
        </Text>

        <Text style={styles.permissionText}>
          GymRyt needs access to your camera to
          scan the gym registration QR code.
        </Text>

        <TouchableOpacity
          style={styles.allowButton}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text style={styles.allowButtonText}>
            ALLOW CAMERA
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>
            GO BACK
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============================================================
  // MAIN SCREEN
  // ============================================================

  return (
    <View style={styles.container}>

      {/* ========================================================
          HEADER
          ======================================================== */}

      <View style={styles.header}>
        <Text style={styles.title}>
          SCAN GYM QR
        </Text>

        <Text style={styles.subtitle}>
          Scan the QR code provided by your gym
        </Text>
      </View>

      {/* ========================================================
          CAMERA BOX
          ======================================================== */}

      <View
        style={[
          styles.cameraBox,
          {
            width: FRAME_SIZE,
            height: FRAME_SIZE,
            top: FRAME_TOP,
            left: FRAME_LEFT,
          },
        ]}
      >
        <CameraView
          style={styles.camera}
          facing="back"
          mode="picture"
          onCameraReady={handleCameraReady}
          onMountError={handleCameraError}
          onBarcodeScanned={
            scanned
              ? undefined
              : handleBarcodeScanned
          }
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />

        {/* ======================================================
            CAMERA LOADING
            ====================================================== */}

        {!cameraReady && (
          <View
            style={styles.cameraLoading}
            pointerEvents="none"
          >
            <ActivityIndicator
              size="large"
              color="#FFFFFF"
            />

            <Text style={styles.cameraLoadingText}>
              Starting camera...
            </Text>
          </View>
        )}
      </View>

      {/* ========================================================
          SCANNER BORDER
          
          This is intentionally OUTSIDE CameraView.
          ======================================================== */}

      <View
        pointerEvents="none"
        style={[
          styles.scannerCorners,
          {
            width: FRAME_SIZE,
            height: FRAME_SIZE,
            top: FRAME_TOP,
            left: FRAME_LEFT,
          },
        ]}
      >

        {/* ======================================================
            TOP LEFT
            ====================================================== */}

        <View
          style={[
            styles.corner,
            styles.topLeft,
          ]}
        />

        {/* ======================================================
            TOP RIGHT
            ====================================================== */}

        <View
          style={[
            styles.corner,
            styles.topRight,
          ]}
        />

        {/* ======================================================
            BOTTOM LEFT
            ====================================================== */}

        <View
          style={[
            styles.corner,
            styles.bottomLeft,
          ]}
        />

        {/* ======================================================
            BOTTOM RIGHT
            ====================================================== */}

        <View
          style={[
            styles.corner,
            styles.bottomRight,
          ]}
        />

      </View>

      {/* ========================================================
          CLOSE BUTTON
          ======================================================== */}

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.closeButtonText}>
          ×
        </Text>
      </TouchableOpacity>

      {/* ========================================================
          BOTTOM INSTRUCTIONS
          ======================================================== */}

      <View style={styles.bottomContent}>
        <Text style={styles.instruction}>
          Place the QR code inside the frame
        </Text>

        <Text style={styles.secureText}>
          🔒 Secure GymRyt registration
        </Text>
      </View>

      {/* ========================================================
          PROCESSING
          ======================================================== */}

      {scanned && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator
            size="large"
            color="#FFFFFF"
          />

          <Text style={styles.processingText}>
            Opening registration...
          </Text>
        </View>
      )}

    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  // ==========================================================
  // MAIN CONTAINER
  // ==========================================================

  container: {
    flex: 1,

    backgroundColor: "#000000",

    position: "relative",

    overflow: "hidden",
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    position: "absolute",

    top: 90,

    left: 0,

    right: 0,

    alignItems: "center",

    paddingHorizontal: 20,

    zIndex: 20,
  },

  title: {
    color: "#FFFFFF",

    fontSize: 25,

    fontWeight: "800",

    letterSpacing: 1,

    textAlign: "center",
  },

  subtitle: {
    color: "#E2E8F0",

    fontSize: 12,

    marginTop: 8,

    textAlign: "center",
  },

  // ==========================================================
  // CAMERA BOX
  // ==========================================================

  cameraBox: {
    position: "absolute",

    backgroundColor: "#000000",

    overflow: "hidden",

    borderRadius: 4,

    zIndex: 5,
  },

  // ==========================================================
  // CAMERA
  // ==========================================================

  camera: {
    width: "100%",

    height: "100%",
  },

  // ==========================================================
  // CAMERA LOADING
  // ==========================================================

  cameraLoading: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor: "#000000",

    alignItems: "center",

    justifyContent: "center",

    zIndex: 10,
  },

  cameraLoadingText: {
    color: "#FFFFFF",

    fontSize: 13,

    marginTop: 12,
  },

  // ==========================================================
  // SCANNER CORNERS
  // ==========================================================

  scannerCorners: {
    position: "absolute",

    zIndex: 50,

    pointerEvents: "none",
  },

  corner: {
    position: "absolute",

    width: 48,

    height: 48,

    borderColor: "#FFFFFF",

    zIndex: 60,
  },

  // ==========================================================
  // TOP LEFT
  // ==========================================================

  topLeft: {
    top: 0,

    left: 0,

    borderTopWidth: 4,

    borderLeftWidth: 4,

    borderTopLeftRadius: 12,
  },

  // ==========================================================
  // TOP RIGHT
  // ==========================================================

  topRight: {
    top: 0,

    right: 0,

    borderTopWidth: 4,

    borderRightWidth: 4,

    borderTopRightRadius: 12,
  },

  // ==========================================================
  // BOTTOM LEFT
  // ==========================================================

  bottomLeft: {
    bottom: 0,

    left: 0,

    borderBottomWidth: 4,

    borderLeftWidth: 4,

    borderBottomLeftRadius: 12,
  },

  // ==========================================================
  // BOTTOM RIGHT
  // ==========================================================

  bottomRight: {
    bottom: 0,

    right: 0,

    borderBottomWidth: 4,

    borderRightWidth: 4,

    borderBottomRightRadius: 12,
  },

  // ==========================================================
  // CLOSE BUTTON
  // ==========================================================

  closeButton: {
    position: "absolute",

    top: 45,

    left: 22,

    width: 45,

    height: 45,

    borderRadius: 23,

    backgroundColor: "rgba(0,0,0,0.75)",

    alignItems: "center",

    justifyContent: "center",

    zIndex: 100,
  },

  closeButtonText: {
    color: "#FFFFFF",

    fontSize: 32,

    fontWeight: "300",

    lineHeight: 34,
  },

  // ==========================================================
  // BOTTOM CONTENT
  // ==========================================================

  bottomContent: {
    position: "absolute",

    left: 0,

    right: 0,

    bottom: 70,

    alignItems: "center",

    paddingHorizontal: 20,

    zIndex: 20,
  },

  instruction: {
    color: "#FFFFFF",

    fontSize: 13,

    fontWeight: "600",

    textAlign: "center",
  },

  secureText: {
    color: "#CBD5E1",

    fontSize: 10,

    marginTop: 10,

    textAlign: "center",
  },

  // ==========================================================
  // PROCESSING
  // ==========================================================

  processingOverlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor: "rgba(0,0,0,0.85)",

    alignItems: "center",

    justifyContent: "center",

    zIndex: 200,
  },

  processingText: {
    color: "#FFFFFF",

    fontSize: 15,

    fontWeight: "600",

    marginTop: 15,
  },

  // ==========================================================
  // PERMISSION SCREEN
  // ==========================================================

  permissionScreen: {
    flex: 1,

    backgroundColor: "#050816",

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 30,
  },

  permissionIcon: {
    width: 80,

    height: 80,

    borderRadius: 40,

    backgroundColor: "#172554",

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 20,
  },

  permissionIconText: {
    fontSize: 36,
  },

  permissionTitle: {
    color: "#FFFFFF",

    fontSize: 22,

    fontWeight: "800",

    textAlign: "center",

    marginBottom: 10,
  },

  permissionText: {
    color: "#94A3B8",

    fontSize: 13,

    lineHeight: 20,

    textAlign: "center",

    marginBottom: 28,
  },

  // ==========================================================
  // ALLOW BUTTON
  // ==========================================================

  allowButton: {
    width: "100%",

    height: 54,

    backgroundColor: "#2563EB",

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 12,

    elevation: 6,
  },

  allowButtonText: {
    color: "#FFFFFF",

    fontSize: 14,

    fontWeight: "800",

    letterSpacing: 0.7,
  },

  // ==========================================================
  // BACK BUTTON
  // ==========================================================

  backButton: {
    width: "100%",

    height: 50,

    borderRadius: 14,

    borderWidth: 1,

    borderColor: "#334155",

    alignItems: "center",

    justifyContent: "center",
  },

  backButtonText: {
    color: "#94A3B8",

    fontSize: 12,

    fontWeight: "700",
  },

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  loadingScreen: {
    flex: 1,

    backgroundColor: "#050816",

    alignItems: "center",

    justifyContent: "center",
  },

  loadingText: {
    color: "#FFFFFF",

    fontSize: 14,

    marginTop: 15,
  },

});
