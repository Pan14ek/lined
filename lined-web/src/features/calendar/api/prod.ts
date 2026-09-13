import { api, toSearchParams } from '@/lib/apiClient';
import type { EventDto, EventCreateDto, EventUpdateDto, EventConflictDto, UserConflictDto } from '@/features/calendar/model';

export const listEvents = (params: {
  lobbyId?: number;
  from: string;
  to: string;
}): Promise<EventDto[]> => {
  return api
    .get('calendar/events', { searchParams: toSearchParams(params) })
    .json<EventDto[]>();
}

export const createEvent = (data: EventCreateDto): Promise<EventDto> => {
  return api.post('calendar/events', { json: data }).json<EventDto>();
}

export const updateEvent = (id: number, data: EventUpdateDto, version = 0): Promise<EventDto> => {
  return api.patch(`calendar/events/${id}`, {
    json: data,
    headers: { 'If-Match': `"${version}"` },
  }).json<EventDto>();
}

export const deleteEvent = (id: number, version = 0): Promise<void> => {
  return api.delete(`calendar/events/${id}`, {
    headers: { 'If-Match': `"${version}"` },
  }).then(() => undefined);
}

export const findConflicts = (params: {
  lobbyId: number;
  start: string;
  end: string;
  requesterId: number;
}): Promise<EventConflictDto[]> => {
  return api
    .get('calendar/conflicts', { searchParams: toSearchParams(params) })
    .json<EventConflictDto[]>();
}

export const checkUserConflict = (params: {
  userId: number;
  start: string;
  end: string;
  requesterId: number;
}): Promise<UserConflictDto> => {
  return api
    .get('calendar/user-conflict', { searchParams: toSearchParams(params) })
    .json<UserConflictDto>();
}
