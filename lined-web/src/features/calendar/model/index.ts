export interface EventDto {
  id: number;
  title: string;
  location: string | null;
  shared: boolean;
  startAt: string;
  endAt: string;
  timezone: string;
  lobbyId: number;
  ownerId: number;
  createdAt: string;
}

export interface EventCreateDto {
  title: string;
  location?: string;
  shared: boolean;
  startAt: string;
  endAt: string;
  timezone: string;
  lobbyId: number;
  notifyMembers?: boolean;
}

export interface EventUpdateDto {
  title?: string;
  /** Omit to keep the current location; send '' to clear it. */
  location?: string;
  shared?: boolean;
  startAt?: string;
  endAt?: string;
  timezone?: string;
}

export interface EventConflictDto {
  first: EventDto;
  second: EventDto;
  overlapStart: string;
  overlapEnd: string;
}

export interface UserConflictDto {
  userId: number;
  hasConflict: boolean;
  conflictingEvent: EventDto | null;
}
