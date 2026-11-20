package com.bustrackr.dto.patternstop;


import java.time.LocalTime;

public record PatternStopResponse(
        Long id,
        Long routePatternId,
        String routePatternCode,
        Long stopId,
        String stopName,
        LocalTime stopArrivalTime,
        Integer sequence,
        Double longitude,
        Double latitude
) {
}