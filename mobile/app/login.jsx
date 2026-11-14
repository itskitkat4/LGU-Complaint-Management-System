import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { Button, ErrorBox, Field, Splash } from "../src/components/ui";
import { colors } from "../src/theme";

export default function Login() {
  const { signIn, signInWithGoogle, session, profile, loading, authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) return <Splash />;
  if (session && profile) return <Redirect href="/" />;

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Please enter your email address and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (e) {
      const invalid = /invalid login credentials/i.test(e.message || "");
      setError(invalid ? "Incorrect email or password." : e.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleBusy(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e.message || "Unable to sign in with Google.");
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Image source={require("../assets/logo.png")} style={{ width: 84, height: 84 }} resizeMode="contain" />
            <Text style={{ fontSize: 26, fontWeight: "800", color: colors.navy, marginTop: 10 }}>BantaySerbisyo</Text>
            <Text style={{ color: colors.muted, marginTop: 4, textAlign: "center" }}>
              Send complaints to your local government and follow each update.
            </Text>
          </View>

          <ErrorBox message={error || authError} />

          <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
            keyboardType="email-address" textContentType="emailAddress" placeholder="you@example.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
            autoCapitalize="none" textContentType="password" placeholder="Your password" onSubmitEditing={handleLogin} />
          <Pressable onPress={() => setShowPassword((v) => !v)} style={{ marginTop: -6, marginBottom: 16 }}>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>{showPassword ? "Hide password" : "Show password"}</Text>
          </Pressable>

          <Button title="Sign in" onPress={handleLogin} loading={busy} disabled={googleBusy} />
          <Button
            title="Continue with Google"
            variant="outline"
            onPress={handleGoogleLogin}
            loading={googleBusy}
            disabled={busy}
            style={{ marginTop: 10 }}
          />
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 18 }}>
            Sign in with the account assigned to your BantaySerbisyo role.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
