import React, { useCallback, useEffect, useState } from "react";

import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from "react-native";

import {
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { router, useFocusEffect } from "expo-router";

import * as ImagePicker from "expo-image-picker";

import { File } from "expo-file-system"; 



// ============================================================
// API CONFIG
// ============================================================

const API_BASE_URL =
    "http://192.168.1.52:8000/api/members";

const BACKEND_BASE_URL =
    "http://192.168.1.52:8000";



// ============================================================
// TRAINER PROFILE
// ============================================================

export default function TrainerProfile() {

    const [trainer, setTrainer] = useState(null);

    const [loading, setLoading] = useState(true);

    const [uploadingPhoto, setUploadingPhoto] =
        useState(false);

    const [loggingOut, setLoggingOut] =
        useState(false);



    // ========================================================
    // LOAD PROFILE
    // ========================================================

    useFocusEffect(
        useCallback(() => {

            loadTrainerProfile();

        }, [])
    );



    // ========================================================
    // GET TOKEN
    // ========================================================

    const getToken = async () => {

        try {

            return await AsyncStorage.getItem(
                "adminToken"
            );

        } catch (error) {

            console.log(
                "Token error:",
                error
            );

            return null;
        }
    };



    // ========================================================
    // FULL IMAGE URL
    // ========================================================

    const getFullImageUrl = (image) => {

        if (!image) {
            return null;
        }

        if (
            image.startsWith("http://") ||
            image.startsWith("https://")
        ) {
            return image;
        }

        if (image.startsWith("/")) {
            return `${BACKEND_BASE_URL}${image}`;
        }

        return `${BACKEND_BASE_URL}/${image}`;
    };



    // ========================================================
    // LOAD PROFILE
    // ========================================================

    const loadTrainerProfile = async () => {

        try {

            setLoading(true);

            const token =
                await getToken();



            if (!token) {

                Alert.alert(
                    "Session Expired",
                    "Please login again.",
                    [
                        {
                            text: "OK",
                            onPress: () =>
                                router.replace("/"),
                        },
                    ]
                );

                return;
            }



            const response =
                await fetch(
                    `${API_BASE_URL}/trainer/profile/`,
                    {
                        method: "GET",

                        headers: {
                            Accept:
                                "application/json",

                            Authorization:
                                `Token ${token}`,
                        },
                    }
                );



            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";



            let data;



            if (
                contentType.includes(
                    "application/json"
                )
            ) {

                data =
                    await response.json();

            } else {

                const text =
                    await response.text();

                console.log(
                    "PROFILE SERVER RESPONSE:",
                    text
                );

                throw new Error(
                    `Server returned HTTP ${response.status}`
                );
            }



            console.log(
                "TRAINER PROFILE:",
                data
            );



            if (!response.ok) {

                throw new Error(
                    data?.detail ||
                    data?.message ||
                    data?.error ||
                    "Unable to load trainer profile."
                );
            }



            setTrainer(data.trainer || data);

        } catch (error) {

            console.log(
                "Trainer profile error:",
                error
            );

            Alert.alert(
                "Profile Error",
                error?.message ||
                "Unable to load trainer profile."
            );

        } finally {

            setLoading(false);
        }
    };



    // ========================================================
    // TRAINER NAME
    // ========================================================

    const getTrainerName = () => {

        if (!trainer) {
            return "Trainer";
        }

        return (
            trainer.name ||
            trainer.full_name ||
            trainer.username ||
            "Trainer"
        );
    };



    // ========================================================
    // INITIAL
    // ========================================================

    const getInitial = () => {

        return getTrainerName()
            .charAt(0)
            .toUpperCase();
    };



    // ========================================================
    // GYM NAME
    // ========================================================

    const getGymName = () => {

        if (!trainer) {
            return "Your Gym";
        }

        return (
            trainer.workspace_name ||
            trainer.gym_name ||
            trainer.workspace?.name ||
            "Your Gym"
        );
    };



    // ========================================================
    // PROFILE IMAGE
    // ========================================================

    const getProfileImage = () => {

        if (!trainer) {
            return null;
        }

        return getFullImageUrl(
            trainer.profile_picture ||
            trainer.profile_image ||
            trainer.image ||
            null
        );
    };



    // ========================================================
    // CHANGE PHOTO
    // ========================================================

    const handleChangePhoto = async () => {

        try {

            const permission =
                await ImagePicker.requestMediaLibraryPermissionsAsync();



            if (
                permission.status !==
                "granted"
            ) {

                Alert.alert(
                    "Permission Required",
                    "Please allow photo library access to change your profile picture."
                );

                return;
            }



            const result =
                await ImagePicker.launchImageLibraryAsync(
                    {
                        mediaTypes:
                            ["images"],

                        allowsEditing:
                            true,

                        aspect:
                            [1, 1],

                        quality:
                            0.85,
                    }
                );



            if (
                result.canceled ||
                !result.assets ||
                result.assets.length === 0
            ) {

                return;
            }



            await uploadProfilePhoto(
                result.assets[0]
            );

        } catch (error) {

            console.log(
                "Image picker error:",
                error
            );

            Alert.alert(
                "Photo Error",
                "Unable to select the image."
            );
        }
    };



    // ========================================================
    // UPLOAD PHOTO
    // ========================================================

    // ========================================================
// UPLOAD PROFILE PHOTO
// ========================================================

const uploadProfilePhoto = async (image) => {

    try {

        setUploadingPhoto(true);


        // ------------------------------------------------
        // GET TOKEN
        // ------------------------------------------------

        const token =
            await getToken();


        if (!token) {

            Alert.alert(
                "Session Expired",
                "Please login again."
            );

            return;
        }


        // ------------------------------------------------
        // CHECK IMAGE
        // ------------------------------------------------

        if (!image?.uri) {

            throw new Error(
                "Selected image could not be accessed."
            );
        }


        console.log(
            "IMAGE URI:",
            image.uri
        );


        // ------------------------------------------------
        // CREATE EXPO FILE
        //
        // This is the important fix.
        //
        // Instead of passing:
        // { uri, name, type }
        //
        // we create a real Expo File object.
        //
        // Expo File implements Blob and can be
        // appended to FormData.
        // ------------------------------------------------

        const file =
            new File(image.uri);


        console.log(
            "FILE URI:",
            file.uri
        );

        console.log(
            "FILE NAME:",
            file.name
        );

        console.log(
            "FILE TYPE:",
            file.type
        );


        // ------------------------------------------------
        // VERIFY FILE
        // ------------------------------------------------

        if (!file.exists) {

            throw new Error(
                "The selected image file could not be found."
            );
        }


        // ------------------------------------------------
        // CREATE FORMDATA
        // ------------------------------------------------

        const formData =
            new FormData();


        // ------------------------------------------------
        // APPEND REAL FILE OBJECT
        // ------------------------------------------------

        formData.append(
            "profile_picture",
            file
        );


        console.log(
            "Uploading profile picture..."
        );


        // ------------------------------------------------
        // SEND PATCH REQUEST
        // ------------------------------------------------
        //
        // IMPORTANT:
        // Do NOT manually set Content-Type.
        //
        // Fetch will generate:
        //
        // multipart/form-data;
        // boundary=...
        //
        // ------------------------------------------------

        const response =
            await fetch(
                `${API_BASE_URL}/trainer/profile/`,
                {
                    method: "PATCH",

                    headers: {
                        Accept:
                            "application/json",

                        Authorization:
                            `Token ${token}`,
                    },

                    body: formData,
                }
            );


        // ------------------------------------------------
        // READ RESPONSE
        // ------------------------------------------------

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        let data;


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            data =
                await response.json();

        } else {

            const text =
                await response.text();

            console.log(
                "PHOTO UPLOAD SERVER RESPONSE:",
                text
            );

            throw new Error(
                `Server returned HTTP ${response.status}`
            );
        }


        console.log(
            "PHOTO UPLOAD RESPONSE:",
            data
        );


        // ------------------------------------------------
        // HANDLE SERVER ERROR
        // ------------------------------------------------

        if (!response.ok) {

            throw new Error(
                data?.detail ||
                data?.message ||
                data?.error ||
                JSON.stringify(data) ||
                "Unable to upload profile picture."
            );
        }


        // ------------------------------------------------
        // IMPORTANT:
        //
        // Backend may return:
        //
        // {
        //   success: true,
        //   trainer: {...}
        // }
        //
        // OR:
        //
        // {
        //   id: 3,
        //   name: "Parth",
        //   ...
        // }
        //
        // Support both.
        // ------------------------------------------------

        const updatedTrainer =
            data?.trainer ||
            data;


        setTrainer(
            updatedTrainer
        );


        // ------------------------------------------------
        // SUCCESS
        // ------------------------------------------------

        Alert.alert(
            "Success",
            "Profile picture updated successfully."
        );


    } catch (error) {

        console.log(
            "Profile photo upload error:",
            error
        );


        Alert.alert(
            "Upload Failed",
            error?.message ||
            "Unable to upload profile picture."
        );


    } finally {

        setUploadingPhoto(false);
    }
};



    // ========================================================
    // LOGOUT
    // ========================================================

    const handleLogout = () => {

        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",

            [
                {
                    text: "Cancel",
                    style: "cancel",
                },

                {
                    text: "Logout",
                    style: "destructive",
                    onPress:
                        performLogout,
                },
            ]
        );
    };



    // ========================================================
    // PERFORM LOGOUT
    // ========================================================

    const performLogout =
        async () => {

            try {

                setLoggingOut(true);



                await AsyncStorage.multiRemove(
                    [
                        "adminToken",
                        "adminUsername",
                        "adminId",
                        "userRole",
                        "workspaceId",
                        "workspaceName",

                        "access_token",
                        "refresh_token",
                        "token",

                        "user",
                        "trainer",
                        "role",
                    ]
                );



                router.replace("/");

            } catch (error) {

                console.log(
                    "Logout error:",
                    error
                );

                Alert.alert(
                    "Logout Error",
                    "Unable to logout. Please try again."
                );

            } finally {

                setLoggingOut(false);
            }
        };



    // ========================================================
    // LOADING
    // ========================================================

    if (loading) {

        return (

            <View
                style={
                    styles.loadingContainer
                }
            >

                <ActivityIndicator
                    size="large"
                    color="#2F80FF"
                />

                <Text
                    style={
                        styles.loadingText
                    }
                >
                    Loading profile...
                </Text>

            </View>
        );
    }



    // ========================================================
    // MAIN
    // ========================================================

    return (

        <View
            style={
                styles.container
            }
        >

            {/* ==================================================
                HEADER
            ================================================== */}

            <View
                style={
                    styles.header
                }
            >

                <TouchableOpacity
                    style={
                        styles.backButton
                    }
                    onPress={() =>
                        router.back()
                    }
                    activeOpacity={0.8}
                >

                    <Ionicons
                        name="arrow-back"
                        size={25}
                        color="#FFFFFF"
                    />

                </TouchableOpacity>



                <Text
                    style={
                        styles.headerTitle
                    }
                >
                    My Profile
                </Text>

            </View>



            {/* ==================================================
                CONTENT
            ================================================== */}

            <ScrollView
                showsVerticalScrollIndicator={
                    false
                }
                contentContainerStyle={
                    styles.scrollContent
                }
            >

                {/* ==================================================
                    PROFILE CARD
                ================================================== */}

                <View
                    style={
                        styles.profileCard
                    }
                >

                    <View
                        style={
                            styles.avatarWrapper
                        }
                    >

                        {getProfileImage() ? (

                            <Image
                                source={{
                                    uri:
                                        getProfileImage(),
                                }}
                                style={
                                    styles.avatar
                                }
                            />

                        ) : (

                            <View
                                style={
                                    styles.avatarPlaceholder
                                }
                            >

                                <Text
                                    style={
                                        styles.avatarText
                                    }
                                >
                                    {getInitial()}
                                </Text>

                            </View>
                        )}



                        <TouchableOpacity
                            style={
                                styles.cameraButton
                            }
                            onPress={
                                handleChangePhoto
                            }
                            disabled={
                                uploadingPhoto
                            }
                            activeOpacity={0.8}
                        >

                            {uploadingPhoto ? (

                                <ActivityIndicator
                                    size="small"
                                    color="#FFFFFF"
                                />

                            ) : (

                                <Ionicons
                                    name="camera"
                                    size={17}
                                    color="#FFFFFF"
                                />

                            )}

                        </TouchableOpacity>

                    </View>



                    <Text
                        style={
                            styles.profileName
                        }
                    >
                        {getTrainerName()}
                    </Text>



                    <Text
                        style={
                            styles.profileRole
                        }
                    >
                        TRAINER
                    </Text>



                    <Text
                        style={
                            styles.profileGym
                        }
                    >
                        {getGymName()}
                    </Text>

                </View>



                {/* ==================================================
                    ACCOUNT INFORMATION
                ================================================== */}

                <SectionTitle
                    title="ACCOUNT INFORMATION"
                />



                <View
                    style={
                        styles.infoCard
                    }
                >

                    <InfoRow
                        icon="person"
                        iconType="ion"
                        label="Username"
                        value={
                            trainer?.username
                                ? `@${trainer.username}`
                                : "@trainer"
                        }
                    />



                    <Divider />



                    <InfoRow
                        icon="card"
                        iconType="ion"
                        label="Trainer ID"
                        value={
                            trainer?.id
                                ? String(
                                    trainer.id
                                )
                                : "—"
                        }
                    />



                    <Divider />



                    <InfoRow
                        icon="mail"
                        iconType="ion"
                        label="Email"
                        value={
                            trainer?.email ||
                            "Not provided"
                        }
                    />



                    <Divider />



                    <InfoRow
                        icon="call"
                        iconType="ion"
                        label="Phone"
                        value={
                            trainer?.phone ||
                            "Not provided"
                        }
                    />

                </View>



                {/* ==================================================
                    TRAINER INFORMATION
                ================================================== */}

                <SectionTitle
                    title="TRAINER INFORMATION"
                />



                <View
                    style={
                        styles.infoCard
                    }
                >

                    <InfoRow
                        icon="arm-flex"
                        iconType="material"
                        label="Specialization"
                        value={
                            trainer?.specialization ||
                            "Not specified"
                        }
                    />



                    <Divider />



                    <InfoRow
                        icon="trophy"
                        iconType="material"
                        label="Experience"
                        value={
                            trainer?.experience_years !==
                                undefined &&
                            trainer?.experience_years !==
                                null
                                ? `${trainer.experience_years} ${
                                    trainer.experience_years ===
                                    1
                                        ? "Year"
                                        : "Years"
                                }`
                                : "0 Years"
                        }
                    />



                    <Divider />



                    <InfoRow
                        icon="office-building"
                        iconType="material"
                        label="Gym"
                        value={
                            getGymName()
                        }
                    />

                </View>



                {/* ==================================================
                    ABOUT ME
                ================================================== */}

                <SectionTitle
                    title="ABOUT ME"
                />



                <View
                    style={
                        styles.aboutCard
                    }
                >

                    <Text
                        style={
                            styles.aboutText
                        }
                    >
                        {trainer?.bio ||
                            "No trainer bio added yet."}
                    </Text>

                </View>



                {/* ==================================================
                    LOGOUT
                ================================================== */}

                <TouchableOpacity
                    style={
                        styles.logoutButton
                    }
                    onPress={
                        handleLogout
                    }
                    disabled={
                        loggingOut
                    }
                    activeOpacity={0.8}
                >

                    {loggingOut ? (

                        <ActivityIndicator
                            size="small"
                            color="#FF4D5E"
                        />

                    ) : (

                        <Ionicons
                            name="log-out-outline"
                            size={21}
                            color="#FF4D5E"
                        />

                    )}



                    <Text
                        style={
                            styles.logoutText
                        }
                    >
                        {loggingOut
                            ? "Logging out..."
                            : "Logout"}
                    </Text>

                </TouchableOpacity>



                <View
                    style={{
                        height: 110,
                    }}
                />

            </ScrollView>



            {/* ==================================================
                TRAINER BOTTOM NAVIGATION
            ================================================== */}

            <TrainerBottomNav
                active="profile"
            />

        </View>
    );
}



// ============================================================
// SECTION TITLE
// ============================================================

function SectionTitle({
    title,
}) {

    return (

        <Text
            style={
                styles.sectionTitle
            }
        >
            {title}
        </Text>

    );
}



// ============================================================
// DIVIDER
// ============================================================

function Divider() {

    return (

        <View
            style={
                styles.divider
            }
        />

    );
}



// ============================================================
// INFO ROW
// ============================================================

function InfoRow({
    icon,
    iconType,
    label,
    value,
}) {

    return (

        <View
            style={
                styles.infoRow
            }
        >

            <View
                style={
                    styles.infoIcon
                }
            >

                {iconType ===
                "material" ? (

                    <MaterialCommunityIcons
                        name={icon}
                        size={21}
                        color="#2F80FF"
                    />

                ) : (

                    <Ionicons
                        name={icon}
                        size={21}
                        color="#2F80FF"
                    />

                )}

            </View>



            <View
                style={
                    styles.infoTextContainer
                }
            >

                <Text
                    style={
                        styles.infoLabel
                    }
                >
                    {label}
                </Text>



                <Text
                    style={
                        styles.infoValue
                    }
                    numberOfLines={1}
                >
                    {value}
                </Text>

            </View>

        </View>
    );
}



// ============================================================
// TRAINER BOTTOM NAVIGATION
// ============================================================

function TrainerBottomNav({
    active,
}) {

    const goTo = (screen) => {

        if (screen === active) {
            return;
        }



        if (screen === "home") {

            router.replace(
                "/trainer/dashboard"
            );

        } else if (
            screen === "members"
        ) {

            router.replace(
                "/trainer/members"
            );

        } else if (
            screen === "workouts"
        ) {

            router.replace(
                "/trainer/workout"
            );

        } else if (
            screen === "profile"
        ) {

            router.replace(
                "/trainer/profile"
            );
        }
    };



    return (

        <View
            style={
                styles.bottomNav
            }
        >

            <NavItem
                icon="home"
                label="Home"
                active={
                    active === "home"
                }
                onPress={() =>
                    goTo("home")
                }
            />



            <NavItem
                icon="people"
                label="Members"
                active={
                    active === "members"
                }
                onPress={() =>
                    goTo("members")
                }
            />



            <NavItem
                icon="barbell-outline"
                label="Workouts"
                active={
                    active === "workouts"
                }
                onPress={() =>
                    goTo("workouts")
                }
            />



            <NavItem
                icon="person-outline"
                label="Profile"
                active={
                    active === "profile"
                }
                onPress={() =>
                    goTo("profile")
                }
            />

        </View>
    );
}



// ============================================================
// NAV ITEM
// ============================================================

function NavItem({
    icon,
    label,
    active,
    onPress,
}) {

    return (

        <TouchableOpacity
            style={
                styles.navItem
            }
            onPress={onPress}
            activeOpacity={0.8}
        >

            <View
                style={[
                    styles.navIconBox,
                    active &&
                    styles.navIconBoxActive,
                ]}
            >

                <Ionicons
                    name={icon}
                    size={27}
                    color={
                        active
                            ? "#4DA3FF"
                            : "#AAB6C8"
                    }
                />

            </View>



            <Text
                style={[
                    styles.navLabel,
                    active &&
                    styles.navLabelActive,
                ]}
            >
                {label}
            </Text>



            {active && (

                <View
                    style={
                        styles.navIndicator
                    }
                />

            )}

        </TouchableOpacity>
    );
}



// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#020617",
    },



    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 30,
    },



    // ========================================================
    // HEADER
    // ========================================================

    header: {
        height: 94,
        paddingHorizontal: 24,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#102044",
    },



    backButton: {
        width: 54,
        height: 54,
        borderRadius: 17,
        backgroundColor: "#081525",
        borderWidth: 1,
        borderColor: "#15366A",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
    },



    headerTitle: {
        color: "#FFFFFF",
        fontSize: 23,
        fontWeight: "800",
    },



    // ========================================================
    // PROFILE CARD
    // ========================================================

    profileCard: {
        backgroundColor: "#071321",
        borderRadius: 27,
        borderWidth: 1,
        borderColor: "#123667",

        paddingTop: 25,
        paddingBottom: 25,
        paddingHorizontal: 20,

        alignItems: "center",

        minHeight: 330,
    },



    avatarWrapper: {
        position: "relative",
        marginBottom: 14,
    },



    avatar: {
        width: 108,
        height: 108,
        borderRadius: 54,
        resizeMode: "cover",
        backgroundColor: "#2563EB",
    },



    avatarPlaceholder: {
        width: 108,
        height: 108,
        borderRadius: 54,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
    },



    avatarText: {
        color: "#FFFFFF",
        fontSize: 38,
        fontWeight: "800",
    },



    cameraButton: {
        position: "absolute",
        right: -2,
        bottom: 1,

        width: 38,
        height: 38,

        borderRadius: 19,

        backgroundColor: "#1264E8",

        borderWidth: 3,
        borderColor: "#071321",

        alignItems: "center",
        justifyContent: "center",
    },



    profileName: {
        color: "#FFFFFF",
        fontSize: 28,
        fontWeight: "800",
        marginTop: 2,
        textAlign: "center",
    },



    profileRole: {
        color: "#4D9AFF",
        fontSize: 13,
        fontWeight: "900",
        letterSpacing: 3,
        marginTop: 7,
    },



    profileGym: {
        color: "#8793A8",
        fontSize: 16,
        fontWeight: "500",
        marginTop: 8,
        textAlign: "center",
    },



    // ========================================================
    // SECTION
    // ========================================================

    sectionTitle: {
        color: "#73849F",
        fontSize: 14,
        fontWeight: "800",
        letterSpacing: 2.2,
        marginTop: 27,
        marginBottom: 11,
    },



    infoCard: {
        backgroundColor: "#071321",
        borderRadius: 21,
        borderWidth: 1,
        borderColor: "#102D56",

        paddingHorizontal: 15,
        paddingVertical: 4,
    },



    infoRow: {
        minHeight: 72,
        flexDirection: "row",
        alignItems: "center",
    },



    infoIcon: {
        width: 45,
        height: 45,
        borderRadius: 14,

        backgroundColor: "#0A214D",

        alignItems: "center",
        justifyContent: "center",

        marginRight: 13,
    },



    infoTextContainer: {
        flex: 1,
        justifyContent: "center",
    },



    infoLabel: {
        color: "#728097",
        fontSize: 11,
        fontWeight: "500",
        marginBottom: 3,
    },



    infoValue: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
    },



    divider: {
        height: 1,
        backgroundColor: "#102344",
        marginLeft: 58,
    },



    // ========================================================
    // ABOUT
    // ========================================================

    aboutCard: {
        backgroundColor: "#071321",
        borderRadius: 21,
        borderWidth: 1,
        borderColor: "#102D56",

        minHeight: 78,

        paddingHorizontal: 18,
        paddingVertical: 18,

        justifyContent: "center",
    },



    aboutText: {
        color: "#A6B1C2",
        fontSize: 13,
        lineHeight: 20,
    },



    // ========================================================
    // LOGOUT
    // ========================================================

    logoutButton: {
        height: 58,

        marginTop: 20,

        borderRadius: 17,

        backgroundColor: "#100D15",

        borderWidth: 1,
        borderColor: "#55202B",

        flexDirection: "row",

        alignItems: "center",

        justifyContent: "center",
    },



    logoutText: {
        color: "#FF4D5E",
        fontSize: 14,
        fontWeight: "800",
        marginLeft: 9,
    },



    // ========================================================
    // BOTTOM NAV
    // ========================================================

    bottomNav: {
        position: "absolute",

        left: 0,
        right: 0,
        bottom: 0,

        height: 92,

        backgroundColor: "#061321",

        borderTopWidth: 1,
        borderTopColor: "#0F294C",

        flexDirection: "row",

        alignItems: "center",

        justifyContent: "space-around",

        paddingBottom: 7,

        elevation: 20,
    },



    navItem: {
        width: "25%",

        height: 82,

        alignItems: "center",

        justifyContent: "center",

        position: "relative",
    },



    navIconBox: {
        width: 58,
        height: 43,

        borderRadius: 15,

        alignItems: "center",
        justifyContent: "center",
    },



    navIconBoxActive: {
        backgroundColor: "#102F69",
    },



    navLabel: {
        color: "#A1ACBD",
        fontSize: 11,
        fontWeight: "700",
        marginTop: 2,
    },



    navLabelActive: {
        color: "#4DA3FF",
    },



    navIndicator: {
        position: "absolute",

        bottom: 0,

        width: 58,

        height: 4,

        borderRadius: 4,

        backgroundColor: "#4DA3FF",
    },



    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
        flex: 1,

        backgroundColor: "#020617",

        alignItems: "center",

        justifyContent: "center",
    },



    loadingText: {
        color: "#8793A8",

        fontSize: 14,

        marginTop: 12,
    },

});