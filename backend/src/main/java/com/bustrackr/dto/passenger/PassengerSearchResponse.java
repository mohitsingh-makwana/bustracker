package com.bustrackr.dto.passenger;

import com.bustrackr.enums.TripStatus;
import com.bustrackr.enums.TripType;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record PassengerSearchResponse(
        Long tripId,
        Long tripScheduleId,
        TripType tripType,
        Long routeId,
        String routeName,
        Long routePatternId,
        String routePatternName,
        Long busId,
        String busNumber,
        Long driverId,
        String driverName,
        LocalDateTime scheduledStartTime,
        LocalDateTime scheduledEndTime,
        TripStatus status,
        String originStopName,
        String destinationStopName
) {
}
