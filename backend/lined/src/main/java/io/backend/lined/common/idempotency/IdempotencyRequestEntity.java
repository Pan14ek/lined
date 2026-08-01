package io.backend.lined.common.idempotency;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "idempotency_requests")
public class IdempotencyRequestEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @Column(nullable = false)
  private Long requesterId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private IdempotencyOperation operation;

  @Column(nullable = false, length = 255)
  private String idempotencyKey;

  @Column(nullable = false, length = 64)
  private String payloadHash;

  private Long resourceId;

  @Column(nullable = false, updatable = false)
  private OffsetDateTime createdAt;
}
