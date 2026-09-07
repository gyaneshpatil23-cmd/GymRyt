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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

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
      <View style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#60A5FA"
        />

        <Text style={styles.loadingText}>
          Loading image...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // SCREEN
  // ==========================================================

  return (
    <View style={styles.container}>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={cancelCrop}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.closeIcon}>
            ×
          </Text>
        </TouchableOpacity>

        <View style={styles.headerText}>

          <Text style={styles.title}>
            CROP PROFILE PHOTO
          </Text>

          <Text style={styles.subtitle}>
            Position your photo inside the frame
          </Text>

        </View>

        <View style={styles.headerSpacer} />

      </View>

      {/* ======================================================
          CROP AREA
      ====================================================== */}

      <View style={styles.cropWrapper}>

        <View
          style={styles.cropArea}
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
              color="#60A5FA"
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
              ]}
            />

            {/* TOP RIGHT */}

            <View
              style={[
                styles.corner,
                styles.topRight,
              ]}
            />

            {/* BOTTOM LEFT */}

            <View
              style={[
                styles.corner,
                styles.bottomLeft,
              ]}
            />

            {/* BOTTOM RIGHT */}

            <View
              style={[
                styles.corner,
                styles.bottomRight,
              ]}
            />

          </View>

        </View>

      </View>

      {/* ======================================================
          INSTRUCTIONS
      ====================================================== */}

      <View style={styles.instructions}>

        <Text style={styles.instructionTitle}>
          Adjust your photo
        </Text>

        <Text style={styles.instructionText}>
          Drag the image to position your face
          inside the circle.
        </Text>

      </View>

      {/* ======================================================
          BUTTONS
      ====================================================== */}

      <View style={styles.bottomArea}>

        {/* ==================================================
            CANCEL
        ================================================== */}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={cancelCrop}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text
            style={styles.cancelButtonText}
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
            <Text
              style={styles.saveButtonText}
            >
              SAVE
            </Text>
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
    backgroundColor: "#050816",
  },

  loadingText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    height: 105,
    paddingTop: 52,
    paddingHorizontal: 20,

    flexDirection: "row",
    alignItems: "center",
  },

  closeButton: {
    width: 42,
    height: 42,

    borderRadius: 14,

    backgroundColor: "#0B1220",

    borderWidth: 1,
    borderColor: "#172554",

    alignItems: "center",
    justifyContent: "center",
  },

  closeIcon: {
    color: "#FFFFFF",

    fontSize: 30,
    fontWeight: "300",

    lineHeight: 32,

    marginTop: -2,
  },

  headerText: {
    flex: 1,
    marginLeft: 13,
  },

  title: {
    color: "#FFFFFF",

    fontSize: 16,
    fontWeight: "900",

    letterSpacing: 0.8,
  },

  subtitle: {
    color: "#64748B",

    fontSize: 10,
    fontWeight: "500",

    marginTop: 4,
  },

  headerSpacer: {
    width: 42,
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
  //
  // IMPORTANT:
  //
  // The old white border has been removed.
  // It was creating the unwanted white curved
  // strap at the top of the crop area.
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

    borderColor: "#60A5FA",
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
    paddingHorizontal: 25,

    alignItems: "center",

    marginBottom: 20,
  },

  instructionTitle: {
    color: "#FFFFFF",

    fontSize: 14,
    fontWeight: "800",
  },

  instructionText: {
    color: "#64748B",

    fontSize: 11,
    fontWeight: "500",

    textAlign: "center",

    marginTop: 6,

    lineHeight: 17,

    maxWidth: 300,
  },

  // ==========================================================
  // BOTTOM AREA
  // ==========================================================

  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 35,

    flexDirection: "row",

    gap: 12,
  },

  // ==========================================================
  // CANCEL
  // ==========================================================

  cancelButton: {
    flex: 1,

    height: 54,

    borderRadius: 14,

    backgroundColor: "#0B1220",

    borderWidth: 1,
    borderColor: "#172554",

    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#94A3B8",

    fontSize: 12,
    fontWeight: "800",

    letterSpacing: 0.7,
  },

  // ==========================================================
  // SAVE
  // ==========================================================

  saveButton: {
    flex: 1,

    height: 54,

    borderRadius: 14,

    backgroundColor: "#2563EB",

    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#FFFFFF",

    fontSize: 13,
    fontWeight: "900",

    letterSpacing: 1,
  },

});