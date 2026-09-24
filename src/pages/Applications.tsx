import { Dialog } from '../components/common/Dialog';
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Kanban,
  Table as TableIcon,
  MapPin,
  Calendar,
  Sparkles,
  Edit3,
  Trash2,
  ExternalLink,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';
import type { Application, ApplicationStage, Priority } from '../types';
import { useToast } from '../components/common/Toast';
import { generateId } from '../utils/id';

interface ApplicationsProps {
  applications: Application[];
  selectedAppId?: string;
  onSaveApplication: (app: Application) => Promise<void>;
  onDeleteApplication: (appId: string) => Promise<void>;
  onNavigateToCopilotJD: (jdText: string) => void;
  onQuickLogInterview: (app: Application) => void;
  userId: string;
}

const STAGES: ApplicationStage[] = [
  'Wishlist',
  'Applied',
  'Assessment',
  'Interviewing',
  'Offer',
  'Rejected',
  'Withdrawn',
];

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

export const Applications: React.FC<ApplicationsProps> = ({
  applications,
  selectedAppId,
  onSaveApplication,
  onDeleteApplication,
  onNavigateToCopilotJD,
  onQuickLogInterview,
  userId,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Add / Edit Modal
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Application>>({});

  // Active Detail Modal
  const activeApp = applications.find(a => a.id === selectedAppId) || null;
  const setActiveApp = (a: Application | null) => navigate(a ? `/applications/${encodeURIComponent(a.id)}` : '/applications');

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchSearch =
        app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPri =
        selectedPriority === 'all' || app.priority === selectedPriority;
      return matchSearch && matchPri;
    });
  }, [applications, searchQuery, selectedPriority]);

  const handleOpenAdd = () => {
    setEditFormData({
      company: '',
      department: 'AI Lab / Foundation Models',
      position: 'LLM Algorithm Engineer',
      jobType: 'Full-time',
      location: 'Remote / Hybrid',
      jobDescription: '',
      source: 'Referral',
      resumeVersion: 'v3.2_Algorithm.pdf',
      applicationDate: new Date().toISOString().split('T')[0],
      status: 'Applied',
      priority: 'High',
      notes: '',
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (app: Application) => {
    setEditFormData(app);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editFormData.company?.trim() || !editFormData.position?.trim()) {
      showToast('Company and Position are required', 'error');
      return;
    }

    const id = editFormData.id || generateId();
    const toSave: Application = {
      id,
      userId,
      company: editFormData.company || 'Unknown Co',
      department: editFormData.department || '',
      position: editFormData.position || 'Algorithm Engineer',
      jobType: (editFormData.jobType as any) || 'Full-time',
      location: editFormData.location || '',
      jobDescription: editFormData.jobDescription || '',
      source: editFormData.source || '',
      resumeVersion: editFormData.resumeVersion || '',
      applicationDate: editFormData.applicationDate || new Date().toISOString().split('T')[0],
      status: (editFormData.status as ApplicationStage) || 'Applied',
      priority: (editFormData.priority as Priority) || 'Medium',
      notes: editFormData.notes || '',
      createdAt: editFormData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try { await onSaveApplication(toSave); } catch { return; }
    if (activeApp?.id === id) {
      setActiveApp(toSave);
    }
    setIsEditing(false);
    showToast('Application saved');
  };

  const handleQuickStatusChange = async (
    app: Application,
    newStatus: ApplicationStage
  ) => {
    const updated = { ...app, status: newStatus, updatedAt: new Date().toISOString() };
    try { await onSaveApplication(updated); } catch { return; }
    showToast(`Moved ${app.company} to ${newStatus}`);
  };

  React.useEffect(() => {
    if (new URLSearchParams(location.search).get('new') === '1') {
      handleOpenAdd();
      navigate(location.pathname, { replace: true });
    }
  }, [location.search]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Job Applications CRM
          </h2>
          <p className="text-xs text-zinc-500">
            Track hiring pipelines, application stages, resume versions, and JD analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-zinc-700 font-semibold text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-700 font-semibold text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 text-xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search companies, positions, locations..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-[11px]">Priority:</span>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs"
          >
            <option value="all">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageApps = filteredApps.filter((a) => a.status === stage);
            return (
              <div
                key={stage}
                className="flex flex-col bg-zinc-100/60 dark:bg-[#0f141f]/70 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 min-w-[240px] max-h-[75vh]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {stage}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200/60 dark:border-zinc-700">
                    {stageApps.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                  {stageApps.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => setActiveApp(app)}
                      className="p-3 bg-white dark:bg-[#151b27] border border-zinc-200/90 dark:border-zinc-800 rounded-lg shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-700 cursor-pointer transition-all space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {app.company}
                          </h4>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-1">
                            {app.position}
                          </p>
                        </div>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                            app.priority === 'High'
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                              : app.priority === 'Medium'
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {app.priority}
                        </span>
                      </div>

                      {app.location && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{app.location}</span>
                        </div>
                      )}

                      {/* Quick Move stage selector */}
                      <div
                        className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] text-zinc-400">Move:</span>
                        <select
                          value={app.status}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              app,
                              e.target.value as ApplicationStage
                            )
                          }
                          className="text-[10px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Applied Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => setActiveApp(app)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {app.company}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {app.position}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          app.priority === 'High'
                            ? 'bg-rose-50 text-rose-600'
                            : app.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {app.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{app.location || '—'}</td>
                    <td className="px-4 py-3 text-zinc-500">{app.applicationDate}</td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleOpenEdit(app)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {activeApp && (
        <Dialog onClose={() => setActiveApp(null)} aria-label="Application details" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-start justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {activeApp.status}
                  </span>
                  <span className="text-xs text-zinc-500">{activeApp.priority} Priority</span>
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {activeApp.company} — {activeApp.position}
                </h3>
                <p className="text-xs text-zinc-500">
                  {activeApp.department} • {activeApp.location} • Applied on {activeApp.applicationDate}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(activeApp)}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Delete application, interview rounds and logged questions for ${activeApp.company}?`)) {
                      try { await onDeleteApplication(activeApp.id); } catch { return; }
                      setActiveApp(null);
                      showToast('Application deleted');
                    }
                  }}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button aria-label="Close"
                  onClick={() => setActiveApp(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600"
                ><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {activeApp.jobDescription && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-zinc-400">
                      Job Description
                    </span>
                    <button
                      onClick={() => {
                        onNavigateToCopilotJD(activeApp.jobDescription);
                      }}
                      className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyze with Copilot</span>
                    </button>
                  </div>
                  <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 whitespace-pre-line text-zinc-700 dark:text-zinc-300">
                    {activeApp.jobDescription}
                  </div>
                </div>
              )}

              {activeApp.notes && (
                <div className="space-y-1">
                  <span className="font-bold uppercase tracking-wider text-zinc-400">
                    Notes & Strategy
                  </span>
                  <p className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {activeApp.notes}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 text-zinc-500">
                <div>Source: {activeApp.source || 'Direct'}</div>
                <div>Resume: {activeApp.resumeVersion || 'Default'}</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                onClick={() => {
                  onQuickLogInterview(activeApp);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Log Interview for this Job</span>
              </button>

              <button
                onClick={() => setActiveApp(null)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ADD / EDIT MODAL */}
      {isEditing && (
        <Dialog onClose={() => setIsEditing(false)} aria-label="Application editor" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {editFormData.id ? 'Edit Application' : 'New Job Application'}
              </h3>
              <button aria-label="Close"
                onClick={() => setIsEditing(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600"
              ><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="applications-field-0" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Company Name
                  </label>
                  <input id="applications-field-0"
                    type="text"
                    value={editFormData.company || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, company: e.target.value })
                    }
                    placeholder="e.g. ByteDance"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label htmlFor="applications-field-1" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Position Title
                  </label>
                  <input id="applications-field-1"
                    type="text"
                    value={editFormData.position || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, position: e.target.value })
                    }
                    placeholder="e.g. LLM Algorithm Engineer"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="applications-field-2" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Stage
                  </label>
                  <select id="applications-field-2"
                    value={editFormData.status || 'Applied'}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value as any })
                    }
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="applications-field-3" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Priority
                  </label>
                  <select id="applications-field-3"
                    value={editFormData.priority || 'Medium'}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, priority: e.target.value as any })
                    }
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="applications-field-4" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Location
                  </label>
                  <input id="applications-field-4"
                    type="text"
                    value={editFormData.location || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, location: e.target.value })
                    }
                    placeholder="Remote / SF"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="applications-field-5" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Job Description (used by AI Copilot for analysis)
                </label>
                <textarea id="applications-field-5"
                  rows={4}
                  value={editFormData.jobDescription || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, jobDescription: e.target.value })
                  }
                  placeholder="Paste JD requirements, skills, qualifications here..."
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label htmlFor="applications-field-6" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Notes & Status Details
                </label>
                <textarea id="applications-field-6"
                  rows={2}
                  value={editFormData.notes || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, notes: e.target.value })
                  }
                  placeholder="Referral contact, recruiter notes, interview scheduling..."
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Save Application
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
