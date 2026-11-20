package com.bustrackr.dto.routepattern;

public record UpdateRoutePatternRequest(

        String code,

        String name,

        Long originStopId,

        Long destinationStopId

) {
}