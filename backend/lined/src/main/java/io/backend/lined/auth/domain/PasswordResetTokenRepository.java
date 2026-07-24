package io.backend.lined.auth.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {

  Optional<PasswordResetTokenEntity> findByTokenHashAndUsedAtIsNull(String tokenHash);

  Optional<PasswordResetTokenEntity> findByTokenHash(String tokenHash);

  List<PasswordResetTokenEntity> findAllByUser_IdAndUsedAtIsNull(Long userId);

  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query("""
      update PasswordResetTokenEntity token
         set token.usedAt = :usedAt
       where token.tokenHash = :tokenHash
         and token.usedAt is null
         and token.expiresAt > :now
      """)
  int claimUnusedUnexpired(
      @Param("tokenHash") String tokenHash,
      @Param("now") OffsetDateTime now,
      @Param("usedAt") OffsetDateTime usedAt);
}
