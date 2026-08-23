package io.backend.lined.featureflag.api;

import io.backend.lined.featureflag.domain.FeatureFlagKey;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a public Spring MVC controller or handler as owned by a feature capability.
 *
 * <p>Use this annotation when an HTTP operation must stop at the MVC boundary while its capability
 * is disabled. It makes the ownership explicit and prevents a disabled feature from invoking a
 * controller or service accidentally.
 *
 * <p>Apply it to a controller when all of its public operations share one capability, or apply it
 * to an individual method when that method belongs to a different capability. For example:
 *
 * <pre>{@code
 * @FeatureRequired(FeatureFlagKey.TASKS)
 * class TaskController {
 *
 *   @FeatureRequired(FeatureFlagKey.CALENDARS)
 *   public List<FreeSlotDto> freeSlots() {
 *     // A Calendar operation hosted by a shared controller.
 *   }
 * }
 * }</pre>
 *
 * <p>Method metadata takes precedence over controller metadata. The annotation is intentionally an
 * MVC concern: it does not gate internal service calls, authorization, control-plane endpoints, or
 * unknown feature keys. Use a composed capability annotation, such as {@link LobbiesFeatureRequired},
 * when it improves clarity without hiding the endpoint's capability ownership.
 */
@Target({ElementType.TYPE, ElementType.METHOD, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface FeatureRequired {

  FeatureFlagKey value();
}
