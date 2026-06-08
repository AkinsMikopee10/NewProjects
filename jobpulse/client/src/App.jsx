import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ApplicationsProvider } from "./context/ApplicationsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import RemoteDashboard, { ContractDashboard } from "./pages/Dashboard";
import Tracker from "./pages/Tracker";

export default function App() {
  return (
    <AuthProvider>
      <ApplicationsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RemoteDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contract"
              element={
                <ProtectedRoute>
                  <ContractDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tracker"
              element={
                <ProtectedRoute>
                  <Tracker />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ApplicationsProvider>
    </AuthProvider>
  );
}
