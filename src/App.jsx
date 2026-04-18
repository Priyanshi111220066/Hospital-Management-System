import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Hospital,
  Bed,
  Clock,
  UserPlus,
  UserMinus,
  Users,
  Zap,
  HeartPulse,
  ChevronDown,
} from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [system, setSystem] = useState({ available: 28, capacity: 28, waiting: 0, allocated: 0, wards: {} });
  const [patients, setPatients] = useState([]);
  const [log, setLog] = useState([]);
  const [form, setForm] = useState({ name: '', age: '', condition: '', distance: '', severity: 3 });
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [releaseId, setReleaseId] = useState('');
  const scrollRef = useRef(null);

  const api = {
    status: () => axios.get(`${API_BASE}/status`),
    queue: () => axios.get(`${API_BASE}/queue`),
    log: () => axios.get(`${API_BASE}/log`),
    patient: (data) => axios.post(`${API_BASE}/patient`, data),
    allocateNext: () => axios.post(`${API_BASE}/allocate-next`),
    allocateAll: () => axios.post(`${API_BASE}/allocate-all`),
    release: (id) => axios.post(`${API_BASE}/release`, { patient_id: id }),
    reset: () => axios.post(`${API_BASE}/reset`),
    demo: () => axios.post(`${API_BASE}/demo`),
  };

  const fetchAll = async () => {
    try {
      const [statusRes, queueRes, logRes] = await Promise.all([api.status(), api.queue(), api.log()]);
      setSystem(statusRes.data);
      setPatients(queueRes.data);
      setLog(logRes.data);
    } catch (error) {
      toast.error('Connection error. Is backend running?');
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, []);

  const addPatient = async (e) => {
    e.preventDefault();
    if (!form.name || !form.condition || !form.age) {
      toast.error('Name, condition, and age are required');
      return;
    }

    setLoading(true);
    try {
      await api.patient(form);
      setForm({ name: '', age: '', condition: '', distance: '', severity: 3 });
      toast.success('✅ Patient registered successfully!');
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add patient');
    }
    setLoading(false);
  };

  const allocateNextPatient = async () => {
    if (patients.length === 0) {
      toast.error('No patients waiting');
      return;
    }
    setLoading(true);
    try {
      await api.allocateNext();
      toast.success('✅ Patient allocated!');
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Allocation failed');
    }
    setLoading(false);
  };

  const releasePatient = async () => {
    if (!releaseId.trim()) {
      toast.error('Enter patient ID');
      return;
    }
    setLoading(true);
    try {
      await api.release(releaseId.trim());
      setReleaseId('');
      toast.success('✅ Patient released!');
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Release failed');
    }
    setLoading(false);
  };

  const capacityRatio = system.capacity ? system.available / system.capacity : 0;
  const capacityStatus = capacityRatio <= 0.15 ? 'critical' : capacityRatio <= 0.35 ? 'warning' : 'good';

  const SEVERITY_COLORS = {
    1: 'bg-emerald-500 text-emerald-100',
    2: 'bg-sky-500 text-sky-100',
    3: 'bg-yellow-500 text-yellow-950',
    4: 'bg-orange-500 text-orange-100',
    5: 'bg-rose-500 text-rose-100',
  };

  const EMERGENCY_CARD_BG = {
    1: 'border-rose-500/60 bg-rose-950/80',
    2: 'border-orange-500/60 bg-orange-950/80',
    3: 'border-amber-500/60 bg-slate-900/80',
    4: 'border-sky-500/60 bg-slate-900/75',
    5: 'border-slate-600/50 bg-slate-900/70',
  };

  return (
    <div className="min-h-screen text-slate-100">
      <Toaster position="top-right" />

      <header className="glass-card sticky top-0 z-50 mx-4 mt-4 mb-8 border-slate-700/70 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="w-16 h-16 rounded-3xl bg-gradient-to-r from-hospital-500 to-emerald-600 shadow-2xl flex items-center justify-center">
                <Hospital className="h-9 w-9 text-white" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white">Hospital Management</h1>
                <p className="text-slate-400 mt-1">City General Hospital • Real-time bed allocation dashboard</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-slate-200">
              <div className="rounded-3xl bg-slate-900/70 px-5 py-4 shadow-lg border border-slate-700/50">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Capacity</p>
                <p className="mt-2 text-3xl font-black text-white">{system.available}/{system.capacity}</p>
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${capacityStatus === 'critical' ? 'bg-rose-500/20 text-rose-300' : capacityStatus === 'warning' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{capacityStatus}</span>
              </div>

              <div className="rounded-3xl bg-slate-900/70 px-5 py-4 shadow-lg border border-slate-700/50 flex items-center gap-3">
                <Users className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Waiting</p>
                  <p className="mt-1 text-2xl font-bold text-white">{system.waiting}</p>
                </div>
              </div>

              <div className="rounded-3xl bg-slate-900/70 px-5 py-4 shadow-lg border border-slate-700/50 flex items-center gap-3">
                <Clock className="h-5 w-5 text-slate-300 animate-pulse" />
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Live updates</p>
                  <p className="mt-1 text-white">Every 3 seconds</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-16 grid gap-8 xl:grid-cols-[1.6fr_0.8fr]">
        <section className="space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
            <div className="flex items-center gap-3 mb-8">
              <UserPlus className="h-7 w-7 text-hospital-400" />
              <div>
                <h2 className="text-2xl font-bold">New Patient Intake</h2>
                <p className="text-slate-400">Register patients and manage incoming workload.</p>
              </div>
            </div>

            <form onSubmit={addPatient} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="John Smith"
                  className="w-full rounded-3xl border border-slate-700/80 bg-slate-900/80 px-5 py-4 text-white placeholder:text-slate-500 focus:border-hospital-500 focus:outline-none focus:ring-4 focus:ring-hospital-500/20"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Age *</label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    placeholder="45"
                    min="1"
                    max="129"
                    className="w-full rounded-3xl border border-slate-700/80 bg-slate-900/80 px-5 py-4 text-white placeholder:text-slate-500 focus:border-hospital-500 focus:outline-none focus:ring-4 focus:ring-hospital-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.distance}
                    onChange={(e) => setForm({ ...form, distance: e.target.value })}
                    placeholder="8.5"
                    className="w-full rounded-3xl border border-slate-700/80 bg-slate-900/80 px-5 py-4 text-white placeholder:text-slate-500 focus:border-hospital-500 focus:outline-none focus:ring-4 focus:ring-hospital-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Chief Complaint *</label>
                <input
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  placeholder="Respiratory distress, fracture, etc."
                  className="w-full rounded-3xl border border-slate-700/80 bg-slate-900/80 px-5 py-4 text-white placeholder:text-slate-500 focus:border-hospital-500 focus:outline-none focus:ring-4 focus:ring-hospital-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-4">Triage Priority</label>
                <div className="grid gap-3 grid-cols-5">
                  {[1, 2, 3, 4, 5].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setForm({ ...form, severity: sev })}
                      className={`rounded-3xl px-4 py-3 font-bold transition ${form.severity === sev ? 'shadow-2xl shadow-slate-900/40 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/70'} ${sev === 1 ? 'bg-emerald-500' : sev === 2 ? 'bg-sky-500' : sev === 3 ? 'bg-amber-500' : sev === 4 ? 'bg-orange-500' : 'bg-rose-500'}`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full btn-primary text-lg flex items-center justify-center gap-3"
              >
                <UserPlus className="h-5 w-5" />
                <span>{loading ? 'Registering...' : 'Register Patient'}</span>
              </motion.button>
            </form>
          </motion.div>
        </section>

        <aside className="space-y-8 xl:sticky xl:top-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="h-7 w-7 text-orange-400" />
              <div>
                <h2 className="text-2xl font-bold">Quick Actions</h2>
                <p className="text-slate-400">Manage triage flow instantly.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <button
                onClick={allocateNextPatient}
                disabled={loading || patients.length === 0}
                className="btn-secondary w-full flex items-center justify-center gap-3"
              >
                <Bed className="h-5 w-5" />
                Allocate Next Patient
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await api.allocateAll();
                    toast.success('🎉 Batch allocation complete!');
                    fetchAll();
                  } catch (error) {
                    toast.error('Batch allocation failed');
                  }
                  setLoading(false);
                }}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-3"
              >
                <Users className="h-5 w-5" />
                Allocate All
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <Bed className="h-7 w-7 text-sky-400" />
              <h2 className="text-2xl font-bold">Ward Occupancy</h2>
            </div>
            <div className="space-y-4">
              {Object.entries(system.wards || {}).map(([ward, data]) => {
                const occupancy = (data.occupancy / data.capacity) * 100;
                return (
                  <div key={ward} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                        ward === 'ICU' ? 'bg-red-500/20 text-red-400' :
                        ward === 'Emergency' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {ward.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-lg text-white">{ward}</div>
                        <div className="text-sm text-slate-400">{data.available || (data.capacity - data.occupancy)}/{data.capacity} beds</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white">{occupancy.toFixed(0)}%</div>
                      <div className="w-24 h-2 bg-slate-700/50 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            ward === 'ICU' ? 'bg-red-500' :
                            ward === 'Emergency' ? 'bg-orange-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${occupancy}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </aside>

        <section className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-yellow-400" />
                <h2 className="text-2xl font-bold">Waiting Queue</h2>
              </div>
              <div className="text-2xl font-bold text-slate-300">{patients.length}</div>
            </div>

            {patients.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-20 h-20 text-slate-600 mx-auto mb-6 opacity-50" />
                <h3 className="text-xl font-bold text-slate-400 mb-2">No patients waiting</h3>
                <p className="text-slate-600">Register new patients to populate the queue</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto" ref={scrollRef}>
                {patients.slice(0, 8).map((patient, index) => (
                  <motion.div
                    key={patient.patient_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer hover:shadow-xl ${EMERGENCY_CARD_BG[patient.severity] || 'border-slate-800/50 bg-slate-900/70'} hover:border-slate-700/70 hover:bg-slate-900/90`}
                    onClick={() => { setSelectedPatient(patient); setReleaseId(patient.patient_id); }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg ${SEVERITY_COLORS[patient.severity].bg}`}>
                          {patient.severity}
                        </div>
                        <div>
                          <div className="font-bold text-xl group-hover:text-white transition-colors">{patient.name}</div>
                          <div className="text-sm text-slate-500">{patient.condition}</div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${SEVERITY_COLORS[patient.severity].text}`}>
                        P{index + 1}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
                      <div>Wait: <span className="font-bold text-white">{patient.wait_minutes || 0} min</span></div>
                      <div>Score: <span className="font-bold text-white">{patient.priority_score || 0}</span></div>
                      <div>Age: <span className="font-bold text-white">{patient.age}</span></div>
                      <div>Dist: <span className="font-bold text-white">{patient.distance_km}km</span></div>
                    </div>
                  </motion.div>
                ))}
                {patients.length > 8 && (
                  <div className="text-center py-4 text-slate-500">+{patients.length - 8} more patients...</div>
                )}
              </div>
            )}
          </motion.div>

          {/* Next Patient Preview */}
          {selectedPatient && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 fixed bottom-6 right-6 left-6 lg:left-auto lg:w-96 z-50 shadow-2xl border-hospital-500/50"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold flex items-center space-x-3">
                  <Zap className="w-8 h-8 text-yellow-400" />
                  <span>Next Priority</span>
                </h3>
                <button onClick={() => setSelectedPatient(null)} className="p-2 hover:bg-slate-800/50 rounded-xl transition-all">
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className={`p-4 rounded-2xl ${SEVERITY_COLORS[selectedPatient.severity].bg} shadow-lg`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-2xl">{selectedPatient.severity}</span>
                    <div className="text-right">
                      <div className="font-bold text-white">{selectedPatient.name}</div>
                      <div className="text-sm opacity-90">#{selectedPatient.patient_id}</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Condition: <span className="font-bold text-white block truncate">{selectedPatient.condition}</span></div>
                  <div>Wait Time: <span className="font-bold text-yellow-400">{selectedPatient.wait_minutes || 0}min</span></div>
                  <div>Age: <span className="font-bold text-white">{selectedPatient.age}</span></div>
                  <div>Distance: <span className="font-bold text-white">{selectedPatient.distance_km}km</span></div>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-8">
            <div className="flex items-center gap-3 mb-8">
              <HeartPulse className="h-7 w-7 text-rose-400" />
              <div>
                <h2 className="text-2xl font-bold">Allocation Log</h2>
                <p className="text-slate-400">Recent admissions and bed assignments.</p>
              </div>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {log.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700/70 bg-slate-900/60 p-8 text-center text-slate-400">
                  No allocations yet.
                </div>
              ) : (
                log.map((entry) => (
                  <div key={`${entry.patient_id}-${entry.bed_id}`} className={`rounded-3xl p-5 shadow-inner ${EMERGENCY_CARD_BG[entry.severity] || 'border-slate-700/70 bg-slate-900/80'} border` }>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{entry.time} • {entry.ward} • Bed {entry.bed_id}</p>
                        <p className="mt-2 font-semibold text-white">{entry.patient_id} — {entry.name}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                        <span className="rounded-full bg-slate-800/70 px-3 py-1">Score {entry.score}</span>
                        <span className="rounded-full bg-slate-800/70 px-3 py-1">Wait {entry.wait_min} min</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Release Patient</h2>
                <p className="text-slate-400">Enter a patient ID to release their bed.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={releaseId}
                  onChange={(e) => setReleaseId(e.target.value)}
                  placeholder="P0001"
                  className="rounded-3xl border border-slate-700/80 bg-slate-900/80 px-5 py-4 text-white placeholder:text-slate-500 focus:border-hospital-500 focus:outline-none focus:ring-4 focus:ring-hospital-500/20"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={releasePatient}
                  disabled={loading || !releaseId.trim()}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <UserMinus className="h-5 w-5" />
                  Release
                </motion.button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}

export default App;
