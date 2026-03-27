import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IS_GAS_ENV } from "@/lib/gasApi";
import { getEnvMode, setEnvMode, type EnvMode } from "@/lib/envMode";
import { queryClient } from "@/lib/queryClient";

export function EnvModeToggle() {
  const [mode, setMode] = useState<EnvMode>(getEnvMode);

  if (IS_GAS_ENV) return null;

  const toggle = () => {
    const next: EnvMode = mode === "gas" ? "rest" : "gas";
    setEnvMode(next);
    setMode(next);
    queryClient.invalidateQueries();
  };

  return (
    <Button
      size="sm"
      variant={mode === "gas" ? "secondary" : "outline"}
      onClick={toggle}
      data-testid="button-env-mode-toggle"
      title={mode === "gas" ? "Режим GAS (google.script.run)" : "Режим REST (Express API)"}
    >
      {mode === "gas" ? "GAS" : "REST"}
    </Button>
  );
}
