import React, {
    useCallback,
    useEffect,
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



// ============================================================
// API CONFIG
// ============================================================

const API_BASE_URL =
    "http://192.168.1.52:8000/api/members";



// ============================================================
// WORKOUT SCREEN
// ============================================================

export default function TrainerWorkout() {

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
    // LOAD WHEN SCREEN FOCUSED
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



        throw new Error(
            `Server returned HTTP ${response.status}`
        );
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
    // REFRESH
    // ========================================================

    const handleRefresh = () => {

        setRefreshing(true);

        loadData();
    };



    // ========================================================
    // OPEN CREATE
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
                            id !==
                            memberId
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



            // ------------------------------------------------
            // Workout payload
            // ------------------------------------------------

            const payload = {

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

                reps:
                    reps
                        ? Number(
                            reps
                        )
                        : null,

                member_ids:
                    selectedMemberIds,

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
                    "Unable to create workout."
                );
            }



            setShowCreateModal(
                false
            );



            Alert.alert(
                "Workout Created",
                "Workout has been created successfully."
            );



            loadData();



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
                    response.status !==
                    204
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

                <View>

                    <Text
                        style={
                            styles.headerEyebrow
                        }
                    >
                        GYMRYT • TRAINER
                    </Text>



                    <Text
                        style={
                            styles.headerTitle
                        }
                    >
                        Workouts
                    </Text>

                </View>



                <TouchableOpacity
                    style={
                        styles.addButton
                    }
                    onPress={
                        openCreateWorkout
                    }
                    activeOpacity={0.85}
                >

                    <Ionicons
                        name="add"
                        size={32}
                        color="#FFFFFF"
                    />

                </TouchableOpacity>

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
                    CREATE WORKOUT
                ================================================== */}

                <TouchableOpacity
                    style={
                        styles.createCard
                    }
                    onPress={
                        openCreateWorkout
                    }
                    activeOpacity={0.85}
                >

                    <View
                        style={
                            styles.createIcon
                        }
                    >

                        <Ionicons
                            name="barbell-outline"
                            size={30}
                            color="#4DA3FF"
                        />

                    </View>



                    <View
                        style={
                            styles.createText
                        }
                    >

                        <Text
                            style={
                                styles.createTitle
                            }
                        >
                            Create Workout
                        </Text>



                        <Text
                            style={
                                styles.createSubtitle
                            }
                        >
                            Design a personalized workout
                        </Text>



                        <Text
                            style={
                                styles.createSubtitle
                            }
                        >
                            plan for your members.
                        </Text>

                    </View>



                    <Ionicons
                        name="chevron-forward"
                        size={24}
                        color="#A8B9D1"
                    />

                </TouchableOpacity>



                {/* ==================================================
                    MY WORKOUTS TITLE
                ================================================== */}

                <View
                    style={
                        styles.sectionHeader
                    }
                >

                    <Text
                        style={
                            styles.sectionTitle
                        }
                    >
                        MY WORKOUTS
                    </Text>



                    <View
                        style={
                            styles.sectionCountContainer
                        }
                    >

                        <Text
                            style={
                                styles.sectionCount
                            }
                        >
                            {workouts.length}
                        </Text>



                        <Ionicons
                            name="chevron-forward"
                            size={21}
                            color="#A8B9D1"
                        />

                    </View>

                </View>



                {/* ==================================================
                    EMPTY WORKOUTS
                ================================================== */}

                {workouts.length === 0 ? (

                    <View
                        style={
                            styles.emptyCard
                        }
                    >

                        <View
                            style={
                                styles.emptyIcon
                            }
                        >

                            <Ionicons
                                name="barbell-outline"
                                size={35}
                                color="#4DA3FF"
                            />

                        </View>



                        <Text
                            style={
                                styles.emptyTitle
                            }
                        >
                            No workouts yet
                        </Text>



                        <Text
                            style={
                                styles.emptySubtitle
                            }
                        >
                            Create your first workout
                        </Text>



                        <Text
                            style={
                                styles.emptySubtitle
                            }
                        >
                            and assign it to your members.
                        </Text>

                    </View>

                ) : (

                    <View
                        style={
                            styles.workoutList
                        }
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
                                    style={
                                        styles.workoutRow
                                    }
                                    onPress={() =>
                                        setSelectedWorkout(
                                            workout
                                        )
                                    }
                                    activeOpacity={
                                        0.8
                                    }
                                >

                                    <View
                                        style={[
                                            styles.workoutIcon,
                                            index %
                                                3 ===
                                                0 &&
                                                styles.workoutIconBlue,

                                            index %
                                                3 ===
                                                1 &&
                                                styles.workoutIconGreen,

                                            index %
                                                3 ===
                                                2 &&
                                                styles.workoutIconOrange,
                                        ]}
                                    >

                                        <MaterialCommunityIcons
                                            name={
                                                getWorkoutIcon(
                                                    index
                                                )
                                            }
                                            size={
                                                27
                                            }
                                            color={
                                                "#FFFFFF"
                                            }
                                        />

                                    </View>



                                    <View
                                        style={
                                            styles.workoutInfo
                                        }
                                    >

                                        <Text
                                            style={
                                                styles.workoutName
                                            }
                                            numberOfLines={
                                                1
                                            }
                                        >
                                            {getWorkoutName(
                                                workout
                                            )}
                                        </Text>



                                        <Text
                                            style={
                                                styles.workoutDescription
                                            }
                                            numberOfLines={
                                                2
                                            }
                                        >
                                            {getWorkoutDescription(
                                                workout
                                            )}
                                        </Text>



                                        <Text
                                            style={
                                                styles.assignedText
                                            }
                                        >
                                            {
                                                getWorkoutMemberCount(
                                                    workout
                                                )
                                            }{" "}
                                            member
                                            {getWorkoutMemberCount(
                                                workout
                                            ) ===
                                            1
                                                ? ""
                                                : "s"}{" "}
                                            assigned
                                        </Text>

                                    </View>



                                    <Ionicons
                                        name="chevron-forward"
                                        size={23}
                                        color="#9DAEC5"
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

                    <Text
                        style={
                            styles.sectionTitle
                        }
                    >
                        ASSIGNED MEMBERS
                    </Text>



                    <View
                        style={
                            styles.sectionCountContainer
                        }
                    >

                        <Text
                            style={
                                styles.sectionCount
                            }
                        >
                            {members.length}
                        </Text>



                        <Ionicons
                            name="chevron-forward"
                            size={21}
                            color="#A8B9D1"
                        />

                    </View>

                </View>



                {members.length === 0 ? (

                    <View
                        style={
                            styles.emptyMemberCard
                        }
                    >

                        <View
                            style={
                                styles.memberEmptyIcon
                            }
                        >

                            <Ionicons
                                name="people-outline"
                                size={31}
                                color="#4DA3FF"
                            />

                        </View>



                        <Text
                            style={
                                styles.emptyTitle
                            }
                        >
                            No members assigned
                        </Text>



                        <Text
                            style={
                                styles.emptySubtitle
                            }
                        >
                            Members assigned to you
                        </Text>



                        <Text
                            style={
                                styles.emptySubtitle
                            }
                        >
                            will appear here.
                        </Text>

                    </View>

                ) : (

                    <View
                        style={
                            styles.memberList
                        }
                    >

                        {members
                            .slice(0, 5)
                            .map(
                                (
                                    member,
                                    index
                                ) => (

                                    <View
                                        key={
                                            member.id ||
                                            index
                                        }
                                        style={
                                            styles.memberRow
                                        }
                                    >

                                        <View
                                            style={
                                                styles.memberAvatar
                                            }
                                        >

                                            <Text
                                                style={
                                                    styles.memberInitial
                                                }
                                            >
                                                {(
                                                    member.name ||
                                                    member.username ||
                                                    "M"
                                                )
                                                    .charAt(
                                                        0
                                                    )
                                                    .toUpperCase()}
                                            </Text>

                                        </View>



                                        <View
                                            style={
                                                styles.memberInfo
                                            }
                                        >

                                            <Text
                                                style={
                                                    styles.memberName
                                                }
                                            >
                                                {member.name ||
                                                    member.username ||
                                                    "Member"}
                                            </Text>



                                            <Text
                                                style={
                                                    styles.memberUsername
                                                }
                                            >
                                                {member.username
                                                    ? `@${member.username}`
                                                    : "Assigned member"}
                                            </Text>

                                        </View>



                                        <Ionicons
                                            name="chevron-forward"
                                            size={22}
                                            color="#9DAEC5"
                                        />

                                    </View>

                                )
                            )}

                    </View>
                )}



                <View
                    style={{
                        height: 120,
                    }}
                />

            </ScrollView>



            {/* ==================================================
                WORKOUT DETAILS MODAL
            ================================================== */}

            <Modal
                visible={
                    selectedWorkout !==
                    null
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
                        style={
                            styles.modalCard
                        }
                    >

                        <View
                            style={
                                styles.modalHeader
                            }
                        >

                            <Text
                                style={
                                    styles.modalTitle
                                }
                            >
                                {selectedWorkout
                                    ? getWorkoutName(
                                        selectedWorkout
                                    )
                                    : "Workout"}
                            </Text>



                            <TouchableOpacity
                                onPress={() =>
                                    setSelectedWorkout(
                                        null
                                    )
                                }
                            >

                                <Ionicons
                                    name="close"
                                    size={27}
                                    color="#FFFFFF"
                                />

                            </TouchableOpacity>

                        </View>



                        <Text
                            style={
                                styles.modalDescription
                            }
                        >
                            {selectedWorkout
                                ? getWorkoutDescription(
                                    selectedWorkout
                                )
                                : ""}
                        </Text>



                        {selectedWorkout?.duration !==
                            undefined &&
                            selectedWorkout?.duration !==
                                null && (

                                <DetailRow
                                    icon="timer-outline"
                                    label="Duration"
                                    value={`${selectedWorkout.duration} minutes`}
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
                                />

                            )}



                        <View
                            style={
                                styles.modalMembers
                            }
                        >

                            <Text
                                style={
                                    styles.modalSectionTitle
                                }
                            >
                                ASSIGNED MEMBERS
                            </Text>



                            <Text
                                style={
                                    styles.modalMemberCount
                                }
                            >
                                {getWorkoutMemberCount(
                                    selectedWorkout
                                )}{" "}
                                member
                                {getWorkoutMemberCount(
                                    selectedWorkout
                                ) ===
                                1
                                    ? ""
                                    : "s"}
                            </Text>

                        </View>



                        <TouchableOpacity
                            style={
                                styles.deleteButton
                            }
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
                        >

                            <Ionicons
                                name="trash-outline"
                                size={20}
                                color="#FF4D5E"
                            />



                            <Text
                                style={
                                    styles.deleteText
                                }
                            >
                                Delete Workout
                            </Text>

                        </TouchableOpacity>

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
                        style={
                            styles.createModal
                        }
                    >

                        <ScrollView
                            showsVerticalScrollIndicator={
                                false
                            }
                        >

                            <View
                                style={
                                    styles.modalHeader
                                }
                            >

                                <View>

                                    <Text
                                        style={
                                            styles.modalTitle
                                        }
                                    >
                                        Create Workout
                                    </Text>



                                    <Text
                                        style={
                                            styles.modalSmallText
                                        }
                                    >
                                        Assign it to your members
                                    </Text>

                                </View>



                                <TouchableOpacity
                                    onPress={() =>
                                        setShowCreateModal(
                                            false
                                        )
                                    }
                                >

                                    <Ionicons
                                        name="close"
                                        size={27}
                                        color="#FFFFFF"
                                    />

                                </TouchableOpacity>

                            </View>



                            {/* WORKOUT NAME */}

                            <Text
                                style={
                                    styles.inputLabel
                                }
                            >
                                WORKOUT NAME
                            </Text>



                            <TextInput
                                style={
                                    styles.input
                                }
                                value={
                                    title
                                }
                                onChangeText={
                                    setTitle
                                }
                                placeholder="e.g. Chest & Triceps"
                                placeholderTextColor="#66758C"
                            />



                            {/* DESCRIPTION */}

                            <Text
                                style={
                                    styles.inputLabel
                                }
                            >
                                DESCRIPTION
                            </Text>



                            <TextInput
                                style={[
                                    styles.input,
                                    styles.textArea,
                                ]}
                                value={
                                    description
                                }
                                onChangeText={
                                    setDescription
                                }
                                placeholder="Describe the workout..."
                                placeholderTextColor="#66758C"
                                multiline
                            />



                            {/* DURATION */}

                            <Text
                                style={
                                    styles.inputLabel
                                }
                            >
                                DURATION (MINUTES)
                            </Text>



                            <TextInput
                                style={
                                    styles.input
                                }
                                value={
                                    duration
                                }
                                onChangeText={
                                    setDuration
                                }
                                placeholder="60"
                                placeholderTextColor="#66758C"
                                keyboardType="numeric"
                            />



                            {/* SETS */}

                            <Text
                                style={
                                    styles.inputLabel
                                }
                            >
                                SETS
                            </Text>



                            <TextInput
                                style={
                                    styles.input
                                }
                                value={
                                    sets
                                }
                                onChangeText={
                                    setSets
                                }
                                placeholder="4"
                                placeholderTextColor="#66758C"
                                keyboardType="numeric"
                            />



                            {/* REPS */}

                            <Text
                                style={
                                    styles.inputLabel
                                }
                            >
                                REPS
                            </Text>



                            <TextInput
                                style={
                                    styles.input
                                }
                                value={
                                    reps
                                }
                                onChangeText={
                                    setReps
                                }
                                placeholder="12"
                                placeholderTextColor="#66758C"
                                keyboardType="numeric"
                            />



                            {/* MEMBERS */}

                            <Text
                                style={
                                    styles.inputLabel
                                }
                            >
                                ASSIGN TO MEMBERS
                            </Text>



                            {members.length ===
                            0 ? (

                                <View
                                    style={
                                        styles.noMembersBox
                                    }
                                >

                                    <Ionicons
                                        name="people-outline"
                                        size={24}
                                        color="#4DA3FF"
                                    />



                                    <Text
                                        style={
                                            styles.noMembersText
                                        }
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
                                                        selected &&
                                                            styles.selectMemberRowActive,
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
                                                        style={
                                                            styles.selectMemberAvatar
                                                        }
                                                    >

                                                        <Text
                                                            style={
                                                                styles.selectMemberInitial
                                                            }
                                                        >
                                                            {(
                                                                member.name ||
                                                                member.username ||
                                                                "M"
                                                            )
                                                                .charAt(
                                                                    0
                                                                )
                                                                .toUpperCase()}
                                                        </Text>

                                                    </View>



                                                    <View
                                                        style={
                                                            styles.selectMemberInfo
                                                        }
                                                    >

                                                        <Text
                                                            style={
                                                                styles.selectMemberName
                                                            }
                                                        >
                                                            {member.name ||
                                                                member.username ||
                                                                "Member"}
                                                        </Text>



                                                        <Text
                                                            style={
                                                                styles.selectMemberUsername
                                                            }
                                                        >
                                                            {member.username
                                                                ? `@${member.username}`
                                                                : "Assigned member"}
                                                        </Text>

                                                    </View>



                                                    <View
                                                        style={[
                                                            styles.checkbox,
                                                            selected &&
                                                                styles.checkboxActive,
                                                        ]}
                                                    >

                                                        {selected && (

                                                            <Ionicons
                                                                name="checkmark"
                                                                size={17}
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



                            {/* SAVE */}

                            <TouchableOpacity
                                style={
                                    styles.saveButton
                                }
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
                                            size={21}
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



                            <View
                                style={{
                                    height: 30,
                                }}
                            />

                        </ScrollView>

                    </View>

                </View>

            </Modal>



            {/* ==================================================
                BOTTOM NAV
            ================================================== */}

            <TrainerBottomNav
                active="workouts"
            />

        </View>
    );
}



// ============================================================
// DETAIL ROW
// ============================================================

function DetailRow({
    icon,
    label,
    value,
}) {

    return (

        <View
            style={
                styles.detailRow
            }
        >

            <Ionicons
                name={icon}
                size={21}
                color="#4DA3FF"
            />



            <Text
                style={
                    styles.detailLabel
                }
            >
                {label}
            </Text>



            <Text
                style={
                    styles.detailValue
                }
            >
                {value}
            </Text>

        </View>
    );
}



// ============================================================
// BOTTOM NAVIGATION
// ============================================================

function TrainerBottomNav({
    active,
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

            router.replace(
                "/trainer/workout"
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
            style={
                styles.bottomNav
            }
        >

            <NavItem
                icon="home"
                label="Home"
                active={
                    active ===
                    "home"
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
                onPress={() =>
                    goTo("workouts")
                }
            />



            <NavItem
                icon="person-outline"
                label="Profile"
                active={
                    active ===
                    "profile"
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

    // ========================================================
    // MAIN
    // ========================================================

    container: {
        flex: 1,
        backgroundColor: "#020617",
    },



    // ========================================================
    // HEADER
    // ========================================================

    header: {

        height: 112,

        paddingHorizontal: 24,

        paddingTop: 25,

        flexDirection: "row",

        alignItems: "center",

        justifyContent:
            "space-between",

        borderBottomWidth: 1,

        borderBottomColor:
            "#102044",
    },



    headerEyebrow: {

        color: "#4D9AFF",

        fontSize: 11,

        fontWeight: "900",

        letterSpacing: 2.4,

        marginBottom: 4,
    },



    headerTitle: {

        color: "#FFFFFF",

        fontSize: 29,

        fontWeight: "900",
    },



    addButton: {

        width: 58,

        height: 58,

        borderRadius: 18,

        backgroundColor:
            "#1264E8",

        alignItems:
            "center",

        justifyContent:
            "center",

        elevation: 5,

        shadowColor:
            "#1264E8",

        shadowOpacity: 0.3,

        shadowRadius: 8,

        shadowOffset: {
            width: 0,
            height: 4,
        },
    },



    // ========================================================
    // CONTENT
    // ========================================================

    scrollContent: {

        paddingHorizontal: 24,

        paddingTop: 24,

        paddingBottom: 30,
    },



    // ========================================================
    // CREATE CARD
    // ========================================================

    createCard: {

        minHeight: 130,

        backgroundColor:
            "#071321",

        borderRadius: 21,

        borderWidth: 1,

        borderColor:
            "#124783",

        paddingHorizontal: 18,

        paddingVertical: 18,

        flexDirection: "row",

        alignItems: "center",
    },



    createIcon: {

        width: 70,

        height: 70,

        borderRadius: 19,

        backgroundColor:
            "#102F69",

        alignItems:
            "center",

        justifyContent:
            "center",

        marginRight: 15,
    },



    createText: {

        flex: 1,
    },



    createTitle: {

        color: "#FFFFFF",

        fontSize: 18,

        fontWeight: "800",

        marginBottom: 5,
    },



    createSubtitle: {

        color: "#A4B4CA",

        fontSize: 12,

        lineHeight: 18,
    },



    // ========================================================
    // SECTION
    // ========================================================

    sectionHeader: {

        marginTop: 28,

        marginBottom: 13,

        flexDirection: "row",

        alignItems: "center",

        justifyContent:
            "space-between",
    },



    sectionTitle: {

        color: "#FFFFFF",

        fontSize: 18,

        fontWeight: "900",

        letterSpacing: 0.5,
    },



    sectionCountContainer: {

        flexDirection: "row",

        alignItems: "center",
    },



    sectionCount: {

        color: "#FFFFFF",

        fontSize: 20,

        fontWeight: "900",

        marginRight: 5,
    },



    // ========================================================
    // WORKOUT LIST
    // ========================================================

    workoutList: {

        backgroundColor:
            "#071321",

        borderRadius: 21,

        borderWidth: 1,

        borderColor:
            "#102D56",

        paddingHorizontal: 14,

        paddingVertical: 4,
    },



    workoutRow: {

        minHeight: 105,

        flexDirection: "row",

        alignItems: "center",

        borderBottomWidth: 1,

        borderBottomColor:
            "#102344",
    },



    workoutIcon: {

        width: 57,

        height: 57,

        borderRadius: 18,

        alignItems:
            "center",

        justifyContent:
            "center",

        marginRight: 13,
    },



    workoutIconBlue: {

        backgroundColor:
            "#173C91",
    },



    workoutIconGreen: {

        backgroundColor:
            "#075746",
    },



    workoutIconOrange: {

        backgroundColor:
            "#744300",
    },



    workoutInfo: {

        flex: 1,

        paddingRight: 10,
    },



    workoutName: {

        color: "#FFFFFF",

        fontSize: 16,

        fontWeight: "800",

        marginBottom: 4,
    },



    workoutDescription: {

        color: "#91A0B6",

        fontSize: 11,

        lineHeight: 16,

        marginBottom: 5,
    },



    assignedText: {

        color: "#4DA3FF",

        fontSize: 11,

        fontWeight: "700",
    },



    // ========================================================
    // EMPTY
    // ========================================================

    emptyCard: {

        minHeight: 230,

        backgroundColor:
            "#071321",

        borderRadius: 21,

        borderWidth: 1,

        borderColor:
            "#102D56",

        alignItems:
            "center",

        justifyContent:
            "center",

        padding: 25,
    },



    emptyMemberCard: {

        minHeight: 190,

        backgroundColor:
            "#071321",

        borderRadius: 21,

        borderWidth: 1,

        borderColor:
            "#102D56",

        alignItems:
            "center",

        justifyContent:
            "center",

        padding: 25,
    },



    emptyIcon: {

        width: 70,

        height: 70,

        borderRadius: 22,

        backgroundColor:
            "#102F69",

        alignItems:
            "center",

        justifyContent:
            "center",

        marginBottom: 15,
    },



    memberEmptyIcon: {

        width: 65,

        height: 65,

        borderRadius: 20,

        backgroundColor:
            "#102F69",

        alignItems:
            "center",

        justifyContent:
            "center",

        marginBottom: 13,
    },



    emptyTitle: {

        color: "#FFFFFF",

        fontSize: 17,

        fontWeight: "800",

        marginBottom: 5,
    },



    emptySubtitle: {

        color: "#78889F",

        fontSize: 12,

        lineHeight: 18,

        textAlign: "center",
    },



    // ========================================================
    // MEMBERS
    // ========================================================

    memberList: {

        backgroundColor:
            "#071321",

        borderRadius: 21,

        borderWidth: 1,

        borderColor:
            "#102D56",

        paddingHorizontal: 14,
    },



    memberRow: {

        minHeight: 80,

        flexDirection: "row",

        alignItems: "center",

        borderBottomWidth: 1,

        borderBottomColor:
            "#102344",
    },



    memberAvatar: {

        width: 50,

        height: 50,

        borderRadius: 17,

        backgroundColor:
            "#173C91",

        alignItems:
            "center",

        justifyContent:
            "center",

        marginRight: 13,
    },



    memberInitial: {

        color: "#FFFFFF",

        fontSize: 20,

        fontWeight: "800",
    },



    memberInfo: {

        flex: 1,
    },



    memberName: {

        color: "#FFFFFF",

        fontSize: 14,

        fontWeight: "800",

        marginBottom: 3,
    },



    memberUsername: {

        color: "#8493A8",

        fontSize: 11,
    },



    // ========================================================
    // MODAL
    // ========================================================

    modalOverlay: {

        flex: 1,

        backgroundColor:
            "rgba(0,0,0,0.72)",

        justifyContent:
            "flex-end",
    },



    modalCard: {

        backgroundColor:
            "#071321",

        borderTopLeftRadius: 28,

        borderTopRightRadius: 28,

        borderWidth: 1,

        borderColor:
            "#153E73",

        paddingHorizontal: 23,

        paddingTop: 22,

        paddingBottom: 35,

        minHeight: 330,
    },



    createModal: {

        backgroundColor:
            "#071321",

        borderTopLeftRadius: 28,

        borderTopRightRadius: 28,

        borderWidth: 1,

        borderColor:
            "#153E73",

        paddingHorizontal: 23,

        paddingTop: 22,

        paddingBottom: 15,

        maxHeight: "92%",
    },



    modalHeader: {

        flexDirection: "row",

        alignItems: "center",

        justifyContent:
            "space-between",

        marginBottom: 22,
    },



    modalTitle: {

        color: "#FFFFFF",

        fontSize: 22,

        fontWeight: "900",
    },



    modalSmallText: {

        color: "#7F90A7",

        fontSize: 11,

        marginTop: 3,
    },



    modalDescription: {

        color: "#A4B4CA",

        fontSize: 13,

        lineHeight: 20,

        marginBottom: 18,
    },



    detailRow: {

        minHeight: 52,

        flexDirection: "row",

        alignItems: "center",

        borderBottomWidth: 1,

        borderBottomColor:
            "#102344",
    },



    detailLabel: {

        color: "#7789A2",

        fontSize: 12,

        marginLeft: 12,

        flex: 1,
    },



    detailValue: {

        color: "#FFFFFF",

        fontSize: 13,

        fontWeight: "800",
    },



    modalMembers: {

        marginTop: 20,

        marginBottom: 20,
    },



    modalSectionTitle: {

        color: "#73849F",

        fontSize: 11,

        fontWeight: "900",

        letterSpacing: 1.5,

        marginBottom: 6,
    },



    modalMemberCount: {

        color: "#4DA3FF",

        fontSize: 15,

        fontWeight: "800",
    },



    deleteButton: {

        height: 54,

        borderRadius: 16,

        borderWidth: 1,

        borderColor:
            "#55202B",

        backgroundColor:
            "#100D15",

        flexDirection: "row",

        alignItems: "center",

        justifyContent:
            "center",
    },



    deleteText: {

        color: "#FF4D5E",

        fontSize: 14,

        fontWeight: "800",

        marginLeft: 8,
    },



    // ========================================================
    // FORM
    // ========================================================

    inputLabel: {

        color: "#73849F",

        fontSize: 11,

        fontWeight: "900",

        letterSpacing: 1.4,

        marginBottom: 7,

        marginTop: 7,
    },



    input: {

        height: 53,

        borderRadius: 15,

        backgroundColor:
            "#020A16",

        borderWidth: 1,

        borderColor:
            "#15345F",

        paddingHorizontal: 15,

        color: "#FFFFFF",

        fontSize: 14,

        fontWeight: "600",

        marginBottom: 12,
    },



    textArea: {

        height: 95,

        paddingTop: 14,

        textAlignVertical:
            "top",
    },



    noMembersBox: {

        minHeight: 80,

        borderRadius: 16,

        backgroundColor:
            "#020A16",

        borderWidth: 1,

        borderColor:
            "#15345F",

        flexDirection: "row",

        alignItems: "center",

        paddingHorizontal: 15,

        marginBottom: 15,
    },



    noMembersText: {

        color: "#8B9AB0",

        fontSize: 12,

        marginLeft: 10,

        flex: 1,
    },



    selectMemberRow: {

        minHeight: 70,

        borderRadius: 16,

        backgroundColor:
            "#020A16",

        borderWidth: 1,

        borderColor:
            "#122D51",

        flexDirection: "row",

        alignItems: "center",

        paddingHorizontal: 11,

        marginBottom: 8,
    },



    selectMemberRowActive: {

        backgroundColor:
            "#0A214D",

        borderColor:
            "#2F80FF",
    },



    selectMemberAvatar: {

        width: 43,

        height: 43,

        borderRadius: 14,

        backgroundColor:
            "#173C91",

        alignItems:
            "center",

        justifyContent:
            "center",

        marginRight: 11,
    },



    selectMemberInitial: {

        color: "#FFFFFF",

        fontSize: 17,

        fontWeight: "800",
    },



    selectMemberInfo: {

        flex: 1,
    },



    selectMemberName: {

        color: "#FFFFFF",

        fontSize: 13,

        fontWeight: "800",

        marginBottom: 3,
    },



    selectMemberUsername: {

        color: "#7D8EA5",

        fontSize: 10,
    },



    checkbox: {

        width: 27,

        height: 27,

        borderRadius: 9,

        borderWidth: 1,

        borderColor:
            "#365170",

        alignItems:
            "center",

        justifyContent:
            "center",
    },



    checkboxActive: {

        backgroundColor:
            "#1264E8",

        borderColor:
            "#1264E8",
    },



    saveButton: {

        height: 57,

        borderRadius: 17,

        backgroundColor:
            "#2563EB",

        marginTop: 20,

        flexDirection: "row",

        alignItems: "center",

        justifyContent:
            "center",
    },



    saveButtonText: {

        color: "#FFFFFF",

        fontSize: 14,

        fontWeight: "900",

        marginLeft: 8,
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

        backgroundColor:
            "#061321",

        borderTopWidth: 1,

        borderTopColor:
            "#0F294C",

        flexDirection: "row",

        alignItems: "center",

        justifyContent:
            "space-around",

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

        backgroundColor:
            "#102F69",
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

        backgroundColor:
            "#4DA3FF",
    },



    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {

        flex: 1,

        backgroundColor:
            "#020617",

        alignItems: "center",

        justifyContent: "center",
    },



    loadingText: {

        color: "#8793A8",

        fontSize: 14,

        marginTop: 12,
    },

});