package com.bustrackr.dto.location;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record UpdateLocationRequest(
        @NotNull
        Double latitude,

        @NotNull
        Double longitude,

        Double accuracyMeters,

        Double speedMetersPerSecond,

        Double headingDegrees,

        LocalDateTime recordedAt,

        @NotNull(message = "next PatternStop is required")
        Long nextPatternStopId
) { }
