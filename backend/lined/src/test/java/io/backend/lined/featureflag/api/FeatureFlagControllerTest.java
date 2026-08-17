package io.backend.lined.featureflag.api;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.featureflag.service.FeatureFlagService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class FeatureFlagControllerTest {

  @Mock
  private FeatureFlagService service;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(new FeatureFlagController(service)).build();
  }

  @Test
  void features_serializesExactlyThePublicFeatureCatalog() throws Exception {
    when(service.publicFlags()).thenReturn(publicFlags());

    mockMvc.perform(get("/api/features"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.flags").isMap())
        .andExpect(jsonPath("$.flags.length()").value(7))
        .andExpect(jsonPath("$.flags['dashboard.feature.enabled']").value(true))
        .andExpect(jsonPath("$.flags['lobbies.feature.enabled']").value(false))
        .andExpect(jsonPath("$.flags['calendars.feature.enabled']").value(true))
        .andExpect(jsonPath("$.flags['tasks.feature.enabled']").value(false))
        .andExpect(jsonPath("$.flags['notifications.feature.enabled']").value(true))
        .andExpect(jsonPath("$.flags['settings.feature.enabled']").value(false))
        .andExpect(jsonPath("$.flags['subscriptions.feature.enabled']").value(true))
        .andExpect(jsonPath("$.flags['internal.feature.enabled']").doesNotExist());

    verify(service).publicFlags();
  }

  private Map<String, Boolean> publicFlags() {
    Map<String, Boolean> flags = new LinkedHashMap<>();
    for (FeatureFlagKey key : FeatureFlagKey.values()) {
      flags.put(key.value(), key.ordinal() % 2 == 0);
    }
    return flags;
  }
}
