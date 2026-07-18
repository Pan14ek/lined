export interface UserDto {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  roles: string[];
  activePlan: string | null;
  activeUntil: string | null;
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
