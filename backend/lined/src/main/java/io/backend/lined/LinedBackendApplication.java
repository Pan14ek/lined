package io.backend.lined;

import java.time.Clock;
import java.time.ZoneId;
import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class LinedBackendApplication {

  public static void main(String[] args) {
    TimeZone.setDefault(TimeZone.getTimeZone(ZoneId.of("UTC")));
    SpringApplication.run(LinedBackendApplication.class, args);
  }

  /**
   * Provides the application clock used by time-sensitive services.
   *
   * <p>The clock is deliberately UTC so reminder processing is deterministic across Kubernetes
   * replicas. For example, a task due reminder becomes eligible at {@code 08:00 UTC} regardless
   * of the host machine's local timezone. Tests replace this bean with a fixed clock.</p>
   *
   * @return the production UTC clock
   */
  @Bean
  public Clock clock() {
    return Clock.systemUTC();
  }

}
