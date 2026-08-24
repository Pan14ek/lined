package io.backend.lined.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/** Returns a stable Problem Details response when an authenticated caller lacks access. */
@Component
@RequiredArgsConstructor
public class ProblemAccessDeniedHandler implements AccessDeniedHandler {

  private final SecurityProblemDetailsWriter problemDetailsWriter;

  @Override
  public void handle(
      HttpServletRequest request,
      HttpServletResponse response,
      AccessDeniedException accessDeniedException) throws IOException {
    problemDetailsWriter.write(
        request,
        response,
        HttpStatus.FORBIDDEN,
        "access-denied",
        "Access denied",
        "You do not have permission to perform this operation.",
        "access.denied");
  }

}
