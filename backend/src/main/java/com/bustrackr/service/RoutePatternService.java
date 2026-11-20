package com.bustrackr.service;

import com.bustrackr.dto.routepattern.CreateRoutePatternRequest;
import com.bustrackr.dto.routepattern.RoutePatternFilter;
import com.bustrackr.dto.routepattern.RoutePatternResponse;
import com.bustrackr.dto.routepattern.UpdateRoutePatternRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

@Service
public interface RoutePatternService {
    RoutePatternResponse create(@Valid CreateRoutePatternRequest request);

    RoutePatternResponse getById(Long id);

    Page<RoutePatternResponse> getAll(int page, int size, RoutePatternFilter filter);

    RoutePatternResponse update(Long id, UpdateRoutePatternRequest request);

    void delete(Long id);
}
