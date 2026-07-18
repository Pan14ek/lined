import { MockHttpError, mockDelay } from '@/lib/apiClient';
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

export const listEvents = async (params: {
  lobbyId?: number;
  from: string;
  to: string;
}): Promise<EventDto[]> => {
  await mockDelay();
  return events.filter(
    (e) =>
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
    shared: data.shared,
    startAt: data.startAt,
    endAt: data.endAt,
    timezone: data.timezone,
    lobbyId: data.lobbyId,
    ownerId: 1,
    createdAt: new Date().toISOString(),
  };
  events.push(event);
  return event;
}

export const updateEvent = async (id: number, data: EventUpdateDto): Promise<EventDto> => {
  await mockDelay();
  const event = events.find((e) => e.id === id);
  if (!event) throw new MockHttpError(404, 'Event not found');
  Object.assign(event, data);
  if (data.location !== undefined && data.location.trim() === '') {
    event.location = null;
  }
  return event;
}

export const deleteEvent = async (id: number): Promise<void> => {
  await mockDelay();
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) throw new MockHttpError(404, 'Event not found');
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
