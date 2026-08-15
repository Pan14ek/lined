package io.backend.lined;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.notification.service.ReminderScheduler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class LinedBackendApplicationTests {

  @Autowired
  private ApplicationContext applicationContext;

  @Test
  void contextLoads() {
  }

  @Test
  void contextLoads_withoutReminderScheduler() {
    assertThat(applicationContext.getBeansOfType(ReminderScheduler.class)).isEmpty();
  }

}
