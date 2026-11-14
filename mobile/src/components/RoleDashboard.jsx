import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { ROLE_HOME } from "../config";
import { Button, Card, Splash } from "./ui";
import { colors } from "../theme";

export default function RoleDashboard({ role, title, modules }) {
  const { loading, session, profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (loading) return <Splash />;
  if (!session) return <Redirect href="/login" />;
  if (!profile) return <Redirect href="/" />;
  if (profile.role !== role) return <Redirect href={ROLE_HOME[profile.role] || "/login"} />;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      Alert.alert("Unable to sign out", error.message || "Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 14, backgroundColor: colors.bg }}>
      <View>
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}>{role}</Text>
        <Text style={{ color: colors.navy, fontSize: 25, fontWeight: "800", marginTop: 4 }}>{title}</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>
          Welcome, {profile.full_name || profile.email || "team member"}.
        </Text>
      </View>

      <Card>
        <Text style={{ color: colors.navy, fontSize: 16, fontWeight: "800", marginBottom: 6 }}>
          Your workspace
        </Text>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Your account is verified and access is limited to this role. Role modules will be migrated in Phase 3.
        </Text>
      </Card>

      {modules.map((module) => (
        <Card key={module}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>{module}</Text>
        </Card>
      ))}

      <Button title="Sign out" variant="outline" loading={signingOut} onPress={handleSignOut} />
    </ScrollView>
  );
}
