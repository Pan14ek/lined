package io.backend.lined.user.api;

import java.util.List;

public record UserPageDto(
    List<UserSearchResultDto> content,
    int page,
    int size,
    long totalElements,
    int totalPages
) {
}
