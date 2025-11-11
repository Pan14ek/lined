package io.backend.lined.lobby.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LobbyRepository extends JpaRepository<LobbyEntity, Long> {

  List<LobbyEntity> findAllByOwner_Id(Long ownerId);

  @Query("SELECT l FROM LobbyEntity l JOIN l.members m WHERE m.id = :userId")
  List<LobbyEntity> findAllByMemberId(@Param("userId") Long userId);

}
