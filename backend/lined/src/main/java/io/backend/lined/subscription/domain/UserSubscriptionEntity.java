package io.backend.lined.subscription.domain;

import io.backend.lined.plan.domain.PlanEntity;
import io.backend.lined.user.domain.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.Check;

@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "user_subscriptions",
    indexes = {
        @Index(name = "idx_user_sub_user_active", columnList = "user_id, is_active"),
        @Index(name = "idx_user_sub_dates", columnList = "user_id, start_date")
    }
)
@Check(constraints = "end_date IS NULL OR end_date >= start_date")
public class UserSubscriptionEntity {

  @Id
  @EqualsAndHashCode.Include
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  @ToString.Exclude
  private UserEntity user;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "plan_id", nullable = false)
  @ToString.Exclude
  private PlanEntity plan;

  @Builder.Default
  @Column(name = "start_date", nullable = false)
  private OffsetDateTime startDate = OffsetDateTime.now();

  @Column(name = "end_date")
  private OffsetDateTime endDate;

  @Builder.Default
  @Column(name = "is_active", nullable = false)
  private boolean isActive = true;

  @Builder.Default
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @PrePersist
  void prePersist() {
    if (startDate == null) {
      startDate = OffsetDateTime.now();
    }
    if (createdAt == null) {
      createdAt = OffsetDateTime.now();
    }
  }
}
