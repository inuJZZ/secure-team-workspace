import type { AuditLog, DirectMessage, OrgMembership, Organization, Project, Task, User } from '../types.js';

export const users: User[] = [];
export const organizations: Organization[] = [];
export const memberships: OrgMembership[] = [];
export const projects: Project[] = [];
export const tasks: Task[] = [];
export const auditLogs: AuditLog[] = [];
export const messages: DirectMessage[] = [];

export const resetStore = () => {
  users.length = 0;
  organizations.length = 0;
  memberships.length = 0;
  projects.length = 0;
  tasks.length = 0;
  auditLogs.length = 0;
  messages.length = 0;
};
