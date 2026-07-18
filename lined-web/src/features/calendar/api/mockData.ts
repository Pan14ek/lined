import type { EventDto } from '@/features/calendar/model';

const today = new Date();
const todayStr = today.toISOString().slice(0, 10);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().slice(0, 10);
const dayAfter = new Date(today);
dayAfter.setDate(dayAfter.getDate() + 2);
const dayAfterStr = dayAfter.toISOString().slice(0, 10);
const inFourDaysStr = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
const inTenDaysStr = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
const dayAfterPlusOneStr = new Date(dayAfter.getTime() + 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

export const MOCK_EVENTS: EventDto[] = [
  {
    id: 1,
    title: 'Morning Coffee',
    location: 'Blue Bottle Cafe',
    shared: true,
    startAt: `${todayStr}T09:00:00Z`,
    endAt: `${todayStr}T10:00:00Z`,
    timezone: 'UTC',
    lobbyId: 1,
    ownerId: 1,
    createdAt: '2026-04-08T08:00:00Z',
  },
  {
    id: 2,
    title: 'Team Lunch',
    location: null,
    shared: true,
    startAt: `${todayStr}T12:00:00Z`,
    endAt: `${todayStr}T13:00:00Z`,
    timezone: 'UTC',
    lobbyId: 3,
    ownerId: 1,
    createdAt: '2026-04-07T10:00:00Z',
  },
  {
    id: 3,
    title: 'Family Dinner',
    location: 'Home',
    shared: true,
    startAt: `${tomorrowStr}T18:00:00Z`,
    endAt: `${tomorrowStr}T20:00:00Z`,
    timezone: 'UTC',
    lobbyId: 2,
    ownerId: 1,
    createdAt: '2026-04-09T09:00:00Z',
  },
  {
    id: 4,
    title: 'Movie Night',
    location: null,
    shared: true,
    startAt: `${tomorrowStr}T20:30:00Z`,
    endAt: `${tomorrowStr}T23:00:00Z`,
    timezone: 'UTC',
    lobbyId: 1,
    ownerId: 2,
    createdAt: '2026-04-09T11:00:00Z',
  },
  {
    id: 5,
    title: 'Weekend Hike',
    location: 'Blue Ridge Trailhead',
    shared: true,
    startAt: `${dayAfterStr}T08:00:00Z`,
    endAt: `${dayAfterStr}T12:00:00Z`,
    timezone: 'UTC',
    lobbyId: 3,
    ownerId: 1,
    createdAt: '2026-04-10T07:00:00Z',
  },
  {
    id: 6,
    title: 'Morning Run',
    location: 'Riverside Park',
    shared: true,
    startAt: `${todayStr}T06:00:00Z`,
    endAt: `${todayStr}T07:00:00Z`,
    timezone: 'UTC',
    lobbyId: 1,
    ownerId: 1,
    createdAt: '2026-04-11T06:00:00Z',
  },
  {
    id: 7,
    title: 'Design Standup',
    location: null,
    shared: true,
    startAt: `${todayStr}T15:00:00Z`,
    endAt: `${todayStr}T15:30:00Z`,
    timezone: 'UTC',
    lobbyId: 4,
    ownerId: 1,
    createdAt: '2026-04-11T07:00:00Z',
  },
  {
    id: 8,
    // Deliberately overlaps "Team Lunch" (lobby 3, same day, 12:00-13:00) by
    // 30 minutes across two different lobbies -- exercises side-by-side lane
    // layout and the lobby-visibility filter on the global calendar.
    title: 'Design Sync',
    location: null,
    shared: true,
    startAt: `${todayStr}T12:30:00Z`,
    endAt: `${todayStr}T13:30:00Z`,
    timezone: 'UTC',
    lobbyId: 4,
    ownerId: 1,
    createdAt: '2026-04-11T07:15:00Z',
  },
  {
    id: 9,
    title: '1:1 with Manager',
    location: null,
    shared: true,
    startAt: `${tomorrowStr}T14:00:00Z`,
    endAt: `${tomorrowStr}T14:30:00Z`,
    timezone: 'UTC',
    lobbyId: 4,
    ownerId: 1,
    createdAt: '2026-04-11T07:30:00Z',
  },
  {
    id: 10,
    // A second midnight-spanning event (different lobby than "Movie Night")
    // -- regression coverage for the day-column clipping/split rendering.
    title: 'Family Game Night',
    location: 'Home',
    shared: true,
    startAt: `${dayAfterStr}T22:00:00Z`,
    endAt: `${dayAfterPlusOneStr}T01:00:00Z`,
    timezone: 'UTC',
    lobbyId: 2,
    ownerId: 1,
    createdAt: '2026-04-10T08:00:00Z',
  },
  {
    id: 11,
    title: 'Design Team Offsite',
    location: 'Lakeside Retreat Center',
    shared: true,
    startAt: `${dayAfterStr}T08:00:00Z`,
    endAt: `${dayAfterStr}T20:00:00Z`,
    timezone: 'UTC',
    lobbyId: 4,
    ownerId: 1,
    createdAt: '2026-04-10T09:00:00Z',
  },
  {
    id: 12,
    title: 'Quarterly Roadmap Review',
    location: null,
    shared: true,
    startAt: `${inTenDaysStr}T16:00:00Z`,
    endAt: `${inTenDaysStr}T17:30:00Z`,
    timezone: 'UTC',
    lobbyId: 4,
    ownerId: 1,
    createdAt: '2026-04-11T08:00:00Z',
  },
  {
    id: 13,
    title: 'Anniversary Dinner',
    location: 'Le Petit Bistro',
    shared: true,
    startAt: `${inFourDaysStr}T19:00:00Z`,
    endAt: `${inFourDaysStr}T21:00:00Z`,
    timezone: 'UTC',
    lobbyId: 1,
    ownerId: 2,
    createdAt: '2026-04-10T10:00:00Z',
  },
];
