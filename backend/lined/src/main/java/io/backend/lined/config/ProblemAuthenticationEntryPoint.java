package io.backend.lined.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/** Returns a stable Problem Details response when a private route has no authentication. */
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
