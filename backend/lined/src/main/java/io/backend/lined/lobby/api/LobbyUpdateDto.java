package io.backend.lined.lobby.api;

import io.backend.lined.lobby.domain.LobbyTypes;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@Schema(name = "LobbyUpdateDto", description = "Partial lobby update payload")
public record LobbyUpdateDto(
    @Schema(description = "Lobby name", example = "Weekend Crew")
    @Size(max = 64)
    @Pattern(regexp = ".*\\S.*", message = "must not be blank") String name,

    @Schema(description = "Lobby type", example = "FRIENDS", allowableValues = {
        "COUPLE", "FAMILY", "FRIENDS", "WORK"}) LobbyTypes lobbyType,

    @Schema(description = "New owner ID; must already be a lobby member", example = "77")
    @Positive Long ownerId
) {
}
