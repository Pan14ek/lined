package io.backend.lined.config;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("prod")
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:production_exposure_test;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.sql.init.mode=never",
    "lined.security.jwt.secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    "lined.auth.reset-token-secret=production-exposure-test-secret"
})
class ProductionExposureMvcTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void publicHealth_returnsStatusWithoutComponentDetails() throws Exception {
    mockMvc.perform(get("/actuator/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(jsonPath("$.components").doesNotExist());
  }

  @Test
  void sensitiveActuatorEndpoints_areNotExposedInProduction() throws Exception {
    assertNotFound("/actuator/info");
    assertNotFound("/actuator/metrics");
    assertNotFound("/actuator/loggers");
    assertNotFound("/actuator/threaddump");
  }

  @Test
  void swaggerEndpoints_areNotExposedInProduction() throws Exception {
    assertNotFound("/swagger-ui.html");
    assertNotFound("/v3/api-docs");
  }

  private void assertNotFound(String path) throws Exception {
    mockMvc.perform(get(path).with(user("operator")))
        .andExpect(status().isNotFound());
  }
}
