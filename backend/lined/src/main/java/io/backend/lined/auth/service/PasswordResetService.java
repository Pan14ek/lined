package io.backend.lined.auth.service;

import io.backend.lined.auth.api.PasswordResetDto;
import io.backend.lined.auth.api.PasswordResetRequestDto;

public interface PasswordResetService {

  void requestReset(PasswordResetRequestDto dto);

  void reset(PasswordResetDto dto);
}
