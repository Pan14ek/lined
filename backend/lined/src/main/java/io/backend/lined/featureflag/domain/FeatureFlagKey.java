package io.backend.lined.featureflag.domain;

/**
 * Stable catalog of public Lined capabilities controlled by feature flags.
 *
 * <p>For example, {@link #CALENDARS} is persisted as {@code calendars.feature.enabled} and is
 * later used by the calendar HTTP capability boundary. The string values are API data and must
 * not be renamed without a coordinated migration.</p>
 */
public enum FeatureFlagKey {
  DASHBOARD("dashboard.feature.enabled"),
  LOBBIES("lobbies.feature.enabled"),
  CALENDARS("calendars.feature.enabled"),
  TASKS("tasks.feature.enabled"),
  NOTIFICATIONS("notifications.feature.enabled"),
  SETTINGS("settings.feature.enabled"),
  SUBSCRIPTIONS("subscriptions.feature.enabled");

  private final String value;

  FeatureFlagKey(String value) {
    this.value = value;
  }

  /**
   * Returns the stable database and public-API key.
   *
   * @return stable feature-flag key
   */
  public String value() {
    return value;
  }
}
