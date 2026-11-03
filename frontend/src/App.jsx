import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/public/Landing";
import Login from "./pages/auth/Login";
import Onboarding from "./pages/auth/Onboarding";
import CitizenDashboard from "./pages/citizen/Dashboard";
import Notifications from "./pages/citizen/ComplaintNotification";
import Profile from "./pages/citizen/Profile";
import HelpSupport from "./pages/citizen/HelpSupport";
import ComplaintDetails from "./pages/citizen/ComplaintDetails";
import CreateComplaint from "./pages/citizen/CreateComplaint";
import Feedback from "./pages/citizen/Feedback";
import CitizenLanding from "./pages/citizen/Landing";
import BarangayPage from "./pages/admin/BarangayPage";
import DepartmentPage from "./pages/admin/DepartmentPage";
import AdminDashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import BarangayDashboard from "./pages/barangay/Dashboard";
import AssignedComplaints from "./pages/barangay/AssignedComplaints";
import DepartmentDashboard from "./pages/department/Dashboard";
import ComplaintAssignment from "./pages/department/ComplaintAssignment";
import PersonnelDashboard from "./pages/personnel/Dashboard";
import MyAssignments from "./pages/personnel/MyAssignments";
import ComplaintWorkDetails from "./pages/personnel/ComplaintWorkDetails";
import StaffDashboard from "./pages/staff/Dashboard";
import ComplaintQueue from "./pages/staff/ComplaintQueue";
import ComplaintReview from "./pages/staff/ComplaintReview";


function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Citizen routes */}
      <Route path="/citizen" element={<CitizenLanding />} />
        <Route
          path="/citizen/dashboard"
          element={<CitizenDashboard />}
        />
        <Route
          path="/citizen/complaints"
          element={<CitizenDashboard />}
        />
        <Route
          path="/citizen/complaints/new"
          element={<CreateComplaint />}
        />
        <Route
          path="/citizen/complaints/:id"
          element={<ComplaintDetails />}
        />
        <Route path="/citizen/complaint-details" element={<ComplaintDetails />}/>
        <Route path="/citizen/notifications" element={<Notifications />} />
        <Route path="/citizen/feedback" element={<Feedback />} />
        <Route path="/citizen/profile" element={<Profile />} />
        <Route path="/citizen/help-support" element={<HelpSupport />} />


        {/* Admin routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/barangays" element={<BarangayPage />} />
        <Route path="/admin/departments" element={<DepartmentPage />} />
        {/* Barangay routes */}
        <Route
          path="/barangay/dashboard"
          element={<BarangayDashboard />}
        />
        <Route
          path="/barangay/complaints"
          element={<AssignedComplaints />}
        />

        {/* Department routes */}
        <Route
          path="/department/dashboard"
          element={<DepartmentDashboard />}
        />
        <Route
          path="/department/assignments"
          element={<ComplaintAssignment />}
        />

        {/* Personnel routes */}
        <Route
          path="/personnel/dashboard"
          element={<PersonnelDashboard />}
        />
        <Route
          path="/personnel/assignments"
          element={<MyAssignments />}
        />
        <Route
          path="/personnel/assignments/:id"
          element={<ComplaintWorkDetails />}
        />

        {/* Staff routes */}
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        <Route path="/staff/complaints" element={<ComplaintQueue />} />
        <Route
          path="/staff/complaints/:id"
          element={<ComplaintReview />}
        />

      {/* Unknown route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
