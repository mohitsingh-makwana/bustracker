package com.bustrackr.dto.trips;

import com.bustrackr.enums.TripStatusFilter;

import java.time.LocalDate;
import java.time.LocalTime;

public record TripFilter(
        TripStatusFilter status,
        Long routePatternId,
        Long driverId,
        Long busId,
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime
) {
}
