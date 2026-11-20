package com.bustrackr.repository;

import com.bustrackr.entity.Stop;
import com.bustrackr.enums.StopStatus;
import com.bustrackr.projection.StopFilterDetails;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StopRepository extends JpaRepository<Stop,Long>, JpaSpecificationExecutor<Stop> {

    Optional<Stop> findByIdAndTransportSystemId(@NotNull(message = "Origin stop id is required") Long aLong, Long currentTransportSystemId);

    @Query("""
    SELECT new com.bustrackr.projection.StopFilterDetails(r.id,r.name)
    FROM Stop r
    WHERE r.transportSystem.id =:currentTransportSystemId
    AND r.status=:status
    AND r.active=:b
""")
    List<StopFilterDetails> getTransportSystemStops(@Param("currentTransportSystemId") Long transportSystemId,
                                                      @Param("status") StopStatus status,
                                                      @Param("b") boolean b);

}
