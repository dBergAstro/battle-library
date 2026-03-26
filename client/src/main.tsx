import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { IS_GAS_ENV } from "./lib/gasApi";
import { installGasMock } from "./lib/gasMock";
import { installGasFetchInterceptor } from "./lib/gasFetchInterceptor";

if (IS_GAS_ENV) {
  installGasFetchInterceptor();
} else {
  installGasMock();
  // In static mock mode, also intercept fetch so TanStack Query routes
  // through window.google.script.run (which gasMock has already set up).
  if (import.meta.env.VITE_MOCK_MODE === "static") {
    installGasFetchInterceptor();
  }
}

createRoot(document.getElementById("root")!).render(<App />);
