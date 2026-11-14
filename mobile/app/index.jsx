import { Alert, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { Button, ErrorBox, Splash } from "../src/components/ui";
import { colors } from "../src/theme";
import { ROLE_HOME } from "../src/config";

// Decides where to send the user at app start.
export default function Index() {
  const { loading, session, profile, requiresOnboarding, authError, reloadProfile, signOut } = useAuth();

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      Alert.alert("Unable to sign out", error.message || "Please try again.");
    }
  }

  if (loading) return <Splash />;
  if (!session) return <Redirect href="/login" />;

  // Signed in, but the profile request failed (for example no network).
  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 }}>
          We could not load your account
        </Text>
        <ErrorBox message={authError} />
        <Button title="Try again" onPress={reloadProfile} style={{ marginBottom: 10 }} />
        <Button title="Sign out" variant="outline" onPress={handleSignOut} />
      </View>
    );
  }

  if (requiresOnboarding) return <Redirect href="/onboarding" />;
  return <Redirect href={ROLE_HOME[profile.role] || "/login"} />;
}
