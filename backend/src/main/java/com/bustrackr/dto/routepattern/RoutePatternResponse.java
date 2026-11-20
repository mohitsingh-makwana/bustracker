package com.bustrackr.dto.routepattern;

import java.time.LocalDateTime;

public record RoutePatternResponse(
        Long id,
        Long routeId,
        String routeCode,
        String routeName,
        String code,
        String name,
        Long originStopId,
        String originStopName,
        Long destinationStopId,
        String destinationStopName,
        Double totalDistanceMeters
     ) {
}