package io.backend.lined.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;

class ProblemAccessDeniedHandlerTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final ProblemAccessDeniedHandler handler = new ProblemAccessDeniedHandler(
      new SecurityProblemDetailsWriter(objectMapper));

  @Test
  void handle_returnsSafeForbiddenProblem() throws Exception {
    var request = new MockHttpServletRequest("GET", "/api/lobbies/1");
    var response = new MockHttpServletResponse();

    handler.handle(request, response, new AccessDeniedException("internal authorization detail"));

    var body = objectMapper.readTree(response.getContentAsByteArray());
    assertThat(response.getStatus()).isEqualTo(HttpStatus.FORBIDDEN.value());
    assertThat(response.getContentType()).isEqualTo(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    assertThat(body.path("type").asText()).isEqualTo("https://lined.app/problems/access-denied");
    assertThat(body.path("title").asText()).isEqualTo("Access denied");
    assertThat(body.path("status").asInt()).isEqualTo(HttpStatus.FORBIDDEN.value());
    assertThat(body.path("detail").asText())
        .isEqualTo("You do not have permission to perform this operation.");
    assertThat(body.path("instance").asText()).isEqualTo("/api/lobbies/1");
  }

}
