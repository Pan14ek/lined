package io.backend.lined.auth.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Persistence boundary for hashed refresh-token history. */
@Repository
public interface AuthRefreshTokenRepository extends JpaRepository<AuthRefreshTokenEntity, UUID> {

  /**
   * Finds token history by its SHA-256 representation without accepting a raw credential.
   *
   * @param tokenHash fixed-width SHA-256 hash of a presented opaque token
   * @return token history when the hash is known
   */
  Optional<AuthRefreshTokenEntity> findByTokenHash(String tokenHash);
}
