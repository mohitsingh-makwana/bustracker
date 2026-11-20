package com.bustrackr.dto.route;

import com.bustrackr.enums.RouteStatus;

public record UpdateRouteRequest(

        String routeCode,

        String name,
        RouteStatus status

) {
}