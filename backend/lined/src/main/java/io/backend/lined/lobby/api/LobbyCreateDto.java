package io.backend.lined.lobby.api;

import io.backend.lined.lobby.domain.LobbyTypes;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(name = "LobbyCreateDto", description = "Payload to create a lobby")
public record LobbyCreateDto(@Schema(description = "Lobby name", example = "Our Family")
                             @NotBlank String name,

                             @Schema(description = "Lobby type", example = "FAMILY", allowableValues = {
                                 "COUPLE", "FAMILY", "FRIENDS", "WORK"})
                             @NotNull LobbyTypes lobbyType) {
}
