import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import JobApplication from "./pages/apply/JobApplication";
import ApplicationThankYou from "./pages/apply/ApplicationThankYou";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import MyStats from "./pages/dashboard/MyStats";
import Leaderboard from "./pages/dashboard/Leaderboard";
import Contests from "./pages/dashboard/Contests";
import Settings from "./pages/dashboard/Settings";
import ThePit from "./pages/dashboard/ThePit";
import PointsHistory from "./pages/dashboard/PointsHistory";
import MyLeads from "./pages/dashboard/MyLeads";
import LeadDetailView from "./pages/dashboard/LeadDetailView";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/dashboard/AdminOverview";
import InviteUsers from "./pages/dashboard/InviteUsers";
import WeeklyUpdates from "./pages/admin/WeeklyUpdates";
import AdminLeaderboards from "./pages/admin/AdminLeaderboards";
import UserRoles from "./pages/admin/UserRoles";
import Announcements from "./pages/admin/Announcements";
import CompanyGoals from "./pages/admin/CompanyGoals";
import PitManagement from "./pages/admin/PitManagement";
import ReportSettings from "./pages/admin/ReportSettings";
import FutureTeamMates from "./pages/admin/FutureTeamMates";
import ApplicantDetail from "./pages/admin/ApplicantDetail";
import Leads from "./pages/admin/Leads";
import LeadDetail from "./pages/admin/LeadDetail";
import GetQuote from "./pages/GetQuote";
import CanvasserLayout from "./pages/canvasser/CanvasserLayout";
import CanvasserStats from "./pages/canvasser/CanvasserStats";
import CanvasserLeaderboard from "./pages/canvasser/CanvasserLeaderboard";
import CanvasserContests from "./pages/canvasser/CanvasserContests";
import CanvasserSettings from "./pages/canvasser/CanvasserSettings";
import CanvasserPit from "./pages/canvasser/CanvasserPit";
import CanvasserPointsHistory from "./pages/canvasser/CanvasserPointsHistory";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/apply" element={<JobApplication />} />
          <Route path="/apply/thank-you" element={<ApplicationThankYou />} />
          <Route path="/get-quote" element={<GetQuote />} />
          
          {/* Protected Dashboard Routes (Sales Reps) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard/stats" replace />} />
            <Route path="stats" element={<MyStats />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="contests" element={<Contests />} />
            <Route path="pit" element={<ThePit />} />
            <Route path="points-history" element={<PointsHistory />} />
            <Route path="my-leads" element={<MyLeads />} />
            <Route path="leads/:id" element={<LeadDetailView />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Canvasser Portal Routes */}
          <Route
            path="/canvasser"
            element={
              <ProtectedRoute requireCanvasser>
                <CanvasserLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/canvasser/stats" replace />} />
            <Route path="stats" element={<CanvasserStats />} />
            <Route path="leaderboard" element={<CanvasserLeaderboard />} />
            <Route path="contests" element={<CanvasserContests />} />
            <Route path="pit" element={<CanvasserPit />} />
            <Route path="points-history" element={<CanvasserPointsHistory />} />
            <Route path="settings" element={<CanvasserSettings />} />
          </Route>

          {/* Admin Portal Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview" element={<AdminOverview />} />
            <Route path="leaderboards" element={<AdminLeaderboards />} />
            <Route path="goals" element={<CompanyGoals />} />
            <Route path="invites" element={<InviteUsers />} />
            <Route path="users" element={<UserRoles />} />
            <Route path="weekly" element={<WeeklyUpdates />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="contests" element={<Contests />} />
            <Route path="pit" element={<PitManagement />} />
            <Route path="reports" element={<ReportSettings />} />
            <Route path="applicants" element={<FutureTeamMates />} />
            <Route path="applicants/:id" element={<ApplicantDetail />} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadDetail />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
