package io.backend.lined.common.idempotency;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ConflictException;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class IdempotencyServiceTest {

  @Mock
  private IdempotencyRequestRepository repository;

  private IdempotencyService service;

  @BeforeEach
  void setUp() {
    service = new IdempotencyService(repository, new ObjectMapper());
  }

  @Test
  void claim_returnsWithoutKey_whenKeyIsAbsent() {
    assertThat(service.claim(IdempotencyOperation.TASK_CREATE, 42L, null, new Payload("task")))
        .isEqualTo(IdempotencyClaim.withoutKey());
  }

  @Test
  void claim_returnsReplay_whenExistingPayloadAndResourceMatch() {
    var request = IdempotencyRequestEntity.builder()
        .payloadHash(hashOf(new Payload("task")))
        .resourceId(55L)
        .build();
    when(repository.claim(42L, "TASK_CREATE", "retry-1", request.getPayloadHash())).thenReturn(0);
    when(repository.findByRequesterIdAndOperationAndIdempotencyKey(
        42L, IdempotencyOperation.TASK_CREATE, "retry-1")).thenReturn(Optional.of(request));

    assertThat(service.claim(IdempotencyOperation.TASK_CREATE, 42L, "retry-1", new Payload("task")))
        .isEqualTo(new IdempotencyClaim(true, "retry-1", 55L));
  }

  @Test
  void claim_throwsConflict_whenExistingKeyHasDifferentPayload() {
    var request = IdempotencyRequestEntity.builder().payloadHash("different").resourceId(55L).build();
    when(repository.claim(eq(42L), eq("TASK_CREATE"), eq("retry-1"), anyString())).thenReturn(0);
    when(repository.findByRequesterIdAndOperationAndIdempotencyKey(
        42L, IdempotencyOperation.TASK_CREATE, "retry-1")).thenReturn(Optional.of(request));

    assertThatThrownBy(() -> service.claim(
        IdempotencyOperation.TASK_CREATE, 42L, "retry-1", new Payload("task")))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("different request body");
  }

  @Test
  void claim_throwsBadRequest_whenKeyIsBlankOrTooLong() {
    assertThatThrownBy(() -> service.claim(
        IdempotencyOperation.TASK_CREATE, 42L, " ", new Payload("task")))
        .isInstanceOf(BadRequestException.class);
    assertThatThrownBy(() -> service.claim(IdempotencyOperation.TASK_CREATE, 42L,
        "a".repeat(256), new Payload("task"))).isInstanceOf(BadRequestException.class);
  }

  private String hashOf(Payload payload) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
          .digest(new ObjectMapper().writeValueAsBytes(payload)));
    } catch (Exception ex) {
      throw new AssertionError(ex);
    }
  }

  private record Payload(String title) { }
}
