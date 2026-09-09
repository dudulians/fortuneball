import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// One typeface for the whole app, bundled (no network). Manrope has full Cyrillic.
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";

import "./App.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
