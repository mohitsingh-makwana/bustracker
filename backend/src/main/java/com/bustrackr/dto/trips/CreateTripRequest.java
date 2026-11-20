package com.bustrackr.dto.trips;

import com.bustrackr.enums.TripType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record CreateTripRequest(

        @NotNull(message = "Route pattern id is required")
        Long routePatternId,

        @NotNull(message = "Bus id is required")
        Long busId,

        @NotNull(message = "Driver id is required")
        Long driverId,


        TripType tripType,

        @NotNull(message = "Scheduled start time is required")
        @FutureOrPresent(message = "Scheduled start time must be present or future")
        LocalDateTime scheduledStartTime,

        @NotNull(message = "Scheduled start time is required")
        @Future(message = "Scheduled start time must be present or future")
        LocalDateTime scheduledEndTime
) {
}
