
import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/protected/ProtectedRoute";
import Landing from "./pages/public/Landing";
import Login from "./pages/auth/Login";
import Onboarding from "./pages/auth/Onboarding";
import SetPassword from "./pages/auth/SetPassword";
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
import DepartmentDashboard from "./pages/department-head/Dashboard";
import ComplaintAssignment from "./pages/department-head/ComplaintAssignment";
import DepartmentPersonnelDirectory from "./pages/department-head/PersonnelDirectory";
import PersonnelDashboard from "./pages/department-personnel/Dashboard";
import MyAssignments from "./pages/department-personnel/MyAssignments";
import ComplaintWorkDetails from "./pages/department-personnel/ComplaintWorkDetails";
import StaffDashboard from "./pages/staff/Dashboard";
import ComplaintQueue from "./pages/staff/ComplaintQueue";
import ComplaintReview from "./pages/staff/ComplaintReview";
import EscalationInbox from "./pages/staff/EscalationInbox";
import ComplaintHistory from "./pages/staff/ComplaintHistory";

function App() {
    return (
        <ThemeProvider>
        <AuthProvider>
            <Routes>

                //* Public routes 
                <Route path="/" element={ window.location.hash.includes("type=invite") ? 
                <Navigate to="/set-password" replace /> :<Landing />}/>
                <Route path="/login" element={<Login />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/set-password" element={<SetPassword />} />

                //* Citizen routes 
                <Route element={
                    <ProtectedRoute allowedRoles={["citizen"]} />
                }>
                    <Route path="/citizen" element={<CitizenLanding />} />
                    <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
                    <Route path="/citizen/complaints" element={<CitizenDashboard />} />
                    <Route path="/citizen/complaints/new" element={<CreateComplaint />} />
                    <Route path="/citizen/complaints/:id" element={<ComplaintDetails />} />
                    <Route path="/citizen/complaint-details" element={<ComplaintDetails />} />
                    <Route path="/citizen/notifications" element={<Notifications />} />
                    <Route path="/citizen/feedback" element={<Feedback />} />
                    <Route path="/citizen/profile" element={<Profile />} />
                    <Route path="/citizen/help-support" element={<HelpSupport />} />
                </Route>

                //* Admin routes 
                <Route element={
                    <ProtectedRoute allowedRoles={["System Administrator"]} />
                }>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<UserManagement />} />
                    <Route path="/admin/barangays" element={<BarangayPage />} />
                    <Route path="/admin/departments" element={<DepartmentPage />} />
                </Route>

                //* Barangay Head routes
                <Route element={
                    <ProtectedRoute allowedRoles={["Barangay_Head"]} />
                }>
                    <Route path="/barangay/dashboard" element={<BarangayDashboard />} />
                    <Route path="/barangay/complaints" element={<AssignedComplaints />} />
                </Route>

                //* Department Head routes
                <Route element={
                    <ProtectedRoute allowedRoles={["Department_Head"]} />
                }>
                    <Route path="/department/dashboard" element={<DepartmentDashboard />} />
                    <Route path="/department/assignments" element={<ComplaintAssignment />} />
                    <Route path="/department/personnel" element={<DepartmentPersonnelDirectory />} />
                </Route>

                //* Department Personnel routes
                <Route element={
                    <ProtectedRoute allowedRoles={["Department_Personnel"]} />
                }>
                    <Route path="/personnel/dashboard" element={<PersonnelDashboard />} />
                    <Route path="/personnel/assignments" element={<MyAssignments />} />
                    <Route path="/personnel/assignments/:id" element={<ComplaintWorkDetails />} />
                </Route>

                //* LGU-Staff routes
                <Route element={
                    <ProtectedRoute allowedRoles={["LGU-Staff"]} />
                    
                }>
                    <Route path="/staff/dashboard" element={<StaffDashboard />} />
                    <Route path="/staff/complaints" element={<ComplaintQueue />} />
                    <Route path="/staff/complaints/history" element={<ComplaintHistory />} />
                    <Route path="/staff/complaints/:id" element={<ComplaintReview />} />
                    <Route path="/staff/escalations" element={<EscalationInbox />} />
                </Route>

                //* Unknown route
                <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
        </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
