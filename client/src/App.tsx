import { Switch, Route, Link, useLocation, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Library, Shield } from "lucide-react";
import { IS_GAS_ENV } from "@/lib/gasApi";
import BattleLibrary from "@/pages/BattleLibrary";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={BattleLibrary} />
      <Route path="/admin" component={AdminPanel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Navigation() {
  const [location] = useLocation();
  
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <Link href="/">
        <Button
          size="sm"
          variant={location === "/" ? "default" : "outline"}
          data-testid="link-library"
        >
          <Library className="h-4 w-4 mr-1" />
          Библиотека
        </Button>
      </Link>
      <Link href="/admin">
        <Button
          size="sm"
          variant={location === "/admin" ? "default" : "outline"}
          data-testid="link-admin"
        >
          <Shield className="h-4 w-4 mr-1" />
          Админ
        </Button>
      </Link>
      <ThemeToggle />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter hook={IS_GAS_ENV ? useHashLocation : undefined}>
          <div className="min-h-screen bg-background">
            <Navigation />
            <AppRoutes />
          </div>
          <Toaster />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
