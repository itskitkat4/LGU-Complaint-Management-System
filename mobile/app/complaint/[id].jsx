import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { getAttachmentSignedUrl, getCitizenComplaint } from "../../src/lib/api";
import { Card, ErrorBox, Splash, StatusBadge } from "../../src/components/ui";
import { formatDate, statusInfo } from "../../src/lib/status";
import { colors } from "../../src/theme";

// Loads a private file through a short-lived signed link.
function Attachment({ file }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const isImage = (file.mime_type || "").startsWith("image/");

  useEffect(() => {
    let alive = true;
    getAttachmentSignedUrl(file.id)
      .then((r) => alive && setUrl(r.signed_url))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [file.id]);

  if (failed) return <Text style={{ color: colors.danger, fontSize: 12 }}>{file.file_name}: unable to load</Text>;
  if (!url) return <ActivityIndicator style={{ width: 110, height: 110 }} />;

  if (isImage) {
    return (
      <Pressable onPress={() => Linking.openURL(url)}>
        <Image source={{ uri: url }} style={{ width: 110, height: 110, borderRadius: 10, backgroundColor: colors.border }} />
      </Pressable>
    );
  }
  return (
    <Pressable onPress={() => Linking.openURL(url)}>
      <Text style={{ color: colors.primary, fontWeight: "600" }}>Open {file.file_name}</Text>
    </Pressable>
  );
}

function Section({ title, children }) {
  return (
    <Card>
      <Text style={{ fontSize: 15, fontWeight: "800", color: colors.navy, marginBottom: 10 }}>{title}</Text>
      {children}
    </Card>
  );
}

export default function ComplaintDetails() {
  const { id } = useLocalSearchParams();
  const { session, profile, loading } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getCitizenComplaint(id);
      setComplaint(res.complaint);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [session, load]);

  if (loading) return <Splash />;
  if (!session) return <Redirect href="/login" />;
  if (profile?.role !== "citizen") return <Redirect href="/" />;
  if (!complaint) {
    return error ? <View style={{ padding: 16 }}><ErrorBox message={error} /></View> : <Splash />;
  }

  const updates = complaint.updates || [];
  const attachments = complaint.attachments || [];
  const resolutions = complaint.resolutions || [];

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 14 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <Card>
        <StatusBadge status={complaint.status} />
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 10 }}>{complaint.title}</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>
          {complaint.category?.name || "General"} | {complaint.barangay?.name || ""}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Sent {formatDate(complaint.created_at)}</Text>
        <Text style={{ color: colors.text, marginTop: 12, lineHeight: 21 }}>{complaint.description}</Text>
      </Card>

      {attachments.length > 0 && (
        <Section title="Your photos">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {attachments.map((f) => <Attachment key={f.id} file={f} />)}
          </View>
        </Section>
      )}

      {resolutions.length > 0 && (
        <Section title="Approved resolution">
          {resolutions.map((r) => (
            <View key={r.id} style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.text, lineHeight: 21 }}>{r.resolution_description}</Text>
              {r.reviewed_at ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Approved on {formatDate(r.reviewed_at)}</Text> : null}
              {(r.attachments || []).length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                  {r.attachments.map((f) => <Attachment key={f.id} file={f} />)}
                </View>
              )}
            </View>
          ))}
        </Section>
      )}

      <Section title="Status history">
        {updates.length === 0 ? (
          <Text style={{ color: colors.muted }}>No updates yet.</Text>
        ) : (
          updates.map((u, i) => (
            <View key={u.id || i} style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusInfo(u.new_status).fg, marginTop: 5 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: colors.text }}>{statusInfo(u.new_status).label}</Text>
                {u.comment ? <Text style={{ color: colors.text, marginTop: 2 }}>{u.comment}</Text> : null}
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{formatDate(u.created_at)}</Text>
              </View>
            </View>
          ))
        )}
      </Section>
    </ScrollView>
  );
}
