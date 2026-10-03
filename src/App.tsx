
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

function Dashboard() {
  return (
    <div className="bg-white p-12 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900 mb-4">Dashboard</h2>
      <p className="text-slate-600">Welcome to the Research Project Development System.</p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
} 

export default App;