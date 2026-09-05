import { randomUUID } from 'node:crypto';
import { auditLogs, memberships, messages, organizations, projects, tasks, users } from '../db/memory.js';
import type { Role, Task } from '../types.js';
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
    avatarUrl: '',
    bio: '',
    favoriteGenres: [],
    createdAt: new Date().toISOString()
  };

  users.push(user);
  return {
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, bio: user.bio, favoriteGenres: user.favoriteGenres },
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
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, bio: user.bio, favoriteGenres: user.favoriteGenres },
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

export const updateUserProfile = (userId: string, name: string, bio: string, favoriteGenres: string[], avatarUrl: string) => {
  const user = users.find((entry) => entry.id === userId);
  if (!user) throw new Error('User not found.');
  user.name = name;
  user.bio = bio;
  user.favoriteGenres = favoriteGenres;
  user.avatarUrl = avatarUrl;
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, bio: user.bio, favoriteGenres: user.favoriteGenres };
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

export const getOrganizationMembers = (orgId: string) => {
  return memberships
    .filter((membership) => membership.orgId === orgId)
    .map((membership) => {
      const user = users.find((entry) => entry.id === membership.userId);
      return user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, bio: user.bio, favoriteGenres: user.favoriteGenres, role: membership.role, createdAt: membership.createdAt } : null;
    })
    .filter(Boolean);
};

export const addOrganizationMember = (orgId: string, actorId: string, email: string, role: Role) => {
  const user = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error('No registered user was found with that email.');
  if (memberships.some((membership) => membership.orgId === orgId && membership.userId === user.id)) {
    throw new Error('That user is already a member of this organization.');
  }

  const membership = { userId: user.id, orgId, role, createdAt: new Date().toISOString() };
  memberships.push(membership);
  auditLogs.push({
    id: randomUUID(),
    orgId,
    userId: actorId,
    action: 'member.added',
    details: { memberId: user.id, email: user.email, role },
    createdAt: new Date().toISOString()
  });

  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, bio: user.bio, favoriteGenres: user.favoriteGenres, role: membership.role, createdAt: membership.createdAt };
};

export const removeOrganizationMember = (orgId: string, actorId: string, memberId: string) => {
  if (actorId === memberId) throw new Error('You cannot remove yourself from this organization.');
  const membershipIndex = memberships.findIndex((membership) => membership.orgId === orgId && membership.userId === memberId);
  if (membershipIndex === -1) throw new Error('Member not found.');
  const membership = memberships[membershipIndex];
  if (membership.role === 'admin' && memberships.filter((entry) => entry.orgId === orgId && entry.role === 'admin').length === 1) {
    throw new Error('The organization must keep at least one administrator.');
  }

  memberships.splice(membershipIndex, 1);
  auditLogs.push({
    id: randomUUID(),
    orgId,
    userId: actorId,
    action: 'member.removed',
    details: { memberId },
    createdAt: new Date().toISOString()
  });
};

export const getOrganizationMemberProfile = (orgId: string, memberId: string) => {
  const membership = memberships.find((entry) => entry.orgId === orgId && entry.userId === memberId);
  const user = users.find((entry) => entry.id === memberId);
  if (!membership || !user) throw new Error('Member not found.');
  const orgProjects = projects.filter((project) => project.orgId === orgId).map((project) => project.id);
  const books = tasks.filter((task) => orgProjects.includes(task.projectId) && task.assigneeId === memberId);
  return {
    member: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, bio: user.bio, favoriteGenres: user.favoriteGenres, role: membership.role, createdAt: membership.createdAt },
    books,
    stats: { total: books.length, read: books.filter((book) => book.status === 'done').length, inProgress: books.filter((book) => book.status === 'in_progress').length }
  };
};

const ensureMember = (orgId: string, userId: string) => {
  if (!memberships.some((membership) => membership.orgId === orgId && membership.userId === userId)) throw new Error('User is not a member of this organization.');
};

export const getDirectMessages = (orgId: string, userId: string, otherUserId: string) => {
  ensureMember(orgId, userId);
  ensureMember(orgId, otherUserId);
  return messages
    .filter((message) => message.orgId === orgId && ((message.senderId === userId && message.recipientId === otherUserId) || (message.senderId === otherUserId && message.recipientId === userId)))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((message) => ({ ...message, senderName: users.find((user) => user.id === message.senderId)?.name ?? 'Unknown' }));
};

export const sendDirectMessage = (orgId: string, senderId: string, recipientId: string, body: string) => {
  ensureMember(orgId, senderId);
  ensureMember(orgId, recipientId);
  const message = { id: randomUUID(), orgId, senderId, recipientId, body, createdAt: new Date().toISOString() };
  messages.push(message);
  return { ...message, senderName: users.find((user) => user.id === senderId)?.name ?? 'Unknown' };
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

export const updateTaskStatus = (orgId: string, userId: string, taskId: string, status: Task['status']) => {
  const task = getOrganizationTasks(orgId).find((entry) => entry.id === taskId);
  if (!task) throw new Error('Book not found in this organization.');

  const membership = memberships.find((entry) => entry.orgId === orgId && entry.userId === userId);
  if (!membership || (membership.role !== 'admin' && task.assigneeId !== userId)) {
    throw new Error('Only the assigned reader or an admin can update this book.');
  }

  task.status = status;
  auditLogs.push({
    id: randomUUID(),
    orgId,
    userId,
    action: 'task.status_updated',
    details: { taskId: task.id, status },
    createdAt: new Date().toISOString()
  });
  return task;
};

export const getAuditLogs = (orgId: string) => {
  return auditLogs.filter((entry) => entry.orgId === orgId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
