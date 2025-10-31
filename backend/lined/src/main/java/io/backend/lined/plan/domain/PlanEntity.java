package io.backend.lined.plan.domain;

import io.backend.lined.subscription.domain.UserSubscriptionEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "plans",
    indexes = @Index(name = "uq_plans_name_nocase", columnList = "name", unique = true))
public class PlanEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;

  @Column(length = 50, nullable = false, unique = true)
  private String name;

  @Column(name = "price_usd", precision = 10, scale = 2, nullable = false)
  private BigDecimal priceUsd = BigDecimal.ZERO;

  @Column(name = "duration_days", nullable = false)
  private int durationDays = 30;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
  private Set<UserSubscriptionEntity> subscriptions = new HashSet<>();

}
