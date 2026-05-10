// Vite-Entry-Point. Mountet App in #root und umschließt es mit dem
// AuthProvider, damit Komponenten via Hook auf den Login-State zugreifen können.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthProvider.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
