package io.backend.lined.common.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Records privacy-safe operational counters for events and tasks.
 *
 * <p>For example, recording a rejected task read creates a counter with only
 * {@code item.type=task}; it never adds the requester, lobby, item identifier, or item content
 * as a metric tag.</p>
 */
@Component
@RequiredArgsConstructor
public class PrivateItemMetrics {

  static final String CREATED_METRIC = "lined.private.item.created";
  static final String ACCESS_DENIED_METRIC = "lined.private.item.access.denied";
  static final String VISIBILITY_CHANGE_METRIC = "lined.visibility.change";
  private static final String ITEM_TYPE_TAG = "item.type";
  private static final String FROM_TAG = "from";
  private static final String TO_TAG = "to";

  private final MeterRegistry meterRegistry;

  /**
   * Records creation of a private item.
   *
   * @param itemType fixed type of the created item
   */
  public void recordPrivateItemCreated(PrivateItemType itemType) {
    incrementAfterCommit(CREATED_METRIC, ITEM_TYPE_TAG, itemType.metricValue());
  }

  /**
   * Records a private item access denial without exposing the hidden resource identity.
   *
   * @param itemType fixed type of the denied item
   */
  public void recordAccessDenied(PrivateItemType itemType) {
    increment(ACCESS_DENIED_METRIC, ITEM_TYPE_TAG, itemType.metricValue());
  }

  /**
   * Records a real transition between the fixed private-item visibility values.
   *
   * @param itemType fixed type of the changed item
   * @param from previous visibility enum
   * @param to new visibility enum
   */
  public void recordVisibilityChange(PrivateItemType itemType, Enum<?> from, Enum<?> to) {
    incrementAfterCommit(VISIBILITY_CHANGE_METRIC, ITEM_TYPE_TAG, itemType.metricValue(),
        FROM_TAG, from.name(), TO_TAG, to.name());
  }

  private void incrementAfterCommit(String metric, String... tags) {
    if (!TransactionSynchronizationManager.isActualTransactionActive()
        || !TransactionSynchronizationManager.isSynchronizationActive()) {
      increment(metric, tags);
      return;
    }
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override
      public void afterCommit() {
        increment(metric, tags);
      }
    });
  }

  private void increment(String metric, String... tags) {
    meterRegistry.counter(metric, tags).increment();
  }
}
