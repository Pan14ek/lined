package io.backend.lined.auth.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {

  Optional<PasswordResetTokenEntity> findByTokenHashAndUsedAtIsNull(String tokenHash);

  List<PasswordResetTokenEntity> findAllByUser_IdAndUsedAtIsNull(Long userId);
}
