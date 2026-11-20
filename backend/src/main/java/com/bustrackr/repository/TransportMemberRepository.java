package com.bustrackr.repository;

import com.bustrackr.entity.TransportMember;
import com.bustrackr.enums.TransportMemberRole;
import com.bustrackr.enums.TransportMemberStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransportMemberRepository extends JpaRepository<TransportMember , Long>, JpaSpecificationExecutor<TransportMember> {

    boolean existsByUserIdAndTransportSystemIdAndStatus(
            Long userId,
            Long transportSystemId,
            TransportMemberStatus status
    );

    boolean existsByUserIdAndTransportSystemId(Long userId, Long transportSystemId);

    TransportMember findByUserIdAndTransportSystemId(Long userId, Long transportSystemId);

    Page<TransportMember> findByTransportSystemIdAndStatus(Long transportSystemId, TransportMemberStatus transportMemberStatus, Pageable pageable);

    Optional<TransportMember> findByIdAndTransportSystemId(Long id, Long transportSystemId);

    Page<TransportMember> findAllByTransportSystemIdOrderByRole(Long transportSystemId, Pageable pageable);

    @Query("""
    SELECT DISTINCT tm.transportSystem.id
    FROM TransportMember tm
    WHERE tm.user.id = :userId
""")
    List<Long> findDistinctTransportSystemIdByUserId(
            @Param("userId") Long userId
    );

    @Query("""
    SELECT COUNT(tm)
    FROM TransportMember tm
    WHERE tm.transportSystem.id = :transportSystemId
      AND tm.status = :status
""")
    Long getCountByTransportSystemIdAndStatus(Long transportSystemId, TransportMemberStatus status);

    @Query("""
    SELECT tm.id
    FROM TransportMember tm
    WHERE tm.transportSystem.id = :transportSystemId
      AND tm.role = :role
      AND tm.active= :active
""")
    List<Long> getIdByTransportSystemIdAndRoleAndActive(@Param("transportSystemId") Long transportSystemId,@Param("role") TransportMemberRole role,@Param("active")boolean active);

    Page<TransportMember> findByTransportSystemId(Long transportSystemId, Pageable pageable);

}
