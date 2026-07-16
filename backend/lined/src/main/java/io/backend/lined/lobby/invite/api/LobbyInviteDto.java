package io.backend.lined.lobby.invite.api;

import io.backend.lined.lobby.invite.domain.LobbyInviteStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(name = "LobbyInviteDto", description = "A lobby membership invitation")
public record LobbyInviteDto(
    @Schema(example = "501") Long id,
    @Schema(example = "101") Long lobbyId,
    @Schema(example = "42") Long inviterId,
    @Schema(example = "77") Long inviteeId,
    @Schema(example = "PENDING") LobbyInviteStatus status,
    @Schema(example = "2026-07-16T10:00:00Z") OffsetDateTime sentAt,
    @Schema(example = "2026-07-16T10:00:00Z") OffsetDateTime createdAt,
    @Schema(example = "2026-07-16T10:00:00Z") OffsetDateTime updatedAt
) {
}
