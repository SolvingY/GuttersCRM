import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import MyStats from "./pages/dashboard/MyStats";
import Leaderboard from "./pages/dashboard/Leaderboard";
import Contests from "./pages/dashboard/Contests";
import Settings from "./pages/dashboard/Settings";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/dashboard/AdminOverview";
import InviteUsers from "./pages/dashboard/InviteUsers";
import WeeklyUpdates from "./pages/admin/WeeklyUpdates";
import AdminLeaderboards from "./pages/admin/AdminLeaderboards";
import UserRoles from "./pages/admin/UserRoles";
import CanvasserLayout from "./pages/canvasser/CanvasserLayout";
import CanvasserStats from "./pages/canvasser/CanvasserStats";
import CanvasserLeaderboard from "./pages/canvasser/CanvasserLeaderboard";
import CanvasserContests from "./pages/canvasser/CanvasserContests";
import CanvasserSettings from "./pages/canvasser/CanvasserSettings";
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
            <Route path="invites" element={<InviteUsers />} />
            <Route path="users" element={<UserRoles />} />
            <Route path="weekly" element={<WeeklyUpdates />} />
            <Route path="contests" element={<Contests />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
