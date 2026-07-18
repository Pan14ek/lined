import { api, requestVoid, toSearchParams } from '@/lib/apiClient';
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

export const updateEvent = (id: number, data: EventUpdateDto): Promise<EventDto> => {
  return api.patch(`calendar/events/${id}`, { json: data }).json<EventDto>();
}

export const deleteEvent = (id: number): Promise<void> => {
  return requestVoid('delete', `calendar/events/${id}`);
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
