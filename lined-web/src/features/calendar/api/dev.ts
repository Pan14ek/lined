import { MockHttpError, mockDelay } from '@/lib/apiClient';
import { useAuthStore } from '@/store/auth';
import { MOCK_EVENTS } from './mockData';
import type {
  EventDto,
  EventCreateDto,
  EventUpdateDto,
  EventConflictDto,
  UserConflictDto,
} from '@/features/calendar/model';

const events: EventDto[] = MOCK_EVENTS.map((e) => ({ ...e }));
let nextId = Math.max(...events.map((e) => e.id)) + 1;

/** Mirrors the backend's owner-only rules (design §7.5/§7.6), same as the
 *  MSW handler counterpart in handlers.ts. */
const isUnauthorizedVisibilityChange = (
  event: EventDto,
  requesterId: number | null,
  nextVisibility?: string,
): boolean => {
  if (event.ownerId === requesterId) return false;
  if (event.visibility === 'PRIVATE') return true;
  return nextVisibility === 'PRIVATE';
}

export const listEvents = async (params: {
  lobbyId?: number;
  from: string;
  to: string;
}): Promise<EventDto[]> => {
  await mockDelay();
  const requesterId = useAuthStore.getState().userId;
  return events.filter(
    (e) =>
      (e.visibility !== 'PRIVATE' || e.ownerId === requesterId) &&
      (params.lobbyId == null || e.lobbyId === params.lobbyId) &&
      e.startAt >= params.from &&
      e.endAt <= params.to,
  );
}

export const createEvent = async (data: EventCreateDto): Promise<EventDto> => {
  await mockDelay();
  if (!data.title.trim()) throw new MockHttpError(400, 'title must not be blank');
  const event: EventDto = {
    id: nextId++,
    title: data.title,
    location: data.location ?? null,
    shared: data.visibility === 'SHARED',
    visibility: data.visibility,
    startAt: data.startAt,
    endAt: data.endAt,
    timezone: data.timezone,
    lobbyId: data.lobbyId,
    ownerId: useAuthStore.getState().userId ?? 1,
    createdAt: new Date().toISOString(),
  };
  events.push(event);
  return event;
}

export const updateEvent = async (id: number, data: EventUpdateDto): Promise<EventDto> => {
  await mockDelay();
  const event = events.find((e) => e.id === id);
  if (!event) throw new MockHttpError(404, 'Event not found');
  const requesterId = useAuthStore.getState().userId;
  if (isUnauthorizedVisibilityChange(event, requesterId, data.visibility)) {
    throw new MockHttpError(event.visibility === 'PRIVATE' ? 404 : 403, 'Event not found');
  }
  Object.assign(event, data);
  if (data.visibility) event.shared = data.visibility === 'SHARED';
  if (data.location !== undefined && data.location.trim() === '') {
    event.location = null;
  }
  return event;
}

export const deleteEvent = async (id: number): Promise<void> => {
  await mockDelay();
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) throw new MockHttpError(404, 'Event not found');
  const requesterId = useAuthStore.getState().userId;
  if (isUnauthorizedVisibilityChange(events[index]!, requesterId)) {
    throw new MockHttpError(404, 'Event not found');
  }
  events.splice(index, 1);
}

export const findConflicts = async (_params: {
  lobbyId: number;
  start: string;
  end: string;
  requesterId: number;
}): Promise<EventConflictDto[]> => {
  await mockDelay();
  return [];
}

export const checkUserConflict = async (params: {
  userId: number;
  start: string;
  end: string;
  requesterId: number;
}): Promise<UserConflictDto> => {
  await mockDelay();
  return { userId: params.userId, hasConflict: false, conflictingEvent: null };
}
