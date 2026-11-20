package com.bustrackr.repository;

import com.bustrackr.entity.Trip;
import com.bustrackr.entity.TripSchedule;
import com.bustrackr.enums.TripScheduleStatus;
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

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface TripScheduleRepository extends JpaRepository<TripSchedule,Long> , JpaSpecificationExecutor<TripSchedule> {

    Page<TripSchedule> findByDriverIdAndTransportSystemIdAndScheduleStatus(Long driverId, Long transportSystemId, TripScheduleStatus tripScheduleStatus, Pageable pageable);

     @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<TripSchedule> findByIdAndDriverIdAndTransportSystemIdAndScheduleStatus(Long id, Long driverId, Long transportSystemId,TripScheduleStatus scheduleStatus);

    @Lock(LockModeType.PESSIMISTIC_READ)
      @Query("""
    SELECT ts
    FROM TripSchedule ts
    WHERE ts.routePattern.id IN:routePatternIds
        AND ts.scheduleStatus=:status
        AND :currentDay MEMBER OF ts.operatingDays
""")
    List<TripSchedule> findByRoutePatternIdAndStatus(
            @Param("routePatternIds") Set<Long> routePatternIds,
            @Param("status") TripScheduleStatus status,
            @Param("currentDay") DayOfWeek currentDay);

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("""
    SELECT ts
    FROM TripSchedule ts
    WHERE ts.routePattern.id IN :routePatternIds
      AND ts.scheduleStatus = :status
      AND :currentDay MEMBER OF ts.operatingDays
      AND ts.scheduledStartTime <= :endTime
      AND ts.scheduledEndTime >= :startTime
""")
    List<TripSchedule> findAvailableSchedules(
            @Param("routePatternIds") Set<Long> routePatternIds,
            @Param("status") TripScheduleStatus status,
            @Param("currentDay") DayOfWeek currentDay,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );


@Lock(LockModeType.PESSIMISTIC_READ)
    @Query("""
    SELECT ts FROM TripSchedule ts
    WHERE ts.transportSystem.id = :transportSystemId
      AND ts.scheduleStatus = :status
      AND (ts.driver.id = :driverId OR ts.bus.id = :busId)
""")
    List<TripSchedule> findPotentialConflicts(
            @Param("transportSystemId") Long transportSystemId,
            @Param("driverId") Long driverId,
            @Param("busId") Long busId,
            @Param("status") TripScheduleStatus status
    );

    @Query("""
    SELECT COUNT(ts)
    FROM TripSchedule ts
    WHERE ts.transportSystem.id=:transportSystemId
      AND :today MEMBER OF ts.operatingDays
""")
    Long getCountByTransportSystemId(Long transportSystemId, DayOfWeek today);
}
