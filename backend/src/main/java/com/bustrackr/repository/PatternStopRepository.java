package com.bustrackr.repository;

import com.bustrackr.dto.routepattern.RouteStopCoordinate;
import com.bustrackr.entity.PatternStop;
import com.bustrackr.projection.PatternStopProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface PatternStopRepository extends JpaRepository<PatternStop,Long> {

    List<PatternStop> findByRoutePatternIdOrderBySequenceAsc(Long routePatternId);

    PatternStop findByRoutePatternIdAndSequence(Long routePatternId, Long currentStop);

    @Query("""
    SELECT DISTINCT ps.routePattern.id
    FROM PatternStop ps
    WHERE ps.stop.id = :stopId
""")
    Set<Long> findDistinctRoutePatternIdsByStopId(@Param("stopId") Long stopId);

    boolean existsByStopId(Long id);

    @Query("""
    SELECT new com.bustrackr.projection.PatternStopProjection(ps.sequence,ps.stop.latitude,ps.stop.longitude)
    FROM PatternStop ps
    WHERE ps.routePattern.id= :routePatternId
    ORDER BY ps.sequence
    ASC
    """)
    List<PatternStopProjection> getPatternStopCoordinatesByRoutePatternId(@Param("routePatternId") Long routePatternId);

    @Query("""
    SELECT ps
    FROM PatternStop ps
    WHERE ps.routePattern.id= :routePatternId
    AND ps.sequence= :sequence
    """)
    Optional<PatternStop> getByRoutePatternIdAndSequence(@Param("routePatternId") Long routePatternId,@Param("sequence") Integer sequence);

    @Query("""
    SELECT new com.bustrackr.dto.routepattern.RouteStopCoordinate(ps.sequence,ps.stop.longitude,ps.stop.latitude)
    FROM PatternStop ps
    WHERE ps.routePattern.id= :id
    ORDER BY ps.sequence ASC
    """)
    List<RouteStopCoordinate> findStopByRoutePatternId(@Param("id") Long id);
}
