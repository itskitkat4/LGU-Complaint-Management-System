import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { getCitizenComplaints } from "../../src/lib/api";
import { Button, Card, EmptyState, ErrorBox } from "../../src/components/ui";
import ComplaintCard from "../../src/components/ComplaintCard";
import { colors } from "../../src/theme";

const EMPTY = { total: 0, pending_review: 0, in_progress: 0, resolved: 0 };

function Stat({ label, value }) {
  return (
    <Card style={{ flex: 1, minWidth: "45%" }}>
      <Text style={{ fontSize: 26, fontWeight: "800", color: colors.navy }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
    </Card>
  );
}

export default function Home() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(EMPTY);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getCitizenComplaints(1);
      setStats(res.statistics || EMPTY);
      setRecent((res.data || []).slice(0, 3));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.navy }}>
          Hello, {(profile?.full_name || "Citizen").split(" ")[0]}
        </Text>
        <Text style={{ color: colors.muted }}>Here is where your complaints stand.</Text>
      </View>

      <ErrorBox message={error} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Waiting for review" value={stats.pending_review} />
        <Stat label="In progress" value={stats.in_progress} />
        <Stat label="Resolved" value={stats.resolved} />
      </View>

      <Button title="File a new complaint" onPress={() => router.push("/new")} />

      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.navy }}>Latest complaints</Text>
      {recent.length === 0 ? (
        <EmptyState title="No complaints yet" text="Your submitted complaints will appear here." />
      ) : (
        recent.map((c) => <ComplaintCard key={c.id} complaint={c} onPress={() => router.push(`/complaint/${c.id}`)} />)
      )}
    </ScrollView>
  );
}
