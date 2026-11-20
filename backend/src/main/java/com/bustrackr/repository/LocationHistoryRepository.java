package com.bustrackr.repository;

import com.bustrackr.entity.LocationHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LocationHistoryRepository extends JpaRepository<LocationHistory,Long> {

    Page<LocationHistory> findLocationHistoryByTripId(Long tripId, Pageable pageable);
}
