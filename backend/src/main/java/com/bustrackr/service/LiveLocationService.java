package com.bustrackr.service;

import com.bustrackr.dto.location.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public interface LiveLocationService {

    void deleteLatestLocation(Long tripId);

    Optional<LiveLocationResponse> getLatestLocation(Long tripId);

     LiveLocationResponse updateLatestLocation(CreateLocationHistoryRequest request, Long tripId, CalculatedLocation calculatedLocation);

    Optional<LiveLocationResponse> findLatestLocation(Long tripId);

    List<LiveBusLocationDto> getLiveBusLocations(List<Long> tripIds);

    void delegateTripStatus(TripStatusEvent event);
}