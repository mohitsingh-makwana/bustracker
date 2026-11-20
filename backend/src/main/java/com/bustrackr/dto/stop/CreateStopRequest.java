package com.bustrackr.dto.stop;

import jakarta.validation.constraints.*;

public record CreateStopRequest(
        @NotBlank(message = "Stop code is required")
        @Size(max = 30, message = "Stop code must not exceed 30 characters")
        String stopCode,

        @NotBlank(message = "Stop name is required")
        @Size(max = 150, message = "Stop name must not exceed 150 characters")
        String name,

        @Size(max = 300, message = "Address must not exceed 300 characters")
        String address,

        @NotNull(message = "Latitude is required")
        @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
        @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
        Double latitude,

        @NotNull(message = "Longitude is required")
        @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
        @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
        Double longitude
) {
}