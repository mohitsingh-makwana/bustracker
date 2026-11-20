package com.bustrackr.mapper;

import com.bustrackr.dto.route.CreateRouteRequest;
import com.bustrackr.dto.route.RouteResponse;
import com.bustrackr.dto.route.UpdateRouteRequest;
import com.bustrackr.entity.Route;
import com.bustrackr.entity.Stop;
import com.bustrackr.entity.TransportSystem;
import org.springframework.stereotype.Component;

@Component
public class RouteMapper {

    public Route toEntity(CreateRouteRequest request) {
        return Route.builder()
                .routeCode(request.routeCode())
                .name(request.name())
                .build();
    }

    public void updateEntity(UpdateRouteRequest request, Route entity) {
        if (request.routeCode() != null) {
            entity.setRouteCode(request.routeCode());
        }

        if (request.name() != null) {
            entity.setName(request.name());
        }
        if (request.status() != null) {
            entity.setStatus(request.status());
        }
    }

    public RouteResponse toResponse(Route entity) {
        TransportSystem transportSystem=entity.getTransportSystem();
        Stop originStop=entity.getOriginStop();
        Stop destinationStop=entity.getDestinationStop();
        return new RouteResponse(
                entity.getId(),
                transportSystem.getId(),
                transportSystem.getName(),
                entity.getRouteCode(),
                entity.getName(),
                originStop.getId(),
                originStop.getName(),
                destinationStop.getId(),
                destinationStop.getName(),
                entity.getStatus()

        );
    }
}