package io.backend.lined.ratelimit;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Validated local rate-limit configuration. */
@Getter
@Setter
@Validated
@ConfigurationProperties("lined.rate-limit")
public class RateLimitProperties {

  private boolean enabled = true;
  @NotBlank
  private String store = "local";
  private boolean singleReplicaRequired = true;
  @Min(1)
  private int maxKeys = 50_000;
  private Duration keyTtl = Duration.ofHours(2);
  @NotBlank
  @Size(min = 32)
  private String keySecret;
  @NotEmpty
  private List<String> trustedProxies = new ArrayList<>(List.of("127.0.0.1/32", "::1/128"));
  private Map<String, PolicyProperties> policies = new LinkedHashMap<>();

  public RateLimitProperties() {
    policies.put("login-ip", new PolicyProperties(30, Duration.ofMinutes(5)));
    policies.put("login-failed-identifier", new PolicyProperties(10, Duration.ofMinutes(15)));
    policies.put("register-ip", new PolicyProperties(5, Duration.ofHours(1)));
    policies.put("reset-request-ip", new PolicyProperties(10, Duration.ofHours(1)));
    policies.put("reset-delivery-identifier", new PolicyProperties(3, Duration.ofHours(1)));
    policies.put("reset-redeem-ip", new PolicyProperties(10, Duration.ofMinutes(15)));
    policies.put("refresh-ip", new PolicyProperties(120, Duration.ofMinutes(5)));
    policies.put("refresh-session", new PolicyProperties(30, Duration.ofMinutes(5)));
    policies.put("logout-ip", new PolicyProperties(120, Duration.ofMinutes(5)));
    policies.put("csrf-ip", new PolicyProperties(300, Duration.ofMinutes(5)));
  }

  public RateLimitPolicy policy(String name) {
    PolicyProperties policy = policies.get(name);
    if (policy == null) {
      throw new IllegalArgumentException("Missing rate-limit policy: " + name);
    }
    return new RateLimitPolicy(name, policy.getCapacity(), policy.getPeriod());
  }

  @AssertTrue(message = "rate-limit store must be local")
  boolean usesSupportedStore() {
    return "local".equals(store);
  }

  @AssertTrue(message = "rate-limit keyTtl must exceed every policy period")
  boolean retainsBucketsForPolicyHorizon() {
    if (keyTtl == null || policies == null) {
      return false;
    }
    return policies.values().stream()
        .allMatch(policy -> policy != null && policy.getPeriod() != null
            && !policy.getPeriod().isNegative() && keyTtl.compareTo(policy.getPeriod()) >= 0);
  }

  /** Nested binding type intentionally keeps the public configuration flat and reviewable. */
  @Getter
  @Setter
  public static class PolicyProperties {

    private long capacity;
    private Duration period;

    public PolicyProperties() {
    }

    public PolicyProperties(long capacity, Duration period) {
      this.capacity = capacity;
      this.period = period;
    }
  }
}
