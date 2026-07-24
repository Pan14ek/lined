package io.backend.lined.billing.api.web;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Makes retired plan-write routes indistinguishable from unmapped legacy billing routes.
 *
 * <p>Spring MVC normally answers {@code 405 Method Not Allowed} when {@code POST /api/plans}
 * shares its path with the temporary {@code GET /api/plans} route. BE-04 deliberately exposes
 * {@code 404 Not Found} instead, for example for {@code DELETE /api/plans/7}, so clients cannot
 * treat the retired write surface as an available API.</p>
 */
@RestControllerAdvice
public class LegacyBillingEndpointRemovalAdvice {

  /**
   * Converts method mismatches for the three retired plan-write routes to {@code 404}.
   *
   * <p>For example, a {@code PUT /api/plans/7} request receives an RFC 7807 {@code 404} response,
   * while an unrelated method mismatch retains the standard {@code 405} status.</p>
   *
   * @param exception Spring MVC mismatch containing the supported HTTP methods
   * @param request incoming request used to limit the compatibility rule to legacy plan URLs
   * @return an intentionally unmapped response for retired plan writes, otherwise {@code 405}
   */
  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ProblemDetail> handleMethodNotSupported(
      HttpRequestMethodNotSupportedException exception, HttpServletRequest request) {
    HttpStatus status = isRetiredPlanWrite(request) ? HttpStatus.NOT_FOUND : HttpStatus.METHOD_NOT_ALLOWED;
    ProblemDetail detail = ProblemDetail.forStatusAndDetail(status,
        status == HttpStatus.NOT_FOUND ? "No endpoint matches this request" : exception.getMessage());
    detail.setTitle(status.getReasonPhrase());
    detail.setType(URI.create("https://errors.lined.app/billing.endpoint-not-found"));
    return ResponseEntity.status(status).body(detail);
  }

  private boolean isRetiredPlanWrite(HttpServletRequest request) {
    String method = request.getMethod();
    String path = request.getRequestURI();
    return ("POST".equals(method) && "/api/plans".equals(path))
        || (("PUT".equals(method) || "DELETE".equals(method)) && path.matches("/api/plans/\\d+"));
  }
}
