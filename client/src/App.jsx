import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CreatorDashboard from './pages/CreatorDashboard';
import ContestDetails from './pages/ContestDetails';
import ProblemDetails from './pages/ProblemDetails';
import ProblemsList from './pages/ProblemsList';
import { useAuth } from './context/AuthContext';

// Protected Route Guard for general authenticated users (Participants or Creators)
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner"></div>
        <p className="loading-text">Authenticating session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Creator Route Guard for admin/creator functionalities
const CreatorRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner"></div>
        <p className="loading-text">Verifying credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'creator') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />

          {/* User Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/problems"
            element={
              <ProtectedRoute>
                <ProblemsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contests/:id"
            element={
              <ProtectedRoute>
                <ContestDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/problems/:id"
            element={
              <ProtectedRoute>
                <ProblemDetails />
              </ProtectedRoute>
            }
          />

          {/* Creator Only Protected Routes */}
          <Route
            path="/creator"
            element={
              <CreatorRoute>
                <CreatorDashboard />
              </CreatorRoute>
            }
          />

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} Algo Online Judge (AOJ). Built for modern developers.</p>
      </footer>
    </div>
  );
}

export default App;
