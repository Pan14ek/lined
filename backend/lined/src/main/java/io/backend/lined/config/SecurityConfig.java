package io.backend.lined.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

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
 * <p>AUTH-SEC-01 intentionally does not configure a JWT decoder or a resource-server Bearer
 * filter. AUTH-SEC-02 adds that credential-processing responsibility while this stateless
 * default-deny boundary remains in place.</p>
 */
@Configuration
public class SecurityConfig {

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  /**
   * Creates the stateless boundary for all HTTP APIs.
   *
   * <p>Bearer-token decoding is deliberately added in AUTH-SEC-02. Until then, private routes
   * remain protected but no Bearer credential is accepted.</p>
   *
   * <p>CSRF remains enabled for browser-facing routes. It is ignored for the stateless API and
   * actuator endpoints because AUTH-SEC-01 has no cookie-authenticated endpoint. AUTH-SEC-04 and
   * AUTH-SEC-05 must replace this temporary API exclusion with an explicit CSRF policy before
   * adding cookie-backed refresh or logout endpoints below {@code /api/**}.</p>
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
        // AUTH-SEC-01 has no cookie-backed routes; see the method contract above.
        .csrf(csrf -> csrf.ignoringRequestMatchers("/api/**", "/actuator/**")) // NOSONAR
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(authorize -> authorize
            .requestMatchers(HttpMethod.POST, "/api/users").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/password-reset-requests").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/password-resets").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/features").permitAll()
            .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
            .anyRequest().authenticated())
        .exceptionHandling(exceptions -> exceptions
            .authenticationEntryPoint(authenticationEntryPoint)
            .accessDeniedHandler(accessDeniedHandler))
        .build();
  }

}
