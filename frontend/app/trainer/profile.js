import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";


// ============================================================
// API CONFIG
// ============================================================

// Change this ONLY if your backend URL is different.
const API_BASE_URL = "http://192.168.1.49:8000/api";

const { width } = Dimensions.get("window");


// ============================================================
// TRAINER PROFILE SCREEN
// ============================================================

export default function TrainerProfile() {

    const [trainer, setTrainer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);


    // ========================================================
    // LOAD PROFILE
    // ========================================================

    useEffect(() => {
        loadTrainerProfile();
    }, []);


    // ========================================================
    // GET AUTH TOKEN
    // ========================================================

    const getToken = async () => {
        try {
            const token =
                await AsyncStorage.getItem("access_token");

            return token;
        } catch (error) {
            console.log("Token error:", error);
            return null;
        }
    };


    // ========================================================
    // LOAD TRAINER PROFILE
    // ========================================================

    const loadTrainerProfile = async () => {

        try {

            setLoading(true);

            const token = await getToken();

            const headers = {
                "Content-Type": "application/json",
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(
                `${API_BASE_URL}/trainer/profile/`,
                {
                    method: "GET",
                    headers,
                }
            );

            const data = await response.json();

            console.log("TRAINER PROFILE:", data);

            if (!response.ok) {

                throw new Error(
                    data?.detail ||
                    data?.message ||
                    "Unable to load trainer profile."
                );
            }

            setTrainer(data);

        } catch (error) {

            console.log(
                "Trainer profile error:",
                error
            );

            Alert.alert(
                "Error",
                "Unable to load trainer profile."
            );

        } finally {

            setLoading(false);
        }
    };


    // ========================================================
    // GET TRAINER NAME
    // ========================================================

    const getTrainerName = () => {

        if (!trainer) {
            return "Trainer";
        }

        if (trainer.name) {
            return trainer.name;
        }

        if (trainer.full_name) {
            return trainer.full_name;
        }

        if (trainer.username) {
            return trainer.username;
        }

        return "Trainer";
    };


    // ========================================================
    // GET FIRST LETTER
    // ========================================================

    const getInitial = () => {

        const name = getTrainerName();

        return name
            .charAt(0)
            .toUpperCase();
    };


    // ========================================================
    // GET WORKSPACE / GYM NAME
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
    // GET PROFILE IMAGE
    // ========================================================

    const getProfileImage = () => {

        if (!trainer) {
            return null;
        }

        return (
            trainer.profile_picture ||
            trainer.profile_image ||
            trainer.image ||
            null
        );
    };


    // ========================================================
    // DESIGN WORKOUT
    // ========================================================

    const handleDesignWorkout = () => {

        router.push("/trainer/workout");
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
                    onPress: performLogout,
                },
            ]
        );
    };


    // ========================================================
    // PERFORM LOGOUT
    // ========================================================

    const performLogout = async () => {

        try {

            setLoggingOut(true);

            // ------------------------------------------------
            // Clear locally stored authentication information
            // ------------------------------------------------

            await AsyncStorage.multiRemove([
                "access_token",
                "refresh_token",
                "token",
                "user",
                "trainer",
                "role",
            ]);


            // ------------------------------------------------
            // Navigate to login
            // ------------------------------------------------

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
            <View style={styles.loadingContainer}>

                <ActivityIndicator
                    size="large"
                    color="#2F80FF"
                />

                <Text style={styles.loadingText}>
                    Loading profile...
                </Text>

            </View>
        );
    }


    // ========================================================
    // MAIN UI
    // ========================================================

    return (

        <View style={styles.container}>

            {/* ==================================================
                HEADER
            ================================================== */}

            <View style={styles.header}>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.8}
                >

                    <Ionicons
                        name="arrow-back"
                        size={22}
                        color="#FFFFFF"
                    />

                </TouchableOpacity>


                <Text style={styles.headerTitle}>
                    My Profile
                </Text>

            </View>


            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >


                {/* ==================================================
                    PROFILE CARD
                ================================================== */}

                <View style={styles.profileCard}>

                    {/* PROFILE IMAGE */}

                    <View style={styles.avatarWrapper}>

                        {getProfileImage() ? (

                            <Image
                                source={{
                                    uri: getProfileImage(),
                                }}
                                style={styles.avatar}
                            />

                        ) : (

                            <View style={styles.avatarPlaceholder}>

                                <Text style={styles.avatarText}>
                                    {getInitial()}
                                </Text>

                            </View>

                        )}


                        {/* CAMERA BUTTON */}

                        <TouchableOpacity
                            style={styles.cameraButton}
                            activeOpacity={0.8}
                        >

                            <Ionicons
                                name="camera"
                                size={16}
                                color="#FFFFFF"
                            />

                        </TouchableOpacity>

                    </View>


                    {/* NAME */}

                    <Text style={styles.profileName}>
                        {getTrainerName()}
                    </Text>


                    {/* ROLE */}

                    <Text style={styles.profileRole}>
                        TRAINER
                    </Text>


                    {/* GYM */}

                    <Text style={styles.profileGym}>
                        {getGymName()}
                    </Text>

                </View>


                {/* ==================================================
                    ACCOUNT INFORMATION
                ================================================== */}

                <SectionTitle title="ACCOUNT INFORMATION" />

                <View style={styles.infoCard}>

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
                                ? String(trainer.id)
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
                        icon="phone"
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

                <SectionTitle title="TRAINER INFORMATION" />

                <View style={styles.infoCard}>

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
                            trainer?.experience_years !== null
                                ? `${trainer.experience_years} ${
                                    trainer.experience_years === 1
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
                        value={getGymName()}
                    />

                </View>


                {/* ==================================================
                    ABOUT ME
                ================================================== */}

                <SectionTitle title="ABOUT ME" />

                <View style={styles.aboutCard}>

                    <Text style={styles.aboutText}>

                        {trainer?.bio
                            ? trainer.bio
                            : "No trainer bio added yet."}

                    </Text>

                </View>


                {/* ==================================================
                    DESIGN WORKOUT BUTTON
                ================================================== */}

                <TouchableOpacity
                    style={styles.workoutButton}
                    onPress={handleDesignWorkout}
                    activeOpacity={0.85}
                >

                    <View style={styles.workoutIconContainer}>

                        <Text style={styles.workoutEmoji}>
                            💪
                        </Text>

                    </View>


                    <View style={styles.workoutTextContainer}>

                        <Text style={styles.workoutTitle}>
                            Design Workout
                        </Text>

                        <Text style={styles.workoutSubtitle}>
                            Create and assign workouts
                        </Text>

                        <Text style={styles.workoutSubtitle}>
                            to your members
                        </Text>

                    </View>


                    <View style={styles.workoutArrow}>

                        <Ionicons
                            name="arrow-forward"
                            size={21}
                            color="#FFFFFF"
                        />

                    </View>

                </TouchableOpacity>


                {/* ==================================================
                    LOGOUT BUTTON
                ================================================== */}

                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    disabled={loggingOut}
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


                    <Text style={styles.logoutText}>
                        {loggingOut
                            ? "Logging out..."
                            : "Logout"}
                    </Text>

                </TouchableOpacity>


                {/* BOTTOM SPACE */}

                <View style={{ height: 35 }} />

            </ScrollView>

        </View>
    );
}


// ============================================================
// SECTION TITLE
// ============================================================

function SectionTitle({ title }) {

    return (

        <Text style={styles.sectionTitle}>
            {title}
        </Text>

    );
}


// ============================================================
// DIVIDER
// ============================================================

function Divider() {

    return (
        <View style={styles.divider} />
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

        <View style={styles.infoRow}>

            {/* ICON */}

            <View style={styles.infoIcon}>

                {iconType === "material" ? (

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


            {/* TEXT */}

            <View style={styles.infoTextContainer}>

                <Text style={styles.infoLabel}>
                    {label}
                </Text>

                <Text
                    style={styles.infoValue}
                    numberOfLines={1}
                >
                    {value}
                </Text>

            </View>

        </View>
    );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

    // ========================================================
    // MAIN
    // ========================================================

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

        // IMPORTANT:
        // Reduced height compared to your screenshot.
        minHeight: 330,
    },


    // ========================================================
    // AVATAR
    // ========================================================

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


    // ========================================================
    // PROFILE TEXT
    // ========================================================

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
    // SECTION TITLE
    // ========================================================

    sectionTitle: {
        color: "#73849F",
        fontSize: 14,
        fontWeight: "800",
        letterSpacing: 2.2,
        marginTop: 27,
        marginBottom: 11,
    },


    // ========================================================
    // INFORMATION CARD
    // ========================================================

    infoCard: {
        backgroundColor: "#071321",
        borderRadius: 21,
        borderWidth: 1,
        borderColor: "#102D56",

        paddingHorizontal: 15,
        paddingVertical: 4,
    },


    // ========================================================
    // INFO ROW
    // ========================================================

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
    // DESIGN WORKOUT
    // ========================================================

    workoutButton: {
        minHeight: 78,

        backgroundColor: "#2563EB",

        borderRadius: 19,

        marginTop: 20,

        paddingHorizontal: 14,

        flexDirection: "row",
        alignItems: "center",

        elevation: 5,
        shadowColor: "#2563EB",
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 4,
        },
    },


    workoutIconContainer: {
        width: 48,
        height: 48,

        borderRadius: 15,

        backgroundColor: "rgba(255,255,255,0.12)",

        alignItems: "center",
        justifyContent: "center",

        marginRight: 12,
    },


    workoutEmoji: {
        fontSize: 27,
    },


    workoutTextContainer: {
        flex: 1,
    },


    workoutTitle: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "800",
        marginBottom: 3,
    },


    workoutSubtitle: {
        color: "#D6E3FF",
        fontSize: 10,
        lineHeight: 14,
    },


    workoutArrow: {
        width: 36,
        height: 36,

        alignItems: "center",
        justifyContent: "center",
    },


    // ========================================================
    // LOGOUT
    // ========================================================

    logoutButton: {
        height: 58,

        marginTop: 13,

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