package io.backend.lined.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.proc.SecurityContext;
import io.backend.lined.auth.service.JwtProperties;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

/**
 * Configures Lined's application-wide HTTP security boundary.
 *
 * <p>This configuration centralizes the rules that determine which requests may reach Spring MVC
 * without authentication. Keeping those rules in one {@link SecurityFilterChain} makes the
 * default-deny policy reviewable and prevents a newly added controller route from becoming public
 * accidentally.</p>
 *
 * <p>Use this configuration for transport-level concerns such as session policy, CSRF policy,
 * public-route allowlisting, and security-filter error handling. Controller, service, and domain
 * code must not duplicate these authentication checks. Endpoint-specific authorization remains a
 * separate concern after a request has been authenticated.</p>
 *
 * <p>For example, an unauthenticated {@code POST /api/auth/login} matches an approved public
 * route and reaches {@code AuthController}. An unauthenticated {@code GET /api/lobbies} matches
 * no public rule, so this chain invokes {@link ProblemAuthenticationEntryPoint} and returns a
 * {@code 401} Problem Details response without calling a controller.</p>
 *
 * <p>AUTH-SEC-02 adds framework Resource Server Bearer authentication while preserving this
 * stateless default-deny boundary.</p>
 */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  /**
   * Configures framework password authentication for Lined's identifier-resolving user details.
   *
   * @param userDetailsService Lined account lookup used by the provider
   * @param passwordEncoder BCrypt verifier for persisted password hashes
   * @return password authentication provider with hidden user-not-found failures
   */
  @Bean
  public DaoAuthenticationProvider daoAuthenticationProvider(
      UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
    provider.setPasswordEncoder(passwordEncoder);
    provider.setHideUserNotFoundExceptions(true);
    return provider;
  }

  /**
   * Exposes the credential authentication entry point used by the login orchestration service.
   *
   * @param provider configured Lined password-authentication provider
   * @return manager delegating credential verification to the Lined provider
   */
  @Bean
  public AuthenticationManager authenticationManager(DaoAuthenticationProvider provider) {
    return new ProviderManager(provider);
  }

  /**
   * Creates the HS256 JWT encoder used by Lined's login service.
   *
   * @param properties externally validated JWT configuration
   * @return framework encoder sharing the configured signing key with the decoder
   */
  @Bean
  public JwtEncoder jwtEncoder(JwtProperties properties) {
    return new NimbusJwtEncoder(new ImmutableSecret<SecurityContext>(properties.signingKey()));
  }

  /**
   * Creates a strict JWT decoder for Bearer access tokens.
   *
   * @param properties externally validated JWT configuration
   * @param clock application clock used for deterministic timestamp validation
   * @return decoder accepting only valid HS256 Lined access tokens
   */
  @Bean
  public JwtDecoder jwtDecoder(JwtProperties properties, Clock clock) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(properties.signingKey())
        .macAlgorithm(MacAlgorithm.HS256)
        .build();
    decoder.setJwtValidator(jwtValidator(properties, clock));
    return decoder;
  }

  /**
   * Creates the stateless boundary for all HTTP APIs.
   *
   * <p>CSRF remains enabled for browser-facing routes and the cookie-authenticated refresh
   * endpoint. Cookie-free API requests use Bearer authentication and are excluded from CSRF;
   * this keeps the stateless API compatible with non-browser clients.</p>
   *
   * @param http Spring Security HTTP configuration builder
   * @param authenticationEntryPoint writer for unauthenticated Problem Details responses
   * @param accessDeniedHandler writer for forbidden Problem Details responses
   * @return configured stateless filter chain
   * @throws Exception when Spring Security cannot build the filter chain
   */
  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      ProblemAuthenticationEntryPoint authenticationEntryPoint,
      ProblemAccessDeniedHandler accessDeniedHandler) throws Exception {
    return http
        .csrf(csrf -> csrf
            // NOSONAR: this non-secret token must be readable by browser JavaScript for the
            // double-submit header check; the refresh credential remains HttpOnly.
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()) // NOSONAR
            .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
            // NOSONAR: only cookie-free API and Actuator requests bypass CSRF; cookie-authenticated
            // refresh and browser-facing state changes remain protected.
            .ignoringRequestMatchers( // NOSONAR
                SecurityConfig::isCookieFreeApi,
                SecurityConfig::isActuator))
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(authorize -> authorize
            .requestMatchers(HttpMethod.POST, "/api/users").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/logout").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/auth/csrf").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/password-reset-requests").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/password-resets").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/features").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/calendar/feed/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
            .anyRequest().authenticated())
        .exceptionHandling(exceptions -> exceptions
            .authenticationEntryPoint(authenticationEntryPoint)
            .accessDeniedHandler(accessDeniedHandler))
        .oauth2ResourceServer(resourceServer -> resourceServer
            .jwt(Customizer.withDefaults())
            .authenticationEntryPoint(authenticationEntryPoint))
        .build();
  }

  private OAuth2TokenValidator<Jwt> jwtValidator(JwtProperties properties, Clock clock) {
    JwtTimestampValidator timestampValidator = new JwtTimestampValidator(properties.clockSkew());
    timestampValidator.setClock(clock);
    return new DelegatingOAuth2TokenValidator<>(
        timestampValidator,
        new JwtClaimValidator<String>(JwtClaimNames.ISS, properties.issuer()::equals),
        new JwtClaimValidator<List<String>>(JwtClaimNames.AUD,
            audience -> audience != null && audience.contains(properties.audience())),
        new JwtClaimValidator<String>(JwtClaimNames.SUB, SecurityConfig::isPositiveUserId),
        new JwtClaimValidator<Instant>(JwtClaimNames.IAT, Objects::nonNull),
        new JwtClaimValidator<Instant>(JwtClaimNames.EXP, Objects::nonNull),
        new JwtClaimValidator<String>(JwtClaimNames.JTI, SecurityConfig::isPresent));
  }

  private static boolean isPositiveUserId(String subject) {
    if (subject == null || subject.isBlank()) {
      return false;
    }
    try {
      return Long.parseLong(subject) > 0;
    } catch (NumberFormatException ex) {
      return false;
    }
  }

  private static boolean isPresent(String value) {
    return value != null && !value.isBlank();
  }

  private static boolean isCookieFreeApi(HttpServletRequest request) {
    return request.getRequestURI().startsWith("/api/")
        && !request.getRequestURI().equals("/api/auth/refresh")
        && !request.getRequestURI().equals("/api/auth/logout");
  }

  private static boolean isActuator(HttpServletRequest request) {
    return request.getRequestURI().startsWith("/actuator/");
  }

}
