
import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/public/Landing";
import Login from "./pages/auth/Login";
import Onboarding from "./pages/auth/Onboarding";
import CitizenDashboard from "./pages/citizen/Dashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
