package com.bustrackr.dto.transportsystem;

import com.bustrackr.enums.AccessType;
import jakarta.validation.constraints.*;

public record CreateTransportSystemRequest(

        @NotBlank(message = "Transport code is required")
        @Size(max = 30, message = "Transport code must not exceed 30 characters")
        String transportCode,

        @NotBlank(message = "Transport name is required")
        @Size(max = 150, message = "Transport name must not exceed 150 characters")
        String name,

        @Size(max = 500, message = "Description must not exceed 500 characters")
        String description,

        @NotNull(message = "Access type is required")
        AccessType accessType,

        @NotBlank(message = "City is required")
        @Size(max = 100, message = "City must not exceed 100 characters")
        String city,

        @Size(max = 100, message = "Area must not exceed 100 characters")
        String area,

        Double latitude,

        Double longitude
) {
}