package io.backend.lined.plan.api;

import io.backend.lined.plan.service.PlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/plans")
@RequiredArgsConstructor
@Tag(name = "Plans", description = "API for managing subscription plans")
public class PlanController {

  private final PlanService planService;

  @GetMapping
  @Operation(
      summary = "List all plans",
      description = "Returns a list of all available subscription plans.",
      responses = {
          @ApiResponse(
              responseCode = "200",
              description = "List of plans",
              content = @Content(
                  mediaType = "application/json",
                  schema = @Schema(implementation = PlanDto.class)
              )
          )
      }
  )
  public List<PlanDto> listAll() {
    return planService.listAll();
  }

  @GetMapping("/{id}")
  @Operation(
      summary = "Get plan by id",
      description = "Returns a single plan by its identifier.",
      responses = {
          @ApiResponse(
              responseCode = "200",
              description = "Plan found",
              content = @Content(
                  mediaType = "application/json",
                  schema = @Schema(implementation = PlanDto.class)
              )
          ),
          @ApiResponse(responseCode = "404", description = "Plan not found")
      }
  )
  public PlanDto getById(
      @Parameter(description = "Plan identifier", example = "1")
      @PathVariable Long id
  ) {
    return planService.getById(id);
  }

  @GetMapping("/by-name")
  @Operation(
      summary = "Get plan by name",
      description = "Returns a single plan by its unique name.",
      responses = {
          @ApiResponse(
              responseCode = "200",
              description = "Plan found",
              content = @Content(
                  mediaType = "application/json",
                  schema = @Schema(implementation = PlanDto.class)
              )
          ),
          @ApiResponse(responseCode = "404", description = "Plan not found")
      }
  )
  public PlanDto getByName(
      @Parameter(description = "Plan unique name", example = "PRO_MONTHLY")
      @RequestParam String name
  ) {
    return planService.getByName(name);
  }

  @PostMapping
  @Operation(
      summary = "Create a new plan",
      description = "Creates a new subscription plan.",
      responses = {
          @ApiResponse(
              responseCode = "201",
              description = "Plan created",
              content = @Content(
                  mediaType = "application/json",
                  schema = @Schema(implementation = PlanDto.class)
              )
          ),
          @ApiResponse(responseCode = "400", description = "Validation error")
      }
  )
  public ResponseEntity<PlanDto> create(
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          description = "New plan data",
          required = true,
          content = @Content(
              mediaType = "application/json",
              schema = @Schema(implementation = PlanCreateDto.class),
              examples = {
                  @io.swagger.v3.oas.annotations.media.ExampleObject(
                      name = "ProMonthly",
                      value = """
                          {
                            "name": "PRO_MONTHLY",
                            "priceUsd": 9.99,
                            "durationDays": 30
                          }
                          """
                  )
              }
          )
      )
      @RequestBody PlanCreateDto request
  ) {
    PlanDto created = planService.create(request);
    return ResponseEntity
        .created(URI.create("/api/plans/" + created.id()))
        .body(created);
  }

  @PutMapping("/{id}")
  @Operation(
      summary = "Update an existing plan",
      description = "Updates an existing subscription plan by id.",
      responses = {
          @ApiResponse(
              responseCode = "200",
              description = "Plan updated",
              content = @Content(
                  mediaType = "application/json",
                  schema = @Schema(implementation = PlanDto.class)
              )
          ),
          @ApiResponse(responseCode = "404", description = "Plan not found")
      }
  )
  public PlanDto update(
      @Parameter(description = "Plan identifier", example = "1")
      @PathVariable Long id,

      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          description = "Updated plan data",
          required = true,
          content = @Content(
              mediaType = "application/json",
              schema = @Schema(implementation = PlanUpdateDto.class),
              examples = {
                  @io.swagger.v3.oas.annotations.media.ExampleObject(
                      name = "ProMonthlyUpdated",
                      value = """
                          {
                            "name": "PRO_MONTHLY",
                            "priceUsd": 12.99,
                            "durationDays": 30
                          }
                          """
                  )
              }
          )
      )
      @RequestBody PlanUpdateDto request
  ) {
    return planService.update(id, request);
  }

  @DeleteMapping("/{id}")
  @Operation(
      summary = "Delete a plan",
      description = "Deletes an existing plan by id.",
      responses = {
          @ApiResponse(responseCode = "204", description = "Plan deleted"),
          @ApiResponse(responseCode = "404", description = "Plan not found")
      }
  )
  public ResponseEntity<Void> delete(
      @Parameter(description = "Plan identifier", example = "1")
      @PathVariable Long id
  ) {
    planService.delete(id);
    return ResponseEntity.noContent().build();
  }

}
