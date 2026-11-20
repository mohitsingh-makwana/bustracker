package com.bustrackr.service.impl;


import com.bustrackr.dto.routepattern.*;
import com.bustrackr.entity.*;
import com.bustrackr.enums.TripScheduleStatus;
import com.bustrackr.enums.TripStatus;
import com.bustrackr.exception.InvalidRequestException;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.mapper.RoutePatternMapper;
import com.bustrackr.repository.*;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.PatternStopService;
import com.bustrackr.service.RoutePatternService;
import com.bustrackr.specification.RoutePatternSpecification;
import com.bustrackr.specification.RouteSpecification;
import com.bustrackr.specification.TripScheduleSpecification;
import com.bustrackr.specification.TripSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoutePatternServiceImpl implements RoutePatternService {

    private final RoutePatternRepository  routePatternRepository;
    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;
    private final TripRepository tripRepository;
    private final TripScheduleRepository tripScheduleRepository;
    private final RoutePatternMapper routePatternMapper;
    private final PatternStopService  patternStopService;

    private final SecurityService securityService;


    @Override
    @Transactional
    public RoutePatternResponse create(CreateRoutePatternRequest request) {
        RoutePattern routePattern=routePatternMapper.toEntity(request);

        Specification<Route> spec=Specification.allOf();
        spec=spec.and(RouteSpecification.hasId(request.routeId()));
        spec=spec.and(RouteSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));
        spec=spec.and(RouteSpecification.isActive(true));

        Route route=routeRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id="+request.routeId()));


        Stop originStop=stopRepository.findByIdAndTransportSystemId(route.getOriginStop().getId(),securityService.getCurrentTransportSystemId())
                .orElseThrow(() -> new ResourceNotFoundException("OriginStop not found with id="+route.getOriginStop().getId()));
        Stop destinationStop=stopRepository.findByIdAndTransportSystemId(route.getDestinationStop().getId(), securityService.getCurrentTransportSystemId())
                .orElseThrow(() -> new ResourceNotFoundException("DestinationStop not found with id="+route.getDestinationStop().getId()));


        routePattern.setRoute(route);
        routePattern.setOrigin(originStop);
        routePattern.setDestination(destinationStop);
        routePattern.setActive(true);
        RoutePattern savedRoutePattern=routePatternRepository.save(routePattern);

        //Saving the pattern stops, adding routeGeometry, totalDistance in meters
        patternStopService.create(request.patternStopRequests(),savedRoutePattern.getId());

        return routePatternMapper.toResponse(savedRoutePattern);
    }

    @Override
    public RoutePatternResponse getById(Long id) {
        Specification<RoutePattern> spec=Specification.allOf();
        spec=spec.and(RoutePatternSpecification.hasId(id));
        spec=spec.and(RoutePatternSpecification.isActive(true));

        RoutePattern routePattern=routePatternRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("RoutePattern not found with id="+id));

        return routePatternMapper.toResponse(routePattern);
    }

    @Override
    public Page<RoutePatternResponse> getAll(int page, int size, RoutePatternFilter filter) {
        Pageable pageable= PageRequest.of(page,size, Sort.by("name").ascending());
        Specification<RoutePattern> spec=Specification.allOf();
        spec=spec.and(RoutePatternSpecification.isActive(true));

        if(filter.routeId()==null){
            List<Long> routeIds=routeRepository.findIdByTransportSystemId(securityService.getCurrentTransportSystemId());
            spec=spec.and(RoutePatternSpecification.hasRouteIds(routeIds));
        }

        if(filter!=null){
            if(filter.routeId()!=null){
                spec=spec.and(RoutePatternSpecification.hasRouteId(filter.routeId()));
            }

            if(filter.name()!=null){
                spec=spec.and(RoutePatternSpecification.hasNameLike(filter.name()));
            }
            if(filter.code()!=null){
                spec=spec.and(RoutePatternSpecification.hasCodeLike(filter.code()));
            }

        }
        Page<RoutePattern> routePatterns=routePatternRepository.findAll(spec,pageable);
        return routePatterns.map(routePatternMapper::toResponse);
    }

    @Transactional
    @Override
    public RoutePatternResponse update(Long id, UpdateRoutePatternRequest request) {
        Specification<RoutePattern> spec=Specification.allOf();
        spec=spec.and(RoutePatternSpecification.hasId(id));
        spec=spec.and(RoutePatternSpecification.isActive(true));

        RoutePattern routePattern=routePatternRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("RoutePattern not found with id="+id));

        routePatternMapper.updateEntity(request,routePattern);
        if(request.destinationStopId()!=null){
            Stop destinationStop=stopRepository.findByIdAndTransportSystemId(request.destinationStopId(), securityService.getCurrentTransportSystemId())
                    .orElseThrow(() -> new ResourceNotFoundException("DestinationStop not found with id="+request.destinationStopId()));
            routePattern.setDestination(destinationStop);
        }
        if(request.originStopId()!=null){
            Stop originStop=stopRepository.findByIdAndTransportSystemId(request.originStopId(), securityService.getCurrentTransportSystemId())
                    .orElseThrow(() -> new ResourceNotFoundException("OriginStop not found with id="+request.originStopId()));
            routePattern.setOrigin(originStop);
        }

        return routePatternMapper.toResponse(routePatternRepository.save(routePattern));
    }

    @Override
    @Transactional
    public void delete(Long id) {

        Specification<Trip> triSpec=Specification.allOf();
        triSpec=triSpec.and(TripSpecification.hasDriverId(id));
        triSpec=triSpec.and(TripSpecification.hasStatus(TripStatus.SCHEDULED).or(TripSpecification.hasStatus(TripStatus.ACTIVE)));
        triSpec=triSpec.and(TripSpecification.hasRoutePatternId(id));

        Specification<TripSchedule> tripScheduleSpecification=Specification.allOf();
        tripScheduleSpecification=tripScheduleSpecification.and(TripScheduleSpecification.hasDriverId(id));
        tripScheduleSpecification=tripScheduleSpecification.and(TripScheduleSpecification.hasStatus(TripScheduleStatus.ACTIVE));
        tripScheduleSpecification=tripScheduleSpecification.and(TripScheduleSpecification.hasRoutePatternId(id));

        if(tripRepository.exists(triSpec) || tripScheduleRepository.exists(tripScheduleSpecification)){
            throw new InvalidRequestException("Driver has an active trip and cannot be deactivated");
        }

        Specification<RoutePattern> spec=Specification.allOf();
        spec=spec.and(RoutePatternSpecification.hasId(id));

        RoutePattern routePattern=routePatternRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("RoutePattern not found with id="+id));

        if(!routePattern.getActive()){
            throw new IllegalStateException("Route Pattern is already deleted");
        }

        routePattern.setActive(false);
    }
}
