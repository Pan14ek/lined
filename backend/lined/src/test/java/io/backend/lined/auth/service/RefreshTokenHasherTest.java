package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.lang.reflect.Field;
import org.junit.jupiter.api.Test;

class RefreshTokenHasherTest {

  private final RefreshTokenHasher hasher = new RefreshTokenHasher();

  @Test
  void hash_returnsDeterministicSha256HexWithoutPersistingRawTokenField() {
    String rawToken = "opaque-refresh-token";

    String hash = hasher.hash(rawToken);

    assertThat(hash).isEqualTo("862f58013a2bd2d34eba271c56252c0e69b4715133aea31b0d0ebbb1470c3d6e");
    assertThat(hash).hasSize(64).isNotEqualTo(rawToken);
    assertThat(java.util.Arrays.stream(
        io.backend.lined.auth.domain.AuthRefreshTokenEntity.class.getDeclaredFields())
        .map(Field::getName))
        .doesNotContain("rawToken", "refreshToken");
  }

  @Test
  void hash_rejectsBlankCredential() {
    assertThatIllegalArgumentException().isThrownBy(() -> hasher.hash(" "));
  }
}
