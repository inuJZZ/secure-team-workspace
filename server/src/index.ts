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
import { registerUser, loginUser, listOrganizationsForUser, createOrganization, getOrganizationProjects, createProject, getOrganizationTasks, createTask, getAuditLogs } from './services/workspace.js';
import { requireAuth, requireOrgMembership, type AuthenticatedRequest } from './middleware/auth.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
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

app.get('/api/organizations/:orgId/projects', requireAuth, requireOrgMembership('member'), (req: AuthenticatedRequest, res) => {
  const orgId = req.params.orgId;
  res.json(getOrganizationProjects(orgId));
});

app.post('/api/organizations/:orgId/projects', requireAuth, requireOrgMembership('admin'), (req, res) => {
  try {
    const parsed = projectSchema.parse(req.body);
    const project = createProject(req.params.orgId, req.user!.id, parsed.name, parsed.description);
    return res.status(201).json(project);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(400).json({ error: 'Invalid project payload.' });
  }
});

app.get('/api/organizations/:orgId/tasks', requireAuth, requireOrgMembership('member'), (req: AuthenticatedRequest, res) => {
  res.json(getOrganizationTasks(req.params.orgId));
});

app.post('/api/organizations/:orgId/tasks', requireAuth, requireOrgMembership('member'), (req, res) => {
  try {
    const parsed = taskSchema.parse(req.body);
    const task = createTask(req.params.orgId, req.user!.id, parsed.projectId, parsed.title, parsed.description, parsed.assigneeId ?? null);
    return res.status(201).json(task);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(400).json({ error: 'Invalid task payload.' });
  }
});

app.get('/api/organizations/:orgId/audit-logs', requireAuth, requireOrgMembership('member'), (req: AuthenticatedRequest, res) => {
  res.json(getAuditLogs(req.params.orgId));
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
