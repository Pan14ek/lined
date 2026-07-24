package io.backend.lined.task.domain;

import io.backend.lined.lobby.domain.LobbyEntity;
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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Persisted lobby task, including the date for which its due reminder was processed.
 *
 * <p>For example, after a task due on 2026-07-25 receives its morning reminder,
 * {@code dueReminderSentForDate} is 2026-07-25; moving it to the next day naturally permits a
 * new occurrence without clearing historical state.</p>
 */
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "tasks")
public class TaskEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @Version
  @Column(nullable = false)
  private long version;

  @Column(nullable = false, length = 160)
  private String title;

  @Column(length = 1000)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private TaskPriority priority;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private TaskStatus status;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "lobby_id", nullable = false)
  private LobbyEntity lobby;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "creator_id", nullable = false)
  private UserEntity creator;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "assignee_id")
  private UserEntity assignee;

  private LocalDate dueDate;

  private LocalDate dueReminderSentForDate;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) {
      createdAt = OffsetDateTime.now();
    }
    if (status == null) {
      status = TaskStatus.TODO;
    }
    if (priority == null) {
      priority = TaskPriority.MEDIUM;
    }
  }

}
