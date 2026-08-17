package io.backend.lined.featureflag.service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.stereotype.Component;

/**
 * Thread-safe immutable feature-flag snapshot used for database-free request evaluation.
 *
 * <p>For example, a refresh swaps the whole {@code calendars.feature.enabled} map atomically, so
 * a concurrent HTTP request sees either the old complete snapshot or the new complete snapshot.</p>
 */
@Component
public class FeatureFlagSnapshot {

  private final AtomicReference<Map<String, Boolean>> flags = new AtomicReference<>(Map.of());

  /**
   * Returns whether a key is enabled, failing closed when the key is absent.
   *
   * @param key stable feature-flag key
   * @return {@code true} only for a cached enabled value
   */
  public boolean isEnabled(String key) {
    return Boolean.TRUE.equals(flags.get().get(key));
  }

  /**
   * Atomically replaces the complete snapshot with an immutable copy.
   *
   * @param replacement complete result returned by the active-environment query
   */
  public void replaceAll(Map<String, Boolean> replacement) {
    flags.set(Map.copyOf(replacement));
  }

  /**
   * Atomically applies one key change while preserving every other cached value.
   *
   * @param key stable feature-flag key
   * @param enabled replacement enabled value
   */
  public void update(String key, boolean enabled) {
    flags.updateAndGet(current -> {
      Map<String, Boolean> updated = new HashMap<>(current);
      updated.put(key, enabled);
      return Map.copyOf(updated);
    });
  }

  /**
   * Returns an immutable view of the current complete snapshot.
   *
   * @return immutable current snapshot
   */
  public Map<String, Boolean> snapshot() {
    return flags.get();
  }
}
