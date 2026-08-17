package io.backend.lined.featureflag.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;

class FeatureFlagStartupLoaderTest {

  @Test
  void run_permitsStartupWhenRefreshReportsFailure() {
    FeatureFlagService service = mock(FeatureFlagService.class);
    when(service.refresh()).thenReturn(false);
    var loader = new FeatureFlagStartupLoader(service);

    loader.run(new DefaultApplicationArguments());

    verify(service).refresh();
  }
}
