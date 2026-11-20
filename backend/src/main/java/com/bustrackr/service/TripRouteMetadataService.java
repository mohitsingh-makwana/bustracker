package com.bustrackr.service;

import com.bustrackr.dto.trips.TripRouteMetadata;

import java.util.Optional;

public interface TripRouteMetadataService {

    void createMetadata(Long tripId, TripRouteMetadata metadata);

    Optional<TripRouteMetadata> getMetadata(Long tripId);

    void deleteMetadata(Long tripId);

}
