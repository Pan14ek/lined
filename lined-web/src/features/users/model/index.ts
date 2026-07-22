export interface UserDto {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  roles: string[];
  activePlan: string | null;
  activeUntil: string | null;
  /** Mock-only until `feature/user-locale-preference` ships on the backend. */
  locale?: 'en' | 'uk';
}

export interface UserCreateDto {
  username: string;
  email: string;
  password: string;
  roles?: string[];
}

export interface UserUpdateDto {
  username?: string;
  email?: string;
  password?: string;
  roles?: string[];
  locale?: 'en' | 'uk';
}

export interface UserSearchResultDto {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  roles: string[];
}

export interface UserPageDto {
  content: UserSearchResultDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface RoleDto {
  id: number;
  name: string;
}
