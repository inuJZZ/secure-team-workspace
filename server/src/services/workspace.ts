import { randomUUID } from 'node:crypto';
import { auditLogs, memberships, organizations, projects, tasks, users } from '../db/memory.js';
import { comparePassword, hashPassword, signJwt } from '../utils/security.js';

export const registerUser = async (name: string, email: string, password: string) => {
  const existing = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('A user with this email already exists.');
  }

  const passwordHash = await hashPassword(password);
  const user = {
    id: randomUUID(),
    email: email.toLowerCase(),
    passwordHash,
    name,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  return {
    user: { id: user.id, email: user.email, name: user.name },
    token: signJwt({ userId: user.id })
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password.');
  }

  return {
    user: { id: user.id, email: user.email, name: user.name },
    token: signJwt({ userId: user.id })
  };
};

export const listOrganizationsForUser = (userId: string) => {
  return memberships
    .filter((membership) => membership.userId === userId)
    .map((membership) => {
      const org = organizations.find((entry) => entry.id === membership.orgId);
      return org ? { ...org, role: membership.role } : null;
    })
    .filter(Boolean);
};

export const createOrganization = (userId: string, name: string) => {
  const org = {
    id: randomUUID(),
    name,
    createdBy: userId,
    createdAt: new Date().toISOString()
  };

  organizations.push(org);
  memberships.push({ userId, orgId: org.id, role: 'admin', createdAt: new Date().toISOString() });
  auditLogs.push({
    id: randomUUID(),
    orgId: org.id,
    userId,
    action: 'organization.created',
    details: { name },
    createdAt: new Date().toISOString()
  });

  return org;
};

export const getOrganizationProjects = (orgId: string) => {
  return projects.filter((project) => project.orgId === orgId);
};

export const createProject = (orgId: string, userId: string, name: string, description: string) => {
  const project = {
    id: randomUUID(),
    orgId,
    name,
    description,
    createdBy: userId,
    createdAt: new Date().toISOString()
  };

  projects.push(project);
  auditLogs.push({
    id: randomUUID(),
    orgId,
    userId,
    action: 'project.created',
    details: { projectId: project.id, name },
    createdAt: new Date().toISOString()
  });

  return project;
};

export const getOrganizationTasks = (orgId: string) => {
  const orgProjects = projects.filter((project) => project.orgId === orgId).map((project) => project.id);
  return tasks.filter((task) => orgProjects.includes(task.projectId));
};

export const createTask = (orgId: string, userId: string, projectId: string, title: string, description: string, assigneeId: string | null) => {
  const projectExists = projects.some((project) => project.id === projectId && project.orgId === orgId);
  if (!projectExists) {
    throw new Error('Project not found in this organization.');
  }

  const task = {
    id: randomUUID(),
    projectId,
    title,
    description,
    status: 'todo' as const,
    assigneeId,
    createdBy: userId,
    createdAt: new Date().toISOString()
  };

  tasks.push(task);
  auditLogs.push({
    id: randomUUID(),
    orgId,
    userId,
    action: 'task.created',
    details: { taskId: task.id, title },
    createdAt: new Date().toISOString()
  });

  return task;
};

export const getAuditLogs = (orgId: string) => {
  return auditLogs.filter((entry) => entry.orgId === orgId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
