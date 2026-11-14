import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";
import { Splash } from "../../src/components/ui";
import { colors } from "../../src/theme";
import { ROLE_HOME } from "../../src/config";

export default function TabsLayout() {
  const { loading, session, profile, requiresOnboarding } = useAuth();

  if (loading) return <Splash />;
  if (!session) return <Redirect href="/login" />;
  if (!profile) return <Redirect href="/" />;
  if (requiresOnboarding) return <Redirect href="/onboarding" />;
  if (profile.role !== "citizen") return <Redirect href={ROLE_HOME[profile.role] || "/login"} />;

  const icon = (name) => {
    function TabIcon({ color, size }) {
      return <Ionicons name={name} size={size} color={color} />;
    }

    return TabIcon;
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerStyle: { backgroundColor: "#fff" },
        headerTitleStyle: { color: colors.navy, fontWeight: "800" },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="complaints" options={{ title: "My complaints", tabBarLabel: "Complaints", tabBarIcon: icon("list-outline") }} />
      <Tabs.Screen name="new" options={{ title: "New complaint", tabBarLabel: "New", tabBarIcon: icon("add-circle-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("person-outline") }} />
    </Tabs>
  );
}
