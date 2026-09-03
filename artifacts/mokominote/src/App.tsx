import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/layout";
import { AuthPage, ForgotPasswordPage, ResetPasswordPage } from "@/pages/auth";
import {
  AdminBusinesses,
  AdminOverview,
  AdminPosts,
  AdminUsers,
  BusinessDashboard,
  MemberDashboard,
  MemberProfilePage,
  NotificationsPage,
  OwnerPostsPage,
  OwnerProfile,
  PromotePage,
} from "@/pages/dashboards";
import { BusinessProfile, CommunityPage, Directory, Home, NotFoundPage, StaticPage } from "@/pages/public";

const queryClient = new QueryClient();

function Router() {
  return (
    <ErrorBoundary resetKey={useLocation()[0]}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/businesses" component={Directory} />
        <Route path="/businesses/:slug" component={BusinessProfile} />
        <Route path="/community" component={CommunityPage} />
        <Route path="/login"><AuthPage mode="login" /></Route>
        <Route path="/register"><AuthPage mode="register" /></Route>
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/about"><StaticPage title="About MoKominoté" body="MoKominoté is a community-driven local business directory for Mauritius. Discover independent businesses, join their communities, and stay close to what they share next." /></Route>
        <Route path="/contact"><StaticPage title="Contact" body="For partnerships and early access questions, write to hello@mokominote.mu. This MVP contact page is a starting point while email delivery is connected." /></Route>
        <Route path="/terms"><StaticPage title="Terms" body="MoKominoté is provided as an early community platform. Do not post unlawful content. Business listings are reviewed before they appear publicly. These terms will expand as the product grows." /></Route>
        <Route path="/privacy"><StaticPage title="Privacy" body="We store account, business, community, and analytics data needed to run the directory. Passwords are hashed. Session cookies are HTTP-only. Do not submit secrets you would not want associated with a community platform." /></Route>
        <Route path="/member">
          <ProtectedRoute roles={["member", "owner", "admin"]}><MemberDashboard /></ProtectedRoute>
        </Route>
        <Route path="/profile">
          <ProtectedRoute><MemberProfilePage /></ProtectedRoute>
        </Route>
        <Route path="/dashboard/business">
          <ProtectedRoute roles={["owner", "admin"]}><BusinessDashboard /></ProtectedRoute>
        </Route>
        <Route path="/dashboard/business/profile">
          <ProtectedRoute roles={["owner", "admin"]}><OwnerProfile /></ProtectedRoute>
        </Route>
        <Route path="/dashboard/business/posts">
          <ProtectedRoute roles={["owner", "admin"]}><OwnerPostsPage /></ProtectedRoute>
        </Route>
        <Route path="/dashboard/business/promote">
          <ProtectedRoute roles={["owner", "admin"]}><PromotePage /></ProtectedRoute>
        </Route>
        <Route path="/admin">
          <ProtectedRoute roles={["admin"]}><AdminOverview /></ProtectedRoute>
        </Route>
        <Route path="/admin/users">
          <ProtectedRoute roles={["admin"]}><AdminUsers /></ProtectedRoute>
        </Route>
        <Route path="/admin/businesses">
          <ProtectedRoute roles={["admin"]}><AdminBusinesses /></ProtectedRoute>
        </Route>
        <Route path="/admin/posts">
          <ProtectedRoute roles={["admin"]}><AdminPosts /></ProtectedRoute>
        </Route>
        <Route path="/notifications">
          <ProtectedRoute><NotificationsPage /></ProtectedRoute>
        </Route>
        <Route component={NotFoundPage} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
