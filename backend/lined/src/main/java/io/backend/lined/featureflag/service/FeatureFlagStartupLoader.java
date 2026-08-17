package io.backend.lined.featureflag.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Loads the first feature-flag snapshot without preventing application startup on database failure.
 */
@Component
@RequiredArgsConstructor
public class FeatureFlagStartupLoader implements ApplicationRunner {

  private final FeatureFlagService featureFlagService;

  @Override
  public void run(ApplicationArguments args) {
    featureFlagService.refresh();
  }
}
