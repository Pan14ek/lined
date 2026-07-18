export interface LoginRequestDto {
  identifier: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userId: number;
  username: string;
  email: string;
  roles: string[];
}

export interface PasswordResetRequestDto {
  identifier: string;
}

export interface PasswordResetDto {
  token: string;
  newPassword: string;
}
