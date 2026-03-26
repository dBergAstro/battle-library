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
}

createRoot(document.getElementById("root")!).render(<App />);
