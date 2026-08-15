package io.backend.lined.common.metrics;

/**
 * Fixed item-type labels permitted in private-item metrics.
 */
public enum PrivateItemType {
  EVENT("event"),
  TASK("task");

  private final String metricValue;

  PrivateItemType(String metricValue) {
    this.metricValue = metricValue;
  }

  public String metricValue() {
    return metricValue;
  }
}
