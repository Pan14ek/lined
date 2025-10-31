package io.backend.lined.role.api;

import io.backend.lined.role.service.RoleService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

  private final RoleService roleService;

  @GetMapping
  public List<RoleDto> listAll() {
    return roleService.listAll();
  }

  @GetMapping("/names")
  public Set<RoleNameDto> listRoleNames() {
    return roleService.listAll().stream()
        .map(r -> new RoleNameDto(r.name()))
        .collect(Collectors.toSet());
  }

  @PostMapping("/{roleName}")
  @ResponseStatus(HttpStatus.CREATED)
  public void ensureExists(@PathVariable String roleName) {
    roleService.ensureExists(roleName);
  }

  @PutMapping("/user/{userId}")
  public Set<String> setUserRoles(@PathVariable Long userId,
                                  @Valid @RequestBody AssignRolesRequestDto req) {
    return roleService.setUserRoles(userId, req.roles());
  }

  @PostMapping("/user/{userId}/add")
  public Set<String> addUserRoles(@PathVariable Long userId,
                                  @Valid @RequestBody AssignRolesRequestDto req) {
    return roleService.addUserRoles(userId, req.roles());
  }

  @PostMapping("/user/{userId}/remove")
  public Set<String> removeUserRoles(@PathVariable Long userId,
                                     @Valid @RequestBody AssignRolesRequestDto req) {
    return roleService.removeUserRoles(userId, req.roles());
  }

}
