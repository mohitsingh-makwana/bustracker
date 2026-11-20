package com.bustrackr.repository;

import com.bustrackr.entity.Bus;
import com.bustrackr.enums.BusStatus;
import com.bustrackr.projection.BusFilterDetails;
import com.bustrackr.projection.BusStatusCountResponse;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusRepository extends JpaRepository<Bus,Long> , JpaSpecificationExecutor<Bus> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Bus> findByIdAndStatusAndTransportSystemId(Long id, BusStatus status,Long transportSystemId);

    @Query("""
    SELECT new com.bustrackr.projection.BusStatusCountResponse(
        b.status,
        COUNT(b)
    )
    FROM Bus b
    WHERE b.transportSystem.id = :transportSystemId
    GROUP BY b.status
""")
    List<BusStatusCountResponse> getCountByTransportSystemIdAndStatus(@Param("transportSystemId") Long transportSystemId);

    @Query("""
    SELECT new com.bustrackr.projection.BusFilterDetails(b.id,b.busNumber)
    FROM Bus b
    WHERE b.transportSystem.id = :transportSystemId
""")
    List<BusFilterDetails> getBusFilterByTransportSystemId(Long transportSystemId);
}
