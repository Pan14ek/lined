package io.backend.lined.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * Produces Lined's safe {@code 403 Forbidden} response for authenticated callers without access.
 *
 * <p>Spring Security invokes an {@link AccessDeniedHandler} after authentication succeeds but an
 * authorization decision rejects the request. This component keeps that filter-layer response in
 * the same RFC 7807 format as the rest of the API, because MVC exception advice does not handle a
 * denial raised inside the security filter chain.</p>
 *
 * <p>Use this handler for authorization denials made by Spring Security. It deliberately returns
 * the stable {@code access.denied} contract instead of the exception message, which can reveal
 * authorization implementation details. Missing or invalid authentication must use
 * {@link ProblemAuthenticationEntryPoint} and return {@code 401}, not this handler.</p>
 *
 * <p>For example, when a future route requires an authority that the authenticated caller lacks,
 * Spring Security calls this handler before controller execution. The caller receives
 * {@code application/problem+json}, status {@code 403}, type {@code access-denied}, and code
 * {@code access.denied}.</p>
 */
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
