package com.bustrackr.mapper;

import com.bustrackr.dto.routepattern.CreateRoutePatternRequest;
import com.bustrackr.dto.routepattern.RoutePatternResponse;
import com.bustrackr.dto.routepattern.UpdateRoutePatternRequest;
import com.bustrackr.entity.Route;
import com.bustrackr.entity.RoutePattern;
import com.bustrackr.entity.Stop;
import org.springframework.stereotype.Component;

@Component
public class RoutePatternMapper {

    public RoutePattern toEntity(CreateRoutePatternRequest request) {
        return RoutePattern.builder()
                .code(request.code())
                .name(request.name())
                .build();
    }

    public void updateEntity(UpdateRoutePatternRequest request, RoutePattern entity) {

        if (request.code() != null) {
            entity.setCode(request.code());
        }

        if (request.name() != null) {
            entity.setName(request.name());
        }
    }

    public RoutePatternResponse toResponse(RoutePattern entity) {
        Route route=entity.getRoute();
        Stop originStop=entity.getOrigin();
        Stop destinationStop=entity.getDestination();
        return new RoutePatternResponse(
                entity.getId(),
                route.getId(),
                route.getRouteCode(),
                route.getName(),
                entity.getCode(),
                entity.getName(),
                originStop.getId(),
                originStop.getName(),
                destinationStop.getId(),
                destinationStop.getName(),
                entity.getTotalDistanceMeters()
        );
    }
}