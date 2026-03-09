import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Eagerly loaded — small, always needed
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Lazy-loaded pages — split into separate chunks per route group
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const GetQuote = lazy(() => import("./pages/GetQuote"));
const SignContract = lazy(() => import("./pages/public/SignContract"));

// Apply routes
const JobApplication = lazy(() => import("./pages/apply/JobApplication"));
const ApplicationThankYou = lazy(() => import("./pages/apply/ApplicationThankYou"));

// Onboarding routes
const OnboardingFlow = lazy(() => import("./pages/onboarding/OnboardingFlow"));
const MandatoryActions = lazy(() => import("./pages/onboarding/MandatoryActions"));

// Dashboard routes
const DashboardLayout = lazy(() => import("./pages/dashboard/DashboardLayout"));
const MyStats = lazy(() => import("./pages/dashboard/MyStats"));
const Leaderboard = lazy(() => import("./pages/dashboard/Leaderboard"));
const Contests = lazy(() => import("./pages/dashboard/Contests"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));
const ThePit = lazy(() => import("./pages/dashboard/ThePit"));
const PointsHistory = lazy(() => import("./pages/dashboard/PointsHistory"));
const MyLeads = lazy(() => import("./pages/dashboard/MyLeads"));
const LeadDetailView = lazy(() => import("./pages/dashboard/LeadDetailView"));
const GutterEstimator = lazy(() => import("./pages/dashboard/GutterEstimator"));
const ToolsHub = lazy(() => import("./pages/dashboard/ToolsHub"));
const MyEstimates = lazy(() => import("./pages/dashboard/MyEstimates"));
const AdminOverview = lazy(() => import("./pages/dashboard/AdminOverview"));
const InviteUsers = lazy(() => import("./pages/dashboard/InviteUsers"));
const InternalAssessment = lazy(() => import("./pages/dashboard/InternalAssessment"));
const GutterContract = lazy(() => import("./pages/dashboard/forms/GutterContract"));
const FlexSchedule = lazy(() => import("./pages/dashboard/forms/FlexSchedule"));
const WarrantyDocument = lazy(() => import("./pages/dashboard/forms/WarrantyDocument"));
const InspectionChecklist = lazy(() => import("./pages/dashboard/forms/InspectionChecklist"));
const AppointmentSheet = lazy(() => import("./pages/dashboard/forms/AppointmentSheet"));

// Admin routes
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const WeeklyUpdates = lazy(() => import("./pages/admin/WeeklyUpdates"));
const AdminLeaderboards = lazy(() => import("./pages/admin/AdminLeaderboards"));
const UserRoles = lazy(() => import("./pages/admin/UserRoles"));
const Announcements = lazy(() => import("./pages/admin/Announcements"));
const CompanyGoals = lazy(() => import("./pages/admin/CompanyGoals"));
const PitManagement = lazy(() => import("./pages/admin/PitManagement"));
const ReportSettings = lazy(() => import("./pages/admin/ReportSettings"));
const FutureTeamMates = lazy(() => import("./pages/admin/FutureTeamMates"));
const ApplicantDetail = lazy(() => import("./pages/admin/ApplicantDetail"));
const Leads = lazy(() => import("./pages/admin/Leads"));
const LeadDetail = lazy(() => import("./pages/admin/LeadDetail"));
const ContractorManagement = lazy(() => import("./pages/admin/ContractorManagement"));
const LeadflowStatistics = lazy(() => import("./pages/admin/LeadflowStatistics"));
const AdminTimeClock = lazy(() => import("./pages/admin/AdminTimeClock"));
const SalesPerformance = lazy(() => import("./pages/admin/SalesPerformance"));
const NotificationRouting = lazy(() => import("./pages/admin/NotificationRouting"));
const AdminPresets = lazy(() => import("./pages/admin/AdminPresets"));
const SentReports = lazy(() => import("./pages/admin/SentReports"));

// Canvasser routes
const CanvasserLayout = lazy(() => import("./pages/canvasser/CanvasserLayout"));
const CanvasserStats = lazy(() => import("./pages/canvasser/CanvasserStats"));
const CanvasserLeaderboard = lazy(() => import("./pages/canvasser/CanvasserLeaderboard"));
const CanvasserContests = lazy(() => import("./pages/canvasser/CanvasserContests"));
const CanvasserSettings = lazy(() => import("./pages/canvasser/CanvasserSettings"));
const CanvasserPit = lazy(() => import("./pages/canvasser/CanvasserPit"));
const CanvasserPointsHistory = lazy(() => import("./pages/canvasser/CanvasserPointsHistory"));
const CreateCanvasserLead = lazy(() => import("./pages/canvasser/CreateCanvasserLead"));

// Supplementer routes
const SupplementerLayout = lazy(() => import("./pages/supplementer/SupplementerLayout"));
const SupplementerDashboard = lazy(() => import("./pages/supplementer/SupplementerDashboard"));
const SupplementerLeaderboard = lazy(() => import("./pages/supplementer/SupplementerLeaderboard"));
const SupplementerJobsList = lazy(() => import("./pages/supplementer/SupplementerJobsList"));
const SupplementerJobDetail = lazy(() => import("./pages/supplementer/SupplementerJobDetail"));
const SupplementerSettings = lazy(() => import("./pages/supplementer/SupplementerSettings"));
const SupplementerPit = lazy(() => import("./pages/supplementer/SupplementerPit"));
const SupplementerPointsHistory = lazy(() => import("./pages/supplementer/SupplementerPointsHistory"));

// Production routes
const ProductionLayout = lazy(() => import("./pages/production/ProductionLayout"));
const ProductionDashboard = lazy(() => import("./pages/production/ProductionDashboard"));
const ProductionLeaderboard = lazy(() => import("./pages/production/ProductionLeaderboard"));
const ProductionToolsHub = lazy(() => import("./pages/production/ProductionToolsHub"));
const CommercialHailAssessment = lazy(() => import("./pages/tools/CommercialHailAssessmentForm"));
const ProductionChecklists = lazy(() => import("./pages/production/ProductionChecklists"));
const ProductionPit = lazy(() => import("./pages/production/ProductionPit"));
const ProductionPointsHistory = lazy(() => import("./pages/production/ProductionPointsHistory"));
const ProductionSettings = lazy(() => import("./pages/production/ProductionSettings"));
const SavedChecklists = lazy(() => import("./pages/tools/SavedChecklists"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes — avoids refetch on every tab focus
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/apply" element={<JobApplication />} />
            <Route path="/apply/thank-you" element={<ApplicationThankYou />} />
            <Route path="/get-quote" element={<GetQuote />} />
            <Route path="/sign/:token" element={<SignContract />} />

            {/* Onboarding & Mandatory Actions (protected but skip onboarding check) */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute skipOnboardingCheck>
                  <OnboardingFlow />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mandatory-actions"
              element={
                <ProtectedRoute skipOnboardingCheck>
                  <MandatoryActions />
                </ProtectedRoute>
              }
            />

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
              <Route path="tools" element={<ToolsHub />} />
              <Route path="tools/estimator" element={<GutterEstimator />} />
              <Route path="tools/my-estimates" element={<MyEstimates />} />
              <Route path="tools/hail-assessment" element={<CommercialHailAssessment />} />
              <Route path="tools/saved-checklists" element={<SavedChecklists />} />
              <Route path="leads/:id" element={<LeadDetailView />} />
              <Route path="leads/:id/contract" element={<GutterContract />} />
              <Route path="leads/:id/flex-schedule" element={<FlexSchedule />} />
              <Route path="leads/:id/warranty" element={<WarrantyDocument />} />
              <Route path="leads/:id/inspection" element={<InspectionChecklist />} />
              <Route path="leads/:id/appointment" element={<AppointmentSheet />} />
              <Route path="settings" element={<Settings />} />
              <Route path="assessment" element={<InternalAssessment />} />
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
              <Route path="create-lead" element={<CreateCanvasserLead />} />
              <Route path="settings" element={<CanvasserSettings />} />
              <Route path="assessment" element={<InternalAssessment />} />
            </Route>

            {/* Supplementer Portal Routes */}
            <Route
              path="/supplementer"
              element={
                <ProtectedRoute requireSupplementer>
                  <SupplementerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/supplementer/stats" replace />} />
              <Route path="stats" element={<SupplementerDashboard />} />
              <Route path="leaderboard" element={<SupplementerLeaderboard />} />
              <Route path="jobs" element={<SupplementerJobsList />} />
              <Route path="jobs/:id" element={<SupplementerJobDetail />} />
              <Route path="pit" element={<SupplementerPit />} />
              <Route path="points-history" element={<SupplementerPointsHistory />} />
              <Route path="settings" element={<SupplementerSettings />} />
            </Route>

            {/* Production Portal Routes */}
            <Route
              path="/production"
              element={
                <ProtectedRoute requireProduction>
                  <ProductionLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/production/stats" replace />} />
              <Route path="stats" element={<ProductionDashboard />} />
              <Route path="leaderboard" element={<ProductionLeaderboard />} />
              <Route path="tools" element={<ProductionToolsHub />} />
              <Route path="tools/checklists" element={<ProductionChecklists />} />
              <Route path="tools/hail-assessment" element={<CommercialHailAssessment />} />
              <Route path="tools/saved-checklists" element={<SavedChecklists />} />
              <Route path="pit" element={<ProductionPit />} />
              <Route path="points-history" element={<ProductionPointsHistory />} />
              <Route path="settings" element={<ProductionSettings />} />
            </Route>

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
              <Route path="leadflow" element={<LeadflowStatistics />} />
              <Route path="sales-performance" element={<SalesPerformance />} />
              <Route path="team" element={<ContractorManagement />} />
              <Route path="timeclock" element={<AdminTimeClock />} />
              <Route path="notifications" element={<NotificationRouting />} />
              <Route path="presets" element={<AdminPresets />} />
              <Route path="sent-reports" element={<SentReports />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
