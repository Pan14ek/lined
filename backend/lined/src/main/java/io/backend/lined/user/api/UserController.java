package io.backend.lined.user.api;

import io.backend.lined.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  @PostMapping
  public UserDto create(@Valid @RequestBody UserCreateDto dto) {
    return userService.create(dto);
  }

  @PatchMapping("/{id}")
  public UserDto update(@PathVariable Long id, @Valid @RequestBody UserUpdateDto dto) {
    return userService.update(id, dto);
  }

  @GetMapping("/{id}")
  public UserDto get(@PathVariable Long id) {
    return userService.getById(id);
  }

}
