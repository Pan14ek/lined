package io.backend.lined.common;

import java.util.Optional;
import java.util.function.Supplier;

/**
 * Utility class for safe entity retrieval from repository lookups.
 *
 * <p>Provides a centralized way to unwrap {@link Optional} results
 * and throw a meaningful exception when the entity is not found,
 * reducing duplicated {@code orElseThrow} patterns across service classes.
 *
 * <p>This class is not instantiable.
 */
public class EntityFinder {

  private EntityFinder() {
  }

  /**
   * Returns the value contained in the given {@link Optional},
   * or throws the exception provided by the supplier if the value is absent.
   *
   * @param <T>               the type of the entity to retrieve
   * @param optional          the {@link Optional} result from a repository lookup
   * @param exceptionSupplier a supplier that produces the exception to throw
   *                          when the entity is not found; must not be {@code null}
   * @return the contained entity value, never {@code null}
   * @throws RuntimeException the exception produced by {@code exceptionSupplier}
   *                          if the {@link Optional} is empty
   */
  public static <T> T findOrThrow(Optional<T> optional,
                                  Supplier<RuntimeException> exceptionSupplier) {
    return optional.orElseThrow(exceptionSupplier);
  }

}
