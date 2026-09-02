package io.backend.lined.auth.service;

import io.backend.lined.auth.api.AuthLoginDto;
import io.backend.lined.auth.api.AuthLoginResponseDto;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.InvalidCredentialsException;
import io.backend.lined.common.exception.InvalidRefreshSessionException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional(dontRollbackOn = InvalidRefreshSessionException.class)
public class AuthServiceImpl implements AuthService {

  private final AuthenticationManager authenticationManager;
  private final JwtTokenService tokenService;
  private final RefreshSessionService refreshSessionService;

  @Override
  public AuthLoginResult login(AuthLoginDto dto) {
    String identifier = dto.resolvedIdentifier();
    if (identifier == null) {
      throw new BadRequestException("Email, username, or identifier is required");
    }

    LinedUserPrincipal user = authenticatedUser(identifier, dto.password());
    IssuedRefreshSession session = refreshSessionService.createSession(user.getUserId());
    AuthLoginResponseDto response = new AuthLoginResponseDto(
        tokenService.issueFor(user.getUserId()),
        tokenService.tokenType(),
        tokenService.ttlSeconds());
    return new AuthLoginResult(response, session.refreshToken(), session.expiresAt());
  }

  @Override
  public AuthLoginResult refresh(String refreshToken) {
    RotatedRefreshSession session = refreshSessionService.refresh(refreshToken);
    AuthLoginResponseDto response = new AuthLoginResponseDto(
        tokenService.issueFor(session.userId()),
        tokenService.tokenType(),
        tokenService.ttlSeconds());
    return new AuthLoginResult(response, session.refreshToken(), session.expiresAt());
  }

  private LinedUserPrincipal authenticatedUser(String identifier, String password) {
    try {
      Authentication authentication = authenticationManager.authenticate(
          UsernamePasswordAuthenticationToken.unauthenticated(identifier, password));
      if (authentication.getPrincipal() instanceof LinedUserPrincipal user) {
        return user;
      }
      throw new AuthenticationServiceException("Authentication returned an unsupported principal");
    } catch (BadCredentialsException ex) {
      throw new InvalidCredentialsException();
    }
  }
}
