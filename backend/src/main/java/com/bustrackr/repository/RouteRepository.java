package com.bustrackr.repository;

import com.bustrackr.projection.RouteCountResponse;
import com.bustrackr.entity.Route;
import com.bustrackr.enums.RouteStatus;
import com.bustrackr.projection.RouteFilterDetails;
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
public interface RouteRepository extends JpaRepository<Route,Long> , JpaSpecificationExecutor<Route> {
    @Query("""
    SELECT new com.bustrackr.projection.RouteCountResponse(
        ts.id,
        COUNT(r)
    )
    FROM TransportSystem ts
    LEFT JOIN Route r ON r.transportSystem.id = ts.id
    GROUP BY ts.id
""")
    List<RouteCountResponse> findRouteCounts();

    @Query("""
    SELECT r.id
    FROM Route r
    WHERE r.transportSystem.id =:currentTransportSystemId
""")
    List<Long> findIdByTransportSystemId(@Param("currentTransportSystemId") Long currentTransportSystemId);

    @Query("""
    SELECT new com.bustrackr.projection.RouteFilterDetails(r.id,r.name)
    FROM Route r
    WHERE r.transportSystem.id =:currentTransportSystemId
    AND r.status=:routeStatus
    AND r.active=:b
""")
    List<RouteFilterDetails> getTransportSystemRoutes(@Param("currentTransportSystemId") Long transportSystemId,
                                                      @Param("routeStatus") RouteStatus routeStatus,
                                                      @Param("b") boolean b);
}
