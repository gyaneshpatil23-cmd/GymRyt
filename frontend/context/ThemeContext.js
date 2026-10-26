import React, {
  createContext,
  useContext,
  useState,
} from "react";

import { crest } from "../constants/brand";

// ============================================================
// DARK THEME (GYMRYT CREST)
// ============================================================

const darkTheme = {
  mode: "dark",

  background: crest.bg,
  backgroundSecondary: "#15112A",
  card: crest.surface,
  cardSecondary: "#201A3A",
  cardElevated: crest.surfaceRaised,
  surface: crest.surfaceRaised,
  input: crest.bg,
  nav: "#15112A",

  text: crest.text,
  secondaryText: crest.textSecondary,
  mutedText: crest.textMuted,

  border: crest.border,
  borderLight: "#3A3260",
  inputBorder: crest.border,

  primary: crest.primary,
  primaryDark: crest.primaryHover,
  primaryLight: crest.brand,

  gold: crest.gold,
  info: crest.info,

  iconBackground: crest.primaryTint,

  success: crest.success,
  successBackground: "#12302A",

  warning: crest.warning,
  warningBackground: "#3A2A12",

  danger: crest.danger,
  dangerBackground: "#3D1824",

  revenue: crest.success,
};

// ============================================================
// LIGHT THEME (GYMRYT CREST)
// ============================================================

const lightTheme = {
  mode: "light",

  background: "#F6F4FB",
  backgroundSecondary: "#EEEBF7",
  card: "#FFFFFF",
  cardSecondary: "#FAF9FD",
  cardElevated: "#FFFFFF",
  surface: "#FAF9FD",
  input: "#FFFFFF",
  nav: "#FFFFFF",

  text: crest.bg,
  secondaryText: "#4F4868",
  mutedText: crest.textMuted,

  border: "#E4E0F0",
  borderLight: "#D3CCE6",
  inputBorder: "#D3CCE6",

  primary: crest.primary,
  primaryDark: crest.primaryHover,
  primaryLight: crest.primaryHover,

  gold: "#8A6410",
  info: "#2F7DD8",

  iconBackground: "#ECE8FF",

  success: "#059669",
  successBackground: "#D1FAE5",

  warning: "#B45309",
  warningBackground: "#FEF3C7",

  danger: "#D93950",
  dangerBackground: "#FDE4E8",

  revenue: "#059669",
};

// ============================================================
// CONTEXT
// ============================================================

const ThemeContext = createContext(null);

// ============================================================
// PROVIDER
// ============================================================

export function ThemeProvider({ children }) {
  // Dark mode is always the default
  const [isDark, setIsDark] = useState(true);

  // ==========================================================
  // TOGGLE THEME
  // ==========================================================

  const toggleTheme = () => {
    setIsDark((current) => !current);
  };

  // ==========================================================
  // CURRENT COLORS
  // ==========================================================

  const colors = isDark
    ? darkTheme
    : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        colors,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================
// CUSTOM HOOK
// ============================================================

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}
