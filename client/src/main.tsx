import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installGasMock } from "./lib/gasMock";

installGasMock();

createRoot(document.getElementById("root")!).render(<App />);
