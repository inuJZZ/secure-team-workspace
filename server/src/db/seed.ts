import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../utils/security.js';
import { auditLogs, memberships, organizations, projects, tasks, users } from './memory.js';

export const seedDemoData = async () => {
  if (users.length > 0) return;

  const adminPassword = await hashPassword('admin123');
  const memberPassword = await hashPassword('member123');

  const admin = {
    id: randomUUID(),
    email: 'admin@demo.com',
    passwordHash: adminPassword,
    name: 'Inass',
    avatarUrl: '/avatars/me.jpeg',
    createdAt: new Date().toISOString()
  };

  const lev = {
    id: randomUUID(),
    email: 'member@demo.com',
    passwordHash: memberPassword,
    name: 'Lev',
    avatarUrl: '/avatars/lova.jpeg',
    createdAt: new Date().toISOString()
  };
  const ikkypriv = { ...lev, id: randomUUID(), email: 'ikkypriv@demo.com', name: 'Ikkypriv', avatarUrl: '/avatars/ikram.jpeg' };
  const ashgurlx = { ...lev, id: randomUUID(), email: 'ashgurlx@demo.com', name: 'ashgurlx', avatarUrl: '/avatars/laila.jpeg' };
  const yass = { ...lev, id: randomUUID(), email: 'yass@demo.com', name: 'yass', avatarUrl: '/avatars/yass.jpeg' };

  users.push(admin, lev, ikkypriv, ashgurlx, yass);

  const org = {
    id: randomUUID(),
    name: 'enuLib',
    createdBy: admin.id,
    createdAt: new Date().toISOString()
  };
  organizations.push(org);

  memberships.push(
    { userId: admin.id, orgId: org.id, role: 'admin', createdAt: new Date().toISOString() },
    { userId: lev.id, orgId: org.id, role: 'member', createdAt: new Date().toISOString() },
    { userId: ikkypriv.id, orgId: org.id, role: 'member', createdAt: new Date().toISOString() },
    { userId: ashgurlx.id, orgId: org.id, role: 'member', createdAt: new Date().toISOString() },
    { userId: yass.id, orgId: org.id, role: 'member', createdAt: new Date().toISOString() }
  );

  const project = {
    id: randomUUID(),
    orgId: org.id,
    name: 'Ideas for a Better Life',
    description: 'A curated collection of books for thoughtful living and creative work.',
    createdBy: admin.id,
    createdAt: new Date().toISOString()
  };
  projects.push(project);

  tasks.push(
    { id: randomUUID(), projectId: project.id, title: 'The Stranger', description: 'Albert Camus / An unsettling classic about absurdity, choice, and consequence.', status: 'done', assigneeId: lev.id, createdBy: admin.id, createdAt: new Date().toISOString() },
    { id: randomUUID(), projectId: project.id, title: 'The Metamorphosis', description: 'Franz Kafka / A surreal, intimate story of isolation and identity.', status: 'in_progress', assigneeId: admin.id, createdBy: admin.id, createdAt: new Date().toISOString() },
    { id: randomUUID(), projectId: project.id, title: 'Crime and Punishment', description: 'Fyodor Dostoevsky / A psychological journey through guilt, morality, and redemption.', status: 'in_progress', assigneeId: ashgurlx.id, createdBy: admin.id, createdAt: new Date().toISOString() },
    { id: randomUUID(), projectId: project.id, title: 'And Then There Were None', description: 'Agatha Christie / A celebrated mystery of suspicion, secrets, and survival.', status: 'done', assigneeId: yass.id, createdBy: admin.id, createdAt: new Date().toISOString() },
    { id: randomUUID(), projectId: project.id, title: 'Anna Karenina', description: 'Leo Tolstoy / Love, society, and the cost of living against convention.', status: 'todo', assigneeId: null, createdBy: admin.id, createdAt: new Date().toISOString() },
    { id: randomUUID(), projectId: project.id, title: 'Pride and Prejudice', description: 'Jane Austen / Wit, first impressions, and the search for an equal heart.', status: 'todo', assigneeId: null, createdBy: admin.id, createdAt: new Date().toISOString() }
  );

  auditLogs.push(
    { id: randomUUID(), orgId: org.id, userId: admin.id, action: 'organization.created', details: { orgId: org.id }, createdAt: new Date().toISOString() },
    { id: randomUUID(), orgId: org.id, userId: admin.id, action: 'project.created', details: { projectId: project.id }, createdAt: new Date().toISOString() }
  );

  console.log('Seed completed');
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedDemoData().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
