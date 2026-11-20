package com.bustrackr.service;

import com.bustrackr.dto.route.CreateRouteRequest;
import com.bustrackr.dto.route.RouteResponse;
import com.bustrackr.dto.route.UpdateRouteRequest;
import com.bustrackr.enums.RouteStatus;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;

public interface RouteService {
    RouteResponse create(@Valid CreateRouteRequest request);

    RouteResponse getById(Long id);


    RouteResponse update(Long id, UpdateRouteRequest request);

    void delete(Long id);

    Page<RouteResponse> getPrivateRoutes(int page, int size);

    Page<RouteResponse> getAllPublicRoutes(Long transportSystemId, int page, int size);

    RouteResponse setStatus(RouteStatus status,Long id);

    RouteResponse getRoute(Long id);
}
