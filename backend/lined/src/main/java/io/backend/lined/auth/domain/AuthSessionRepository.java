package io.backend.lined.auth.domain;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Persistence boundary for independently revocable authentication sessions. */
@Repository
public interface AuthSessionRepository extends JpaRepository<AuthSessionEntity, UUID> {
}
