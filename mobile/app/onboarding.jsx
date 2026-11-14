import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { getBarangays, updateCitizenProfile } from "../src/lib/api";
import { Button, ErrorBox, Splash } from "../src/components/ui";
import { colors } from "../src/theme";

export default function Onboarding() {
  const { session, profile, requiresOnboarding, loading, reloadProfile } = useAuth();
  const router = useRouter();
  const [barangays, setBarangays] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getBarangays().then(setBarangays).catch((e) => setError(e.message));
  }, []);

  if (loading) return <Splash />;
  if (!session) return <Redirect href="/login" />;
  if (profile && profile.role !== "citizen") return <Redirect href="/" />;
  if (profile && !requiresOnboarding) return <Redirect href="/" />;

  async function save() {
    if (!selected) return setError("Please choose your barangay.");
    setBusy(true);
    setError("");
    try {
      await updateCitizenProfile(selected);
      await reloadProfile();
      router.replace("/");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: colors.navy }}>Choose your barangay</Text>
      <Text style={{ color: colors.muted, marginTop: 4, marginBottom: 14 }}>
        Your complaints go to the barangay you pick here.
      </Text>
      <ErrorBox message={error} />
      <FlatList
        data={barangays}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
        renderItem={({ item }) => {
          const on = selected === item.id;
          return (
            <Pressable onPress={() => setSelected(item.id)}
              style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, backgroundColor: "#fff",
                borderColor: on ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 16, color: colors.text, fontWeight: on ? "700" : "500" }}>{item.name}</Text>
            </Pressable>
          );
        }}
      />
      <View><Button title="Continue" onPress={save} loading={busy} disabled={!selected} /></View>
    </SafeAreaView>
  );
}
