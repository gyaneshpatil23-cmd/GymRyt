import React, {
  createContext,
  useContext,
  useState,
} from "react";

// ============================================================
// DARK THEME
// ============================================================

const darkTheme = {
  mode: "dark",

  background: "#050816",
  card: "#0B1220",
  input: "#0D0D0D",
  nav: "#080D19",

  text: "#FFFFFF",
  secondaryText: "#94A3B8",
  mutedText: "#64748B",

  border: "#172554",
  inputBorder: "#334155",

  primary: "#2563EB",
  primaryLight: "#60A5FA",

  iconBackground: "#172554",

  success: "#22C55E",
  successBackground: "#052E16",

  warning: "#F59E0B",
  warningBackground: "#451A03",

  danger: "#EF4444",
  dangerBackground: "#450A0A",

  revenue: "#22C55E",
};

// ============================================================
// LIGHT THEME
// ============================================================

const lightTheme = {
  mode: "light",

  background: "#F8FAFC",
  card: "#FFFFFF",
  input: "#FFFFFF",
  nav: "#FFFFFF",

  text: "#0F172A",
  secondaryText: "#475569",
  mutedText: "#64748B",

  border: "#E2E8F0",
  inputBorder: "#CBD5E1",

  primary: "#2563EB",
  primaryLight: "#2563EB",

  iconBackground: "#DBEAFE",

  success: "#16A34A",
  successBackground: "#DCFCE7",

  warning: "#D97706",
  warningBackground: "#FEF3C7",

  danger: "#DC2626",
  dangerBackground: "#FEE2E2",

  revenue: "#16A34A",
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
