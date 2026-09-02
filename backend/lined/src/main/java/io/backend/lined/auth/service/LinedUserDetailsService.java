package io.backend.lined.auth.service;

import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Resolves a Lined login identifier to the account data required by Spring Security.
 */
@Service
@RequiredArgsConstructor
public class LinedUserDetailsService implements UserDetailsService {

  private final UserRepository userRepository;

  @Override
  public UserDetails loadUserByUsername(String identifier) {
    return userRepository.findByEmailIgnoreCase(identifier)
        .or(() -> userRepository.findByUsernameIgnoreCase(identifier))
        .map(this::toPrincipal)
        .orElseThrow(() -> new UsernameNotFoundException("User not found"));
  }

  private LinedUserPrincipal toPrincipal(UserEntity user) {
    return new LinedUserPrincipal(user.getId(), user.getUsername(), user.getPassword());
  }
}
