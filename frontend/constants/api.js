import Constants from "expo-constants";


// ============================================================
// SERVER URL
// ============================================================

// The phone reaches Metro at the PC's LAN IP (e.g. "192.168.1.39:8081"),
// and Django runs on that same PC, so reuse that host for the API.
// This keeps working when the router hands the PC a new IP.

const DEV_HOST =
  Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";

export const SERVER_URL = `http://${DEV_HOST}:8000`;
