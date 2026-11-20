package com.bustrackr.dto.patternstop;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record CreatePatternStopRequest(

        @NotNull(message = "Stop id is required")
        Long stopId,

        @NotNull(message = "Sequence is required")
        @Min(value = 1, message = "Sequence must be greater than 0")
        Integer sequence,

        @NotNull(message = "Stop arrival is needed")
        LocalTime stopArrivalTime
) {
}