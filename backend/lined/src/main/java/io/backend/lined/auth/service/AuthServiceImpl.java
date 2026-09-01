package io.backend.lined.auth.service;

import io.backend.lined.auth.api.AuthLoginDto;
import io.backend.lined.auth.api.AuthLoginResponseDto;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.UnauthorizedException;
import io.backend.lined.user.api.UserDto;
import io.backend.lined.user.api.UserMapper;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

  private static final String INVALID_CREDENTIALS_MESSAGE =
      "Invalid email, username, or password";

  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenService tokenService;

  @Override
  public AuthLoginResponseDto login(AuthLoginDto dto) {
    String identifier = dto.resolvedIdentifier();
    if (identifier == null) {
      throw new BadRequestException("Email, username, or identifier is required");
    }

    UserEntity user = findUser(identifier);
    if (!passwordEncoder.matches(dto.password(), user.getPassword())) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    UserDto userDto = userMapper.toDto(user);
    return new AuthLoginResponseDto(
        tokenService.issueFor(user.getId()),
        tokenService.tokenType(),
        tokenService.ttlSeconds(),
        userDto.id(),
        userDto.username(),
        userDto.email(),
        userDto.roles());
  }

  private UserEntity findUser(String identifier) {
    return userRepository.findByEmailIgnoreCase(identifier)
        .or(() -> userRepository.findByUsernameIgnoreCase(identifier))
        .orElseThrow(() -> new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
  }
}
