package io.backend.lined.common;

import java.util.Optional;
import java.util.function.Supplier;

public class EntityFinder {

  private EntityFinder() {
  }

  public static <T> T findOrThrow(Optional<T> optional,
                                  Supplier<RuntimeException> exceptionSupplier) {
    return optional.orElseThrow(exceptionSupplier);
  }

}
