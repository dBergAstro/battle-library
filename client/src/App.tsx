import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Library, Shield, Swords } from "lucide-react";
import BattleLibrary from "@/pages/BattleLibrary";
import ReplayLibrary from "@/pages/ReplayLibrary";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={BattleLibrary} />
      <Route path="/replays" component={ReplayLibrary} />
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
          Бои
        </Button>
      </Link>
      <Link href="/replays">
        <Button
          size="sm"
          variant={location === "/replays" ? "default" : "outline"}
          data-testid="link-replays"
        >
          <Swords className="h-4 w-4 mr-1" />
          Записи
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
        <div className="min-h-screen bg-background">
          <Navigation />
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
