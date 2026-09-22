import React, {
    useCallback,
    useState,
} from "react";

import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
    RefreshControl,
} from "react-native";

import {
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    router,
    useFocusEffect,
} from "expo-router";

import { useTheme } from "../../context/ThemeContext";


// ============================================================
// API CONFIG
// ============================================================

const API_BASE_URL =
    "http://192.168.1.52:8000/api/members";


// ============================================================
// WORKOUT SCREEN
// ============================================================

export default function TrainerWorkout() {

    const {
        colors,
        isDark,
        toggleTheme,
    } = useTheme();

    // --------------------------------------------------------
    // THEME COLORS
    // --------------------------------------------------------

    const theme = {
        background:
            colors?.background ||
            (isDark ? "#020617" : "#F5F7FB"),

        card:
            colors?.card ||
            (isDark ? "#071321" : "#FFFFFF"),

        cardSecondary:
            colors?.surface ||
            colors?.cardSecondary ||
            (isDark ? "#0A1728" : "#F8FAFC"),

        text:
            colors?.text ||
            (isDark ? "#FFFFFF" : "#172033"),

        muted:
            colors?.mutedText ||
            (isDark ? "#91A0B6" : "#6B7280"),

        border:
            colors?.border ||
            (isDark ? "#102D56" : "#E3E8F0"),

        primary:
            colors?.primary ||
            "#2563EB",

        primaryLight:
            colors?.primaryLight ||
            "#4DA3FF",

        iconBackground:
            colors?.iconBackground ||
            (isDark ? "#102F69" : "#EAF2FF"),

        input:
            isDark ? "#020A16" : "#F8FAFC",

        nav:
            isDark ? "#061321" : "#FFFFFF",

        divider:
            isDark ? "#102344" : "#E8EDF4",

        danger:
            "#FF4D5E",
    };


    // ========================================================
    // STATE
    // ========================================================

    const [workouts, setWorkouts] =
        useState([]);

    const [members, setMembers] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [showCreateModal, setShowCreateModal] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [selectedWorkout, setSelectedWorkout] =
        useState(null);


    // ========================================================
    // FORM
    // ========================================================

    const [title, setTitle] =
        useState("");

    const [description, setDescription] =
        useState("");

    const [duration, setDuration] =
        useState("");

    const [sets, setSets] =
        useState("");

    const [reps, setReps] =
        useState("");

    const [selectedMemberIds, setSelectedMemberIds] =
        useState([]);


    // ========================================================
    // LOAD WHEN SCREEN IS FOCUSED
    // ========================================================

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );


    // ========================================================
    // TOKEN
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
    // SAFE JSON RESPONSE
    // ========================================================

    const parseResponse = async (
        response
    ) => {

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            return await response.json();
        }


        const text =
            await response.text();


        console.log(
            "SERVER RESPONSE:",
            text
        );


        if (!text) {
            return {};
        }


        throw new Error(
            `Server returned HTTP ${response.status}`
        );
    };


    // ========================================================
    // NORMALIZE LIST
    // ========================================================

    const normalizeList = (
        data
    ) => {

        if (
            Array.isArray(data)
        ) {
            return data;
        }


        if (
            Array.isArray(
                data?.results
            )
        ) {
            return data.results;
        }


        if (
            Array.isArray(
                data?.workouts
            )
        ) {
            return data.workouts;
        }


        if (
            Array.isArray(
                data?.members
            )
        ) {
            return data.members;
        }


        return [];
    };


    // ========================================================
    // LOAD DATA
    // ========================================================

    const loadData = async () => {

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


            // ------------------------------------------------
            // LOAD WORKOUTS
            // ------------------------------------------------

            const workoutResponse =
                await fetch(
                    `${API_BASE_URL}/trainer/workouts/`,
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


            const workoutData =
                await parseResponse(
                    workoutResponse
                );


            if (
                !workoutResponse.ok
            ) {

                throw new Error(
                    workoutData?.detail ||
                    workoutData?.message ||
                    "Unable to load workouts."
                );
            }


            setWorkouts(
                normalizeList(
                    workoutData
                )
            );


            // ------------------------------------------------
            // LOAD ASSIGNED MEMBERS
            // ------------------------------------------------

            const memberResponse =
                await fetch(
                    `${API_BASE_URL}/`,
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


            const memberData =
                await parseResponse(
                    memberResponse
                );


            if (
                memberResponse.ok
            ) {

                const memberList =
                    normalizeList(
                        memberData
                    );


                // Only members assigned to this trainer
                const assigned =
                    memberList.filter(
                        (member) => {

                            const trainerUsername =
                                member.trainer_username;

                            const trainerId =
                                member.trainer_id;

                            return (
                                member.trainer ||
                                trainerUsername ||
                                trainerId
                            );
                        }
                    );


                setMembers(
                    assigned
                );
            }

        } catch (error) {

            console.log(
                "Workout load error:",
                error
            );

            Alert.alert(
                "Workouts Error",
                error?.message ||
                "Unable to load workouts."
            );

        } finally {

            setLoading(false);
            setRefreshing(false);
        }
    };


    // ========================================================
    // REFRESH
    // ========================================================

    const handleRefresh = () => {

        setRefreshing(true);

        loadData();
    };


    // ========================================================
    // OPEN CREATE WORKOUT
    // ========================================================

    const openCreateWorkout = () => {

        setTitle("");

        setDescription("");

        setDuration("");

        setSets("");

        setReps("");

        setSelectedMemberIds([]);

        setSelectedWorkout(null);

        setShowCreateModal(true);
    };


    // ========================================================
    // TOGGLE MEMBER
    // ========================================================

    const toggleMember = (
        memberId
    ) => {

        setSelectedMemberIds(
            (previous) => {

                if (
                    previous.includes(
                        memberId
                    )
                ) {

                    return previous.filter(
                        (id) =>
                            id !== memberId
                    );
                }


                return [
                    ...previous,
                    memberId,
                ];
            }
        );
    };


    // ========================================================
    // CREATE WORKOUT
    // ========================================================

    const createWorkout = async () => {

        if (!title.trim()) {

            Alert.alert(
                "Workout Name Required",
                "Please enter a workout name."
            );

            return;
        }


        if (
            selectedMemberIds.length === 0
        ) {

            Alert.alert(
                "Select Members",
                "Please select at least one assigned member."
            );

            return;
        }


        try {

            setSaving(true);


            const token =
                await getToken();


            if (!token) {

                Alert.alert(
                    "Session Expired",
                    "Please login again."
                );

                return;
            }


            const selectedIds =
                selectedMemberIds
                    .map(
                        (id) =>
                            Number(id)
                    )
                    .filter(
                        (id) =>
                            Number.isFinite(id)
                    );


            if (
                selectedIds.length === 0
            ) {

                Alert.alert(
                    "Invalid Member",
                    "Please select a valid member."
                );

                return;
            }


            console.log(
                "SELECTED MEMBER IDS:",
                selectedIds
            );


            // ------------------------------------------------
            // COMMON WORKOUT DATA
            // ------------------------------------------------

            const basePayload = {

                title:
                    title.trim(),

                name:
                    title.trim(),

                description:
                    description.trim(),

                duration:
                    duration
                        ? Number(
                            duration
                        )
                        : null,

                sets:
                    sets
                        ? Number(
                            sets
                        )
                        : null,

                // Keep reps as TEXT.
                reps:
                    reps
                        ? reps.trim()
                        : null,
            };


            console.log(
                "CREATE WORKOUT BASE DATA:",
                basePayload
            );


            // ------------------------------------------------
            // CREATE WORKOUT FOR EACH MEMBER
            // ------------------------------------------------

            const results = [];


            for (
                const memberId
                of selectedIds
            ) {

                const payload = {

                    ...basePayload,

                    // Backend expects "member"
                    // because WorkoutPlan has
                    // a single member ForeignKey.
                    member:
                        memberId,
                };


                console.log(
                    "CREATE WORKOUT:",
                    payload
                );


                const response =
                    await fetch(
                        `${API_BASE_URL}/trainer/workouts/`,
                        {
                            method: "POST",

                            headers: {

                                Accept:
                                    "application/json",

                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    `Token ${token}`,
                            },

                            body:
                                JSON.stringify(
                                    payload
                                ),
                        }
                    );


                const data =
                    await parseResponse(
                        response
                    );


                console.log(
                    "CREATE WORKOUT RESPONSE:",
                    data
                );


                if (!response.ok) {

                    throw new Error(
                        data?.detail ||
                        data?.message ||
                        data?.error ||
                        JSON.stringify(data) ||
                        `Unable to create workout for member ${memberId}.`
                    );
                }


                results.push(
                    data
                );
            }


            console.log(
                "ALL WORKOUTS CREATED:",
                results
            );


            setShowCreateModal(
                false
            );


            // ------------------------------------------------
            // CLEAR FORM
            // ------------------------------------------------

            setTitle("");

            setDescription("");

            setDuration("");

            setSets("");

            setReps("");

            setSelectedMemberIds([]);

            setSelectedWorkout(null);


            // ------------------------------------------------
            // RELOAD
            // ------------------------------------------------

            await loadData();


            Alert.alert(
                "Workout Created",

                selectedIds.length === 1
                    ? "Workout has been created and assigned successfully."
                    : `Workout has been created and assigned to ${selectedIds.length} members.`
            );


        } catch (error) {

            console.log(
                "Create workout error:",
                error
            );

            Alert.alert(
                "Create Workout Failed",
                error?.message ||
                "Unable to create workout."
            );

        } finally {

            setSaving(false);
        }
    };


    // ========================================================
    // DELETE WORKOUT
    // ========================================================

    const deleteWorkout = (
        workout
    ) => {

        Alert.alert(
            "Delete Workout",

            `Delete "${getWorkoutName(workout)}"?`,

            [
                {
                    text: "Cancel",
                    style: "cancel",
                },

                {
                    text: "Delete",
                    style: "destructive",

                    onPress: () =>
                        confirmDeleteWorkout(
                            workout
                        ),
                },
            ]
        );
    };


    // ========================================================
    // CONFIRM DELETE
    // ========================================================

    const confirmDeleteWorkout =
        async (workout) => {

            try {

                const token =
                    await getToken();


                if (!token) {

                    Alert.alert(
                        "Session Expired",
                        "Please login again."
                    );

                    return;
                }


                const response =
                    await fetch(
                        `${API_BASE_URL}/trainer/workouts/${workout.id}/`,
                        {
                            method: "DELETE",

                            headers: {
                                Accept:
                                    "application/json",

                                Authorization:
                                    `Token ${token}`,
                            },
                        }
                    );


                if (
                    response.status !== 204
                ) {

                    const data =
                        await parseResponse(
                            response
                        );


                    if (
                        !response.ok
                    ) {

                        throw new Error(
                            data?.detail ||
                            data?.message ||
                            "Unable to delete workout."
                        );
                    }
                }


                setWorkouts(
                    (previous) =>
                        previous.filter(
                            (item) =>
                                item.id !==
                                workout.id
                        )
                );

            } catch (error) {

                console.log(
                    "Delete workout error:",
                    error
                );

                Alert.alert(
                    "Delete Failed",
                    error?.message ||
                    "Unable to delete workout."
                );
            }
        };


    // ========================================================
    // WORKOUT NAME
    // ========================================================

    const getWorkoutName = (
        workout
    ) => {

        return (
            workout?.title ||
            workout?.name ||
            workout?.workout_name ||
            "Workout"
        );
    };


    // ========================================================
    // WORKOUT DESCRIPTION
    // ========================================================

    const getWorkoutDescription = (
        workout
    ) => {

        return (
            workout?.description ||
            workout?.details ||
            "Personalized workout plan"
        );
    };


    // ========================================================
    // MEMBER COUNT
    // ========================================================

    const getWorkoutMemberCount = (
        workout
    ) => {

        if (
            Array.isArray(
                workout?.members
            )
        ) {

            return workout.members.length;
        }


        if (
            Array.isArray(
                workout?.member_ids
            )
        ) {

            return workout.member_ids.length;
        }


        if (
            workout?.assigned_members_count !==
            undefined
        ) {

            return workout.assigned_members_count;
        }


        if (
            workout?.member
        ) {

            return 1;
        }


        return 0;
    };


    // ========================================================
    // WORKOUT ICON
    // ========================================================

    const getWorkoutIcon = (
        index
    ) => {

        const icons = [
            "arm-flex",
            "run-fast",
            "dumbbell",
            "weight-lifter",
        ];

        return icons[
            index %
            icons.length
        ];
    };


    // ========================================================
    // LOADING
    // ========================================================

    if (loading) {

        return (

            <View
                style={[
                    styles.loadingContainer,
                    {
                        backgroundColor:
                            theme.background,
                    },
                ]}
            >

                <ActivityIndicator
                    size="large"
                    color={
                        theme.primaryLight
                    }
                />

                <Text
                    style={[
                        styles.loadingText,
                        {
                            color:
                                theme.muted,
                        },
                    ]}
                >
                    Loading workouts...
                </Text>

            </View>
        );
    }


    // ========================================================
    // MAIN UI
    // ========================================================

    return (

        <View
            style={[
                styles.container,
                {
                    backgroundColor:
                        theme.background,
                },
            ]}
        >

            {/* ==================================================
                HEADER
            ================================================== */}

            <View
                style={[
                    styles.header,
                    {
                        borderBottomColor:
                            theme.border,
                    },
                ]}
            >

                <View
                    style={
                        styles.headerTextContainer
                    }
                >

                    <Text
                        style={[
                            styles.headerEyebrow,
                            {
                                color:
                                    theme.primaryLight,
                            },
                        ]}
                    >
                        GYMRYT • TRAINER
                    </Text>

                    <Text
                        style={[
                            styles.headerTitle,
                            {
                                color:
                                    theme.text,
                            },
                        ]}
                    >
                        Workouts
                    </Text>

                </View>


                <View
                    style={
                        styles.headerActions
                    }
                >

                    {/* Theme */}

                    <TouchableOpacity
                        style={[
                            styles.headerButton,
                            {
                                backgroundColor:
                                    theme.card,
                                borderColor:
                                    theme.border,
                            },
                        ]}
                        onPress={
                            toggleTheme
                        }
                        activeOpacity={0.85}
                    >

                        <Ionicons
                            name={
                                isDark
                                    ? "sunny-outline"
                                    : "moon-outline"
                            }
                            size={20}
                            color={
                                theme.primaryLight
                            }
                        />

                    </TouchableOpacity>


                    {/* Add */}

                    <TouchableOpacity
                        style={[
                            styles.addButton,
                            {
                                backgroundColor:
                                    theme.primary,
                            },
                        ]}
                        onPress={
                            openCreateWorkout
                        }
                        activeOpacity={0.85}
                    >

                        <Ionicons
                            name="add"
                            size={25}
                            color="#FFFFFF"
                        />

                    </TouchableOpacity>

                </View>

            </View>


            {/* ==================================================
                CONTENT
            ================================================== */}

            <ScrollView
                showsVerticalScrollIndicator={
                    false
                }

                refreshControl={
                    <RefreshControl
                        refreshing={
                            refreshing
                        }
                        onRefresh={
                            handleRefresh
                        }
                        tintColor={
                            theme.primary
                        }
                    />
                }

                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingBottom: 120,
                    },
                ]}
            >

                {/* ==================================================
                    CREATE WORKOUT CARD
                ================================================== */}

                <TouchableOpacity
                    style={[
                        styles.createCard,
                        {
                            backgroundColor:
                                theme.card,
                            borderColor:
                                theme.border,
                        },
                    ]}
                    onPress={
                        openCreateWorkout
                    }
                    activeOpacity={0.85}
                >

                    <View
                        style={[
                            styles.createIcon,
                            {
                                backgroundColor:
                                    theme.iconBackground,
                            },
                        ]}
                    >

                        <Ionicons
                            name="barbell-outline"
                            size={26}
                            color={
                                theme.primaryLight
                            }
                        />

                    </View>


                    <View
                        style={
                            styles.createText
                        }
                    >

                        <Text
                            style={[
                                styles.createTitle,
                                {
                                    color:
                                        theme.text,
                                },
                            ]}
                        >
                            Create Workout
                        </Text>

                        <Text
                            style={[
                                styles.createSubtitle,
                                {
                                    color:
                                        theme.muted,
                                },
                            ]}
                        >
                            Design a personalized workout
                            plan for your members.
                        </Text>

                    </View>


                    <View
                        style={[
                            styles.chevronBox,
                            {
                                backgroundColor:
                                    theme.iconBackground,
                            },
                        ]}
                    >

                        <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={
                                theme.primaryLight
                            }
                        />

                    </View>

                </TouchableOpacity>


                {/* ==================================================
                    MY WORKOUTS
                ================================================== */}

                <View
                    style={
                        styles.sectionHeader
                    }
                >

                    <View>

                        <Text
                            style={[
                                styles.sectionEyebrow,
                                {
                                    color:
                                        theme.primaryLight,
                                },
                            ]}
                        >
                            TRAINING
                        </Text>

                        <Text
                            style={[
                                styles.sectionTitle,
                                {
                                    color:
                                        theme.text,
                                },
                            ]}
                        >
                            My Workouts
                        </Text>

                    </View>


                    <View
                        style={[
                            styles.countPill,
                            {
                                backgroundColor:
                                    theme.iconBackground,
                                borderColor:
                                    theme.border,
                            },
                        ]}
                    >

                        <Text
                            style={[
                                styles.sectionCount,
                                {
                                    color:
                                        theme.primaryLight,
                                },
                            ]}
                        >
                            {workouts.length}
                        </Text>

                    </View>

                </View>


                {/* ==================================================
                    EMPTY WORKOUTS
                ================================================== */}

                {workouts.length === 0 ? (

                    <View
                        style={[
                            styles.emptyCard,
                            {
                                backgroundColor:
                                    theme.card,
                                borderColor:
                                    theme.border,
                            },
                        ]}
                    >

                        <View
                            style={[
                                styles.emptyIcon,
                                {
                                    backgroundColor:
                                        theme.iconBackground,
                                },
                            ]}
                        >

                            <Ionicons
                                name="barbell-outline"
                                size={28}
                                color={
                                    theme.primaryLight
                                }
                            />

                        </View>

                        <Text
                            style={[
                                styles.emptyTitle,
                                {
                                    color:
                                        theme.text,
                                },
                            ]}
                        >
                            No workouts yet
                        </Text>

                        <Text
                            style={[
                                styles.emptySubtitle,
                                {
                                    color:
                                        theme.muted,
                                },
                            ]}
                        >
                            Create your first workout
                            and assign it to your members.
                        </Text>

                    </View>

                ) : (

                    <View
                        style={[
                            styles.workoutList,
                            {
                                backgroundColor:
                                    theme.card,
                                borderColor:
                                    theme.border,
                            },
                        ]}
                    >

                        {workouts.map(
                            (
                                workout,
                                index
                            ) => (

                                <TouchableOpacity
                                    key={
                                        workout.id ||
                                        index
                                    }

                                    style={[
                                        styles.workoutRow,
                                        {
                                            borderBottomColor:
                                                theme.divider,
                                        },
                                    ]}

                                    onPress={() =>
                                        setSelectedWorkout(
                                            workout
                                        )
                                    }

                                    activeOpacity={0.8}
                                >

                                    <View
                                        style={[
                                            styles.workoutIcon,
                                            {
                                                backgroundColor:
                                                    index % 3 === 0
                                                        ? "#173C91"
                                                        : index % 3 === 1
                                                            ? "#075746"
                                                            : "#744300",
                                            },
                                        ]}
                                    >

                                        <MaterialCommunityIcons
                                            name={
                                                getWorkoutIcon(
                                                    index
                                                )
                                            }
                                            size={24}
                                            color="#FFFFFF"
                                        />

                                    </View>


                                    <View
                                        style={
                                            styles.workoutInfo
                                        }
                                    >

                                        <Text
                                            style={[
                                                styles.workoutName,
                                                {
                                                    color:
                                                        theme.text,
                                                },
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {
                                                getWorkoutName(
                                                    workout
                                                )
                                            }
                                        </Text>


                                        <Text
                                            style={[
                                                styles.workoutDescription,
                                                {
                                                    color:
                                                        theme.muted,
                                                },
                                            ]}
                                            numberOfLines={2}
                                        >
                                            {
                                                getWorkoutDescription(
                                                    workout
                                                )
                                            }
                                        </Text>


                                        <View
                                            style={
                                                styles.assignedRow
                                            }
                                        >

                                            <Ionicons
                                                name="people-outline"
                                                size={13}
                                                color={
                                                    theme.primaryLight
                                                }
                                            />

                                            <Text
                                                style={[
                                                    styles.assignedText,
                                                    {
                                                        color:
                                                            theme.primaryLight,
                                                    },
                                                ]}
                                            >
                                                {
                                                    getWorkoutMemberCount(
                                                        workout
                                                    )
                                                }{" "}
                                                member
                                                {
                                                    getWorkoutMemberCount(
                                                        workout
                                                    ) === 1
                                                        ? ""
                                                        : "s"
                                                }{" "}
                                                assigned
                                            </Text>

                                        </View>

                                    </View>


                                    <Ionicons
                                        name="chevron-forward"
                                        size={18}
                                        color={
                                            theme.muted
                                        }
                                    />

                                </TouchableOpacity>

                            )
                        )}

                    </View>
                )}


                {/* ==================================================
                    ASSIGNED MEMBERS
                ================================================== */}

                <View
                    style={
                        styles.sectionHeader
                    }
                >

                    <View>

                        <Text
                            style={[
                                styles.sectionEyebrow,
                                {
                                    color:
                                        theme.primaryLight,
                                },
                            ]}
                        >
                            YOUR CLIENTS
                        </Text>

                        <Text
                            style={[
                                styles.sectionTitle,
                                {
                                    color:
                                        theme.text,
                                },
                            ]}
                        >
                            Assigned Members
                        </Text>

                    </View>


                    <View
                        style={[
                            styles.countPill,
                            {
                                backgroundColor:
                                    theme.iconBackground,
                                borderColor:
                                    theme.border,
                            },
                        ]}
                    >

                        <Text
                            style={[
                                styles.sectionCount,
                                {
                                    color:
                                        theme.primaryLight,
                                },
                            ]}
                        >
                            {members.length}
                        </Text>

                    </View>

                </View>


                {members.length === 0 ? (

                    <View
                        style={[
                            styles.emptyMemberCard,
                            {
                                backgroundColor:
                                    theme.card,
                                borderColor:
                                    theme.border,
                            },
                        ]}
                    >

                        <View
                            style={[
                                styles.emptyIconSmall,
                                {
                                    backgroundColor:
                                        theme.iconBackground,
                                },
                            ]}
                        >

                            <Ionicons
                                name="people-outline"
                                size={25}
                                color={
                                    theme.primaryLight
                                }
                            />

                        </View>

                        <Text
                            style={[
                                styles.emptyTitle,
                                {
                                    color:
                                        theme.text,
                                },
                            ]}
                        >
                            No members assigned
                        </Text>

                        <Text
                            style={[
                                styles.emptySubtitle,
                                {
                                    color:
                                        theme.muted,
                                },
                            ]}
                        >
                            Members assigned to you
                            will appear here.
                        </Text>

                    </View>

                ) : (

                    <View
                        style={[
                            styles.memberList,
                            {
                                backgroundColor:
                                    theme.card,
                                borderColor:
                                    theme.border,
                            },
                        ]}
                    >

                        {members
                            .slice(0, 5)
                            .map(
                                (
                                    member,
                                    index
                                ) => (

                                    <TouchableOpacity
                                        key={
                                            member.id ||
                                            index
                                        }

                                        style={[
                                            styles.memberRow,
                                            {
                                                borderBottomColor:
                                                    theme.divider,
                                            },
                                        ]}

                                        activeOpacity={0.8}
                                    >

                                        <View
                                            style={[
                                                styles.memberAvatar,
                                                {
                                                    backgroundColor:
                                                        theme.iconBackground,
                                                },
                                            ]}
                                        >

                                            <Text
                                                style={[
                                                    styles.memberInitial,
                                                    {
                                                        color:
                                                            theme.primaryLight,
                                                    },
                                                ]}
                                            >
                                                {(
                                                    member.name ||
                                                    member.username ||
                                                    "M"
                                                )
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </Text>

                                        </View>


                                        <View
                                            style={
                                                styles.memberInfo
                                            }
                                        >

                                            <Text
                                                style={[
                                                    styles.memberName,
                                                    {
                                                        color:
                                                            theme.text,
                                                    },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {
                                                    member.name ||
                                                    member.username ||
                                                    "Member"
                                                }
                                            </Text>


                                            <Text
                                                style={[
                                                    styles.memberUsername,
                                                    {
                                                        color:
                                                            theme.muted,
                                                    },
                                                ]}
                                            >
                                                {member.username
                                                    ? `@${member.username}`
                                                    : "Assigned member"}
                                            </Text>

                                        </View>


                                        <View
                                            style={[
                                                styles.memberArrow,
                                                {
                                                    backgroundColor:
                                                        theme.iconBackground,
                                                },
                                            ]}
                                        >

                                            <Ionicons
                                                name="chevron-forward"
                                                size={16}
                                                color={
                                                    theme.primaryLight
                                                }
                                            />

                                        </View>

                                    </TouchableOpacity>

                                )
                            )}

                    </View>
                )}

            </ScrollView>


            {/* ==================================================
                WORKOUT DETAILS MODAL
            ================================================== */}

            <Modal
                visible={
                    selectedWorkout !== null
                }
                transparent
                animationType="slide"
                onRequestClose={() =>
                    setSelectedWorkout(
                        null
                    )
                }
            >

                <View
                    style={
                        styles.modalOverlay
                    }
                >

                    <View
                        style={[
                            styles.modalCard,
                            {
                                backgroundColor:
                                    theme.card,
                                borderColor:
                                    theme.border,
                            },
                        ]}
                    >

                        <View
                            style={
                                styles.modalHandle
                            }
                        />


                        <View
                            style={
                                styles.modalHeader
                            }
                        >

                            <View
                                style={
                                    styles.modalTitleWrap
                                }
                            >

                                <Text
                                    style={[
                                        styles.modalEyebrow,
                                        {
                                            color:
                                                theme.primaryLight,
                                        },
                                    ]}
                                >
                                    WORKOUT DETAILS
                                </Text>

                                <Text
                                    style={[
                                        styles.modalTitle,
                                        {
                                            color:
                                                theme.text,
                                        },
                                    ]}
                                    numberOfLines={2}
                                >
                                    {
                                        selectedWorkout
                                            ? getWorkoutName(
                                                selectedWorkout
                                            )
                                            : "Workout"
                                    }
                                </Text>

                            </View>


                            <TouchableOpacity
                                style={[
                                    styles.closeButton,
                                    {
                                        backgroundColor:
                                            theme.iconBackground,
                                    },
                                ]}
                                onPress={() =>
                                    setSelectedWorkout(
                                        null
                                    )
                                }
                            >

                                <Ionicons
                                    name="close"
                                    size={20}
                                    color={
                                        theme.text
                                    }
                                />

                            </TouchableOpacity>

                        </View>


                        <ScrollView
                            showsVerticalScrollIndicator={
                                false
                            }
                            contentContainerStyle={{
                                paddingBottom: 10,
                            }}
                        >

                            <Text
                                style={[
                                    styles.modalDescription,
                                    {
                                        color:
                                            theme.muted,
                                    },
                                ]}
                            >
                                {selectedWorkout
                                    ? getWorkoutDescription(
                                        selectedWorkout
                                    )
                                    : ""}
                            </Text>


                            <View
                                style={[
                                    styles.detailsBox,
                                    {
                                        backgroundColor:
                                            theme.cardSecondary,
                                        borderColor:
                                            theme.border,
                                    },
                                ]}
                            >

                                {selectedWorkout?.duration !==
                                    undefined &&
                                    selectedWorkout?.duration !==
                                    null && (

                                        <DetailRow
                                            icon="timer-outline"
                                            label="Duration"
                                            value={`${selectedWorkout.duration} minutes`}
                                            theme={
                                                theme
                                            }
                                        />

                                    )}


                                {selectedWorkout?.sets !==
                                    undefined &&
                                    selectedWorkout?.sets !==
                                    null && (

                                        <DetailRow
                                            icon="repeat"
                                            label="Sets"
                                            value={String(
                                                selectedWorkout.sets
                                            )}
                                            theme={
                                                theme
                                            }
                                        />

                                    )}


                                {selectedWorkout?.reps !==
                                    undefined &&
                                    selectedWorkout?.reps !==
                                    null && (

                                        <DetailRow
                                            icon="fitness-outline"
                                            label="Reps"
                                            value={String(
                                                selectedWorkout.reps
                                            )}
                                            theme={
                                                theme
                                            }
                                        />

                                    )}

                            </View>


                            <View
                                style={
                                    styles.modalMembers
                                }
                            >

                                <Text
                                    style={[
                                        styles.modalSectionTitle,
                                        {
                                            color:
                                                theme.muted,
                                        },
                                    ]}
                                >
                                    ASSIGNED MEMBERS
                                </Text>


                                <View
                                    style={[
                                        styles.modalMemberPill,
                                        {
                                            backgroundColor:
                                                theme.iconBackground,
                                        },
                                    ]}
                                >

                                    <Ionicons
                                        name="people-outline"
                                        size={16}
                                        color={
                                            theme.primaryLight
                                        }
                                    />

                                    <Text
                                        style={[
                                            styles.modalMemberCount,
                                            {
                                                color:
                                                    theme.primaryLight,
                                            },
                                        ]}
                                    >
                                        {
                                            getWorkoutMemberCount(
                                                selectedWorkout
                                            )
                                        }{" "}
                                        member
                                        {
                                            getWorkoutMemberCount(
                                                selectedWorkout
                                            ) === 1
                                                ? ""
                                                : "s"
                                        }
                                    </Text>

                                </View>

                            </View>


                            <TouchableOpacity
                                style={[
                                    styles.deleteButton,
                                    {
                                        backgroundColor:
                                            isDark
                                                ? "#100D15"
                                                : "#FFF5F6",
                                        borderColor:
                                            isDark
                                                ? "#55202B"
                                                : "#FFD5DA",
                                    },
                                ]}
                                onPress={() => {

                                    const workout =
                                        selectedWorkout;

                                    setSelectedWorkout(
                                        null
                                    );

                                    deleteWorkout(
                                        workout
                                    );

                                }}
                                activeOpacity={0.85}
                            >

                                <Ionicons
                                    name="trash-outline"
                                    size={18}
                                    color={
                                        theme.danger
                                    }
                                />

                                <Text
                                    style={[
                                        styles.deleteText,
                                        {
                                            color:
                                                theme.danger,
                                        },
                                    ]}
                                >
                                    Delete Workout
                                </Text>

                            </TouchableOpacity>

                        </ScrollView>

                    </View>

                </View>

            </Modal>


            {/* ==================================================
                CREATE WORKOUT MODAL
            ================================================== */}

            <Modal
                visible={
                    showCreateModal
                }
                transparent
                animationType="slide"
                onRequestClose={() =>
                    setShowCreateModal(
                        false
                    )
                }
            >

                <View
                    style={
                        styles.modalOverlay
                    }
                >

                    <View
                        style={[
                            styles.createModal,
                            {
                                backgroundColor:
                                    theme.card,
                                borderColor:
                                    theme.border,
                            },
                        ]}
                    >

                        <View
                            style={
                                styles.modalHandle
                            }
                        />


                        <ScrollView
                            showsVerticalScrollIndicator={
                                false
                            }
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{
                                paddingBottom: 25,
                            }}
                        >

                            <View
                                style={
                                    styles.modalHeader
                                }
                            >

                                <View
                                    style={
                                        styles.modalTitleWrap
                                    }
                                >

                                    <Text
                                        style={[
                                            styles.modalEyebrow,
                                            {
                                                color:
                                                    theme.primaryLight,
                                            },
                                        ]}
                                    >
                                        TRAINING PLAN
                                    </Text>

                                    <Text
                                        style={[
                                            styles.modalTitle,
                                            {
                                                color:
                                                    theme.text,
                                            },
                                        ]}
                                    >
                                        Create Workout
                                    </Text>

                                    <Text
                                        style={[
                                            styles.modalSmallText,
                                            {
                                                color:
                                                    theme.muted,
                                            },
                                        ]}
                                    >
                                        Assign it to your members
                                    </Text>

                                </View>


                                <TouchableOpacity
                                    style={[
                                        styles.closeButton,
                                        {
                                            backgroundColor:
                                                theme.iconBackground,
                                        },
                                    ]}
                                    onPress={() =>
                                        setShowCreateModal(
                                            false
                                        )
                                    }
                                >

                                    <Ionicons
                                        name="close"
                                        size={20}
                                        color={
                                            theme.text
                                        }
                                    />

                                </TouchableOpacity>

                            </View>


                            {/* ==================================================
                                WORKOUT NAME
                            ================================================== */}

                            <FormLabel
                                text="WORKOUT NAME"
                                theme={
                                    theme
                                }
                            />

                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor:
                                            theme.input,
                                        borderColor:
                                            theme.border,
                                        color:
                                            theme.text,
                                    },
                                ]}
                                value={
                                    title
                                }
                                onChangeText={
                                    setTitle
                                }
                                placeholder="e.g. Chest & Triceps"
                                placeholderTextColor={
                                    theme.muted
                                }
                                autoCapitalize="sentences"
                            />


                            {/* ==================================================
                                DESCRIPTION
                            ================================================== */}

                            <FormLabel
                                text="DESCRIPTION"
                                theme={
                                    theme
                                }
                            />

                            <TextInput
                                style={[
                                    styles.input,
                                    styles.textArea,
                                    {
                                        backgroundColor:
                                            theme.input,
                                        borderColor:
                                            theme.border,
                                        color:
                                            theme.text,
                                    },
                                ]}
                                value={
                                    description
                                }
                                onChangeText={
                                    setDescription
                                }
                                placeholder="Describe the workout..."
                                placeholderTextColor={
                                    theme.muted
                                }
                                multiline
                            />


                            {/* ==================================================
                                QUICK STATS
                            ================================================== */}

                            <View
                                style={
                                    styles.formRow
                                }
                            >

                                <View
                                    style={
                                        styles.formHalf
                                    }
                                >

                                    <FormLabel
                                        text="DURATION"
                                        theme={
                                            theme
                                        }
                                    />

                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                backgroundColor:
                                                    theme.input,
                                                borderColor:
                                                    theme.border,
                                                color:
                                                    theme.text,
                                            },
                                        ]}
                                        value={
                                            duration
                                        }
                                        onChangeText={
                                            setDuration
                                        }
                                        placeholder="60 min"
                                        placeholderTextColor={
                                            theme.muted
                                        }
                                        keyboardType="numeric"
                                    />

                                </View>


                                <View
                                    style={
                                        styles.formHalf
                                    }
                                >

                                    <FormLabel
                                        text="SETS"
                                        theme={
                                            theme
                                        }
                                    />

                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                backgroundColor:
                                                    theme.input,
                                                borderColor:
                                                    theme.border,
                                                color:
                                                    theme.text,
                                            },
                                        ]}
                                        value={
                                            sets
                                        }
                                        onChangeText={
                                            setSets
                                        }
                                        placeholder="4"
                                        placeholderTextColor={
                                            theme.muted
                                        }
                                        keyboardType="numeric"
                                    />

                                </View>

                            </View>


                            {/* ==================================================
                                REPS
                            ================================================== */}

                            <FormLabel
                                text="REPS"
                                theme={
                                    theme
                                }
                            />

                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor:
                                            theme.input,
                                        borderColor:
                                            theme.border,
                                        color:
                                            theme.text,
                                    },
                                ]}
                                value={
                                    reps
                                }
                                onChangeText={
                                    setReps
                                }
                                placeholder="8-10"
                                placeholderTextColor={
                                    theme.muted
                                }
                                keyboardType="default"
                                autoCapitalize="none"
                            />


                            {/* ==================================================
                                ASSIGN MEMBERS
                            ================================================== */}

                            <View
                                style={
                                    styles.memberSelectHeader
                                }
                            >

                                <FormLabel
                                    text="ASSIGN TO MEMBERS"
                                    theme={
                                        theme
                                    }
                                />

                                <View
                                    style={[
                                        styles.selectedCount,
                                        {
                                            backgroundColor:
                                                theme.iconBackground,
                                        },
                                    ]}
                                >

                                    <Text
                                        style={[
                                            styles.selectedCountText,
                                            {
                                                color:
                                                    theme.primaryLight,
                                            },
                                        ]}
                                    >
                                        {
                                            selectedMemberIds.length
                                        }
                                    </Text>

                                </View>

                            </View>


                            {members.length === 0 ? (

                                <View
                                    style={[
                                        styles.noMembersBox,
                                        {
                                            backgroundColor:
                                                theme.input,
                                            borderColor:
                                                theme.border,
                                        },
                                    ]}
                                >

                                    <Ionicons
                                        name="people-outline"
                                        size={21}
                                        color={
                                            theme.primaryLight
                                        }
                                    />

                                    <Text
                                        style={[
                                            styles.noMembersText,
                                            {
                                                color:
                                                    theme.muted,
                                            },
                                        ]}
                                    >
                                        No members are assigned
                                        to you yet.
                                    </Text>

                                </View>

                            ) : (

                                <View>

                                    {members.map(
                                        (
                                            member,
                                            index
                                        ) => {

                                            const memberId =
                                                member.id;

                                            const selected =
                                                selectedMemberIds.includes(
                                                    memberId
                                                );

                                            return (

                                                <TouchableOpacity
                                                    key={
                                                        memberId ||
                                                        index
                                                    }

                                                    style={[
                                                        styles.selectMemberRow,
                                                        {
                                                            backgroundColor:
                                                                selected
                                                                    ? theme.iconBackground
                                                                    : theme.input,
                                                            borderColor:
                                                                selected
                                                                    ? theme.primary
                                                                    : theme.border,
                                                        },
                                                    ]}

                                                    onPress={() =>
                                                        toggleMember(
                                                            memberId
                                                        )
                                                    }

                                                    activeOpacity={
                                                        0.8
                                                    }
                                                >

                                                    <View
                                                        style={[
                                                            styles.selectMemberAvatar,
                                                            {
                                                                backgroundColor:
                                                                    theme.iconBackground,
                                                            },
                                                        ]}
                                                    >

                                                        <Text
                                                            style={[
                                                                styles.selectMemberInitial,
                                                                {
                                                                    color:
                                                                        theme.primaryLight,
                                                                },
                                                            ]}
                                                        >
                                                            {(
                                                                member.name ||
                                                                member.username ||
                                                                "M"
                                                            )
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </Text>

                                                    </View>


                                                    <View
                                                        style={
                                                            styles.selectMemberInfo
                                                        }
                                                    >

                                                        <Text
                                                            style={[
                                                                styles.selectMemberName,
                                                                {
                                                                    color:
                                                                        theme.text,
                                                                },
                                                            ]}
                                                        >
                                                            {
                                                                member.name ||
                                                                member.username ||
                                                                "Member"
                                                            }
                                                        </Text>


                                                        <Text
                                                            style={[
                                                                styles.selectMemberUsername,
                                                                {
                                                                    color:
                                                                        theme.muted,
                                                                },
                                                            ]}
                                                        >
                                                            {member.username
                                                                ? `@${member.username}`
                                                                : "Assigned member"}
                                                        </Text>

                                                    </View>


                                                    <View
                                                        style={[
                                                            styles.checkbox,
                                                            {
                                                                borderColor:
                                                                    selected
                                                                        ? theme.primary
                                                                        : theme.border,
                                                                backgroundColor:
                                                                    selected
                                                                        ? theme.primary
                                                                        : "transparent",
                                                            },
                                                        ]}
                                                    >

                                                        {selected && (

                                                            <Ionicons
                                                                name="checkmark"
                                                                size={16}
                                                                color="#FFFFFF"
                                                            />

                                                        )}

                                                    </View>

                                                </TouchableOpacity>

                                            );
                                        }
                                    )}

                                </View>
                            )}


                            {/* ==================================================
                                SAVE
                            ================================================== */}

                            <TouchableOpacity
                                style={[
                                    styles.saveButton,
                                    {
                                        backgroundColor:
                                            theme.primary,
                                        opacity:
                                            saving
                                                ? 0.7
                                                : 1,
                                    },
                                ]}
                                onPress={
                                    createWorkout
                                }
                                disabled={
                                    saving
                                }
                                activeOpacity={
                                    0.85
                                }
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
                                            size={20}
                                            color="#FFFFFF"
                                        />

                                        <Text
                                            style={
                                                styles.saveButtonText
                                            }
                                        >
                                            Create Workout
                                        </Text>

                                    </>

                                )}

                            </TouchableOpacity>

                        </ScrollView>

                    </View>

                </View>

            </Modal>


            {/* ==================================================
                BOTTOM NAVIGATION
            ================================================== */}

            <TrainerBottomNav
                active="workouts"
                theme={
                    theme
                }
            />

        </View>
    );
}


// ============================================================
// FORM LABEL
// ============================================================

function FormLabel({
    text,
    theme,
}) {

    return (

        <Text
            style={[
                styles.inputLabel,
                {
                    color:
                        theme.muted,
                },
            ]}
        >
            {text}
        </Text>
    );
}


// ============================================================
// DETAIL ROW
// ============================================================

function DetailRow({
    icon,
    label,
    value,
    theme,
}) {

    return (

        <View
            style={[
                styles.detailRow,
                {
                    borderBottomColor:
                        theme.border,
                },
            ]}
        >

            <View
                style={[
                    styles.detailIcon,
                    {
                        backgroundColor:
                            theme.iconBackground,
                    },
                ]}
            >

                <Ionicons
                    name={icon}
                    size={17}
                    color={
                        theme.primaryLight
                    }
                />

            </View>


            <Text
                style={[
                    styles.detailLabel,
                    {
                        color:
                            theme.muted,
                    },
                ]}
            >
                {label}
            </Text>


            <Text
                style={[
                    styles.detailValue,
                    {
                        color:
                            theme.text,
                    },
                ]}
            >
                {value}
            </Text>

        </View>
    );
}


// ============================================================
// TRAINER BOTTOM NAVIGATION
// ============================================================

function TrainerBottomNav({
    active,
    theme,
}) {

    const goTo = (
        screen
    ) => {

        if (
            screen ===
            active
        ) {
            return;
        }


        if (
            screen ===
            "home"
        ) {

            router.replace(
                "/trainer/dashboard"
            );

        } else if (
            screen ===
            "members"
        ) {

            router.replace(
                "/trainer/members"
            );

        } else if (
            screen ===
            "workouts"
        ) {

            // IMPORTANT:
            // Existing route is /trainer/workout
            router.replace(
                "/trainer/workout"
            );

        } else if (
            screen ===
            "attendance"
        ) {

            router.replace(
                "/trainer/attendance"
            );

        } else if (
            screen ===
            "profile"
        ) {

            router.replace(
                "/trainer/profile"
            );
        }
    };


    return (

        <View
            style={[
                styles.bottomNav,
                {
                    backgroundColor:
                        theme.nav,
                    borderTopColor:
                        theme.border,
                },
            ]}
        >

            <NavItem
                icon="home"
                label="Home"
                active={
                    active ===
                    "home"
                }
                theme={
                    theme
                }
                onPress={() =>
                    goTo("home")
                }
            />


            <NavItem
                icon="people"
                label="Members"
                active={
                    active ===
                    "members"
                }
                theme={
                    theme
                }
                onPress={() =>
                    goTo("members")
                }
            />


            <NavItem
                icon="barbell-outline"
                label="Workouts"
                active={
                    active ===
                    "workouts"
                }
                theme={
                    theme
                }
                onPress={() =>
                    goTo("workouts")
                }
            />


            <NavItem
                icon="calendar-outline"
                label="Attendance"
                active={
                    active ===
                    "attendance"
                }
                theme={
                    theme
                }
                onPress={() =>
                    goTo("attendance")
                }
            />


            <NavItem
                icon="person-outline"
                label="Profile"
                active={
                    active ===
                    "profile"
                }
                theme={
                    theme
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
    theme,
}) {

    return (

        <TouchableOpacity
            style={
                styles.navItem
            }
            onPress={
                onPress
            }
            activeOpacity={
                0.8
            }
        >

            <View
                style={[
                    styles.navIconBox,
                    active && {
                        backgroundColor:
                            theme.iconBackground,
                    },
                ]}
            >

                <Ionicons
                    name={icon}
                    size={21}
                    color={
                        active
                            ? theme.primaryLight
                            : theme.muted
                    }
                />

            </View>


            <Text
                style={[
                    styles.navLabel,
                    {
                        color:
                            active
                                ? theme.primaryLight
                                : theme.muted,
                    },
                ]}
            >
                {label}
            </Text>


            {active && (

                <View
                    style={[
                        styles.navIndicator,
                        {
                            backgroundColor:
                                theme.primaryLight,
                        },
                    ]}
                />

            )}

        </TouchableOpacity>
    );
}


// ============================================================
// STYLES
// ============================================================

const styles =
    StyleSheet.create({

        // ====================================================
        // MAIN
        // ====================================================

        container: {
            flex: 1,
        },


        // ====================================================
        // HEADER
        // ====================================================

        header: {
            minHeight: 105,
            paddingHorizontal: 18,
            paddingTop: 45,
            paddingBottom: 12,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",

            borderBottomWidth:
                1,
        },

        headerTextContainer: {
            flex: 1,
        },

        headerEyebrow: {
            fontSize: 10,
            fontWeight: "900",
            letterSpacing: 1.8,
            marginBottom: 3,
        },

        headerTitle: {
            fontSize: 26,
            fontWeight: "900",
        },

        headerActions: {
            flexDirection:
                "row",

            alignItems:
                "center",

            gap: 8,
        },

        headerButton: {
            width: 43,
            height: 43,
            borderRadius: 14,

            borderWidth: 1,

            alignItems:
                "center",

            justifyContent:
                "center",
        },

        addButton: {
            width: 43,
            height: 43,
            borderRadius: 14,

            alignItems:
                "center",

            justifyContent:
                "center",
        },


        // ====================================================
        // CONTENT
        // ====================================================

        scrollContent: {
            paddingHorizontal: 18,
            paddingTop: 18,
        },


        // ====================================================
        // CREATE CARD
        // ====================================================

        createCard: {
            minHeight: 105,

            borderRadius: 20,

            borderWidth: 1,

            paddingHorizontal: 14,
            paddingVertical: 14,

            flexDirection:
                "row",

            alignItems:
                "center",
        },

        createIcon: {
            width: 56,
            height: 56,

            borderRadius: 17,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginRight: 13,
        },

        createText: {
            flex: 1,
            paddingRight: 8,
        },

        createTitle: {
            fontSize: 16,
            fontWeight: "900",
            marginBottom: 4,
        },

        createSubtitle: {
            fontSize: 11,
            lineHeight: 16,
        },

        chevronBox: {
            width: 32,
            height: 32,

            borderRadius: 11,

            alignItems:
                "center",

            justifyContent:
                "center",
        },


        // ====================================================
        // SECTION
        // ====================================================

        sectionHeader: {
            marginTop: 23,
            marginBottom: 10,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",
        },

        sectionEyebrow: {
            fontSize: 9,
            fontWeight: "900",
            letterSpacing: 1.5,
            marginBottom: 2,
        },

        sectionTitle: {
            fontSize: 17,
            fontWeight: "900",
        },

        countPill: {
            minWidth: 34,
            height: 30,

            paddingHorizontal: 9,

            borderRadius: 11,

            borderWidth: 1,

            alignItems:
                "center",

            justifyContent:
                "center",
        },

        sectionCount: {
            fontSize: 13,
            fontWeight: "900",
        },


        // ====================================================
        // WORKOUT LIST
        // ====================================================

        workoutList: {
            borderRadius: 20,

            borderWidth: 1,

            paddingHorizontal: 12,
        },

        workoutRow: {
            minHeight: 82,

            flexDirection:
                "row",

            alignItems:
                "center",

            borderBottomWidth:
                1,

            paddingVertical: 8,
        },

        workoutIcon: {
            width: 47,
            height: 47,

            borderRadius: 15,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginRight: 11,
        },

        workoutInfo: {
            flex: 1,
            paddingRight: 8,
        },

        workoutName: {
            fontSize: 14,
            fontWeight: "900",
            marginBottom: 3,
        },

        workoutDescription: {
            fontSize: 10,
            lineHeight: 14,
            marginBottom: 4,
        },

        assignedRow: {
            flexDirection:
                "row",

            alignItems:
                "center",

            gap: 4,
        },

        assignedText: {
            fontSize: 10,
            fontWeight: "800",
        },


        // ====================================================
        // EMPTY
        // ====================================================

        emptyCard: {
            minHeight: 180,

            borderRadius: 20,

            borderWidth: 1,

            alignItems:
                "center",

            justifyContent:
                "center",

            padding:
                22,
        },

        emptyMemberCard: {
            minHeight: 150,

            borderRadius: 20,

            borderWidth: 1,

            alignItems:
                "center",

            justifyContent:
                "center",

            padding:
                20,
        },

        emptyIcon: {
            width: 58,
            height: 58,

            borderRadius: 18,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginBottom: 11,
        },

        emptyIconSmall: {
            width: 50,
            height: 50,

            borderRadius: 16,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginBottom: 10,
        },

        emptyTitle: {
            fontSize: 15,
            fontWeight: "900",
            marginBottom: 4,
        },

        emptySubtitle: {
            fontSize: 11,
            lineHeight: 17,
            textAlign:
                "center",
            maxWidth: 250,
        },


        // ====================================================
        // MEMBERS
        // ====================================================

        memberList: {
            borderRadius: 20,

            borderWidth: 1,

            paddingHorizontal: 12,
        },

        memberRow: {
            minHeight: 69,

            flexDirection:
                "row",

            alignItems:
                "center",

            borderBottomWidth:
                1,
        },

        memberAvatar: {
            width: 43,
            height: 43,

            borderRadius: 14,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginRight: 11,
        },

        memberInitial: {
            fontSize: 17,
            fontWeight: "900",
        },

        memberInfo: {
            flex: 1,
        },

        memberName: {
            fontSize: 13,
            fontWeight: "900",
            marginBottom: 2,
        },

        memberUsername: {
            fontSize: 10,
        },

        memberArrow: {
            width: 30,
            height: 30,

            borderRadius: 10,

            alignItems:
                "center",

            justifyContent:
                "center",
        },


        // ====================================================
        // MODAL
        // ====================================================

        modalOverlay: {
            flex: 1,

            backgroundColor:
                "rgba(0,0,0,0.68)",

            justifyContent:
                "flex-end",
        },

        modalCard: {
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,

            borderWidth: 1,

            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: 25,

            maxHeight: "78%",
        },

        createModal: {
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,

            borderWidth: 1,

            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: 10,

            maxHeight: "91%",
        },

        modalHandle: {
            width: 38,
            height: 4,

            borderRadius: 4,

            backgroundColor:
                "#68758A",

            alignSelf:
                "center",

            marginBottom: 14,
        },

        modalHeader: {
            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",

            marginBottom: 16,
        },

        modalTitleWrap: {
            flex: 1,
            paddingRight: 12,
        },

        modalEyebrow: {
            fontSize: 9,
            fontWeight: "900",
            letterSpacing: 1.5,
            marginBottom: 3,
        },

        modalTitle: {
            fontSize: 20,
            fontWeight: "900",
        },

        modalSmallText: {
            fontSize: 10,
            marginTop: 3,
        },

        closeButton: {
            width: 36,
            height: 36,

            borderRadius: 12,

            alignItems:
                "center",

            justifyContent:
                "center",
        },

        modalDescription: {
            fontSize: 12,
            lineHeight: 18,
            marginBottom: 13,
        },

        detailsBox: {
            borderRadius: 16,

            borderWidth: 1,

            paddingHorizontal: 12,
        },

        detailRow: {
            minHeight: 48,

            flexDirection:
                "row",

            alignItems:
                "center",

            borderBottomWidth:
                1,
        },

        detailIcon: {
            width: 32,
            height: 32,

            borderRadius: 10,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginRight: 9,
        },

        detailLabel: {
            fontSize: 11,

            flex: 1,
        },

        detailValue: {
            fontSize: 12,
            fontWeight: "900",
        },

        modalMembers: {
            marginTop: 16,
            marginBottom: 14,
        },

        modalSectionTitle: {
            fontSize: 9,
            fontWeight: "900",
            letterSpacing: 1.4,
            marginBottom: 7,
        },

        modalMemberPill: {
            alignSelf:
                "flex-start",

            flexDirection:
                "row",

            alignItems:
                "center",

            paddingHorizontal: 11,
            height: 34,

            borderRadius: 11,

            gap: 6,
        },

        modalMemberCount: {
            fontSize: 11,
            fontWeight: "900",
        },

        deleteButton: {
            height: 49,

            borderRadius: 14,

            borderWidth: 1,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "center",
        },

        deleteText: {
            fontSize: 12,
            fontWeight: "900",
            marginLeft: 7,
        },


        // ====================================================
        // FORM
        // ====================================================

        inputLabel: {
            fontSize: 9,
            fontWeight: "900",
            letterSpacing: 1.2,
            marginBottom: 6,
            marginTop: 5,
        },

        input: {
            height: 47,

            borderRadius: 13,

            borderWidth: 1,

            paddingHorizontal: 13,

            fontSize: 13,
            fontWeight: "600",

            marginBottom: 9,
        },

        textArea: {
            height: 76,

            paddingTop: 12,

            textAlignVertical:
                "top",
        },

        formRow: {
            flexDirection:
                "row",

            gap: 10,
        },

        formHalf: {
            flex: 1,
        },

        memberSelectHeader: {
            flexDirection:
                "row",

            alignItems:
                "flex-end",

            justifyContent:
                "space-between",
        },

        selectedCount: {
            minWidth: 28,
            height: 25,

            borderRadius: 9,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginBottom: 6,
        },

        selectedCountText: {
            fontSize: 10,
            fontWeight: "900",
        },

        noMembersBox: {
            minHeight: 65,

            borderRadius: 14,

            borderWidth: 1,

            flexDirection:
                "row",

            alignItems:
                "center",

            paddingHorizontal: 13,

            marginBottom: 10,
        },

        noMembersText: {
            fontSize: 11,
            marginLeft: 9,
            flex: 1,
        },

        selectMemberRow: {
            minHeight: 60,

            borderRadius: 14,

            borderWidth: 1,

            flexDirection:
                "row",

            alignItems:
                "center",

            paddingHorizontal: 10,

            marginBottom: 7,
        },

        selectMemberAvatar: {
            width: 38,
            height: 38,

            borderRadius: 12,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginRight: 10,
        },

        selectMemberInitial: {
            fontSize: 15,
            fontWeight: "900",
        },

        selectMemberInfo: {
            flex: 1,
        },

        selectMemberName: {
            fontSize: 12,
            fontWeight: "900",
            marginBottom: 2,
        },

        selectMemberUsername: {
            fontSize: 9,
        },

        checkbox: {
            width: 25,
            height: 25,

            borderRadius: 8,

            borderWidth: 1,

            alignItems:
                "center",

            justifyContent:
                "center",
        },

        saveButton: {
            height: 51,

            borderRadius: 15,

            marginTop: 13,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "center",
        },

        saveButtonText: {
            color: "#FFFFFF",

            fontSize: 13,
            fontWeight: "900",

            marginLeft: 7,
        },


        // ====================================================
        // BOTTOM NAV
        // ====================================================

        bottomNav: {
            position:
                "absolute",

            left: 0,
            right: 0,
            bottom: 0,

            height: 82,

            borderTopWidth: 1,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-around",

            paddingBottom: 4,

            elevation: 20,
        },

        navItem: {
            flex: 1,

            height: 70,

            alignItems:
                "center",

            justifyContent:
                "center",

            position:
                "relative",
        },

        navIconBox: {
            width: 48,
            height: 37,

            borderRadius: 12,

            alignItems:
                "center",

            justifyContent:
                "center",
        },

        navLabel: {
            fontSize: 9,
            fontWeight: "800",

            marginTop: 2,
        },

        navIndicator: {
            position:
                "absolute",

            bottom: 1,

            width: 32,
            height: 3,

            borderRadius: 3,
        },


        // ====================================================
        // LOADING
        // ====================================================

        loadingContainer: {
            flex: 1,

            alignItems:
                "center",

            justifyContent:
                "center",
        },

        loadingText: {
            fontSize: 12,
            marginTop: 10,
        },

    });