import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import CreateExam from "./pages/CreateExam.jsx";
import ExamReview from "./pages/ExamReview.jsx";
import StudentHome from "./pages/StudentHome.jsx";
import TakeExam from "./pages/TakeExam.jsx";

const Guard = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
};

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "teacher" ? "/teacher" : "/student"} replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/teacher"
        element={
          <Guard role="teacher">
            <TeacherDashboard />
          </Guard>
        }
      />
      <Route
        path="/teacher/create"
        element={
          <Guard role="teacher">
            <CreateExam />
          </Guard>
        }
      />
      <Route
        path="/teacher/exam/:examId"
        element={
          <Guard role="teacher">
            <ExamReview />
          </Guard>
        }
      />

      <Route
        path="/student"
        element={
          <Guard role="student">
            <StudentHome />
          </Guard>
        }
      />
      <Route
        path="/student/exam/:examId"
        element={
          <Guard role="student">
            <TakeExam />
          </Guard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}