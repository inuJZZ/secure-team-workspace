import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { resetStore } from '../src/db/memory.js';

beforeEach(() => {
  resetStore();
});

describe('secure workspace API', () => {
  it('registers a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'secret123' });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.token).toBeTypeOf('string');
  });

  it('rejects unauthorized org access', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'user@example.com', password: 'secret123' });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'secret123' });

    const token = loginResponse.body.token;

    const unauthorized = await request(app)
      .get('/api/organizations/nonexistent/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(unauthorized.status).toBe(403);
    expect(unauthorized.body.error).toMatch(/not a member/i);
  });

  it('allows a member to list organization tasks', async () => {
    const admin = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin', email: 'admin@example.com', password: 'secret123' });

    const org = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${admin.body.token}`)
      .send({ name: 'Portfolio Team' });

    const project = await request(app)
      .post(`/api/organizations/${org.body.id}/projects`)
      .set('Authorization', `Bearer ${admin.body.token}`)
      .send({ name: 'Landing Page', description: 'Build a landing page' });

    const task = await request(app)
      .post(`/api/organizations/${org.body.id}/tasks`)
      .set('Authorization', `Bearer ${admin.body.token}`)
      .send({ projectId: project.body.id, title: 'Write hero copy', description: 'Add hero text', assigneeId: null });

    expect(task.status).toBe(201);
    const tasks = await request(app)
      .get(`/api/organizations/${org.body.id}/tasks`)
      .set('Authorization', `Bearer ${admin.body.token}`);

    expect(tasks.status).toBe(200);
    expect(tasks.body.length).toBeGreaterThan(0);
  });
});
