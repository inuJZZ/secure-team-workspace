import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

type User = {
  id: string;
  email: string;
  name: string;
};

type Organization = {
  id: string;
  name: string;
  role: 'admin' | 'member';
};

type Project = {
  id: string;
  orgId: string;
  name: string;
  description: string;
};

type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  assigneeId: string | null;
};

type AuditLog = {
  id: string;
  action: string;
  createdAt: string;
};

const API_URL = 'http://localhost:4000';

const getAuthHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
});

const readingStatus = (status: Task['status']) => ({
  todo: 'Want to read',
  in_progress: 'Reading now',
  done: 'Finished'
}[status]);

const AuthPage = ({ onLogin }: { onLogin: (token: string, user: User) => void }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: 'admin@demo.com', password: 'admin123' });
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = mode === 'login' ? { email: form.email, password: form.password } : { ...form };

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Authentication failed.');
      return;
    }

    onLogin(data.token, data.user);
  };

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="brand-lockup">
          <img src="/logo.png" alt="enuLib logo" />
          <p className="eyebrow">enuLib / DIGITAL LIBRARY</p>
        </div>
        <h1 id="auth-title">{mode === 'login' ? 'Return to your shelf' : 'Create your reader account'}</h1>
        <div className="segmented" aria-label="Authentication mode selector">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        </div>

        {mode === 'register' && (
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Jane Developer" />
          </label>
        )}

        <label>
          <span>Email</span>
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" />
        </label>

        <label>
          <span>Password</span>
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="primary" type="button" onClick={submit}>{mode === 'login' ? 'Log in' : 'Register'}</button>
      </section>
    </main>
  );
};

const WorkspacePage = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [newTask, setNewTask] = useState({ projectId: '', title: '', description: '', assigneeId: '' });
  const [selectedBook, setSelectedBook] = useState<Task | null>(null);

  const selectedOrg = useMemo(() => orgs.find((org) => org.id === selectedOrgId) ?? null, [orgs, selectedOrgId]);
  const completedTasks = tasks.filter((task) => task.status === 'done').length;
  const activeTasks = tasks.filter((task) => task.status !== 'done').length;

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      navigate('/login');
      return;
    }

    const load = async () => {
      const userResponse = await fetch(`${API_URL}/api/auth/me`, {
        headers: getAuthHeaders(savedToken)
      });

      if (!userResponse.ok) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const userData = await userResponse.json();
      setUser(userData.user);
      setToken(savedToken);

      const orgResponse = await fetch(`${API_URL}/api/organizations`, {
        headers: getAuthHeaders(savedToken)
      });

      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        setOrgs(orgData);
        if (orgData[0]) {
          setSelectedOrgId(orgData[0].id);
        }
      }
    };

    load();
  }, [navigate]);

  useEffect(() => {
    if (!selectedOrgId || !token) return;

    const loadOrgDetails = async () => {
      const [projectsResponse, tasksResponse, logsResponse] = await Promise.all([
        fetch(`${API_URL}/api/organizations/${selectedOrgId}/projects`, { headers: getAuthHeaders(token) }),
        fetch(`${API_URL}/api/organizations/${selectedOrgId}/tasks`, { headers: getAuthHeaders(token) }),
        fetch(`${API_URL}/api/organizations/${selectedOrgId}/audit-logs`, { headers: getAuthHeaders(token) })
      ]);

      if (projectsResponse.ok) setProjects(await projectsResponse.json());
      if (tasksResponse.ok) setTasks(await tasksResponse.json());
      if (logsResponse.ok) setAuditLogs(await logsResponse.json());
    };

    loadOrgDetails();
  }, [selectedOrgId, token]);

  const createOrganization = async () => {
    if (!token || !newOrg.trim()) return;
    const response = await fetch(`${API_URL}/api/organizations`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ name: newOrg.trim() })
    });

    if (response.ok) {
      const org = await response.json();
      setOrgs((current) => [...current, { ...org, role: 'admin' }]);
      setSelectedOrgId(org.id);
      setMessage('Library created.');
      setNewOrg('');
    } else {
      setMessage('Unable to create library.');
    }
  };

  const createProject = async () => {
    if (!selectedOrgId || !token || !newProject.name.trim()) return;
    const response = await fetch(`${API_URL}/api/organizations/${selectedOrgId}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(newProject)
    });

    if (response.ok) {
      const created = await response.json();
      setProjects((current) => [...current, created]);
      setNewProject({ name: '', description: '' });
      setMessage('Collection created.');
    }
  };

  const createTaskAction = async () => {
    if (!selectedOrgId || !token || !newTask.title.trim()) return;
    const response = await fetch(`${API_URL}/api/organizations/${selectedOrgId}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({
        projectId: newTask.projectId || projects[0]?.id,
        title: newTask.title,
        description: newTask.description,
        assigneeId: newTask.assigneeId || null
      })
    });

    if (response.ok) {
      const created = await response.json();
      setTasks((current) => [...current, created]);
      setNewTask({ projectId: '', title: '', description: '', assigneeId: '' });
      setMessage('Book added to your reading queue.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (!user || !token) return null;

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-lockup">
            <img src="/logo.png" alt="enuLib logo" />
            <p className="eyebrow">enuLib</p>
          </div>
          <h2>{user.name}</h2>
          <p className="sidebar-caption">Read deeply. Keep discovering.</p>
        </div>

        <button className="ghost" onClick={logout}>Log out</button>

        <div className="panel">
          <h3>My libraries</h3>
          {orgs.length === 0 ? <p>No libraries yet.</p> : orgs.map((org) => (
            <button key={org.id} className={`org-chip ${selectedOrgId === org.id ? 'selected' : ''}`} onClick={() => setSelectedOrgId(org.id)}>
              {org.name} <small>{org.role}</small>
            </button>
          ))}
          <input value={newOrg} onChange={(event) => setNewOrg(event.target.value)} placeholder="Name a new library" />
          <button className="primary" onClick={createOrganization}>Create library</button>
        </div>
      </aside>

      <main className="content">
        {selectedOrg ? (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">Library / overview</p>
                <div className="hero-brand"><img src="/logo.png" alt="" /><h1>{selectedOrg.name}</h1></div>
                <p className="page-subtitle">A thoughtful place to collect, explore, and return to great ideas.</p>
              </div>
              <span className="badge">{selectedOrg.role}</span>
            </header>

            {message && <div className="notice">{message}</div>}

            <div className="planner-stats" aria-label="Planner summary">
              <div className="stat-card"><span>Collections</span><strong>{projects.length}</strong><small>curated shelves</small></div>
              <div className="stat-card"><span>Reading queue</span><strong>{activeTasks}</strong><small>books waiting for you</small></div>
              <div className="stat-card"><span>Finished</span><strong>{completedTasks}</strong><small>books completed</small></div>
            </div>

            <div className="grid two-up">
              <section className="panel">
                <div className="section-heading"><div><p className="eyebrow">Organize your ideas</p><h3>Collections</h3></div><span className="section-mark">01</span></div>
                {projects.map((project) => (
                  <div key={project.id} className="card-item">
                    <strong>{project.name}</strong>
                    <p>{project.description}</p>
                  </div>
                ))}
                <input value={newProject.name} onChange={(event) => setNewProject({ ...newProject, name: event.target.value })} placeholder="Collection name" />
                <textarea value={newProject.description} onChange={(event) => setNewProject({ ...newProject, description: event.target.value })} placeholder="What belongs on this shelf?" />
                <button className="primary" onClick={createProject}>Add collection</button>
              </section>

              <section className="panel">
                <div className="section-heading"><div><p className="eyebrow">Choose your next read</p><h3>Reading queue</h3></div><span className="section-mark">02</span></div>
                {tasks.map((task, index) => (
                  <button key={task.id} className={`card-item book-card book-card-${index % 6}`} onClick={() => setSelectedBook(task)} type="button">
                    <strong>{task.title}</strong>
                    <p>{task.description}</p>
                    <small>{readingStatus(task.status)}</small>
                  </button>
                ))}
                <select value={newTask.projectId || projects[0]?.id || ''} onChange={(event) => setNewTask({ ...newTask, projectId: event.target.value })}>
                  {projects.map((project) => (
                    <option value={project.id} key={project.id}>{project.name}</option>
                  ))}
                </select>
                <input value={newTask.title} onChange={(event) => setNewTask({ ...newTask, title: event.target.value })} placeholder="Book title" />
                <textarea value={newTask.description} onChange={(event) => setNewTask({ ...newTask, description: event.target.value })} placeholder="Author, notes, or why you want to read it" />
                <input value={newTask.assigneeId} onChange={(event) => setNewTask({ ...newTask, assigneeId: event.target.value })} placeholder="Reader ID (optional)" />
                <button className="primary" onClick={createTaskAction}>Add book to queue</button>
              </section>
            </div>

            <section className="panel">
              <div className="section-heading"><div><p className="eyebrow">Your reading journey</p><h3>Reading activity</h3></div><span className="section-mark">03</span></div>
              <ul className="log-list">
                {auditLogs.map((log) => (
                  <li key={log.id}><span>{log.action}</span><time>{new Date(log.createdAt).toLocaleString()}</time></li>
                ))}
              </ul>
            </section>

            {selectedBook && (
              <div className="reader-overlay" role="dialog" aria-modal="true" aria-labelledby="reader-title">
                <section className="reader-panel">
                  <div className="reader-header">
                    <div><p className="eyebrow">enuLib reader</p><h2 id="reader-title">{selectedBook.title}</h2></div>
                    <button className="ghost" type="button" onClick={() => setSelectedBook(null)}>Close</button>
                  </div>
                  {selectedBook.title === 'The Stranger' ? (
                    <iframe className="pdf-reader" title="The Stranger PDF" src="/books/the-stranger.pdf" />
                  ) : (
                    <div className="reader-empty"><strong>Your reading copy will appear here.</strong><p>Add a legally obtained PDF to <code>client/public/books/{selectedBook.title.toLowerCase().replace(/ /g, '-')}.pdf</code> to open it in enuLib.</p></div>
                  )}
                </section>
              </div>
            )}
          </>
        ) : (
          <p>No library selected.</p>
        )}
      </main>
    </div>
  );
};

const App = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);

  const onLogin = (nextToken: string, nextUser: User) => {
    localStorage.setItem('token', nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/auth/me`, { headers: getAuthHeaders(token) })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data) setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('token');
      });
  }, [token]);

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <AuthPage onLogin={onLogin} />} />
      <Route path="/" element={token ? <WorkspacePage /> : <Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
