package com.bustrackr.dto.route;

import com.bustrackr.enums.RouteStatus;

import java.time.LocalDateTime;

public record RouteResponse(
        Long id,
        Long transportSystemId,
        String transportSystemName,
        String routeCode,
        String name,
        Long originStopId,
        String originStopName,
        Long destinationStopId,
        String destinationStopName,
        RouteStatus status) {
}