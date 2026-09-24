import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.timetabmanager",
  appName: "Shift Control",
  webDir: "android-dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
