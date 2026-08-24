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

/** Writes RFC 7807 responses for failures raised before Spring MVC handles a request. */
@Component
@RequiredArgsConstructor
class SecurityProblemDetailsWriter {

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
