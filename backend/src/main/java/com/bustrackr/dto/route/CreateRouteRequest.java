package com.bustrackr.dto.route;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateRouteRequest(

        @NotBlank(message = "Route code is required")
        @Size(max = 30, message = "Route code must not exceed 30 characters")
        String routeCode,

        @NotBlank(message = "Route name is required")
        @Size(max = 150, message = "Route name must not exceed 150 characters")
        String name,

        @NotNull(message = "Origin stop id is required")
        Long originStopId,

        @NotNull(message = "Destination stop id is required")
        Long destinationStopId

) {
}