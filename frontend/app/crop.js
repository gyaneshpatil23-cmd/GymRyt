import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import { useTheme } from "../context/ThemeContext";

// ============================================================
// SCREEN SIZE
// ============================================================

const { width: SCREEN_WIDTH } =
  Dimensions.get("window");

// ============================================================
// CROP SIZE
// ============================================================

const CROP_SIZE = Math.min(
  SCREEN_WIDTH - 40,
  340
);

// ============================================================
// RESTORE ROUTER-ENCODED FILE URI
// ============================================================

const restoreFileUri = (value) => {
  if (!value) {
    return "";
  }

  let uri = String(value);

  // ==========================================================
  // IMPORTANT
  //
  // Expo Router decodes the route parameter once.
  //
  // Original:
  // %2540anonymous%252Ffrontend
  //
  // Router gives us:
  // %40anonymous%2Ffrontend
  //
  // We need to restore the % character:
  // %40 -> %2540
  // %2F -> %252F
  //
  // DO NOT use decodeURIComponent() here.
  // ==========================================================

  uri = uri.replace(/%/g, "%25");

  return uri;
};

// ============================================================
// CROP SCREEN
// ============================================================

export default function CropScreen() {
  const { colors } = useTheme();

  // ==========================================================
  // ROUTE PARAMETER
  // ==========================================================

  const params = useLocalSearchParams();

  const routeUri = Array.isArray(params.uri)
    ? params.uri[0]
    : params.uri;

  // ==========================================================
  // IMAGE URI
  // ==========================================================

  const [imageUri, setImageUri] =
    useState("");

  // ==========================================================
  // IMAGE SIZE
  // ==========================================================

  const [imageSize, setImageSize] =
    useState({
      width: 0,
      height: 0,
    });

  // ==========================================================
  // DISPLAYED IMAGE SIZE
  // ==========================================================

  const [displayedSize, setDisplayedSize] =
    useState({
      width: 0,
      height: 0,
    });

  // ==========================================================
  // IMAGE POSITION
  // ==========================================================

  const [imagePosition, setImagePosition] =
    useState({
      x: 0,
      y: 0,
    });

  // ==========================================================
  // SAVING STATE
  // ==========================================================

  const [saving, setSaving] =
    useState(false);

  // ==========================================================
  // POSITION REF
  // ==========================================================

  const positionRef = useRef({
    x: 0,
    y: 0,
  });

  // ==========================================================
  // START POSITION REF
  // ==========================================================

  const startPositionRef = useRef({
    x: 0,
    y: 0,
  });

  // ==========================================================
  // DISPLAYED SIZE REF
  // ==========================================================

  const displayedSizeRef = useRef({
    width: 0,
    height: 0,
  });

  // ==========================================================
  // RESTORE IMAGE URI
  // ==========================================================

  useEffect(() => {
    if (!routeUri) {
      return;
    }

    const restoredUri =
      restoreFileUri(routeUri);

    console.log(
      "CROP ROUTE URI:",
      routeUri
    );

    console.log(
      "CROP RESTORED URI:",
      restoredUri
    );

    setImageUri(restoredUri);
  }, [routeUri]);

  // ==========================================================
  // LOAD IMAGE
  // ==========================================================

  useEffect(() => {
    if (!imageUri) {
      return;
    }

    console.log(
      "CROP LOADING IMAGE:",
      imageUri
    );

    Image.getSize(
      imageUri,
      (width, height) => {
        console.log(
          "CROP IMAGE SIZE:",
          width,
          height
        );

        // ====================================================
        // ORIGINAL IMAGE SIZE
        // ====================================================

        setImageSize({
          width,
          height,
        });

        // ====================================================
        // CALCULATE SCALE
        // ====================================================

        const scale = Math.max(
          CROP_SIZE / width,
          CROP_SIZE / height
        );

        // ====================================================
        // DISPLAYED IMAGE SIZE
        // ====================================================

        const displayedWidth =
          width * scale;

        const displayedHeight =
          height * scale;

        const newDisplayedSize = {
          width: displayedWidth,
          height: displayedHeight,
        };

        setDisplayedSize(
          newDisplayedSize
        );

        displayedSizeRef.current =
          newDisplayedSize;

        // ====================================================
        // CENTER IMAGE
        // ====================================================

        const initialX =
          (CROP_SIZE -
            displayedWidth) /
          2;

        const initialY =
          (CROP_SIZE -
            displayedHeight) /
          2;

        const initialPosition = {
          x: initialX,
          y: initialY,
        };

        positionRef.current =
          initialPosition;

        setImagePosition(
          initialPosition
        );
      },
      (error) => {
        console.log(
          "CROP IMAGE LOAD ERROR:",
          error
        );

        Alert.alert(
          "Image Error",
          "Unable to load this image. Please select another photo.",
          [
            {
              text: "OK",
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      }
    );
  }, [imageUri]);

  // ==========================================================
  // PAN RESPONDER
  // ==========================================================

  const panResponder = useRef(
    PanResponder.create({
      // ======================================================
      // TOUCH START
      // ======================================================

      onStartShouldSetPanResponder: () =>
        true,

      onMoveShouldSetPanResponder: () =>
        true,

      // ======================================================
      // TOUCH GRANTED
      // ======================================================

      onPanResponderGrant: () => {
        startPositionRef.current = {
          ...positionRef.current,
        };
      },

      // ======================================================
      // MOVE IMAGE
      // ======================================================

      onPanResponderMove: (
        _event,
        gestureState
      ) => {
        const displayed =
          displayedSizeRef.current;

        if (
          !displayed.width ||
          !displayed.height
        ) {
          return;
        }

        // ====================================================
        // IMAGE BOUNDARIES
        // ====================================================

        const minimumX =
          CROP_SIZE -
          displayed.width;

        const maximumX = 0;

        const minimumY =
          CROP_SIZE -
          displayed.height;

        const maximumY = 0;

        // ====================================================
        // CALCULATE NEW POSITION
        // ====================================================

        let newX =
          startPositionRef.current.x +
          gestureState.dx;

        let newY =
          startPositionRef.current.y +
          gestureState.dy;

        // ====================================================
        // KEEP IMAGE INSIDE FRAME
        // ====================================================

        newX = Math.max(
          minimumX,
          Math.min(
            maximumX,
            newX
          )
        );

        newY = Math.max(
          minimumY,
          Math.min(
            maximumY,
            newY
          )
        );

        const newPosition = {
          x: newX,
          y: newY,
        };

        // ====================================================
        // UPDATE REF
        // ====================================================

        positionRef.current =
          newPosition;

        // ====================================================
        // UPDATE SCREEN
        // ====================================================

        setImagePosition(
          newPosition
        );
      },

      // ======================================================
      // RELEASE
      // ======================================================

      onPanResponderRelease: () => {
        // Position already stored in ref.
      },
    })
  ).current;

  // ==========================================================
  // SAVE CROPPED IMAGE
  // ==========================================================

  const saveCrop = async () => {
    if (
      !imageUri ||
      !imageSize.width ||
      !imageSize.height ||
      !displayedSize.width ||
      !displayedSize.height ||
      saving
    ) {
      return;
    }

    try {
      setSaving(true);

      console.log(
        "STARTING CROP..."
      );

      // ======================================================
      // DISPLAY SCALE
      // ======================================================

      const scale =
        displayedSize.width /
        imageSize.width;

      // ======================================================
      // CURRENT IMAGE POSITION
      // ======================================================

      const currentX =
        positionRef.current.x;

      const currentY =
        positionRef.current.y;

      // ======================================================
      // ORIGINAL IMAGE CROP ORIGIN
      // ======================================================

      const originX =
        Math.max(
          0,
          -currentX / scale
        );

      const originY =
        Math.max(
          0,
          -currentY / scale
        );

      // ======================================================
      // CROP DIMENSIONS
      // ======================================================

      const cropWidth =
        Math.min(
          CROP_SIZE / scale,
          imageSize.width -
            originX
        );

      const cropHeight =
        Math.min(
          CROP_SIZE / scale,
          imageSize.height -
            originY
        );

      console.log(
        "CROP PARAMETERS:",
        {
          originX,
          originY,
          cropWidth,
          cropHeight,
        }
      );

      // ======================================================
      // CREATE CROPPED IMAGE
      // ======================================================

      const result =
        await ImageManipulator.manipulateAsync(
          imageUri,
          [
            {
              crop: {
                originX,
                originY,
                width: cropWidth,
                height: cropHeight,
              },
            },

            {
              resize: {
                width: 800,
                height: 800,
              },
            },
          ],
          {
            compress: 0.9,

            format:
              ImageManipulator.SaveFormat
                .JPEG,
          }
        );

      console.log(
        "CROPPED IMAGE URI:",
        result.uri
      );

      // ======================================================
      // STORE CROPPED IMAGE
      // ======================================================

      await AsyncStorage.setItem(
        "pendingProfilePictureUri",
        result.uri
      );

      console.log(
        "CROPPED IMAGE SAVED"
      );

      // ======================================================
      // RETURN TO PROFILE
      // ======================================================

      router.back();
    } catch (error) {
      console.log(
        "CROP ERROR:",
        error
      );

      Alert.alert(
        "Crop Failed",
        error?.message ||
          "Unable to save this image. Please try another photo."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // CANCEL
  // ==========================================================

  const cancelCrop = () => {
    router.back();
  };

  // ==========================================================
  // WAITING FOR URI
  // ==========================================================

  if (!imageUri) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            { color: colors.mutedText },
          ]}
        >
          Loading image...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // SCREEN
  // ==========================================================

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text
            style={[
              styles.eyebrow,
              { color: colors.primaryLight },
            ]}
          >
            GYMRYT • PROFILE PHOTO
          </Text>

          <Text
            style={[
              styles.title,
              { color: colors.text },
            ]}
          >
            Crop Photo
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.closeButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={cancelCrop}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Ionicons
            name="close"
            size={21}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* ======================================================
          CROP AREA
      ====================================================== */}

      <View style={styles.cropWrapper}>
        <View
          style={[
            styles.cropArea,
            { borderColor: colors.border },
          ]}
          {...panResponder.panHandlers}
        >

          {/* ==================================================
              IMAGE
          ================================================== */}

          {displayedSize.width > 0 &&
          displayedSize.height > 0 ? (
            <Image
              source={{
                uri: imageUri,
              }}
              style={{
                position: "absolute",
                width:
                  displayedSize.width,
                height:
                  displayedSize.height,
                left:
                  imagePosition.x,
                top:
                  imagePosition.y,
              }}
              resizeMode="contain"
            />
          ) : (
            <ActivityIndicator
              size="large"
              color={colors.primaryLight}
            />
          )}

          {/* ==================================================
              OVERLAY
          ================================================== */}

          <View
            pointerEvents="none"
            style={styles.cropOverlay}
          />

          {/* ==================================================
              CROP FRAME
          ================================================== */}

          <View
            pointerEvents="none"
            style={styles.cropBorder}
          >

            {/* TOP LEFT */}

            <View
              style={[
                styles.corner,
                styles.topLeft,
                { borderColor: colors.primaryLight },
              ]}
            />

            {/* TOP RIGHT */}

            <View
              style={[
                styles.corner,
                styles.topRight,
                { borderColor: colors.primaryLight },
              ]}
            />

            {/* BOTTOM LEFT */}

            <View
              style={[
                styles.corner,
                styles.bottomLeft,
                { borderColor: colors.primaryLight },
              ]}
            />

            {/* BOTTOM RIGHT */}

            <View
              style={[
                styles.corner,
                styles.bottomRight,
                { borderColor: colors.primaryLight },
              ]}
            />
          </View>
        </View>
      </View>

      {/* ======================================================
          INSTRUCTIONS
      ====================================================== */}

      <View
        style={[
          styles.instructions,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.instructionIcon,
            { backgroundColor: colors.iconBackground },
          ]}
        >
          <Ionicons
            name="move-outline"
            size={21}
            color={colors.primaryLight}
          />
        </View>

        <View style={styles.instructionTextContainer}>
          <Text
            style={[
              styles.instructionTitle,
              { color: colors.text },
            ]}
          >
            Adjust your photo
          </Text>

          <Text
            style={[
              styles.instructionText,
              { color: colors.secondaryText },
            ]}
          >
            Drag the image to position your face
            inside the circle.
          </Text>
        </View>
      </View>

      {/* ======================================================
          BUTTONS
      ====================================================== */}

      <View style={styles.bottomArea}>

        {/* ==================================================
            CANCEL
        ================================================== */}

        <TouchableOpacity
          style={[
            styles.cancelButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={cancelCrop}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.cancelButtonText,
              { color: colors.secondaryText },
            ]}
          >
            CANCEL
          </Text>
        </TouchableOpacity>

        {/* ==================================================
            SAVE
        ================================================== */}

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            saving &&
              styles.saveButtonDisabled,
          ]}
          onPress={saveCrop}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text
                style={styles.saveButtonText}
              >
                SAVE
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  // ==========================================================
  // MAIN
  // ==========================================================

  container: {
    flex: 1,
  },

  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    paddingTop:
      Platform.OS === "ios"
        ? 54
        : 44,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  headerText: {
    flex: 1,
    marginRight: 10,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },

  closeButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // ==========================================================
  // CROP WRAPPER
  // ==========================================================

  cropWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // ==========================================================
  // CROP AREA
  // ==========================================================

  cropArea: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    backgroundColor: "#000000",
    overflow: "hidden",
    borderWidth: 1,
    borderRadius:
      CROP_SIZE / 2,
  },

  // ==========================================================
  // OVERLAY
  // ==========================================================

  cropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(0,0,0,0.06)",
    borderRadius:
      CROP_SIZE / 2,
  },

  // ==========================================================
  // CROP FRAME
  // ==========================================================

  cropBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius:
      CROP_SIZE / 2,
  },

  // ==========================================================
  // CORNERS
  // ==========================================================

  corner: {
    position: "absolute",
    width: 28,
    height: 28,
  },

  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 15,
  },

  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 15,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 15,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 15,
  },

  // ==========================================================
  // INSTRUCTIONS
  // ==========================================================

  instructions: {
    minHeight: 76,
    marginHorizontal: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 21,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  instructionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  instructionTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  instructionTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  instructionText: {
    fontSize: 9,
    fontWeight: "600",
    lineHeight: 13,
    marginTop: 3,
  },

  // ==========================================================
  // BOTTOM AREA
  // ==========================================================

  bottomArea: {
    paddingHorizontal: 18,
    paddingBottom: 35,
    flexDirection: "row",
    gap: 10,
  },

  // ==========================================================
  // CANCEL
  // ==========================================================

  cancelButton: {
    flex: 1,
    height: 54,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  // ==========================================================
  // SAVE
  // ==========================================================

  saveButton: {
    flex: 1.4,
    height: 54,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
});