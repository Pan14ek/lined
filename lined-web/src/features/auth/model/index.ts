export interface LoginRequestDto {
  identifier: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface CsrfTokenDto {
  token: string;
}

export interface PasswordResetRequestDto {
  identifier: string;
}

export interface PasswordResetDto {
  token: string;
  newPassword: string;
}
