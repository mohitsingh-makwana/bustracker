package com.bustrackr.service.impl;

import com.bustrackr.dto.location.*;
import com.bustrackr.entity.LocationHistory;
import com.bustrackr.entity.Trip;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.mapper.LocationHistoryMapper;
import com.bustrackr.repository.LocationHistoryRepository;
import com.bustrackr.repository.TripRepository;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.LiveLocationService;
import com.bustrackr.service.LocationHistoryService;
import com.bustrackr.service.OsrmDistanceService;
import com.bustrackr.specification.TripSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class LocationHistoryServiceImpl implements LocationHistoryService {

    private final TripRepository tripRepository;
    private final LocationHistoryRepository locationHistoryRepository;

    private final LocationHistoryMapper locationHistoryMapper;

    private final SecurityService securityService;
    private final ApplicationEventPublisher eventPublisher;

    private final LiveLocationService liveLocationService;
    private final OsrmDistanceService osrmDistanceService;

    @Override
    @Transactional
    public LocationHistoryResponse create(CreateLocationHistoryRequest request) {

        if (request.recordedAt() == null) {
            log.error("LOCATION CREATE: recordedAt is null");
            throw new IllegalArgumentException("GPS recordedAt timestamp is required");
        }


        Long transportSystemId = securityService.getCurrentTransportSystemId();

           Specification<Trip> spec=Specification.allOf();
        spec=spec.and(TripSpecification.hasId(request.tripId()));
        spec=spec.and(TripSpecification.hasTransportSystemId(transportSystemId));

        Trip trip = tripRepository.findOne(spec)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Trip not found with id=" + request.tripId()
                        )
                );

        Optional<LiveLocationResponse> previousLocation =
                liveLocationService.findLatestLocation(request.tripId());



        Double distanceMeters = null;
        Double calculatedSpeed = null;

        if (previousLocation.isPresent()) {
            LiveLocationResponse previous = previousLocation.get();


            Instant currentCapturedAt = request.recordedAt()
                    .atZone(ZoneId.of("Asia/Kolkata"))
                    .toInstant();

            Duration elapsed = Duration.between(
                    previous.capturedAt(),
                    currentCapturedAt
            );

            log.info("LOCATION CREATE: elapsedMillis={}", elapsed.toMillis());

            if (elapsed.isZero() || elapsed.isNegative()) {
                log.warn(
                        "LOCATION CREATE: Cannot calculate speed because timestamp " +
                                "interval is invalid. tripId={}, elapsedMillis={}",
                        trip.getId(),
                        elapsed.toMillis()
                );

                // Do not calculate speed using an invalid time interval.

            } else {

                distanceMeters = osrmDistanceService.calculateRoadDistanceMeters(
                        previous.latitude(),
                        previous.longitude(),
                        request.latitude(),
                        request.longitude()
                );

                log.info("LOCATION CREATE: OSRM returned distance={}", distanceMeters);

                calculatedSpeed = distanceMeters / elapsed.toMillis() * 1000.0;
            }
        }

          LocationHistory locationHistory =
                locationHistoryMapper.toEntity(request);

        locationHistory.setTrip(trip);
        locationHistory.setSpeed(calculatedSpeed);

         LocationHistory savedLocationHistory =
                locationHistoryRepository.save(locationHistory);

        eventPublisher.publishEvent(
                new LocationAcceptedEvent(
                        request.tripId(),
                        request,
                        new CalculatedLocation(distanceMeters, calculatedSpeed)
                )
        );


        return locationHistoryMapper.toResponse(savedLocationHistory);
    }

    @Override
    public LocationHistoryResponse getById(Long id) {
        LocationHistory locationHistory=locationHistoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LocationHistory not found with id="+id));

        return locationHistoryMapper.toResponse(locationHistory);
    }

    @Override
    public Page<LocationHistoryResponse> getAll(int page, int size) {
        Pageable pageable= PageRequest.of(page,size);
        Page<LocationHistory> locationHistories=locationHistoryRepository.findAll(pageable);
        return locationHistories.map(locationHistoryMapper::toResponse);
    }

    @Override
    public Page<LocationHistoryResponse> getByTripId(Long tripId, Pageable pageable) {
        Page<LocationHistory> locationHistories=locationHistoryRepository.findLocationHistoryByTripId(tripId,pageable);
        return locationHistories.map(locationHistoryMapper::toResponse);
    }
}
