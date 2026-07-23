package io.backend.lined.lobby.api;

import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.lobby.domain.LobbyAccessMode;
import io.backend.lined.lobby.domain.LobbyLifecycleStatus;
import io.backend.lined.lobby.domain.LobbyRestrictionReason;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.Set;

@Schema(name = "LobbyDto", description = "Lobby representation")
public record LobbyDto(
    @Schema(example = "101") Long id,
    @Schema(example = "0", description = "Optimistic-lock version") long version,
    @Schema(example = "Our Family") String name,
    @Schema(example = "FAMILY") LobbyTypes lobbyType,
    @Schema(example = "42") Long ownerId,
    @Schema(example = "[1,42,77]") Set<Long> memberIds,
    @Schema(example = "ACTIVE") LobbyLifecycleStatus lifecycleStatus,
    @Schema(example = "READ_WRITE") LobbyAccessMode accessMode,
    @Schema(example = "NONE") LobbyRestrictionReason restrictionReason,
    @Schema(example = "2026-08-01T00:00:00Z") OffsetDateTime archiveAt,
    @Schema(example = "2026-07-24T12:00:00Z") OffsetDateTime selectedAsFreeAt
) {
  public LobbyDto(Long id, String name, LobbyTypes lobbyType, Long ownerId, Set<Long> memberIds) {
    this(id, 0L, name, lobbyType, ownerId, memberIds, LobbyLifecycleStatus.ACTIVE,
        LobbyAccessMode.READ_WRITE, LobbyRestrictionReason.NONE, null, null);
  }
}
