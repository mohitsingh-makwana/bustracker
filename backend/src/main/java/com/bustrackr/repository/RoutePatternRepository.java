package com.bustrackr.repository;

import com.bustrackr.entity.RoutePattern;
import com.bustrackr.projection.RoutePatternFilterDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;


@Repository
public interface RoutePatternRepository extends JpaRepository<RoutePattern,Long> , JpaSpecificationExecutor<RoutePattern> {

    @Query("SELECT rp.id FROM RoutePattern rp WHERE rp.route.id = :routeId")
    Set<Long> findIdsByRouteId(@Param("routeId") Long routeId);

    @Query("""
    SELECT new com.bustrackr.projection.RoutePatternFilterDetails(rp.id,rp.name)
    FROM RoutePattern rp
    WHERE rp.route.id IN :routeIds
    AND rp.active =:b
    """)
    List<RoutePatternFilterDetails> getRoutePatternFilterByTransportSystemId(@Param("routeIds") List<Long> routeIds,@Param("b") boolean b);
}
