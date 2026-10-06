import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Today from './pages/Today.jsx';
import Report from './pages/Report.jsx';
import Profile from './pages/Profile.jsx';
import Notes from './pages/Notes.jsx';
import SharedView from './pages/SharedView.jsx';
import TabBar from './components/TabBar.jsx';
import SidebarStatic from './components/SidebarStatic.jsx';

function Private({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
        <Route path="/today" element={<Private><Today /></Private>} />
        <Route path="/report" element={<Private><Report /></Private>} />
        <Route path="/profile" element={<Private><Profile /></Private>} />
        <Route path="/notes" element={<Private><Notes /></Private>} />
        <Route path="/s/:token" element={<SharedView />} />
      </Routes>
      {user && <TabBar />}
      {user && <SidebarStatic />}
    </>
  );
}
