package com.bustrackr.dto.routepattern;

import com.bustrackr.dto.patternstop.CreatePatternStopRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateRoutePatternRequest(

        @NotNull(message = "Route id is required")
        Long routeId,

        @NotBlank(message = "Pattern code is required")
        @Size(max = 30, message = "Pattern code must not exceed 30 characters")
        String code,

        @NotBlank(message = "Pattern name is required")
        @Size(max = 150, message = "Pattern name must not exceed 150 characters")
        String name,

        @NotNull(message = "Please Select the required stops")
        @Size(min = 2,message = "A route pattern needs minimum two stops")
        List<@Valid @NotNull CreatePatternStopRequest> patternStopRequests
) {
}