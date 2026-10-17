import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { api, fileUrl } from "../lib/api.js";

const EVENT_LABEL = {
  no_face: "No face",
  multi_face: "Multi face",
  face_away: "Face away",
  phone: "Phone",
  tab_switch: "Tab switch",
};

const RISK_BADGE = {
  low: "badge-low",
  medium: "badge-medium",
  high: "badge-high",
};

const REVIEW_STYLE = {
  valid: "bg-green-500/20 text-green-300 border border-green-500/40",
  false_alarm: "bg-red-500/20 text-red-300 border border-red-500/40",
  pending: "bg-slate-700/60 text-slate-300 border border-slate-600/60",
};

export default function ExamReview() {
  const { examId } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [selected, setSelected] = useState(null); // { attempt, events }
  const [stats, setStats] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  const loadAttempts = () =>
    api.get(`/attempts/exam/${examId}`).then((r) => setAttempts(r.data));

  const loadStats = () =>
    api.get("/events/stats/rules").then((r) => setStats(r.data));

  useEffect(() => {
    Promise.all([loadAttempts(), loadStats()]).finally(() =>
      setLoadingAttempts(false)
    );
  }, [examId]);

  const openAttempt = async (id) => {
    const r = await api.get(`/attempts/${id}`);
    setSelected(r.data);
  };

  const review = async (eventId, reviewVal) => {
    await api.patch(`/events/${eventId}/review`, { review: reviewVal });
    if (selected) {
      const r = await api.get(`/attempts/${selected.attempt._id}`);
      setSelected(r.data);
    }
    loadAttempts();
    loadStats();
  };

  const totalAlarms = stats.reduce((sum, s) => sum + s.total, 0);

  // 🟡 Tuning hints for the currently-selected student
  const tuningHints = (() => {
    if (!selected) return [];
    const byType = {};
    selected.events.forEach((ev) => {
      if (!byType[ev.type]) byType[ev.type] = { total: 0, false: 0 };
      byType[ev.type].total += 1;
      if (ev.review === "false_alarm") byType[ev.type].false += 1;
    });
    return Object.entries(byType)
      .filter(([, s]) => s.total >= 3 && s.false / s.total > 0.6)
      .map(([type, s]) => ({
        type,
        label: EVENT_LABEL[type] || type,
        falseRate: Math.round((s.false / s.total) * 100),
      }));
  })();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 fade-in">
      {/* Back + header */}
      <div className="space-y-1">
        <Link
          to="/teacher"
          className="text-sm text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
        >
          ← Back to dashboard
        </Link>
        <div className="flex justify-between items-end flex-wrap gap-2">
          <div>
            <h1 className="page-title">
              <span className="gradient-text">Exam</span> Review
            </h1>
            <p className="page-subtitle">
              Review flagged moments and decide — valid or false alarm
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700 text-slate-300">
              👥 {attempts.length} students
            </span>
            <span className="px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700 text-slate-300">
              ⚠️ {totalAlarms} alarms
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass p-4 float-up">
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="font-semibold">Alarms by rule</p>
            <p className="text-xs text-slate-400">
              Tuning view — rules firing too often may need adjustment
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/40 text-indigo-300">
            {stats.length} rule{stats.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="h-56">
          {stats.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No alarms recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <XAxis
                  dataKey="_id"
                  stroke="#64748b"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => EVENT_LABEL[v] || v}
                />
                <YAxis
                  stroke="#64748b"
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.08)" }}
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => EVENT_LABEL[v] || v}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {stats.map((s) => (
                    <Cell
                      key={s._id}
                      fill={
                        s._id === "phone"
                          ? "#ef4444"
                          : s._id === "multi_face"
                          ? "#f59e0b"
                          : s._id === "no_face"
                          ? "#ec4899"
                          : s._id === "face_away"
                          ? "#8b5cf6"
                          : "#6366f1"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Two-column: students / events */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Students */}
        <div className="glass p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="font-semibold">Students</p>
            <span className="text-xs text-slate-500">
              {attempts.length} total
            </span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {loadingAttempts && (
              <p className="text-slate-500 text-sm">Loading...</p>
            )}

            {!loadingAttempts && attempts.length === 0 && (
              <div className="text-center py-8 space-y-1">
                <div className="text-3xl">👤</div>
                <p className="text-slate-400 text-sm">No attempts yet</p>
              </div>
            )}

            {attempts.map((a) => {
              const isTerminated = a.status === "terminated";
              return (
                <button
                  key={a._id}
                  onClick={() => openAttempt(a._id)}
                  className={`w-full text-left rounded-lg p-3 transition-all border ${
                    selected?.attempt?._id === a._id
                      ? "bg-indigo-500/10 border-indigo-500/60 ring-1 ring-indigo-500/40"
                      : isTerminated
                      ? "bg-red-500/5 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
                      : "bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {a.student?.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <p className="font-semibold truncate">
                        {a.student?.name || "Unknown"}
                      </p>
                    </div>

                    {/* 🔴 TERMINATED badge takes priority over risk */}
                    {isTerminated ? (
                      <span className="badge bg-red-500/20 text-red-300 border-red-500/50">
                        🚫 TERMINATED
                      </span>
                    ) : (
                      <span
                        className={RISK_BADGE[a.riskLevel] || RISK_BADGE.low}
                      >
                        {(a.riskLevel || "low").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {a.validEventCount} valid event
                    {a.validEventCount !== 1 ? "s" : ""}
                    {isTerminated && a.terminatedReason && (
                      <span className="text-red-300/80">
                        {" "}
                        · {a.terminatedReason}
                      </span>
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Events */}
        <div className="glass p-4">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center space-y-2">
              <div className="text-4xl opacity-50">👈</div>
              <p className="text-slate-400 text-sm">
                Select a student to review their events
              </p>
            </div>
          ) : (
            <>
              {/* Selected student header */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="font-semibold truncate">
                  {selected.attempt.student.name} — events
                </p>
                <div className="flex items-center gap-2">
                  {selected.attempt.status === "terminated" && (
                    <span className="badge bg-red-500/20 text-red-300 border-red-500/50 text-[10px]">
                      🚫 TERMINATED
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    {selected.events.length} total
                  </span>
                </div>
              </div>

              {/* 🔴 Terminated explanation banner */}
              {selected.attempt.status === "terminated" && (
                <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-2.5 mb-2 text-xs text-red-200">
                  <b>⚠️ Auto-terminated:</b>{" "}
                  {selected.attempt.terminatedReason ||
                    "Suspicious activity threshold exceeded"}
                </div>
              )}

              {/* 🟡 Tuning hints */}
              {tuningHints.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-2.5 mb-2 text-xs text-yellow-200">
                  💡 <b>Tuning suggestion:</b>{" "}
                  {tuningHints
                    .map((h) => `${h.label} (${h.falseRate}% false alarm)`)
                    .join(", ")}{" "}
                  — consider raising the threshold.
                </div>
              )}

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {selected.events.length === 0 && (
                  <div className="text-center py-8 space-y-1">
                    <div className="text-3xl">✓</div>
                    <p className="text-slate-400 text-sm">
                      No events — clean session
                    </p>
                  </div>
                )}

                {selected.events.map((ev) => (
                  <div
                    key={ev._id}
                    className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-2.5 text-sm"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-medium text-slate-200">
                        {EVENT_LABEL[ev.type] || ev.type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {ev.snapshot && (
                      <img
                        src={fileUrl(ev.snapshot)}
                        alt="snapshot"
                        title="Hover to unblur"
                        className="mt-1 rounded-md max-h-32 border border-slate-700 blur-md hover:blur-0 transition-all cursor-help"
                      />
                    )}

                    <div className="flex gap-2 mt-2 items-center">
                      <button
                        onClick={() => review(ev._id, "valid")}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all active:scale-95 ${
                          ev.review === "valid"
                            ? "bg-green-600 text-white shadow-lg shadow-green-500/30"
                            : "bg-slate-700/70 text-slate-300 hover:bg-green-600/70 hover:text-white"
                        }`}
                      >
                        ✓ Valid
                      </button>
                      <button
                        onClick={() => review(ev._id, "false_alarm")}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all active:scale-95 ${
                          ev.review === "false_alarm"
                            ? "bg-red-600 text-white shadow-lg shadow-red-500/30"
                            : "bg-slate-700/70 text-slate-300 hover:bg-red-600/70 hover:text-white"
                        }`}
                      >
                        ✕ False Alarm
                      </button>
                      <span
                        className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          REVIEW_STYLE[ev.review] || REVIEW_STYLE.pending
                        }`}
                      >
                        {ev.review}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}