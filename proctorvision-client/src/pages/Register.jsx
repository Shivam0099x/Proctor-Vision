import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = await register(form);
      nav(u.role === "teacher" ? "/teacher" : "/student");
    } catch (e) {
      setErr(e.response?.data?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 fade-in">
      <form
        onSubmit={submit}
        className="glass-strong p-8 w-full max-w-sm space-y-4 float-up"
      >
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="text-3xl">🛡️</div>
          <h1 className="text-2xl font-bold">
            <span className="gradient-text">ProctorVision</span>
          </h1>
          <p className="page-subtitle">Create your account</p>
        </div>

        {err && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm rounded-lg px-3 py-2">
            {err}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Name</label>
            <input
              className="input"
              placeholder="Full name"
              value={form.name}
              onChange={set("name")}
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Email</label>
            <input
              className="input"
              placeholder="you@example.com"
              type="email"
              value={form.email}
              onChange={set("email")}
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Password</label>
            <input
              className="input"
              placeholder="••••••••"
              type="password"
              value={form.password}
              onChange={set("password")}
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Role</label>
            <select className="input" value={form.role} onChange={set("role")}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating..." : "Create Account"}
        </button>

        <p className="text-sm text-slate-400 text-center pt-2 border-t border-slate-800">
          Have an account?{" "}
          <Link className="btn-link" to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}