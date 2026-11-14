import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { getBarangays } from "../../src/lib/api";
import { Button, Card } from "../../src/components/ui";
import { colors } from "../../src/theme";

function Row({ label, value }) {
  return (
    <View style={{ paddingVertical: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{value || "-"}</Text>
    </View>
  );
}

export default function Profile() {
  const { profile, signOut } = useAuth();
  const [barangay, setBarangay] = useState("");

  useEffect(() => {
    getBarangays()
      .then((list) => setBarangay(list.find((b) => b.id === profile?.barangay_id)?.name || ""))
      .catch(() => {});
  }, [profile?.barangay_id]);

  function confirmSignOut() {
    Alert.alert("Sign out", "Do you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: handleSignOut },
    ]);
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      Alert.alert("Unable to sign out", error.message || "Please try again.");
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Card>
        <Row label="Full name" value={profile?.full_name} />
        <Row label="Email address" value={profile?.email} />
        <Row label="Barangay" value={barangay} />
      </Card>
      <Button title="Sign out" variant="danger" onPress={confirmSignOut} />
    </ScrollView>
  );
}
