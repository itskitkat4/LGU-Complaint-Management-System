import Swal from "sweetalert2";
import { supabase } from "./supabase";

export async function confirmAndSignOut(navigate) {
  const confirmation = await Swal.fire({
    title: "Sign out?",
    text: "You will need to sign in again to access your account.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sign out",
    cancelButtonText: "Stay signed in",
    confirmButtonColor: "#b91c1c",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
    focusCancel: true,
  });

  if (!confirmation.isConfirmed) return false;

  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    navigate("/login", { replace: true });
    return true;
  } catch (error) {
    await Swal.fire({
      title: "Sign out failed",
      text: error.message || "Please try again.",
      icon: "error",
      confirmButtonText: "OK",
      confirmButtonColor: "#047857",
    });
    return false;
  }
}
