package com.bustrackr.dto.location;

import com.bustrackr.dto.routepattern.RouteGeometryDto;

import java.time.Instant;

public record LiveLocationResponse(
        Long tripId,

        Double latitude,
        Double longitude,

        Double accuracy,

        Double speedMetersPerSecond,
        Double speedKmh,

        Instant capturedAt,
        Instant updatedAt,
        Boolean stale,

        Long nextPatternStopId,
        Long nextStopId,
        Integer nextStopSequence,
        String nextStopName,

        Double nextStopDistanceMeters,
        Double remainingDistanceMeters,
        Double totalRouteDistanceMeters,
        RouteGeometryDto routeGeometry
) {
}
