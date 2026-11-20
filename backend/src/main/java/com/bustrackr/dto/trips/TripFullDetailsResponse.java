package com.bustrackr.dto.trips;

import com.bustrackr.entity.RouteGeometry;
import com.bustrackr.enums.TripStatus;
import com.bustrackr.enums.TripType;
import lombok.Builder;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

@Builder
public record TripFullDetailsResponse(
        Long tripId,
        Long tripScheduleId,
        TripType tripType,
        String routePatternName,
        String routePatternCode,
        String routeName,
        RouteGeometry routeGeometry,
        String originStopName,
        String destinationStopName,
        String busNumber,
        String driverName,
        LocalDateTime scheduledTripStartTime,
        LocalDateTime scheduledTripEndTime,
        String scheduledTripScheduleStartTime,
        String scheduledTripScheduleEndTime,
        Set<DayOfWeek> operatingDays,
        TripStatus status
) {
}
