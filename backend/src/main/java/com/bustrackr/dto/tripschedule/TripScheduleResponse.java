package com.bustrackr.dto.tripschedule;

import com.bustrackr.enums.TripScheduleStatus;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

public record TripScheduleResponse(
        Long id,
        Long transportSystemId,
        Long routePatternId,
        Long busId,
        Long driverId,
        TripScheduleStatus scheduleStatus,
        String scheduledStartTime,
        String scheduledEndTime,
        Set<DayOfWeek> operatingDays,
        LocalDateTime createdAt,
        LocalDateTime updatedAt

     ) {
}