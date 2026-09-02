package io.backend.lined.auth.service;

import io.backend.lined.auth.api.AuthLoginDto;

public interface AuthService {

  AuthLoginResult login(AuthLoginDto dto);
}
