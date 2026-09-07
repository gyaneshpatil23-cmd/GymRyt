import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import * as SystemUI from "expo-system-ui";
import { ThemeProvider, useTheme } from "../context/ThemeContext";

function AppLayout() {
  const { colors } = useTheme();

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const setSystemBackground = async () => {
      try {
        await SystemUI.setBackgroundColorAsync(colors.background);
      } catch (error) {
        console.log("System background error:", error);
      }
    };

    setSystemBackground();
  }, [colors.background]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppLayout />
    </ThemeProvider>
  );
}