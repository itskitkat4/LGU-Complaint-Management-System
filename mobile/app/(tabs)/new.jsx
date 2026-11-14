import { useCallback, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { createComplaint, getComplaintCategories } from "../../src/lib/api";
import { Button, ErrorBox, Field } from "../../src/components/ui";
import { colors } from "../../src/theme";

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;

export default function NewComplaint() {
  const { profile } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      getComplaintCategories().then(setCategories).catch((e) => setError(e.message));
    }, [])
  );

  function addAssets(assets) {
    const room = MAX_PHOTOS - photos.length;
    const accepted = [];
    for (const a of assets.slice(0, room)) {
      if (a.fileSize && a.fileSize > MAX_BYTES) {
        Alert.alert("Photo too large", "Each photo must be 5 MB or smaller.");
        continue;
      }
      accepted.push({
        uri: a.uri,
        name: a.fileName || `photo-${Date.now()}-${accepted.length}.jpg`,
        type: a.mimeType && a.mimeType.startsWith("image/") ? a.mimeType : "image/jpeg",
      });
    }
    setPhotos((prev) => [...prev, ...accepted]);
  }

  async function pickFromLibrary() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.7, // also converts HEIC photos to JPEG
    });
    if (!res.canceled) addAssets(res.assets);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Camera blocked", "Allow camera access in your phone settings.");
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled) addAssets(res.assets);
  }

  function addPhoto() {
    if (photos.length >= MAX_PHOTOS) return Alert.alert("Limit reached", `You can attach up to ${MAX_PHOTOS} photos.`);
    Alert.alert("Add a photo", "Choose a source", [
      { text: "Take photo", onPress: takePhoto },
      { text: "Choose from library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function submit() {
    if (!categoryId) return setError("Please choose a category.");
    if (!title.trim()) return setError("Please enter a title.");
    if (description.trim().length < 10) return setError("Please describe the problem in at least 10 characters.");
    if (!profile?.barangay_id) return setError("Your barangay is missing. Sign out and sign in again.");

    setBusy(true);
    setError("");
    try {
      const res = await createComplaint({
        barangay_id: profile.barangay_id,
        category_id: categoryId,
        title: title.trim(),
        description: description.trim(),
        photos,
      });
      setTitle(""); setDescription(""); setPhotos([]); setCategoryId(null);
      const id = res.complaint?.id;
      Alert.alert("Complaint sent", "You will see updates in your complaint list.");
      if (id) router.push(`/complaint/${id}`);
      else router.push("/complaints");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <ErrorBox message={error} />

        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 8 }}>Category</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {categories.map((c) => {
            const on = categoryId === c.id;
            return (
              <Pressable key={c.id} onPress={() => setCategoryId(c.id)}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5,
                  borderColor: on ? colors.primary : colors.border, backgroundColor: on ? "#DBEAFE" : "#fff" }}>
                <Text style={{ color: on ? colors.primary : colors.text, fontWeight: on ? "700" : "500" }}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Short summary of the problem" maxLength={255} />
        <Field label="Description" value={description} onChangeText={setDescription} multiline textAlignVertical="top"
          placeholder="What happened, where and when?" style={{ minHeight: 120, paddingTop: 12 }} />

        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 8 }}>
          Photos ({photos.length}/{MAX_PHOTOS})
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          {photos.map((p, i) => (
            <View key={p.uri + i}>
              <Image source={{ uri: p.uri }} style={{ width: 84, height: 84, borderRadius: 10 }} />
              <Pressable onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
                  backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "800", lineHeight: 18 }}>x</Text>
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable onPress={addPhoto}
              style={{ width: 84, height: 84, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed",
                borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Add</Text>
            </Pressable>
          )}
        </View>

        <Button title="Submit complaint" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
