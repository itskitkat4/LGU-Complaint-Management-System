import { Pressable, Text, View } from "react-native";
import { Card, StatusBadge } from "./ui";
import { formatDate } from "../lib/status";
import { colors } from "../theme";

export default function ComplaintCard({ complaint, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: colors.text }} numberOfLines={2}>
            {complaint.title}
          </Text>
          <StatusBadge status={complaint.status} />
        </View>
        <Text style={{ color: colors.muted, marginTop: 6, fontSize: 13 }}>
          {complaint.category?.name || "General"} | {complaint.barangay?.name || ""}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12 }}>{formatDate(complaint.created_at)}</Text>
      </Card>
    </Pressable>
  );
}
