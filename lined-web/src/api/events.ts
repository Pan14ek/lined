import { api } from './client';
import type {
  EventDto,
  EventCreateDto,
  EventUpdateDto,
  EventConflictDto,
  UserConflictDto,
} from '@/types';

export function listEvents(params: {
  lobbyId?: number;
  from: string;
  to: string;
}): Promise<EventDto[]> {
  return api
    .get('calendar/events', { searchParams: params as Record<string, string | number> })
    .json<EventDto[]>();
}

export function createEvent(data: EventCreateDto): Promise<EventDto> {
  return api.post('calendar/events', { json: data }).json<EventDto>();
}

export function updateEvent(id: number, data: EventUpdateDto): Promise<EventDto> {
  return api.patch(`calendar/events/${id}`, { json: data }).json<EventDto>();
}

export function deleteEvent(id: number): Promise<void> {
  return api.delete(`calendar/events/${id}`).then(() => undefined);
}

export function findConflicts(params: {
  lobbyId: number;
  start: string;
  end: string;
  requesterId: number;
}): Promise<EventConflictDto[]> {
  return api
    .get('calendar/conflicts', { searchParams: params as Record<string, string | number> })
    .json<EventConflictDto[]>();
}

export function checkUserConflict(params: {
  userId: number;
  start: string;
  end: string;
  requesterId: number;
}): Promise<UserConflictDto> {
  return api
    .get('calendar/user-conflict', {
      searchParams: params as Record<string, string | number>,
    })
    .json<UserConflictDto>();
}
