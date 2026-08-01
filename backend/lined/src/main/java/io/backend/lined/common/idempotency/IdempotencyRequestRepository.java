package io.backend.lined.common.idempotency;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface IdempotencyRequestRepository extends JpaRepository<IdempotencyRequestEntity, Long> {

  @Modifying(flushAutomatically = true)
  @Query(value = """
      INSERT INTO idempotency_requests
          (requester_id, operation, idempotency_key, payload_hash, created_at)
      VALUES (:requesterId, :operation, :idempotencyKey, :payloadHash, CURRENT_TIMESTAMP)
      ON CONFLICT (requester_id, operation, idempotency_key) DO NOTHING
      """, nativeQuery = true)
  int claim(@Param("requesterId") Long requesterId, @Param("operation") String operation,
            @Param("idempotencyKey") String idempotencyKey, @Param("payloadHash") String payloadHash);

  Optional<IdempotencyRequestEntity> findByRequesterIdAndOperationAndIdempotencyKey(
      Long requesterId, IdempotencyOperation operation, String idempotencyKey);
}
