import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getCitizenComplaints } from "../../src/lib/api";
import { EmptyState, ErrorBox } from "../../src/components/ui";
import ComplaintCard from "../../src/components/ComplaintCard";

export default function Complaints() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const page = useRef(1);
  const lastPage = useRef(1);

  const loadFirst = useCallback(async () => {
    try {
      const res = await getCitizenComplaints(1);
      page.current = 1;
      lastPage.current = res.pagination?.last_page || 1;
      setItems(res.data || []);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadFirst(); }, [loadFirst]));

  async function onRefresh() {
    setRefreshing(true);
    await loadFirst();
    setRefreshing(false);
  }

  async function loadMore() {
    if (loadingMore || page.current >= lastPage.current) return;
    setLoadingMore(true);
    try {
      const next = page.current + 1;
      const res = await getCitizenComplaints(next);
      page.current = next;
      setItems((prev) => [...prev, ...(res.data || [])]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={<ErrorBox message={error} />}
      ListEmptyComponent={!error ? <EmptyState title="No complaints yet" text="Tap New to send your first complaint." /> : null}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 12 }} /> : null}
      renderItem={({ item }) => <ComplaintCard complaint={item} onPress={() => router.push(`/complaint/${item.id}`)} />}
    />
  );
}
