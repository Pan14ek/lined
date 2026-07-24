package io.backend.lined.plan.api;

import io.backend.lined.plan.service.PlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Temporary read-only view of legacy plans until BE-05 replaces this catalog.
 *
 * <p>For example, {@code GET /api/plans} exposes plan identifiers and names but never price or
 * duration data. Creating, changing, or deleting plans through this controller is intentionally
 * unavailable.</p>
 */
@RestController
@RequestMapping("/api/plans")
@RequiredArgsConstructor
@Tag(name = "Plans", description = "Temporary read-only legacy plan API")
public class PlanController {

  private final PlanService planService;

  /**
   * Lists temporary legacy plan identifiers without paid catalog details.
   *
   * <p>For example, a response item is {@code {"id":1,"name":"FREE"}} and does not reveal
   * price or billing-period fields.</p>
   *
   * @return read-only legacy plan summaries
   */
  @GetMapping
  @Operation(summary = "List legacy plans", description = "Returns no pricing or duration data.",
      responses = @ApiResponse(responseCode = "200", description = "Plan summaries returned",
          content = @Content(mediaType = "application/json",
              schema = @Schema(implementation = PlanDto.class))))
  public List<PlanDto> listAll() {
    return planService.listAll();
  }

  /**
   * Returns one temporary legacy plan summary by identifier.
   *
   * <p>For example, {@code GET /api/plans/1} returns the plan name but not its legacy price or
   * duration.</p>
   *
   * @param id legacy plan identifier
   * @return read-only legacy plan summary
   */
  @GetMapping("/{id}")
  @Operation(summary = "Get legacy plan by id", responses = {
      @ApiResponse(responseCode = "200", description = "Plan summary returned"),
      @ApiResponse(responseCode = "404", description = "Plan not found")
  })
  public PlanDto getById(
      @Parameter(description = "Plan identifier", example = "1") @PathVariable Long id) {
    return planService.getById(id);
  }

  /**
   * Returns one temporary legacy plan summary by name.
   *
   * <p>For example, {@code GET /api/plans/by-name?name=FREE} returns the Free identifier and
   * name only; the endpoint is not a paid catalog lookup.</p>
   *
   * @param name unique legacy plan name
   * @return read-only legacy plan summary
   */
  @GetMapping("/by-name")
  @Operation(summary = "Get legacy plan by name", responses = {
      @ApiResponse(responseCode = "200", description = "Plan summary returned"),
      @ApiResponse(responseCode = "404", description = "Plan not found")
  })
  public PlanDto getByName(
      @Parameter(description = "Plan unique name", example = "FREE") @RequestParam String name) {
    return planService.getByName(name);
  }
}
