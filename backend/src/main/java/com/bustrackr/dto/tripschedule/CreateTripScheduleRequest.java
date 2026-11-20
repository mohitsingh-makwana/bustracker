package com.bustrackr.dto.tripschedule;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Set;

@Builder
public record CreateTripScheduleRequest(

        @NotNull(message = "Route pattern id is required")
        Long routePatternId,

        @NotNull(message = "Bus id is required")
        Long busId,

        @NotNull(message = "Driver id is required")
        Long driverId,

        Set<DayOfWeek> operatingDays,

        @NotNull(message = "Scheduled start time is required")
        LocalTime scheduledStartTime,

        @NotNull(message = "Scheduled start time is required")
        LocalTime scheduledEndTime
) {
}