package io.backend.lined.user.service;

import io.backend.lined.user.api.UserCreateDto;
import io.backend.lined.user.api.UserDto;
import io.backend.lined.user.api.UserPageDto;
import io.backend.lined.user.api.UserUpdateDto;

public interface UserService {

  UserDto create(UserCreateDto dto);

  UserDto getById(Long id);

  UserDto update(Long id, UserUpdateDto dto);

  void delete(Long id);

  void changePassword(Long userId, String rawNewPassword);

  UserDto changeEmail(Long userId, String newEmail);

  UserDto changeUsername(Long userId, String newUsername);

  UserPageDto findUsers(String query, int page, int size);

  UserPageDto findUsersByRole(String roleName, int page, int size);

}
