package io.backend.lined.auth.service;

import io.backend.lined.auth.api.AuthLoginDto;
import io.backend.lined.auth.api.AuthLoginResponseDto;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.InvalidCredentialsException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

  private final AuthenticationManager authenticationManager;
  private final JwtTokenService tokenService;

  @Override
  public AuthLoginResponseDto login(AuthLoginDto dto) {
    String identifier = dto.resolvedIdentifier();
    if (identifier == null) {
      throw new BadRequestException("Email, username, or identifier is required");
    }

    LinedUserPrincipal user = authenticatedUser(identifier, dto.password());
    return new AuthLoginResponseDto(
        tokenService.issueFor(user.getUserId()),
        tokenService.tokenType(),
        tokenService.ttlSeconds());
  }

  private LinedUserPrincipal authenticatedUser(String identifier, String password) {
    try {
      Authentication authentication = authenticationManager.authenticate(
          UsernamePasswordAuthenticationToken.unauthenticated(identifier, password));
      if (authentication.getPrincipal() instanceof LinedUserPrincipal user) {
        return user;
      }
      throw new InvalidCredentialsException();
    } catch (AuthenticationException ex) {
      throw new InvalidCredentialsException();
    }
  }
}
