package io.backend.lined.lobby.api;

import io.backend.lined.lobby.domain.LobbyTypes;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;

@Schema(name = "LobbyDto", description = "Lobby representation")
public record LobbyDto(
    @Schema(example = "101") Long id,
    @Schema(example = "Our Family") String name,
    @Schema(example = "FAMILY") LobbyTypes lobbyType,
    @Schema(example = "42") Long ownerId,
    @Schema(example = "[1,42,77]") Set<Long> memberIds
) {
}