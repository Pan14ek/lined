package io.backend.lined.ratelimit;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

  private static final Set<String> REQUIRED_POLICIES = Set.of(
      "login-ip", "login-failed-identifier", "register-ip", "reset-request-ip",
      "reset-delivery-identifier", "reset-redeem-ip", "refresh-ip", "refresh-session",
      "logout-ip", "csrf-ip");

  private boolean enabled = true;
  @NotBlank
  private String store = "local";
  private boolean singleReplicaRequired = true;
  @Min(1)
  private int maxKeys = 50_000;
  @NotNull
  private Duration keyTtl = Duration.ofHours(2);
  @NotBlank
  @Size(min = 32)
  private String keySecret;
  @NotEmpty
  private List<String> trustedProxies = new ArrayList<>(List.of("127.0.0.1/32", "::1/128"));
  @NotEmpty
  @Valid
  private Map<String, PolicyProperties> policies = new LinkedHashMap<>();

  /** Creates the documented default local policies. */
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

  /** Returns the validated policy identified by its internal allowlisted name.
   *
   * @param name internal policy name
   * @return token-bucket policy for the requested name
   * @throws IllegalArgumentException when the configured policy is missing
   */
  public RateLimitPolicy policy(String name) {
    PolicyProperties policy = policies.get(name);
    if (policy == null) {
      throw new IllegalArgumentException("Missing rate-limit policy: " + name);
    }
    return new RateLimitPolicy(name, policy.getCapacity(), policy.getPeriod());
  }

  /** Validates that only the implemented local store is selected. */
  @AssertTrue(message = "rate-limit store must be local")
  public boolean isSupportedStore() {
    return "local".equals(store);
  }

  /** Validates that the cache retains every policy bucket for its refill horizon. */
  @AssertTrue(message = "rate-limit keyTtl must exceed every policy period")
  public boolean isBucketRetentionValid() {
    if (keyTtl == null || policies == null) {
      return false;
    }
    return policies.values().stream()
        .allMatch(policy -> policy != null && policy.getPeriod() != null
            && !policy.getPeriod().isNegative() && !policy.getPeriod().isZero()
            && keyTtl.compareTo(policy.getPeriod()) >= 0);
  }

  /** Validates that every runtime policy required by the allowlist is configured. */
  @AssertTrue(message = "all required rate-limit policies must be configured")
  public boolean isRequiredPoliciesConfigured() {
    return policies != null && policies.keySet().containsAll(REQUIRED_POLICIES);
  }

  /** Nested binding type intentionally keeps the public configuration flat and reviewable. */
  @Getter
  @Setter
  public static class PolicyProperties {

    @Min(1)
    private long capacity;

    @NotNull
    private Duration period;

    /** Creates an empty binding target for Spring configuration properties. */
    public PolicyProperties() {
    }

    /** Creates one policy value for programmatic configuration and tests.
     *
     * @param capacity maximum burst size
     * @param period refill period
     */
    public PolicyProperties(long capacity, Duration period) {
      this.capacity = capacity;
      this.period = period;
    }

    /** Validates that a policy refills over a positive duration. */
    @AssertTrue(message = "rate-limit policy period must be positive")
    public boolean isPeriodPositive() {
      return period != null && !period.isNegative() && !period.isZero();
    }
  }
}
