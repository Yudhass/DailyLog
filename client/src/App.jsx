import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import TopBar from './components/TopBar.jsx';

// Layout persisten: header di-mount sekali dan tidak ikut remount saat pindah
// halaman, supaya navigasi tidak terasa seperti refresh.
function PrivateLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <TopBar />
      <Outlet />
    </>
  );
}

export default function App() {
  const { user } = useAuth();
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route element={<PrivateLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/today" element={<Today />} />
          <Route path="/report" element={<Report />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notes" element={<Notes />} />
        </Route>
        <Route path="/s/:token" element={<SharedView />} />
      </Routes>
      {user && <TabBar />}
      {user && <SidebarStatic />}
    </>
  );
}
