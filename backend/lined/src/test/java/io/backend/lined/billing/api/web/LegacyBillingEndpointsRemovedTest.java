package io.backend.lined.billing.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LegacyBillingEndpointsRemovedTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void retiredSubscriptionAndPlanWriteRoutesReturnNotFound() throws Exception {
    mockMvc.perform(post("/api/subscriptions").with(user("billing-user")))
        .andExpect(status().isNotFound());
    mockMvc.perform(post("/api/subscriptions/17/cancel-active").with(user("billing-user")))
        .andExpect(status().isNotFound());
    mockMvc.perform(get("/api/subscriptions/17/active").with(user("billing-user")))
        .andExpect(status().isNotFound());
    mockMvc.perform(get("/api/subscriptions/17/history").with(user("billing-user")))
        .andExpect(status().isNotFound());
    mockMvc.perform(post("/api/plans").with(user("billing-user")))
        .andExpect(status().isNotFound());
    mockMvc.perform(put("/api/plans/1").with(user("billing-user")))
        .andExpect(status().isNotFound());
    mockMvc.perform(delete("/api/plans/1").with(user("billing-user")))
        .andExpect(status().isNotFound());
  }
}
