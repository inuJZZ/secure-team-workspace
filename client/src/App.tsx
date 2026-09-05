import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  favoriteGenres?: string[];
};

type Organization = {
  id: string;
  name: string;
  role: 'admin' | 'member';
};

type Member = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  favoriteGenres?: string[];
  role: 'admin' | 'member';
  createdAt: string;
};

const avatarFallback = (name: string) => name.slice(0, 1).toUpperCase();

type MemberProfile = {
  member: Member;
  books: Task[];
  stats: { total: number; read: number; inProgress: number };
};

type DirectMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  body: string;
  createdAt: string;
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

const API_URL = import.meta.env.VITE_API_URL || '';

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
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<MemberProfile | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [message, setMessage] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [newTask, setNewTask] = useState({ projectId: '', title: '', description: '', assigneeId: '' });
  const [invite, setInvite] = useState({ email: '', role: 'member' as Member['role'] });
  const [selectedBook, setSelectedBook] = useState<Task | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', bio: '', genres: '', avatarUrl: '/avatars/me.jpeg' });

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
      const [projectsResponse, tasksResponse, logsResponse, membersResponse] = await Promise.all([
        fetch(`${API_URL}/api/organizations/${selectedOrgId}/projects`, { headers: getAuthHeaders(token) }),
        fetch(`${API_URL}/api/organizations/${selectedOrgId}/tasks`, { headers: getAuthHeaders(token) }),
        fetch(`${API_URL}/api/organizations/${selectedOrgId}/audit-logs`, { headers: getAuthHeaders(token) }),
        fetch(`${API_URL}/api/organizations/${selectedOrgId}/members`, { headers: getAuthHeaders(token) })
      ]);

      if (projectsResponse.ok) setProjects(await projectsResponse.json());
      if (tasksResponse.ok) setTasks(await tasksResponse.json());
      if (logsResponse.ok) setAuditLogs(await logsResponse.json());
      if (membersResponse.ok) setMembers(await membersResponse.json());
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

  const updateBookStatus = async (status: Task['status']) => {
    if (!selectedOrgId || !token || !selectedBook) return;
    const response = await fetch(`${API_URL}/api/organizations/${selectedOrgId}/tasks/${selectedBook.id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error || 'Unable to update reading status.');
      return;
    }

    const updated = await response.json();
    setTasks((current) => current.map((task) => task.id === updated.id ? updated : task));
    setSelectedBook(updated);
    setSelectedMemberProfile((current) => current ? {
      ...current,
      books: current.books.map((book) => book.id === updated.id ? updated : book),
      stats: {
        total: current.books.length,
        read: current.books.map((book) => book.id === updated.id ? updated : book).filter((book) => book.status === 'done').length,
        inProgress: current.books.map((book) => book.id === updated.id ? updated : book).filter((book) => book.status === 'in_progress').length
      }
    } : current);
    setMessage('Reading progress updated.');
  };

  const inviteMember = async () => {
    if (!selectedOrgId || !token || !invite.email.trim()) return;
    const response = await fetch(`${API_URL}/api/organizations/${selectedOrgId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ email: invite.email.trim(), role: invite.role })
    });

    if (response.ok) {
      const member = await response.json();
      setMembers((current) => [...current, member]);
      setInvite({ email: '', role: 'member' });
      setMessage('Member added to your library.');
    } else {
      const data = await response.json();
      setMessage(data.error || 'Unable to add member.');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!selectedOrgId || !token) return;
    const response = await fetch(`${API_URL}/api/organizations/${selectedOrgId}/members/${memberId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });

    if (response.ok) {
      setMembers((current) => current.filter((member) => member.id !== memberId));
      setMessage('Member removed from your library.');
    } else {
      const data = await response.json();
      setMessage(data.error || 'Unable to remove member.');
    }
  };

  const openMemberProfile = async (memberId: string) => {
    if (!selectedOrgId || !token) return;
    const [profileResponse, messagesResponse] = await Promise.all([
      fetch(`${API_URL}/api/organizations/${selectedOrgId}/members/${memberId}/profile`, { headers: getAuthHeaders(token) }),
      fetch(`${API_URL}/api/organizations/${selectedOrgId}/messages/${memberId}`, { headers: getAuthHeaders(token) })
    ]);
    if (profileResponse.ok) setSelectedMemberProfile(await profileResponse.json());
    if (messagesResponse.ok) setDirectMessages(await messagesResponse.json());
  };

  const sendMessage = async () => {
    if (!selectedOrgId || !token || !selectedMemberProfile || !messageDraft.trim()) return;
    const response = await fetch(`${API_URL}/api/organizations/${selectedOrgId}/messages/${selectedMemberProfile.member.id}`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ body: messageDraft })
    });
    if (response.ok) {
      const message = await response.json();
      setDirectMessages((current) => [...current, message]);
      setMessageDraft('');
    }
  };

  const closeMemberProfile = () => {
    setSelectedMemberProfile(null);
    setDirectMessages([]);
    setMessageDraft('');
  };

  useEffect(() => {
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedBook(null);
        closeMemberProfile();
      }
    };
    window.addEventListener('keydown', handleDialogKey);
    return () => window.removeEventListener('keydown', handleDialogKey);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const openProfileEditor = () => {
    if (!user) return;
    setProfileForm({
      name: user.name,
      bio: user.bio ?? '',
      genres: (user.favoriteGenres ?? []).join(', '),
      avatarUrl: user.avatarUrl ?? '/avatars/me.jpeg'
    });
    setProfileEditorOpen(true);
  };

  const saveProfile = async () => {
    if (!token || !profileForm.name.trim()) return;
    const response = await fetch(`${API_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify({
        name: profileForm.name.trim(),
        bio: profileForm.bio.trim(),
        favoriteGenres: profileForm.genres.split(',').map((genre) => genre.trim()).filter(Boolean),
        avatarUrl: profileForm.avatarUrl
      })
    });
    const data = await response.json();
    if (response.ok) {
      setUser(data.user);
      setProfileEditorOpen(false);
      setMessage('Profile updated.');
    } else {
      setMessage(data.error || 'Unable to update profile.');
    }
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
          <div className="sidebar-profile-heading">{user.avatarUrl ? <img className="avatar" src={user.avatarUrl} alt={`${user.name} profile`} /> : <span className="avatar avatar-fallback">{avatarFallback(user.name)}</span>}<div><h2>{user.name}</h2><p className="sidebar-caption">{user.bio || 'Read deeply. Keep discovering.'}</p></div></div>
        </div>

        <button className="ghost" type="button" onClick={openProfileEditor}>Edit profile</button>
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

            <section className="panel members-panel">
              <div className="section-heading"><div><p className="eyebrow">Build your circle</p><h3>People</h3></div><span className="section-mark">04</span></div>
              <div className="member-list">
                {members.map((member) => (
                  <div className="member-row" key={member.id} role="button" tabIndex={0} onClick={() => openMemberProfile(member.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openMemberProfile(member.id); }}>
                    <div className="avatar-wrap">{member.avatarUrl ? <img className="avatar" src={member.avatarUrl} alt={`${member.name} profile`} /> : <span className="avatar avatar-fallback">{avatarFallback(member.name)}</span>}</div>
                    <div><strong>{member.name}</strong><small>{member.email}</small></div>
                    <span className="badge">{member.role}</span>
                    {selectedOrg.role === 'admin' && member.id !== user.id && <button className="remove-button" type="button" onClick={(event) => { event.stopPropagation(); removeMember(member.id); }}>Remove</button>}
                  </div>
                ))}
              </div>
              {selectedOrg.role === 'admin' && <div className="invite-row">
                <input value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} placeholder="Registered user's email" type="email" />
                <select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value as Member['role'] })}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="primary" type="button" onClick={inviteMember}>Add person</button>
              </div>}
            </section>

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
                  <div className="status-control"><label htmlFor="book-status">Reading status</label><select id="book-status" value={selectedBook.status} onChange={(event) => updateBookStatus(event.target.value as Task['status'])}><option value="todo">Want to read</option><option value="in_progress">Reading now</option><option value="done">Finished</option></select></div>
                  {selectedBook.title === 'The Stranger' ? (
                    <iframe className="pdf-reader" title="The Stranger PDF" src="/books/the-stranger.pdf" />
                  ) : selectedBook.title === 'The Metamorphosis' ? (
                    <iframe className="pdf-reader" title="The Metamorphosis PDF" src="/books/the-metamorphosis.pdf" />
                  ) : selectedBook.title === 'Crime and Punishment' ? (
                    <iframe className="pdf-reader" title="Crime and Punishment PDF" src="/books/crime-and-punishment.pdf" />
                  ) : selectedBook.title === 'And Then There Were None' ? (
                    <iframe className="pdf-reader" title="Swiss Family PDF" src="/books/swiss-family.pdf" />
                  ) : selectedBook.title === 'Anna Karenina' ? (
                    <iframe className="pdf-reader" title="Anna Karenina PDF" src="/books/anna-karenina.pdf" />
                  ) : selectedBook.title === 'Pride and Prejudice' ? (
                    <iframe className="pdf-reader" title="Pride and Prejudice PDF" src="/books/pride-and-prejudice.pdf" />
                  ) : (
                    <div className="reader-empty"><strong>Your reading copy will appear here.</strong><p>Add a legally obtained PDF to <code>client/public/books/{selectedBook.title.toLowerCase().replace(/ /g, '-')}.pdf</code> to open it in enuLib.</p></div>
                  )}
                </section>
              </div>
            )}

            {selectedMemberProfile && (
              <div className="reader-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-title">
                <section className="profile-panel">
                  <div className="reader-header">
                    <div className="profile-identity">{selectedMemberProfile.member.avatarUrl ? <img className="profile-avatar" src={selectedMemberProfile.member.avatarUrl} alt={`${selectedMemberProfile.member.name} profile`} /> : <span className="profile-avatar avatar-fallback">{avatarFallback(selectedMemberProfile.member.name)}</span>}<div><p className="eyebrow">Member profile</p><h2 id="profile-title">{selectedMemberProfile.member.name}</h2><p className="page-subtitle">{selectedMemberProfile.member.email}</p>{selectedMemberProfile.member.bio && <p className="profile-bio">{selectedMemberProfile.member.bio}</p>}{selectedMemberProfile.member.favoriteGenres && selectedMemberProfile.member.favoriteGenres.length > 0 && <div className="genre-list">{selectedMemberProfile.member.favoriteGenres.map((genre) => <span className="genre-chip" key={genre}>{genre}</span>)}</div>}</div></div>
                    <button className="ghost close-dialog" type="button" onClick={closeMemberProfile}>Back to reading space</button>
                  </div>
                  <div className="profile-stats">
                    <div><strong>{selectedMemberProfile.stats.total}</strong><small>Books assigned</small></div>
                    <div><strong>{selectedMemberProfile.stats.read}</strong><small>Books read</small></div>
                    <div><strong>{selectedMemberProfile.stats.inProgress}</strong><small>Reading now</small></div>
                  </div>
                  <div className="profile-columns">
                    <section className="profile-books">
                      <div className="section-heading"><div><p className="eyebrow">Reading record</p><h3>Books</h3></div></div>
                      {selectedMemberProfile.books.length === 0 ? <p className="muted-copy">No books assigned yet.</p> : selectedMemberProfile.books.map((book) => <div className="profile-book" key={book.id}><strong>{book.title}</strong><span>{readingStatus(book.status)}</span></div>)}
                    </section>
                    <section className="dm-panel">
                      <div className="section-heading"><div><p className="eyebrow">Private conversation</p><h3>Direct message</h3></div></div>
                      <div className="message-list">
                        {directMessages.length === 0 ? <p className="muted-copy">Start a conversation with {selectedMemberProfile.member.name}.</p> : directMessages.map((message) => <div className={`message-bubble ${message.senderId === user.id ? 'mine' : ''}`} key={message.id}><small>{message.senderName}</small><p>{message.body}</p></div>)}
                      </div>
                      <div className="message-composer"><input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="Write a message..." /><button className="primary" type="button" onClick={sendMessage}>Send</button></div>
                    </section>
                  </div>
                </section>
              </div>
            )}

            {profileEditorOpen && (
              <div className="reader-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
                <section className="profile-editor-panel">
                  <div className="reader-header"><div><p className="eyebrow">Your reader identity</p><h2 id="edit-profile-title">Edit profile</h2></div><button className="ghost" type="button" onClick={() => setProfileEditorOpen(false)}>Cancel</button></div>
                  <div className="profile-editor-form">
                    <label><span>Display name</span><input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} /></label>
                    <label><span>Short bio</span><textarea value={profileForm.bio} onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })} placeholder="What do you enjoy reading?" /></label>
                    <label><span>Favorite genres</span><input value={profileForm.genres} onChange={(event) => setProfileForm({ ...profileForm, genres: event.target.value })} placeholder="Classics, mystery, sci-fi" /></label>
                    <div><span className="form-label">Profile picture</span><div className="avatar-choice-list">{['/avatars/me.jpeg', '/avatars/laila.jpeg', '/avatars/lova.jpeg', '/avatars/yass.jpeg'].map((avatar) => <button className={`avatar-choice ${profileForm.avatarUrl === avatar ? 'selected' : ''}`} type="button" key={avatar} onClick={() => setProfileForm({ ...profileForm, avatarUrl: avatar })}><img className="profile-avatar" src={avatar} alt="Choose profile picture" /></button>)}</div></div>
                    <button className="primary" type="button" onClick={saveProfile}>Save profile</button>
                  </div>
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
