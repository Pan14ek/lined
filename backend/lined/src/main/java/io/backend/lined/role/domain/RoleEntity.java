package io.backend.lined.role.domain;

import io.backend.lined.user.domain.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.util.HashSet;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.BatchSize;

@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "roles",
    indexes = @Index(name = "uq_roles_name_nocase", columnList = "name", unique = true))
public class RoleEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private long id;

  @ToString.Include
  @Column(length = 50, nullable = false)
  private String name;

  @Builder.Default
  @ManyToMany(mappedBy = "roles", fetch = FetchType.LAZY)
  @ToString.Exclude
  @BatchSize(size = 50)
  private Set<UserEntity> users = new HashSet<>();

  @PrePersist
  @PreUpdate
  void normalize() {
    if (name != null) {
      name = name.trim();
    }
  }
}
