package io.backend.lined.subscription.api;

import io.backend.lined.subscription.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Subscriptions", description = "API for managing user subscriptions")
public class SubscriptionController {

  private final SubscriptionService subscriptionService;

  @PostMapping
  @Operation(
      summary = "Start a new subscription",
      description = "Starts a new subscription for a user. If 'active' is true (or null), "
          + "previous active subscription will be deactivated.",
      responses = {
          @ApiResponse(
              responseCode = "201",
              description = "Subscription created",
              content = @Content(
                  mediaType = "application/json",
                  schema = @Schema(implementation = SubscriptionDto.class)
              )
          ),
          @ApiResponse(responseCode = "400", description = "Validation error"),
          @ApiResponse(responseCode = "404", description = "User or plan not found")
      }
  )
  public ResponseEntity<SubscriptionDto> start(
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          required = true,
          description = "Subscription creation payload",
          content = @Content(
              mediaType = "application/json",
              schema = @Schema(implementation = SubscriptionCreateDto.class),
              examples = {
                  @ExampleObject(
                      name = "Active subscription with auto dates",
                      value = """
                          {
                            "userId": 1,
                            "planId": 2,
                            "startDate": null,
                            "endDate": null,
                            "active": true
                          }
                          """
                  )
              }
          )
      )
      @Valid @RequestBody SubscriptionCreateDto request
  ) {
    SubscriptionDto created = subscriptionService.start(
        request.userId(),
        request.planId(),
        request.startDate(),
        request.endDate(),
        request.active()
    );
    return ResponseEntity.status(201).body(created);
  }

  @PostMapping("/{userId}/cancel-active")
  @Operation(
      summary = "Cancel active subscription",
      description = "Cancels currently active subscription for the specified user.",
      responses = {
          @ApiResponse(
              responseCode = "200",
              description = "Active subscription cancelled",
              content = @Content(
                  mediaType = "application/json",
                  schema = @Schema(implementation = SubscriptionDto.class)
              )
          ),
          @ApiResponse(responseCode = "404", description = "Active subscription not found")
      }
  )
  public SubscriptionDto cancelActive(
      @Parameter(description = "User identifier", example = "1")
      @PathVariable Long userId
  ) {
    return subscriptionService.cancelActive(userId);
  }

  @GetMapping("/{userId}/active")
  @Operation(
      summary = "Get active subscription",
      description = "Returns currently active subscription for the specified user, if exists.",
      responses = {
          @ApiResponse(
              responseCode = "200",
              description = "Active subscription found",
              content = @Content(
                  mediaType = "application/json",
                  schema = @Schema(implementation = SubscriptionDto.class)
              )
          ),
          @ApiResponse(responseCode = "404", description = "No active subscription")
      }
  )
  public ResponseEntity<SubscriptionDto> getActive(
      @Parameter(description = "User identifier", example = "1")
      @PathVariable Long userId
  ) {
    return ResponseEntity.of(subscriptionService.getActive(userId));
  }

  @GetMapping("/{userId}/history")
  @Operation(
      summary = "Get subscription history",
      description = "Returns all subscriptions for the specified user, ordered by start date (desc).",
      responses = {
          @ApiResponse(
              responseCode = "200",
              description = "Subscription history",
              content = @Content(
                  mediaType = "application/json",
                  schema = @Schema(implementation = SubscriptionDto.class)
              )
          )
      }
  )
  public List<SubscriptionDto> history(
      @Parameter(description = "User identifier", example = "1")
      @PathVariable Long userId
  ) {
    return subscriptionService.history(userId);
  }

}
