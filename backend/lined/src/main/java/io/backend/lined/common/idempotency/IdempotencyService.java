package io.backend.lined.common.idempotency;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ConflictException;
import jakarta.transaction.Transactional;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Persists optional request keys so a client can safely retry a timed-out create request.
 *
 * <p>For example, two task requests by user {@code 42} with key {@code retry-1} compete for one
 * database row. The winner creates the task; the other transaction reads that completed row and
 * returns the same task rather than inserting another one.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class IdempotencyService {

  static final int MAX_KEY_LENGTH = 255;

  private final IdempotencyRequestRepository repository;
  private final ObjectMapper objectMapper;

  public IdempotencyClaim claim(IdempotencyOperation operation, Long requesterId,
                                String rawKey, Object payload) {
    String key = normalizeKey(rawKey);
    if (key == null) {
      return IdempotencyClaim.withoutKey();
    }
    String payloadHash = hash(payload);
    if (repository.claim(requesterId, operation.name(), key, payloadHash) == 1) {
      return new IdempotencyClaim(false, key, null);
    }
    var request = EntityFinder.findOrThrow(
        repository.findByRequesterIdAndOperationAndIdempotencyKey(requesterId, operation, key),
        () -> new ConflictException("IDEMPOTENCY_REQUEST_UNAVAILABLE",
            "Idempotency request could not be loaded"));
    if (!request.getPayloadHash().equals(payloadHash)) {
      throw new ConflictException("IDEMPOTENCY_KEY_PAYLOAD_MISMATCH",
          "Idempotency-Key was already used with a different request body");
    }
    if (request.getResourceId() == null) {
      throw new ConflictException("IDEMPOTENCY_REQUEST_IN_PROGRESS",
          "Idempotency-Key is still being processed");
    }
    return new IdempotencyClaim(true, key, request.getResourceId());
  }

  public void complete(IdempotencyOperation operation, Long requesterId,
                       IdempotencyClaim claim, Long resourceId) {
    if (claim.idempotencyKey() == null) {
      return;
    }
    var request = EntityFinder.findOrThrow(
        repository.findByRequesterIdAndOperationAndIdempotencyKey(
            requesterId, operation, claim.idempotencyKey()),
        () -> new ConflictException("IDEMPOTENCY_REQUEST_UNAVAILABLE",
            "Idempotency request could not be completed"));
    request.setResourceId(resourceId);
  }

  private String normalizeKey(String rawKey) {
    if (rawKey == null) {
      return null;
    }
    if (rawKey.isBlank() || rawKey.length() > MAX_KEY_LENGTH) {
      throw new BadRequestException("Idempotency-Key must contain 1 through 255 characters");
    }
    return rawKey;
  }

  private String hash(Object payload) {
    try {
      byte[] json = objectMapper.writeValueAsBytes(payload);
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json));
    } catch (JsonProcessingException ex) {
      throw new IllegalStateException("Idempotency request body cannot be serialized", ex);
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 is unavailable", ex);
    }
  }
}
