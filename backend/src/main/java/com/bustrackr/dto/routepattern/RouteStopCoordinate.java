package com.bustrackr.dto.routepattern;


public record RouteStopCoordinate(
        Integer sequence,
        Double longitude,
        Double latitude
) {}