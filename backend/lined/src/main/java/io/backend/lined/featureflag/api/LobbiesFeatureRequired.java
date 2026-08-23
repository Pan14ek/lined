package io.backend.lined.featureflag.api;

import io.backend.lined.featureflag.domain.FeatureFlagKey;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks an MVC controller or method as owned by the Lobbies capability.
 *
 * <p>Use this composed annotation for lobby management and invitation operations so callers do not
 * repeat the catalog key and so {@link FeatureRequiredResolver} can resolve the same requirement as
 * a direct {@link FeatureRequired} annotation. For example:
 *
 * <pre>{@code
 * @LobbiesFeatureRequired
 * public LobbyDto createLobby(LobbyCreateDto request) {
 *   // Lobby management operation.
 * }
 * }</pre>
 *
 * <p>Do not use it for shared lobby reads or operations owned by another capability. In those cases,
 * leave the method unannotated or use the owning capability directly; method-level metadata takes
 * precedence over this annotation on a controller.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@FeatureRequired(FeatureFlagKey.LOBBIES)
public @interface LobbiesFeatureRequired {
}
