import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/citizen/Landing";
import Login from "./pages/citizen/Login";


function App() {
  return (
    <Routes>
      {/* Main Landing Page */}
      <Route path="/" element={<Landing />} />

      {/* Login and Create Account Page */}
      <Route path="/login" element={<Login />} />


      {/* Redirect Get Started to Login */}
      <Route
        path="/onboarding"
        element={<Navigate to="/login" replace />}
      />

      {/* Redirect unknown pages to Landing */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;
