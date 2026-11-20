package com.bustrackr.dto.location;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record CreateLocationHistoryRequest(

        @NotNull(message = "Trip id is required")
        Long tripId,

        @NotNull(message = "Latitude is required")
        @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
        @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
        Double latitude,

        @NotNull(message = "Longitude is required")
        @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
        @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
        Double longitude,

        Double speed,

        Double accuracyMeters,

        @NotNull(message = "Recorded time is required")
        LocalDateTime recordedAt,

        @NotNull(message = "next pattern stop id is required")
        Long nextPatternStopId
) {
}