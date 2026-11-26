import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/protected/ProtectedRoute";

// Public pages
const Landing = lazy(() => import("./pages/public/Landing"));
const Login = lazy(() => import("./pages/auth/Login"));
const Onboarding = lazy(() => import("./pages/auth/Onboarding"));
const SetPassword = lazy(() => import("./pages/auth/SetPassword"));

// Citizen pages
const CitizenDashboard = lazy(() => import("./pages/citizen/Dashboard"));
const Notifications = lazy(() => import("./pages/citizen/ComplaintNotification"));
const Profile = lazy(() => import("./pages/citizen/Profile"));
const HelpSupport = lazy(() => import("./pages/citizen/HelpSupport"));
const ComplaintDetails = lazy(() => import("./pages/citizen/ComplaintDetails"));
const CreateComplaint = lazy(() => import("./pages/citizen/CreateComplaint"));
const Feedback = lazy(() => import("./pages/citizen/Feedback"));
const CitizenLanding = lazy(() => import("./pages/citizen/Landing"));

// Admin pages
const BarangayPage = lazy(() => import("./pages/admin/BarangayPage"));
const DepartmentPage = lazy(() => import("./pages/admin/DepartmentPage"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const AdminComplaints = lazy(() => import("./pages/admin/Complaints"));

// Barangay pages
const BarangayDashboard = lazy(() => import("./pages/barangay/Dashboard"));
const AssignedComplaints = lazy(() => import("./pages/barangay/AssignedComplaints"));
const BarangayComplaintHistory = lazy(() => import("./pages/barangay/ComplaintHistory"));

// Department Head pages
const DepartmentDashboard = lazy(() => import("./pages/department-head/Dashboard"));
const ComplaintAssignment = lazy(() => import("./pages/department-head/ComplaintAssignment"));
const DepartmentPersonnelDirectory = lazy(() => import("./pages/department-head/PersonnelDirectory"));
const DepartmentMonitoring = lazy(() => import("./pages/department-head/DepartmentMonitoring"));

// Department Personnel pages
const PersonnelDashboard = lazy(() => import("./pages/department-personnel/Dashboard"));
const MyAssignments = lazy(() => import("./pages/department-personnel/MyAssignments"));
const ComplaintWorkDetails = lazy(() => import("./pages/department-personnel/ComplaintWorkDetails"));

// LGU Staff pages
const StaffDashboard = lazy(() => import("./pages/staff/Dashboard"));
const ComplaintQueue = lazy(() => import("./pages/staff/ComplaintQueue"));
const ComplaintReview = lazy(() => import("./pages/staff/ComplaintReview"));
const EscalationInbox = lazy(() => import("./pages/staff/EscalationInbox"));
const ComplaintHistory = lazy(() => import("./pages/staff/ComplaintHistory"));
const ResolutionQueue = lazy(() => import("./pages/staff/ResolutionQueue"));
const StaffReports = lazy(() => import("./pages/staff/StaffReports"));
const StaffNotifications = lazy(() => import("./pages/staff/StaffNotifications"));

// Shared pages
const FeedbackMonitoring = lazy(() => import("./pages/shared/FeedbackMonitoring"));

function isPasswordSetupCallback() {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const emailLinkTypes = new Set(["invite", "signup"]);

    return (
        emailLinkTypes.has(query.get("type")) ||
        emailLinkTypes.has(hash.get("type")) ||
        query.get("error_code") === "otp_expired" ||
        hash.get("error_code") === "otp_expired"
    );
}

function PageLoading() {
    return (
        <div role="status" className="app-bg flex min-h-screen items-center justify-center p-6">
            <div className="glass w-full max-w-xs rounded-3xl px-8 py-10 text-center">
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                    <span className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600 motion-reduce:animate-none" />
                    <span className="glass-icon flex h-10 w-10 items-center justify-center rounded-full">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-10 2 2 4-4" />
                        </svg>
                    </span>
                </div>

                <p className="mt-6 text-sm font-semibold text-slate-800">Loading, please wait...</p>
                <p className="mt-1 text-xs text-slate-500">Preparing your page</p>
            </div>
        </div>
    );
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Suspense fallback={<PageLoading />}>
                    <Routes>

                    {/* Public routes */}
                    <Route path="/" element={ isPasswordSetupCallback() ?
                    <Navigate to={`/set-password${window.location.search}${window.location.hash}`} replace /> :<Landing />}/>
                    <Route path="/login" element={<Login />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/set-password" element={<SetPassword />} />

                    {/* Citizen routes */}
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

                    {/* Admin routes */}
                    <Route element={
                        <ProtectedRoute allowedRoles={["System Administrator"]} />
                    }>
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />
                        <Route path="/admin/complaints" element={<AdminComplaints />} />
                        <Route path="/admin/users" element={<UserManagement />} />
                        <Route path="/admin/barangays" element={<BarangayPage />} />
                        <Route path="/admin/departments" element={<DepartmentPage />} />
                    </Route>

                    {/* Barangay Head routes */}
                    <Route element={
                        <ProtectedRoute allowedRoles={["Barangay_Head"]} />
                    }>
                        <Route path="/barangay/dashboard" element={<BarangayDashboard />} />
                        <Route path="/barangay/complaints" element={<AssignedComplaints />} />
                        <Route path="/barangay/complaints/history" element={<BarangayComplaintHistory />} />
                        <Route path="/barangay/feedback" element={<FeedbackMonitoring />} />
                    </Route>

                    {/* Department Head routes */}
                    <Route element={
                        <ProtectedRoute allowedRoles={["Department_Head"]} />
                    }>
                        <Route path="/department/dashboard" element={<DepartmentDashboard />} />
                        <Route path="/department/assignments" element={<ComplaintAssignment />} />
                        <Route path="/department/monitoring" element={<DepartmentMonitoring />} />
                        <Route path="/department/personnel" element={<DepartmentPersonnelDirectory />} />
                        <Route path="/department/feedback" element={<FeedbackMonitoring />} />
                    </Route>

                    {/* Department Personnel routes */}
                    <Route element={
                        <ProtectedRoute allowedRoles={["Department_Personnel"]} />
                    }>
                        <Route path="/personnel/dashboard" element={<PersonnelDashboard />} />
                        <Route path="/personnel/assignments" element={<MyAssignments />} />
                        <Route path="/personnel/assignments/:id" element={<ComplaintWorkDetails />} />
                    </Route>

                    {/* LGU-Staff routes */}
                    <Route element={
                        <ProtectedRoute allowedRoles={["LGU-Staff"]} />
                    }>
                        <Route path="/staff/dashboard" element={<StaffDashboard />} />
                        <Route path="/staff/complaints" element={<ComplaintQueue />} />
                        <Route path="/staff/complaints/history" element={<ComplaintHistory />} />
                        <Route path="/staff/complaints/:id" element={<ComplaintReview />} />
                        <Route path="/staff/escalations" element={<EscalationInbox />} />
                        <Route path="/staff/resolutions" element={<ResolutionQueue />} />
                        <Route path="/staff/notifications" element={<StaffNotifications />} />
                        <Route path="/staff/reports" element={<StaffReports />} />
                        <Route path="/staff/feedback" element={<FeedbackMonitoring />} />
                    </Route>

                    {/* Unknown route */}
                    <Route path="*" element={<Navigate to="/" replace />} />

                </Routes>
                </Suspense>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
