package com.bustrackr.dto.tripschedule;


import java.time.DayOfWeek;
import java.time.LocalTime;

public record TripScheduleFilter(
        Long routePatternId,
        Long driverId,
        DayOfWeek day,
        LocalTime startTime,
        LocalTime endTime
) {
}
