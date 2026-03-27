import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EnvModeToggle } from "@/components/EnvModeToggle";
import { Button } from "@/components/ui/button";
import { Library, Shield } from "lucide-react";
import BattleLibrary from "@/pages/BattleLibrary";
import AdminPanel from "@/pages/AdminPanel";

type Tab = "library" | "admin";

function App() {
  const [tab, setTab] = useState<Tab>("library");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
            <Button
              size="sm"
              variant={tab === "library" ? "default" : "outline"}
              onClick={() => setTab("library")}
              data-testid="link-library"
            >
              <Library className="h-4 w-4 mr-1" />
              Библиотека
            </Button>
            <Button
              size="sm"
              variant={tab === "admin" ? "default" : "outline"}
              onClick={() => setTab("admin")}
              data-testid="link-admin"
            >
              <Shield className="h-4 w-4 mr-1" />
              Админ
            </Button>
            <EnvModeToggle />
            <ThemeToggle />
          </div>

          {tab === "library" && <BattleLibrary />}
          {tab === "admin" && <AdminPanel />}
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
