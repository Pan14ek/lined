package io.backend.lined.user.domain;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {

  boolean existsByEmailIgnoreCase(String email);

  boolean existsByUsernameIgnoreCase(String username);

  Optional<UserEntity> findByEmailIgnoreCase(String email);

  Optional<UserEntity> findByUsernameIgnoreCase(String username);

  @EntityGraph(attributePaths = "roles")
  @Query("select u from UserEntity u where u.id = :id")
  Optional<UserEntity> findWithRolesById(@Param("id") Long id);

  @EntityGraph(attributePaths = {"subscriptions", "subscriptions.plan"})
  @Query("select u from UserEntity u where u.id = :id")
  Optional<UserEntity> findWithSubscriptionsById(@Param("id") Long id);

  @Query("""
         select u from UserEntity u
         where lower(u.username) like lower(concat('%', :q, '%'))
            or lower(u.email)    like lower(concat('%', :q, '%'))
      """)
  Page<UserEntity> searchLight(@Param("q") String q, Pageable pageable);

  @EntityGraph(attributePaths = "roles")
  @Query(value = """
        select u from UserEntity u
        where lower(u.username) like lower(concat('%', :q, '%'))
           or lower(u.email)    like lower(concat('%', :q, '%'))
      """,
      countQuery = """
            select count(u) from UserEntity u
            where lower(u.username) like lower(concat('%', :q, '%'))
               or lower(u.email)    like lower(concat('%', :q, '%'))
          """)
  Page<UserEntity> searchWithRoles(@Param("q") String q, Pageable pageable);
}
