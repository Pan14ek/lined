package io.backend.lined.user.service;

import io.backend.lined.user.api.UserCreateDto;
import io.backend.lined.user.api.UserDto;
import io.backend.lined.user.api.UserPageDto;
import io.backend.lined.user.api.UserUpdateDto;

/**
 * Service interface for managing user accounts.
 * Provides CRUD operations, credential updates, and search functionality.
 */
public interface UserService {

  /**
   * Creates a new user account.
   * Validates username and email uniqueness before saving.
   *
   * @param dto the user creation data
   * @return the created user as a DTO
   * @throws ConflictException if the username or email already exists
   */
  UserDto create(UserCreateDto dto);

  /**
   * Retrieves a user by their unique identifier.
   *
   * @param id the user ID
   * @return the user as a DTO
   * @throws NotFoundException if no user exists with the given ID
   */
  UserDto getById(Long id);

  /**
   * Updates an existing user's details.
   * Only non-null fields in the DTO are applied.
   *
   * @param id  the user ID to update
   * @param dto the update data
   * @return the updated user as a DTO
   * @throws NotFoundException if no user exists with the given ID
   * @throws ConflictException if the new username or email is already taken
   */
  UserDto update(Long id, UserUpdateDto dto, long expectedVersion);

  @Deprecated
  default UserDto update(Long id, UserUpdateDto dto) {
    return update(id, dto, -1L);
  }

  /**
   * Deletes the requesting user's account when they do not own a lobby.
   *
   * @param id the user ID to delete
   * @param currentUserId the ID supplied by the current MVP authentication header
   * @throws ForbiddenException if the requester is deleting another account
   * @throws ConflictException if the account owns one or more lobbies
   * @throws NotFoundException if no user exists with the given ID
   */
  void delete(Long id, Long currentUserId, long expectedVersion);

  @Deprecated
  default void delete(Long id, Long currentUserId) {
    delete(id, currentUserId, -1L);
  }

  /**
   * Changes the password for a user.
   *
   * @param userId         the user ID
   * @param rawNewPassword the new plain-text password (will be encoded before saving)
   * @throws NotFoundException if no user exists with the given ID
   */
  void changePassword(Long userId, String rawNewPassword);

  /**
   * Changes the email address for a user.
   *
   * @param userId   the user ID
   * @param newEmail the new email address
   * @return the updated user as a DTO
   * @throws ConflictException if the email is already in use
   * @throws NotFoundException if no user exists with the given ID
   */
  UserDto changeEmail(Long userId, String newEmail);

  /**
   * Changes the username for a user.
   *
   * @param userId      the user ID
   * @param newUsername the new username
   * @return the updated user as a DTO
   * @throws ConflictException if the username is already in use
   * @throws NotFoundException if no user exists with the given ID
   */
  UserDto changeUsername(Long userId, String newUsername);

  /**
   * Searches users by partial username or email match.
   * Results are paginated and sorted by username ascending.
   *
   * @param query the search string
   * @param page  zero-based page index
   * @param size  number of results per page
   * @return a paginated list of matching users
   */

  UserPageDto findUsers(String query, int page, int size);

  /**
   * Returns all users assigned to a specific role.
   *
   * @param roleName the role name to filter by (case-insensitive)
   * @param page     zero-based page index
   * @param size     number of results per page
   * @return a paginated list of users with the given role
   * @throws NotFoundException if the role does not exist
   */
  UserPageDto findUsersByRole(String roleName, int page, int size);

}
