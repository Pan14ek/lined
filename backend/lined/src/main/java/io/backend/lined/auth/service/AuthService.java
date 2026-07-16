package io.backend.lined.auth.service;

import io.backend.lined.auth.api.AuthLoginDto;
import io.backend.lined.auth.api.AuthLoginResponseDto;

public interface AuthService {

  AuthLoginResponseDto login(AuthLoginDto dto);
}
