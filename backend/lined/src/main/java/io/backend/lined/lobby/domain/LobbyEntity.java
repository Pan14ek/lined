package io.backend.lined.lobby.domain;

import io.backend.lined.user.domain.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "lobbies")
public class LobbyEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @ToString.Include
  @Column(length = 64, nullable = false)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(name = "lobby_type", nullable = false, length = 16)
  private LobbyTypes lobbyType;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "owner_id", nullable = false)
  private UserEntity owner;

  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(
      name = "lobby_members",
      joinColumns = @JoinColumn(name = "lobby_id"),
      inverseJoinColumns = @JoinColumn(name = "user_id")
  )
  private Set<UserEntity> members;

}
