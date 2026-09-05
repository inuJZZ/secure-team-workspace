import express from 'express';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from './config.js';
import { organizations, users, memberships } from './db/memory.js';
import { seedDemoData } from './db/seed.js';
import { registerUser, loginUser, listOrganizationsForUser, updateUserProfile, createOrganization, getOrganizationMembers, addOrganizationMember, removeOrganizationMember, getOrganizationMemberProfile, getDirectMessages, sendDirectMessage, getOrganizationProjects, createProject, getOrganizationTasks, createTask, updateTaskStatus, getAuditLogs } from './services/workspace.js';
import { requireAuth, requireOrgMembership, type AuthenticatedRequest } from './middleware/auth.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === config.clientUrl || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):5173$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
  })
);

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const orgSchema = z.object({
  name: z.string().min(2).max(80)
});

const projectSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).default('')
});

const taskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2).max(120),
  description: z.string().max(1000).default(''),
  assigneeId: z.string().uuid().nullable().optional()
});

const memberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member')
});

const messageSchema = z.object({ body: z.string().trim().min(1).max(1000) });
const taskStatusSchema = z.object({ status: z.enum(['todo', 'in_progress', 'done']) });
const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(240).default(''),
  favoriteGenres: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  avatarUrl: z.enum(['/avatars/me.jpeg', '/avatars/laila.jpeg', '/avatars/lova.jpeg', '/avatars/yass.jpeg'])
});

const param = (value: string | string[]) => Array.isArray(value) ? value[0] : value;

app.get('/health', (_req, res) => {
  res.json({ ok: true, message: 'Workspace API is healthy.' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const result = await registerUser(parsed.name, parsed.email, parsed.password);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(400).json({ error: 'Invalid registration payload.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await loginUser(parsed.email, parsed.password);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(401).json({ error: error.message });
    }
    return res.status(401).json({ error: 'Invalid login payload.' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

app.put('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const parsed = profileSchema.parse(req.body);
    return res.json({ user: updateUserProfile(req.user!.id, parsed.name, parsed.bio, parsed.favoriteGenres, parsed.avatarUrl) });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid profile.' });
  }
});

app.get('/api/organizations', requireAuth, (req: AuthenticatedRequest, res) => {
  const organizationsForUser = listOrganizationsForUser(req.user!.id);
  res.json(organizationsForUser);
});

app.post('/api/organizations', requireAuth, (req, res) => {
  try {
    const parsed = orgSchema.parse(req.body);
    const org = createOrganization(req.user!.id, parsed.name);
    return res.status(201).json(org);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(400).json({ error: 'Invalid organization payload.' });
  }
});

app.get('/api/organizations/:orgId/members', requireAuth, requireOrgMembership('member'), (req, res) => {
  res.json(getOrganizationMembers(param(req.params.orgId)));
});

app.post('/api/organizations/:orgId/members', requireAuth, requireOrgMembership('admin'), (req: AuthenticatedRequest, res) => {
  try {
    const parsed = memberSchema.parse(req.body);
    return res.status(201).json(addOrganizationMember(param(req.params.orgId), req.user!.id, parsed.email, parsed.role));
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid member payload.' });
  }
});

app.delete('/api/organizations/:orgId/members/:memberId', requireAuth, requireOrgMembership('admin'), (req: AuthenticatedRequest, res) => {
  try {
    removeOrganizationMember(param(req.params.orgId), req.user!.id, param(req.params.memberId));
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to remove member.' });
  }
});

app.get('/api/organizations/:orgId/members/:memberId/profile', requireAuth, requireOrgMembership('member'), (req, res) => {
  try {
    return res.json(getOrganizationMemberProfile(param(req.params.orgId), param(req.params.memberId)));
  } catch (error) {
    return res.status(404).json({ error: error instanceof Error ? error.message : 'Member not found.' });
  }
});

app.get('/api/organizations/:orgId/messages/:memberId', requireAuth, requireOrgMembership('member'), (req: AuthenticatedRequest, res) => {
  try {
    return res.json(getDirectMessages(param(req.params.orgId), req.user!.id, param(req.params.memberId)));
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to load messages.' });
  }
});

app.post('/api/organizations/:orgId/messages/:memberId', requireAuth, requireOrgMembership('member'), (req: AuthenticatedRequest, res) => {
  try {
    const parsed = messageSchema.parse(req.body);
    return res.status(201).json(sendDirectMessage(param(req.params.orgId), req.user!.id, param(req.params.memberId), parsed.body));
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to send message.' });
  }
});

app.get('/api/organizations/:orgId/projects', requireAuth, requireOrgMembership('member'), (req: AuthenticatedRequest, res) => {
  const orgId = param(req.params.orgId);
  res.json(getOrganizationProjects(orgId));
});

app.post('/api/organizations/:orgId/projects', requireAuth, requireOrgMembership('admin'), (req, res) => {
  try {
    const parsed = projectSchema.parse(req.body);
    const project = createProject(param(req.params.orgId), req.user!.id, parsed.name, parsed.description);
    return res.status(201).json(project);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(400).json({ error: 'Invalid project payload.' });
  }
});

app.get('/api/organizations/:orgId/tasks', requireAuth, requireOrgMembership('member'), (req: AuthenticatedRequest, res) => {
  res.json(getOrganizationTasks(param(req.params.orgId)));
});

app.post('/api/organizations/:orgId/tasks', requireAuth, requireOrgMembership('member'), (req, res) => {
  try {
    const parsed = taskSchema.parse(req.body);
    const task = createTask(param(req.params.orgId), req.user!.id, parsed.projectId, parsed.title, parsed.description, parsed.assigneeId ?? null);
    return res.status(201).json(task);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(400).json({ error: 'Invalid task payload.' });
  }
});

app.patch('/api/organizations/:orgId/tasks/:taskId/status', requireAuth, requireOrgMembership('member'), (req: AuthenticatedRequest, res) => {
  try {
    const parsed = taskStatusSchema.parse(req.body);
    return res.json(updateTaskStatus(param(req.params.orgId), req.user!.id, param(req.params.taskId), parsed.status));
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update book status.' });
  }
});

app.get('/api/organizations/:orgId/audit-logs', requireAuth, requireOrgMembership('member'), (req: AuthenticatedRequest, res) => {
  res.json(getAuditLogs(param(req.params.orgId)));
});

app.get('/api/debug/memberships', (_req, res) => {
  res.json(memberships);
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

const port = config.port;
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedDemoData()
    .then(() => {
      app.listen(port, () => {
        console.log(`Secure workspace API running on http://localhost:${port}`);
      });
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { app };
