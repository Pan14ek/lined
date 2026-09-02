package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@ExtendWith(MockitoExtension.class)
class LinedUserDetailsServiceTest {

  private static final String EMAIL = "alice@example.com";
  private static final String USERNAME = "alice";

  @Mock
  private UserRepository userRepository;

  private LinedUserDetailsService userDetailsService;
  private UserEntity user;

  @BeforeEach
  void setUp() {
    userDetailsService = new LinedUserDetailsService(userRepository);
    user = new UserEntity();
    user.setId(42L);
    user.setUsername(USERNAME);
    user.setPassword("encoded-password");
  }

  @Test
  void loadUserByUsername_resolvesEmail() {
    when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));

    LinedUserPrincipal result = (LinedUserPrincipal) userDetailsService.loadUserByUsername(EMAIL);

    assertThat(result.getUserId()).isEqualTo(42L);
    assertThat(result.getUsername()).isEqualTo(USERNAME);
    assertThat(result.getPassword()).isEqualTo("encoded-password");
  }

  @Test
  void loadUserByUsername_fallsBackToUsername() {
    when(userRepository.findByEmailIgnoreCase(USERNAME)).thenReturn(Optional.empty());
    when(userRepository.findByUsernameIgnoreCase(USERNAME)).thenReturn(Optional.of(user));

    LinedUserPrincipal result = (LinedUserPrincipal) userDetailsService.loadUserByUsername(USERNAME);

    assertThat(result.getUserId()).isEqualTo(42L);
    verify(userRepository).findByUsernameIgnoreCase(USERNAME);
  }

  @Test
  void loadUserByUsername_throwsWhenIdentifierIsUnknown() {
    when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.empty());
    when(userRepository.findByUsernameIgnoreCase(EMAIL)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userDetailsService.loadUserByUsername(EMAIL))
        .isInstanceOf(UsernameNotFoundException.class);
  }
}
