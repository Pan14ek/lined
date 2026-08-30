package io.backend.lined.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * Produces Lined's safe {@code 401 Unauthorized} response for unauthenticated private requests.
 *
 * <p>Spring Security invokes an {@link AuthenticationEntryPoint} from its filter chain when a
 * request requires authentication but has no accepted principal. The failure happens before MVC,
 * so using this component ensures the response still follows the API-wide RFC 7807 contract
 * instead of returning a container-generated HTML or empty response.</p>
 *
 * <p>Use this entry point for missing, malformed, expired, or otherwise unaccepted request
 * credentials. It must expose only the stable {@code auth.required} contract and never include
 * exception messages that could reveal token-validation or authentication internals. Authorization
 * failures for an authenticated caller belong to {@link ProblemAccessDeniedHandler} instead.</p>
 *
 * <p>For example, an unauthenticated {@code GET /api/lobbies} is intercepted before
 * {@code LobbyController}; this entry point returns {@code application/problem+json}, status
 * {@code 401}, type {@code authentication-required}, and {@code WWW-Authenticate: Bearer}.</p>
 */
@Component
@RequiredArgsConstructor
public class ProblemAuthenticationEntryPoint implements AuthenticationEntryPoint {

  private final SecurityProblemDetailsWriter problemDetailsWriter;

  @Override
  public void commence(
      HttpServletRequest request,
      HttpServletResponse response,
      AuthenticationException authenticationException) throws IOException {
    response.setHeader("WWW-Authenticate", "Bearer");
    problemDetailsWriter.write(
        request,
        response,
        org.springframework.http.HttpStatus.UNAUTHORIZED,
        "authentication-required",
        "Authentication required",
        "Authentication is required to access this resource.",
        "auth.required");
  }

}
