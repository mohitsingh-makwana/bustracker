package com.bustrackr.dto.trips;

import com.bustrackr.dto.routepattern.RouteStopCoordinate;

import java.util.List;

public record TripRouteMetadata(
        Long routePatternId,
        Long destinationPatternStopId,
        Double destinationLatitude,
        Double destinationLongitude,
        Double totalRouteDistanceMeters,
        List<RouteStopCoordinate> routeStops,
        Double totalDistanceTravelled
) {
}
