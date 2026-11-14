import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/context/AuthContext";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="complaint/[id]"
          options={{
            headerShown: true,
            title: "Complaint",
            headerTintColor: colors.navy,
            headerBackTitle: "Back",
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
