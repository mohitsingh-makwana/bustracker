package com.bustrackr.dto.routepattern;

import java.util.List;

public record RoutePatternInfoResponse(
        Double totalDistanceMeters,
        List<Coordinate> coordinates
) {
}
