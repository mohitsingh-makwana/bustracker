package com.bustrackr.service.impl;

import com.bustrackr.dto.stop.CreateStopRequest;
import com.bustrackr.dto.stop.StopFilter;
import com.bustrackr.dto.stop.StopResponse;
import com.bustrackr.dto.stop.UpdateStopRequest;
import com.bustrackr.entity.Route;
import com.bustrackr.entity.RoutePattern;
import com.bustrackr.entity.Stop;
import com.bustrackr.entity.TransportSystem;
import com.bustrackr.enums.StopStatus;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.mapper.StopMapper;
import com.bustrackr.repository.*;
import com.bustrackr.security.CustomUserDetails;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.StopService;
import com.bustrackr.specification.RoutePatternSpecification;
import com.bustrackr.specification.RouteSpecification;
import com.bustrackr.specification.StopSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class StopServiceImpl implements StopService {

    private final StopRepository stopRepository;
    private final TransportSystemRepository transportSystemRepository;
    private final PatternStopRepository patternStopRepository;
    private final RouteRepository routeRepository;
    private final RoutePatternRepository routePatternRepository;
    private final StopMapper stopMapper;

    private final SecurityService securityService;

    @Override
    @Transactional
    public StopResponse create(CreateStopRequest request) {
        Long transportSystemId= securityService.getCurrentTransportSystemId();

        Specification<Stop> spec=Specification.allOf();
        spec=spec.and(StopSpecification.hasTransportSystemId(transportSystemId));
        spec=spec.and(StopSpecification.hasStopCode(request.stopCode()));
        spec=spec.and(StopSpecification.hasName(request.name()));
        spec=spec.and(StopSpecification.hasAddress(request.address()));
        spec=spec.and(StopSpecification.isActive(false));
       Stop stop;

        if(stopRepository.exists(spec)){
            stop=stopRepository.findOne(spec).orElseThrow(() -> new ResourceNotFoundException("Stop not found"));
            stop.setStatus(StopStatus.ACTIVE);
            stop.setActive(true);
            stop.setUpdatedAt(LocalDateTime.now());
            stop.setLatitude(request.latitude());
            stop.setLongitude(request.longitude());
        }
        else {

            TransportSystem transportSystem = transportSystemRepository.findById(transportSystemId)
                    .orElseThrow(() -> new ResourceNotFoundException("TransportSystem not found with id=" + transportSystemId));

            stop = stopMapper.toEntity(request);
            stop.setTransportSystem(transportSystem);
            stop.setStatus(StopStatus.ACTIVE);
            stop.setActive(true);
        }
        return stopMapper.toResponse(stopRepository.save(stop));
    }

    @Override
    public StopResponse getStopsById(Long id) {
        Specification<Stop> spec=Specification.allOf();
        spec=spec.and(StopSpecification.hasId(id));
        spec=spec.and(StopSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));
        spec=spec.and(StopSpecification.isActive(true));

        Stop stop=stopRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Stop not found with id="+id));
        return stopMapper.toResponse(stop);
    }

    @Override
    public StopResponse updateStops(Long id, UpdateStopRequest request) {
        Specification<Stop> spec=Specification.allOf();
        spec=spec.and(StopSpecification.hasId(id));
        spec=spec.and(StopSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));
        spec=spec.and(StopSpecification.isActive(true));

        Stop stop=stopRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Stop not found with id="+id));
        stopMapper.updateEntity(request,stop);

        return stopMapper.toResponse(stopRepository.save(stop));
    }

    @Override
    @Transactional
    public void deleteStops(Long id) {

        Specification<Route> routeSpec=Specification.allOf();
        routeSpec=routeSpec.and(RouteSpecification.hasDestinationStop(id)).or(RouteSpecification.hasOriginStop(id));

        Specification<RoutePattern> routePatternSpec=Specification.allOf();
        routePatternSpec=routePatternSpec.and(RoutePatternSpecification.hasDestionationStop(id)).or(RoutePatternSpecification.hasOriginStop(id));

        if(patternStopRepository.existsByStopId(id) || routeRepository.exists(routeSpec) || routePatternRepository.exists(routePatternSpec)){
            throw new IllegalStateException("Stop is in use");
        }

        Specification<Stop> stopSpec=Specification.allOf();
        stopSpec=stopSpec.and(StopSpecification.hasId(id));
        stopSpec=stopSpec.and(StopSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));

        Stop stop=stopRepository.findOne(stopSpec)
                .orElseThrow(() -> new ResourceNotFoundException("Stop not found with id="+id));
        stop.setActive(false);
    }

    public Page<StopResponse> getAllTransportSystemStops(int page,int size,Long transportSystemId,StopFilter filter) {
        Pageable pageable= PageRequest.of(page, size, Sort.by("name").ascending());
        Specification<Stop> spec=Specification.allOf();
        spec=spec.and(StopSpecification.hasTransportSystemId(transportSystemId));
       spec=spec.and(StopSpecification.isActive(true));
        if(filter!=null){
            if(filter.name()!=null){
                spec=spec.and(StopSpecification.hasNameLike(filter.name()));

            }
            if(filter.address()!=null){
                spec=spec.and(StopSpecification.hasAddressLike(filter.address()));
            }
            if(filter.status()!=null){
                spec=spec.and(StopSpecification.hasStatus(filter.status()));
            }
        }

        Page<Stop> stops=stopRepository.findAll(spec,pageable);
        return stops.map(stopMapper::toResponse);
    }

    @Override
    public Page<StopResponse> getPrivateStops(int page, int size, StopFilter filter) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();
        return getAllTransportSystemStops(page,size,transportSystemId,filter);
    }

    @Override
    public Page<StopResponse> getPublicStops(int page, int size, Long transportSystemId) {
        return getAllTransportSystemStops(page,size,transportSystemId,null);
    }
}
