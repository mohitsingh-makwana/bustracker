package com.bustrackr.repository;

import com.bustrackr.entity.Driver;
import com.bustrackr.enums.DriverStatus;
import com.bustrackr.projection.DriverFilterDetails;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Driver,Long>, JpaSpecificationExecutor<Driver> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Driver> findByIdAndStatus(Long Long, DriverStatus status);

    Optional<Driver> findByIdAndTransportMemberId(Long id, Long transportMemberId);

    @Query("""
    SELECT COUNT(d)
    FROM Driver d
    WHERE d.transportMember.id IN :memberIds
    AND d.status =:driverStatus
""")
    Long getCountByTransportSystemIdAndStatus(@Param("memberIds")List<Long> transportMemberIds, @Param("driverStatus") DriverStatus driverStatus);

    @Query("""
    SELECT new com.bustrackr.projection.DriverFilterDetails(d.id,d.name)
    FROM Driver d
    WHERE d.transportMember.id IN :memberIds
""")
    List<DriverFilterDetails> getDriverFilterByTransportSystemId(@Param("memberIds") List<Long> memberIds);
}
