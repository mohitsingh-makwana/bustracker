package com.bustrackr.service.impl;

import com.bustrackr.dto.route.CreateRouteRequest;
import com.bustrackr.dto.route.RouteResponse;
import com.bustrackr.dto.route.UpdateRouteRequest;
import com.bustrackr.entity.Route;
import com.bustrackr.entity.RoutePattern;
import com.bustrackr.entity.Stop;
import com.bustrackr.entity.TransportSystem;
import com.bustrackr.enums.RouteStatus;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.mapper.RouteMapper;
import com.bustrackr.repository.RoutePatternRepository;
import com.bustrackr.repository.RouteRepository;
import com.bustrackr.repository.StopRepository;
import com.bustrackr.repository.TransportSystemRepository;
import com.bustrackr.security.CustomUserDetails;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.RouteService;
import com.bustrackr.specification.RoutePatternSpecification;
import com.bustrackr.specification.RouteSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RouteServiceImpl implements RouteService {

    private final RouteRepository routeRepository;
    private final RoutePatternRepository routePatternRepository;
    private final TransportSystemRepository transportSystemRepository;

    private final RouteMapper routeMapper;
    private final SecurityService securityService;
    private final StopRepository stopRepository;

    @Override
    public RouteResponse create(CreateRouteRequest request) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();

        Route route;

        Specification<Route> spec=Specification.allOf();
        spec=spec.and(RouteSpecification.hasTransportSystemId(transportSystemId));
        spec=spec.and(RouteSpecification.hasName(request.name()));
        spec=spec.and(RouteSpecification.hasRouteCode(request.routeCode()));
        spec=spec.and(RouteSpecification.hasOriginStop(request.originStopId()));
        spec=spec.and(RouteSpecification.hasDestinationStop(request.destinationStopId()));

        if(routeRepository.exists(spec.and(RouteSpecification.isActive(false)))){
            route=routeRepository.findOne(spec).orElseThrow(() -> new ResourceNotFoundException("Route not found"));
            route.setActive(true);
            route.setUpdatedAt(LocalDateTime.now());
        }
        else {
            TransportSystem transportSystem = transportSystemRepository.findById(transportSystemId)
                    .orElseThrow(() -> new ResourceNotFoundException("TransportSystem not found with id=" + transportSystemId));
            Stop originStop = stopRepository.findByIdAndTransportSystemId(request.originStopId(), securityService.getCurrentTransportSystemId())
                    .orElseThrow(() -> new ResourceNotFoundException("OriginStop not found with id=" + request.originStopId()));
            Stop destinationStop = stopRepository.findByIdAndTransportSystemId(request.destinationStopId(), securityService.getCurrentTransportSystemId())
                    .orElseThrow(() -> new ResourceNotFoundException("DestinationStop not found with id=" + request.destinationStopId()));

             route = routeMapper.toEntity(request);
            route.setTransportSystem(transportSystem);
            route.setOriginStop(originStop);
            route.setDestinationStop(destinationStop);
            route.setStatus(RouteStatus.ACTIVE);
            route.setActive(true);
       }

        return routeMapper.toResponse(routeRepository.save(route));
    }

    @Override
    public RouteResponse getById(Long id) {
        Specification<Route> spec=Specification.allOf();
        spec=spec.and(RouteSpecification.hasId(id));
        spec=spec.and(RouteSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));
        spec=spec.and(RouteSpecification.isActive(true));

        Route route=routeRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id="+id));

        return routeMapper.toResponse(route);
    }


    @Override
    public RouteResponse update(Long id, UpdateRouteRequest request) {
        Specification<Route> spec=Specification.allOf();
        spec=spec.and(RouteSpecification.hasId(id));
        spec=spec.and(RouteSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));
        spec=spec.and(RouteSpecification.isActive(true));

        Route route=routeRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id="+id));

        routeMapper.updateEntity(request,route);
        return routeMapper.toResponse(routeRepository.save(route));
    }

    @Override
    public void delete(Long id) {

        Specification<RoutePattern> routePatternSpecification=Specification.allOf();
        routePatternSpecification=routePatternSpecification.and(RoutePatternSpecification.hasRouteId(id));
        routePatternSpecification=routePatternSpecification.and(RoutePatternSpecification.isActive(true));

        if(routePatternRepository.exists(routePatternSpecification)){
            throw new IllegalStateException("Route is in use so it can't be deleted");
        }

        Specification<Route> spec=Specification.allOf();
        spec=spec.and(RouteSpecification.hasId(id));
        spec=spec.and(RouteSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));
        spec=spec.and(RouteSpecification.isActive(true));

        Route route=routeRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id="+id));

        if(!route.getActive()){
            throw new IllegalStateException("Route is already deleted");
        }
        route.setActive(false);
        routeRepository.delete(route);
    }


    private Page<RouteResponse> getAllTransportRoutes(int page, int size,Long transportSystemId) {
        Pageable pageable= PageRequest.of(page,size);
        Specification<Route> spec=Specification.allOf();
        spec=spec.and(RouteSpecification.hasTransportSystemId(transportSystemId));
        spec=spec.and(RouteSpecification.isActive(true));

        Page<Route> routes=routeRepository.findAll(spec,pageable);
        return routes.map(routeMapper::toResponse);
    }

    @Override
    public Page<RouteResponse> getPrivateRoutes(int page, int size) {
           return getAllTransportRoutes(page,size, securityService.getCurrentTransportSystemId());
    }

    @Override
    public Page<RouteResponse> getAllPublicRoutes(Long transportSystemId, int page, int size) {
        return getAllTransportRoutes(page,size,transportSystemId);
    }

    @Override
    public RouteResponse setStatus(RouteStatus status,Long id) {
        Specification<Route> spec=Specification.allOf();
        spec=spec.and(RouteSpecification.hasId(id));
        spec=spec.and(RouteSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));
        spec=spec.and(RouteSpecification.isActive(true));

        Route route=routeRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id="+id));
        route.setStatus(status);
        return routeMapper.toResponse(routeRepository.save(route));
    }

    @Override
    public RouteResponse getRoute(Long id) {
        Specification<Route> spec=Specification.allOf();
        spec=spec.and(RouteSpecification.hasId(id));
        spec=spec.and(RouteSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));
        spec=spec.and(RouteSpecification.isActive(true));

        Route route=routeRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id="+id));

        return routeMapper.toResponse(route);
    }
}
