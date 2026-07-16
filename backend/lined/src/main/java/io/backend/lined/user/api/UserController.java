package io.backend.lined.user.api;

import io.backend.lined.app.AccountApplicationService;
import io.backend.lined.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Users", description = "Action on users")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;
  private final AccountApplicationService accountApplicationService;

  @Operation(
      summary = "Create user",
      description = "Creates a new user with unique username & email."
  )
  @PostMapping
  public UserDto create(
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          required = true,
          description = "User payload",
          content = @Content(schema = @Schema(implementation = UserCreateDto.class),
              examples = @ExampleObject(name = "valid", value = """
                    {
                      "username": "alex",
                      "email": "alex@example.com",
                      "password": "P@ssw0rd!"
                    }
                  """)
          )
      )
      @Valid @RequestBody UserCreateDto dto) {
    return accountApplicationService.registerUser(dto);
  }

  @Operation(
      summary = "Update user",
      description = "Partial update of an existing user by ID."
  )
  @PatchMapping("/{id}")
  public UserDto update(
      @Parameter(description = "User ID", example = "1")
      @PathVariable Long id,
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          required = true,
          description = "Fields to update",
          content = @Content(schema = @Schema(implementation = UserUpdateDto.class),
              examples = @ExampleObject(value = """
                    {
                      "email": "new.mail@example.com",
                      "password": "N3wP@ss!"
                    }
                  """)
          )
      )
      @Valid @RequestBody UserUpdateDto dto) {
    return userService.update(id, dto);
  }

  @Operation(
      summary = "Get user",
      description = "Returns a user by ID."
  )
  @GetMapping("/{id}")
  public UserDto get(
      @Parameter(description = "User ID", example = "1")
      @PathVariable Long id) {
    return userService.getById(id);
  }

  @Operation(
      summary = "Delete own account",
      description = "Deletes the caller's account when they do not own a lobby."
  )
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @Parameter(description = "User ID", example = "1") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "1")
      @org.springframework.web.bind.annotation.RequestHeader("X-User-Id") Long currentUserId) {
    userService.delete(id, currentUserId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/search")
  public ResponseEntity<UserPageDto> findUsers(
      @RequestParam String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ResponseEntity.ok(userService.findUsers(q, page, size));
  }

  @GetMapping("/by-role")
  public ResponseEntity<UserPageDto> findUsersByRole(
      @RequestParam String role,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ResponseEntity.ok(userService.findUsersByRole(role, page, size));
  }

}
