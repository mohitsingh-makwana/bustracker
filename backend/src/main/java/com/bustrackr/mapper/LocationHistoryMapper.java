package com.bustrackr.mapper;

import com.bustrackr.dto.location.CreateLocationHistoryRequest;
import com.bustrackr.dto.location.LocationHistoryResponse;
import com.bustrackr.entity.LocationHistory;
import org.springframework.stereotype.Component;

@Component
public class LocationHistoryMapper {

    public LocationHistory toEntity(CreateLocationHistoryRequest request) {
        return LocationHistory.builder()
                .latitude(request.latitude())
                .longitude(request.longitude())
                .speed(request.speed())
                .accuracyMeters(request.accuracyMeters())
                .recordedAt(request.recordedAt())
                .build();
    }

    public LocationHistoryResponse toResponse(LocationHistory entity) {
        return new LocationHistoryResponse(
                entity.getId(),
                entity.getTrip().getId(),
                entity.getLatitude(),
                entity.getLongitude(),
                entity.getSpeed(),
                entity.getAccuracyMeters(),
                entity.getRecordedAt()
        );
    }
}