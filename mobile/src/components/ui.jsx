import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme";
import { statusInfo } from "../lib/status";

export function Splash() {
  return (
    <View style={[s.center, { flex: 1, backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ title, onPress, loading, disabled, variant = "primary", style }) {
  const off = disabled || loading;
  const bg = variant === "primary" ? colors.primary : variant === "danger" ? colors.danger : colors.card;
  const fg = variant === "outline" ? colors.primary : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: bg, opacity: off ? 0.55 : pressed ? 0.85 : 1 },
        variant === "outline" && { borderWidth: 1, borderColor: colors.primary },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, error, style, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#9AA3B2"
        style={[s.input, error && { borderColor: colors.danger }, style]}
        {...props}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <View style={s.errorBox}>
      <Text style={{ color: colors.danger, fontSize: 14 }}>{message}</Text>
    </View>
  );
}

export function StatusBadge({ status }) {
  const info = statusInfo(status);
  return (
    <View style={[s.badge, { backgroundColor: info.bg }]}>
      <Text style={{ color: info.fg, fontSize: 12, fontWeight: "700" }}>{info.label}</Text>
    </View>
  );
}

export function EmptyState({ title, text }) {
  return (
    <View style={[s.center, { padding: 32 }]}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 }}>{title}</Text>
      <Text style={{ color: colors.muted, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
  button: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  buttonText: { fontSize: 16, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 },
  input: {
    minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    backgroundColor: "#fff", paddingHorizontal: 14, fontSize: 16, color: colors.text,
  },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 10, padding: 12, marginBottom: 14 },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
