package com.bustrackr.dto.trips;

import com.bustrackr.enums.TripStatus;
import com.bustrackr.enums.TripType;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record TripResponse(
        Long id,
        Long tripScheduleId,
        LocalDateTime scheduledStartTime,
        LocalDateTime scheduledEndTime,
        LocalDateTime actualStartTime,
        LocalDateTime actualEndTime,
        Double startLatitude,
        Double startLongitude,
        Double endLatitude,
        Double endLongitude,
        Double distanceKm,
        TripStatus status,
        TripType tripType,
        String routePatternName,
        String routePatternCode,
        String originStopName,
        String destinationStopName,
        String busNumber,
        String driverName

        ) {
}
