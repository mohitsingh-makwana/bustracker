package com.bustrackr.repository;

import com.bustrackr.entity.Trip;
import com.bustrackr.enums.TripStatus;
import com.bustrackr.projection.ActiveTripsCountResponse;
import com.bustrackr.projection.TripStatusCountResponse;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.web.bind.annotation.PathVariable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface TripRepository extends JpaRepository<Trip,Long>, JpaSpecificationExecutor<Trip> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Trip> findByDriverIdAndTransportSystemIdAndStatus(Long driverId, Long transportSystemId, TripStatus tripStatus);


    @Lock(LockModeType.PESSIMISTIC_READ)
    Page<Trip> findPageByDriverIdAndTransportSystemIdAndStatus(Long driverId, Long transportSystemId, TripStatus tripStatus, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_READ)
    Page<Trip> getTripByDriverIdAndTransportSystemIdAndStatusIn(Long driverId, Long transportSystemId, List<TripStatus> statuses, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Trip> findByIdAndDriverIdAndTransportSystemIdAndStatus(Long id, Long driverId, Long transportSystemId, TripStatus tripStatus);

      @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("""
    SELECT t FROM Trip t
    WHERE t.routePattern.id IN :routePatternIds
    AND t.status IN :statuses
""")
    List<Trip> findByRoutePatternsAndStatuses(
            @Param("routePatternIds") Set<Long> routePatternIds,
            @Param("statuses") Set<TripStatus> statuses
    );

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("""
    SELECT t
    FROM Trip t
    WHERE t.routePattern.id IN :routePatternIds
      AND t.status IN :statuses
      AND t.scheduledStartTime <= :endDateTime
      AND t.scheduledEndTime >= :startDateTime
""")
    List<Trip> findAvailableTrips(
            @Param("routePatternIds") Set<Long> routePatternIds,
            @Param("statuses") Set<TripStatus> statuses,
            @Param("startDateTime") LocalDateTime startDateTime,
            @Param("endDateTime") LocalDateTime endDateTime
    );


    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("""
    SELECT t FROM Trip t
    WHERE t.transportSystem.id = :transportSystemId
      AND t.status IN :statuses
      AND (t.driver.id = :driverId OR t.bus.id = :busId)
""")
    List<Trip> findPotentialConflicts(
            @Param("transportSystemId") Long transportSystemId,
            @Param("driverId") Long driverId,
            @Param("busId") Long busId,
            @Param("statuses") Set<TripStatus> statuses
    );

    @Query("""
    SELECT new com.bustrackr.projection.ActiveTripsCountResponse(
        ts.id,
        COUNT(t)
    )
    FROM TransportSystem ts
    LEFT JOIN Trip t ON t.transportSystem.id = ts.id
        AND t.status = :status
    GROUP BY ts.id
""")
    List<ActiveTripsCountResponse> findTripCountsByStatus(@Param("status") TripStatus status);

    @Query("""
    SELECT new com.bustrackr.projection.TripStatusCountResponse(
    t.status,
    COUNT(t)
    )
    FROM Trip t
    WHERE t.transportSystem.id=:transportSystemId
    AND t.scheduledStartTime>= :startTime
    AND t.scheduledEndTime<= :endTime
    GROUP BY t.status
""")
    List<TripStatusCountResponse> findTripCountByTransportSystemIdAndStatusAndToday(@Param("transportSystemId") Long transportSystemId,
                                                                                    @Param("startTime") LocalDateTime startTime,
                                                                                    @Param("endTime") LocalDateTime endTime);

    Optional<Trip> findByIdAndTransportSystemIdAndStatus(Long id, Long transportSystemId, TripStatus tripStatus);

    @Query("""
    SELECT t.id
    FROM Trip t
    WHERE t.transportSystem.id=:transportSystemId
    AND t.status=:tripStatus
""")
    List<Long> getIdByTransportSystemIdAndStatus(@Param("transportSystemId") Long transportSystemId,
                                                 @Param("tripStatus") TripStatus tripStatus);

    @Query("select distinct t.transportSystem.id from Trip t where t.status = :status")
    List<Long> findTransportSystemIdsWithActiveTrips(@Param("status") TripStatus status);
}