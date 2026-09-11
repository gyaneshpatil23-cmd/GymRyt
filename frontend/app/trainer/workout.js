import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../context/ThemeContext";

const BASE_URL =
  "http://192.168.1.49:8000/api/members";

const MEMBERS_API =
  `${BASE_URL}/`;

const WORKOUTS_API =
  `${BASE_URL}/trainer/workouts/`;

// ============================================================
// DEFAULT EXERCISE
// ============================================================

const createExercise = () => ({
  day: "Day 1",
  name: "",
  sets: "3",
  reps: "10",
  rest: "60 sec",
});

// ============================================================
// WORKOUT SCREEN
// ============================================================

export default function TrainerWorkout() {
  const { colors } = useTheme();

  const [members, setMembers] = useState([]);
  const [workouts, setWorkouts] = useState([]);

  const [selectedMember, setSelectedMember] =
    useState(null);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [daysPerWeek, setDaysPerWeek] =
    useState("3");

  const [schedule, setSchedule] =
    useState("Monday • Wednesday • Friday");

  const [notes, setNotes] =
    useState("");

  const [exercises, setExercises] =
    useState([createExercise()]);

  const [membersLoading, setMembersLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [workoutsLoading, setWorkoutsLoading] =
    useState(true);

  const [showMembers, setShowMembers] =
    useState(false);

  // ==========================================================
  // SESSION
  // ==========================================================

  const getToken = async () => {
    return await AsyncStorage.getItem(
      "adminToken"
    );
  };

  const expireSession = async () => {
    await AsyncStorage.multiRemove([
      "adminToken",
      "adminUsername",
      "adminId",
      "userRole",
      "workspaceId",
      "workspaceName",
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
  };

  // ==========================================================
  // FETCH MEMBERS
  // ==========================================================

  const fetchMembers = useCallback(
    async () => {
      try {
        setMembersLoading(true);

        const token = await getToken();

        if (!token) {
          await expireSession();
          return;
        }

        const response = await fetch(
          MEMBERS_API,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Token ${token}`,
            },
          }
        );

        if (response.status === 401) {
          await expireSession();
          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load assigned members."
          );
        }

        const list =
          Array.isArray(data)
            ? data
            : data.results ||
              data.members ||
              [];

        setMembers(list);

      } catch (error) {
        console.log(
          "WORKOUT MEMBERS ERROR:",
          error
        );

        Alert.alert(
          "Error",
          error.message ||
            "Could not load your members."
        );

      } finally {
        setMembersLoading(false);
      }
    },
    []
  );

  // ==========================================================
  // FETCH EXISTING WORKOUTS
  // ==========================================================

  const fetchWorkouts = useCallback(
    async () => {
      try {
        setWorkoutsLoading(true);

        const token = await getToken();

        if (!token) {
          await expireSession();
          return;
        }

        const response = await fetch(
          WORKOUTS_API,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Token ${token}`,
            },
          }
        );

        if (response.status === 401) {
          await expireSession();
          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load workouts."
          );
        }

        setWorkouts(
          Array.isArray(data.workouts)
            ? data.workouts
            : []
        );

      } catch (error) {
        console.log(
          "WORKOUT LIST ERROR:",
          error
        );

      } finally {
        setWorkoutsLoading(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
      fetchWorkouts();
    }, [
      fetchMembers,
      fetchWorkouts,
    ])
  );

  // ==========================================================
  // EXERCISE HELPERS
  // ==========================================================

  const updateExercise = (
    index,
    field,
    value
  ) => {
    setExercises((previous) =>
      previous.map(
        (exercise, exerciseIndex) =>
          exerciseIndex === index
            ? {
                ...exercise,
                [field]: value,
              }
            : exercise
      )
    );
  };

  const addExercise = () => {
    setExercises((previous) => [
      ...previous,
      {
        ...createExercise(),
        day: `Day ${
          Math.min(
            Number(daysPerWeek) || 1,
            7
          )
        }`,
      },
    ]);
  };

  const removeExercise = (index) => {
    if (exercises.length === 1) {
      Alert.alert(
        "Workout",
        "Keep at least one exercise."
      );
      return;
    }

    setExercises((previous) =>
      previous.filter(
        (_, exerciseIndex) =>
          exerciseIndex !== index
      )
    );
  };

  // ==========================================================
  // RESET FORM
  // ==========================================================

  const resetForm = () => {
    setSelectedMember(null);
    setTitle("");
    setDescription("");
    setDaysPerWeek("3");
    setSchedule(
      "Monday • Wednesday • Friday"
    );
    setNotes("");
    setExercises([createExercise()]);
  };

  // ==========================================================
  // CREATE WORKOUT
  // ==========================================================

  const createWorkout = async () => {
    if (!selectedMember) {
      Alert.alert(
        "Select Member",
        "Please select a member first."
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert(
        "Workout Title",
        "Please enter a workout title."
      );
      return;
    }

    const parsedDays =
      Number(daysPerWeek);

    if (
      !Number.isInteger(parsedDays) ||
      parsedDays < 1 ||
      parsedDays > 7
    ) {
      Alert.alert(
        "Invalid Days",
        "Days per week must be between 1 and 7."
      );
      return;
    }

    const cleanedExercises =
      exercises
        .map((exercise) => ({
          day:
            exercise.day?.trim() ||
            "Day 1",

          name:
            exercise.name?.trim() ||
            "",

          sets:
            Number(exercise.sets) || 0,

          reps:
            exercise.reps?.trim() ||
            "",

          rest:
            exercise.rest?.trim() ||
            "",
        }))
        .filter(
          (exercise) =>
            exercise.name.length > 0
        );

    if (!cleanedExercises.length) {
      Alert.alert(
        "Exercises Required",
        "Add at least one exercise."
      );
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      if (!token) {
        await expireSession();
        return;
      }

      const payload = {
        member: selectedMember.id,
        title: title.trim(),
        description:
          description.trim() || "",
        days_per_week:
          parsedDays,
        schedule:
          schedule.trim() || "",
        exercises:
          cleanedExercises,
        notes:
          notes.trim() || "",
      };

      const response = await fetch(
        WORKOUTS_API,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
            Authorization:
              `Token ${token}`,
          },
          body: JSON.stringify(
            payload
          ),
        }
      );

      if (response.status === 401) {
        await expireSession();
        return;
      }

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        const message =
          data.message ||
          Object.values(data)
            .flat()
            .join("\n") ||
          "Unable to create workout.";

        throw new Error(message);
      }

      Alert.alert(
        "Workout Assigned",
        `${title.trim()} has been assigned to ${selectedMember.name}.`
      );

      resetForm();
      await fetchWorkouts();

    } catch (error) {
      console.log(
        "CREATE WORKOUT ERROR:",
        error
      );

      Alert.alert(
        "Could Not Create Workout",
        error.message ||
          "Something went wrong."
      );

    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // DELETE WORKOUT
  // ==========================================================

  const deleteWorkout = (
    workout
  ) => {
    Alert.alert(
      "Remove Workout",
      `Remove "${workout.title}" from ${workout.member_name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            confirmDeleteWorkout(
              workout.id
            ),
        },
      ]
    );
  };

  const confirmDeleteWorkout =
    async (workoutId) => {
      try {
        const token =
          await getToken();

        if (!token) {
          await expireSession();
          return;
        }

        const response =
          await fetch(
            `${WORKOUTS_API}${workoutId}/`,
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

        if (response.status === 401) {
          await expireSession();
          return;
        }

        const data =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Unable to remove workout."
          );
        }

        setWorkouts(
          (previous) =>
            previous.filter(
              (workout) =>
                workout.id !==
                workoutId
            )
        );

      } catch (error) {
        Alert.alert(
          "Error",
          error.message ||
            "Could not remove workout."
        );
      }
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    membersLoading &&
    workoutsLoading
  ) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                colors.mutedText,
            },
          ]}
        >
          Loading workout studio...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // SCREEN
  // ==========================================================

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor:
              colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          style={[
            styles.backButton,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.backIcon,
              {
                color: colors.text,
              },
            ]}
          >
            ←
          </Text>
        </Pressable>

        <View
          style={styles.headerTextBox}
        >
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.text,
              },
            ]}
          >
            Workout Studio
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            Design • Assign • Manage
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
      >
        {/* ==================================================
            CREATE WORKOUT
        ================================================== */}

        <View
          style={[
            styles.card,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              {
                color: colors.text,
              },
            ]}
          >
            DESIGN NEW WORKOUT
          </Text>

          {/* MEMBER */}

          <Text
            style={[
              styles.label,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            ASSIGN TO MEMBER
          </Text>

          <Pressable
            onPress={() =>
              setShowMembers(
                (previous) =>
                  !previous
              )
            }
            style={[
              styles.selectBox,
              {
                borderColor:
                  colors.border,
                backgroundColor:
                  colors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.selectText,
                {
                  color:
                    selectedMember
                      ? colors.text
                      : colors.mutedText,
                },
              ]}
            >
              {selectedMember
                ? selectedMember.name
                : "Select your member"}
            </Text>

            <Text
              style={[
                styles.selectArrow,
                {
                  color:
                    colors.primary,
                },
              ]}
            >
              {showMembers
                ? "▲"
                : "▼"}
            </Text>
          </Pressable>

          {showMembers && (
            <View
              style={[
                styles.memberList,
                {
                  backgroundColor:
                    colors.background,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              {members.length === 0 ? (
                <Text
                  style={[
                    styles.emptyText,
                    {
                      color:
                        colors.mutedText,
                    },
                  ]}
                >
                  No members are assigned
                  to you yet.
                </Text>
              ) : (
                members.map(
                  (member) => (
                    <Pressable
                      key={
                        member.id
                      }
                      onPress={() => {
                        setSelectedMember(
                          member
                        );
                        setShowMembers(
                          false
                        );
                      }}
                      style={[
                        styles.memberOption,
                        {
                          borderBottomColor:
                            colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.memberAvatar,
                          {
                            backgroundColor:
                              colors.primary,
                          },
                        ]}
                      >
                        <Text
                          style={
                            styles.memberAvatarText
                          }
                        >
                          {(
                            member.name ||
                            "M"
                          )
                            .slice(
                              0,
                              1
                            )
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.memberOptionText
                        }
                      >
                        <Text
                          style={[
                            styles.memberName,
                            {
                              color:
                                colors.text,
                            },
                          ]}
                        >
                          {member.name}
                        </Text>

                        <Text
                          style={[
                            styles.memberMeta,
                            {
                              color:
                                colors.mutedText,
                            },
                          ]}
                        >
                          {member.phone ||
                            member.username ||
                            "Member"}
                        </Text>
                      </View>

                      {selectedMember?.id ===
                        member.id && (
                        <Text
                          style={[
                            styles.check,
                            {
                              color:
                                colors.primary,
                            },
                          ]}
                        >
                          ✓
                        </Text>
                      )}
                    </Pressable>
                  )
                )
              )}
            </View>
          )}

          {/* TITLE */}

          <Text
            style={[
              styles.label,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            WORKOUT TITLE
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Fat Loss • Beginner Strength"
            placeholderTextColor={
              colors.mutedText
            }
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor:
                  colors.border,
                backgroundColor:
                  colors.background,
              },
            ]}
          />

          {/* DESCRIPTION */}

          <Text
            style={[
              styles.label,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            DESCRIPTION
          </Text>

          <TextInput
            value={description}
            onChangeText={
              setDescription
            }
            placeholder="Short goal or focus of this plan"
            placeholderTextColor={
              colors.mutedText
            }
            multiline
            style={[
              styles.input,
              styles.textArea,
              {
                color: colors.text,
                borderColor:
                  colors.border,
                backgroundColor:
                  colors.background,
              },
            ]}
          />

          {/* DAYS */}

          <Text
            style={[
              styles.label,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            DAYS PER WEEK
          </Text>

          <View
            style={styles.chipRow}
          >
            {[1, 2, 3, 4, 5, 6, 7].map(
              (day) => {
                const active =
                  Number(
                    daysPerWeek
                  ) === day;

                return (
                  <Pressable
                    key={day}
                    onPress={() =>
                      setDaysPerWeek(
                        String(day)
                      )
                    }
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor:
                          active
                            ? colors.primary
                            : colors.background,
                        borderColor:
                          active
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        {
                          color:
                            active
                              ? "#FFFFFF"
                              : colors.text,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>

          {/* SCHEDULE */}

          <Text
            style={[
              styles.label,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            SCHEDULE
          </Text>

          <TextInput
            value={schedule}
            onChangeText={setSchedule}
            placeholder="Monday • Wednesday • Friday"
            placeholderTextColor={
              colors.mutedText
            }
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor:
                  colors.border,
                backgroundColor:
                  colors.background,
              },
            ]}
          />

          {/* EXERCISES */}

          <View
            style={styles.exerciseHeader}
          >
            <Text
              style={[
                styles.label,
                styles.exerciseHeaderLabel,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              EXERCISES
            </Text>

            <Text
              style={[
                styles.exerciseCount,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              {exercises.length} exercise
              {exercises.length === 1
                ? ""
                : "s"}
            </Text>
          </View>

          {exercises.map(
            (exercise, index) => (
              <View
                key={index}
                style={[
                  styles.exerciseCard,
                  {
                    backgroundColor:
                      colors.background,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <View
                  style={
                    styles.exerciseTop
                  }
                >
                  <Text
                    style={[
                      styles.exerciseNumber,
                      {
                        color:
                          colors.primary,
                      },
                    ]}
                  >
                    {String(
                      index + 1
                    ).padStart(2, "0")}
                  </Text>

                  <Text
                    style={[
                      styles.exerciseTitle,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    EXERCISE
                  </Text>

                  <Pressable
                    onPress={() =>
                      removeExercise(
                        index
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.removeExercise,
                        {
                          color:
                            colors.danger,
                        },
                      ]}
                    >
                      REMOVE
                    </Text>
                  </Pressable>
                </View>

                <TextInput
                  value={
                    exercise.name
                  }
                  onChangeText={(value) =>
                    updateExercise(
                      index,
                      "name",
                      value
                    )
                  }
                  placeholder="Exercise name"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  style={[
                    styles.input,
                    {
                      color:
                        colors.text,
                      borderColor:
                        colors.border,
                      backgroundColor:
                        colors.card,
                    },
                  ]}
                />

                <View
                  style={
                    styles.exerciseGrid
                  }
                >
                  <SmallInput
                    label="DAY"
                    value={
                      exercise.day
                    }
                    onChangeText={(
                      value
                    ) =>
                      updateExercise(
                        index,
                        "day",
                        value
                      )
                    }
                    colors={colors}
                  />

                  <SmallInput
                    label="SETS"
                    value={
                      exercise.sets
                    }
                    onChangeText={(
                      value
                    ) =>
                      updateExercise(
                        index,
                        "sets",
                        value
                      )
                    }
                    keyboardType="numeric"
                    colors={colors}
                  />

                  <SmallInput
                    label="REPS"
                    value={
                      exercise.reps
                    }
                    onChangeText={(
                      value
                    ) =>
                      updateExercise(
                        index,
                        "reps",
                        value
                      )
                    }
                    colors={colors}
                  />

                  <SmallInput
                    label="REST"
                    value={
                      exercise.rest
                    }
                    onChangeText={(
                      value
                    ) =>
                      updateExercise(
                        index,
                        "rest",
                        value
                      )
                    }
                    colors={colors}
                  />
                </View>
              </View>
            )
          )}

          <Pressable
            onPress={addExercise}
            style={[
              styles.addExerciseButton,
              {
                borderColor:
                  colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.addExerciseText,
                {
                  color:
                    colors.primaryLight,
                },
              ]}
            >
              + ADD EXERCISE
            </Text>
          </Pressable>

          {/* NOTES */}

          <Text
            style={[
              styles.label,
              {
                color:
                  colors.mutedText,
              },
            ]}
          >
            TRAINER NOTES
          </Text>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add instructions, precautions or goals..."
            placeholderTextColor={
              colors.mutedText
            }
            multiline
            style={[
              styles.input,
              styles.textAreaLarge,
              {
                color: colors.text,
                borderColor:
                  colors.border,
                backgroundColor:
                  colors.background,
              },
            ]}
          />

          {/* SAVE */}

          <Pressable
            onPress={createWorkout}
            disabled={saving}
            style={[
              styles.saveButton,
              {
                backgroundColor:
                  colors.primary,
                opacity: saving
                  ? 0.65
                  : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <>
                <Text
                  style={
                    styles.saveIcon
                  }
                >
                  💪
                </Text>

                <Text
                  style={
                    styles.saveText
                  }
                >
                  ASSIGN WORKOUT
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* ==================================================
            EXISTING WORKOUTS
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.mutedText,
            },
          ]}
        >
          ASSIGNED WORKOUTS
        </Text>

        {workoutsLoading ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />
        ) : workouts.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              No workouts yet
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color:
                    colors.mutedText,
                },
              ]}
            >
              Create your first workout
              above and assign it to one
              of your members.
            </Text>
          </View>
        ) : (
          workouts.map(
            (workout) => (
              <View
                key={workout.id}
                style={[
                  styles.workoutCard,
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
                    styles.workoutCardTop
                  }
                >
                  <View
                    style={
                      styles.workoutTitleBox
                    }
                  >
                    <Text
                      style={[
                        styles.workoutTitle,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                    >
                      {workout.title}
                    </Text>

                    <Text
                      style={[
                        styles.workoutMember,
                        {
                          color:
                            colors.primaryLight,
                        },
                      ]}
                    >
                      {workout.member_name ||
                        "Member"}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      deleteWorkout(
                        workout
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.removeExercise,
                        {
                          color:
                            colors.danger,
                        },
                      ]}
                    >
                      REMOVE
                    </Text>
                  </Pressable>
                </View>

                <View
                  style={
                    styles.statsRow
                  }
                >
                  <WorkoutStat
                    label="DAYS"
                    value={
                      workout.days_per_week
                    }
                    colors={colors}
                  />

                  <WorkoutStat
                    label="EXERCISES"
                    value={
                      Array.isArray(
                        workout.exercises
                      )
                        ? workout
                            .exercises
                            .length
                        : 0
                    }
                    colors={colors}
                  />

                  <WorkoutStat
                    label="SCHEDULE"
                    value={
                      workout.schedule ||
                      "Flexible"
                    }
                    colors={colors}
                    wide
                  />
                </View>
              </View>
            )
          )
        )}

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// SMALL INPUT
// ============================================================

function SmallInput({
  label,
  value,
  onChangeText,
  keyboardType,
  colors,
}) {
  return (
    <View
      style={styles.smallInputBox}
    >
      <Text
        style={[
          styles.smallLabel,
          {
            color:
              colors.mutedText,
          },
        ]}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={
          keyboardType || "default"
        }
        placeholderTextColor={
          colors.mutedText
        }
        style={[
          styles.smallInput,
          {
            color: colors.text,
            borderColor:
              colors.border,
            backgroundColor:
              colors.card,
          },
        ]}
      />
    </View>
  );
}

// ============================================================
// WORKOUT STAT
// ============================================================

function WorkoutStat({
  label,
  value,
  colors,
  wide = false,
}) {
  return (
    <View
      style={[
        styles.workoutStat,
        wide && styles.workoutStatWide,
      ]}
    >
      <Text
        style={[
          styles.workoutStatLabel,
          {
            color:
              colors.mutedText,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.workoutStatValue,
          {
            color:
              colors.text,
          },
        ]}
        numberOfLines={2}
      >
        {String(value)}
      </Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "600",
  },

  header: {
    minHeight: 105,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },

  backButton: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    fontSize: 31,
    fontWeight: "300",
  },

  headerTextBox: {
    flex: 1,
    marginLeft: 18,
  },

  headerTitle: {
    fontSize: 27,
    fontWeight: "900",
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
  },

  content: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
  },

  card: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 24,
  },

  cardTitle: {
    fontSize: 18,
    letterSpacing: 2,
    fontWeight: "900",
    marginBottom: 26,
  },

  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 22,
    marginBottom: 10,
  },

  selectBox: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },

  selectArrow: {
    fontSize: 15,
    marginLeft: 10,
  },

  memberList: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 17,
    overflow: "hidden",
  },

  memberOption: {
    minHeight: 72,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },

  memberAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  memberAvatarText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },

  memberOptionText: {
    flex: 1,
  },

  memberName: {
    fontSize: 16,
    fontWeight: "800",
  },

  memberMeta: {
    marginTop: 3,
    fontSize: 12,
  },

  check: {
    fontSize: 24,
    fontWeight: "900",
  },

  input: {
    minHeight: 55,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: "600",
  },

  textArea: {
    minHeight: 92,
    paddingTop: 15,
    textAlignVertical: "top",
  },

  textAreaLarge: {
    minHeight: 125,
    paddingTop: 15,
    textAlignVertical: "top",
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  dayChip: {
    width: 43,
    height: 43,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  dayChipText: {
    fontSize: 15,
    fontWeight: "900",
  },

  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },

  exerciseHeaderLabel: {
    marginBottom: 10,
  },

  exerciseCount: {
    fontSize: 12,
    fontWeight: "800",
  },

  exerciseCard: {
    borderWidth: 1,
    borderRadius: 21,
    padding: 16,
    marginBottom: 13,
  },

  exerciseTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  exerciseNumber: {
    fontSize: 16,
    fontWeight: "900",
    marginRight: 10,
  },

  exerciseTitle: {
    flex: 1,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: "900",
  },

  removeExercise: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  exerciseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },

  smallInputBox: {
    width: "48%",
  },

  smallLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },

  smallInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 11,
    fontSize: 13,
    fontWeight: "700",
  },

  addExerciseButton: {
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  addExerciseText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },

  saveButton: {
    minHeight: 62,
    borderRadius: 19,
    marginTop: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  saveIcon: {
    fontSize: 22,
    marginRight: 10,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    letterSpacing: 1.5,
    fontWeight: "900",
  },

  sectionTitle: {
    marginTop: 48,
    marginBottom: 20,
    fontSize: 17,
    letterSpacing: 2.5,
    fontWeight: "900",
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 25,
    padding: 25,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "900",
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },

  workoutCard: {
    borderWidth: 1,
    borderRadius: 25,
    padding: 20,
    marginBottom: 13,
  },

  workoutCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  workoutTitleBox: {
    flex: 1,
    paddingRight: 15,
  },

  workoutTitle: {
    fontSize: 18,
    fontWeight: "900",
  },

  workoutMember: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800",
  },

  statsRow: {
    marginTop: 18,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.25)",
    flexDirection: "row",
    gap: 12,
  },

  workoutStat: {
    flex: 1,
  },

  workoutStatWide: {
    flex: 2,
  },

  workoutStatLabel: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "800",
  },

  workoutStatValue: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 35,
  },
});
