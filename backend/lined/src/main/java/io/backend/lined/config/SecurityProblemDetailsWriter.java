package io.backend.lined.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;

/**
 * Serializes RFC 7807 Problem Details responses raised by Spring Security filters.
 *
 * <p>Security failures occur before a request reaches a controller, so
 * {@link GlobalExceptionHandler} cannot convert them into Lined's normal API error shape. This
 * component gives {@link ProblemAuthenticationEntryPoint} and {@link ProblemAccessDeniedHandler}
 * one serialization path, keeping their HTTP status, media type, problem URI, request instance,
 * and stable {@code code} extension consistent.</p>
 *
 * <p>Use this writer only from infrastructure components that handle a security failure before
 * Spring MVC. Controller and service exceptions should continue through {@code GlobalExceptionHandler};
 * they must not write directly to {@link HttpServletResponse}.</p>
 *
 * <p>For example, an authentication entry point can write the response for an unauthenticated
 * {@code GET /api/lobbies} with status {@code 401}, type {@code authentication-required}, and
 * code {@code auth.required}. The resulting response has content type
 * {@code application/problem+json} and instance {@code /api/lobbies}, without serializing the
 * underlying authentication exception.</p>
 */
@Component
@RequiredArgsConstructor
public class SecurityProblemDetailsWriter {

  private static final String PROBLEM_BASE_URI = "https://lined.app/problems/";

  private final ObjectMapper objectMapper;

  void write(
      HttpServletRequest request,
      HttpServletResponse response,
      HttpStatus status,
      String type,
      String title,
      String detail,
      String code) throws IOException {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setType(URI.create(PROBLEM_BASE_URI + type));
    problem.setTitle(title);
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", code);

    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    objectMapper.writeValue(response.getOutputStream(), problem);
  }

}
