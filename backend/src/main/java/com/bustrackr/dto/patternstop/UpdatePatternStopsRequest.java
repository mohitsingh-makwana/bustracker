package com.bustrackr.dto.patternstop;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdatePatternStopsRequest(

        @NotNull(message = "Pattern stops are required")
        @Size(min = 2, message = "A pattern must contain at least two stops")
        List<@NotNull @Valid CreatePatternStopRequest> patternStopRequests
) {
}