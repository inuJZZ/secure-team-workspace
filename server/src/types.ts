export type Role = 'admin' | 'member';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  favoriteGenres?: string[];
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export interface OrgMembership {
  userId: string;
  orgId: string;
  role: Role;
  createdAt: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  assigneeId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  orgId: string;
  userId: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  orgId: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
}
