import type { TaskDto } from '@/features/tasks/model';

const today = new Date();
const todayStr = today.toISOString().slice(0, 10);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().slice(0, 10);
const dayAfter = new Date(today);
dayAfter.setDate(dayAfter.getDate() + 2);
const dayAfterStr = dayAfter.toISOString().slice(0, 10);
const inTenDaysStr = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
const yesterdayStr = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

export const MOCK_TASKS: TaskDto[] = [
  {
    id: 1,
    title: 'Plan dinner for Saturday',
    description: 'Pick a restaurant and book a table for two',
    priority: 'MEDIUM',
    status: 'TODO',
    lobbyId: 1,
    creatorId: 1,
    assigneeId: 1,
    dueDate: tomorrowStr,
    createdAt: '2026-04-09T08:00:00Z',
  },
  {
    id: 2,
    title: 'Book restaurant reservation',
    description: null,
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    lobbyId: 1,
    creatorId: 2,
    assigneeId: 1,
    dueDate: todayStr,
    createdAt: '2026-04-08T14:00:00Z',
  },
  {
    id: 3,
    title: 'Buy groceries',
    description: 'Milk, bread, eggs',
    priority: 'LOW',
    status: 'DONE',
    lobbyId: 2,
    creatorId: 1,
    assigneeId: 2,
    dueDate: todayStr,
    createdAt: '2026-04-07T09:00:00Z',
  },
  {
    id: 4,
    title: 'Prepare presentation slides',
    description: null,
    priority: 'MEDIUM',
    status: 'TODO',
    lobbyId: 3,
    creatorId: 1,
    assigneeId: 1,
    dueDate: dayAfterStr,
    createdAt: '2026-04-10T10:00:00Z',
  },
  {
    id: 5,
    title: 'Send invitations',
    description: null,
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    lobbyId: 3,
    creatorId: 2,
    assigneeId: 2,
    dueDate: tomorrowStr,
    createdAt: '2026-04-09T16:00:00Z',
  },
  {
    id: 6,
    title: 'Clean apartment',
    description: null,
    priority: 'LOW',
    status: 'TODO',
    lobbyId: 2,
    creatorId: 1,
    assigneeId: null,
    dueDate: null,
    createdAt: '2026-04-10T11:00:00Z',
  },
  {
    id: 7,
    title: 'Finalize onboarding flow mockups',
    description: 'Incorporate feedback from the last design review',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    lobbyId: 4,
    creatorId: 1,
    assigneeId: 5,
    dueDate: tomorrowStr,
    createdAt: '2026-04-11T09:00:00Z',
  },
  {
    id: 8,
    title: 'Review pull requests',
    description: null,
    priority: 'MEDIUM',
    status: 'TODO',
    lobbyId: 4,
    creatorId: 1,
    assigneeId: 6,
    dueDate: todayStr,
    createdAt: '2026-04-11T10:00:00Z',
  },
  {
    id: 9,
    title: 'Submit expense report',
    description: 'Overdue since last week',
    priority: 'MEDIUM',
    status: 'TODO',
    lobbyId: 4,
    creatorId: 7,
    assigneeId: 7,
    dueDate: yesterdayStr,
    createdAt: '2026-04-05T08:00:00Z',
  },
  {
    id: 10,
    title: 'Prepare quarterly roadmap deck',
    description: null,
    priority: 'HIGH',
    status: 'TODO',
    lobbyId: 4,
    creatorId: 1,
    assigneeId: 1,
    dueDate: inTenDaysStr,
    createdAt: '2026-04-11T12:00:00Z',
  },
  {
    id: 11,
    title: 'Water the plants',
    description: null,
    priority: 'LOW',
    status: 'DONE',
    lobbyId: 1,
    creatorId: 2,
    assigneeId: 2,
    dueDate: yesterdayStr,
    createdAt: '2026-04-06T08:00:00Z',
  },
];
