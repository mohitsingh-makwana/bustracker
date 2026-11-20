package com.bustrackr.service.impl;

import com.bustrackr.dto.routepattern.Coordinate;
import com.bustrackr.dto.patternstop.CreatePatternStopRequest;
import com.bustrackr.dto.patternstop.PatternStopResponse;
import com.bustrackr.dto.routepattern.RouteGeometryDto;
import com.bustrackr.entity.*;
import com.bustrackr.enums.TripStatus;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.mapper.PatternStopMapper;
import com.bustrackr.projection.PatternStopProjection;
import com.bustrackr.repository.*;
import com.bustrackr.service.OsrmDistanceService;
import com.bustrackr.service.PatternStopService;
import com.bustrackr.specification.TripScheduleSpecification;
import com.bustrackr.specification.TripSpecification;
import com.fasterxml.jackson.core.JsonProcessingException;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.lang.runtime.ObjectMethods;
import java.util.*;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@RequiredArgsConstructor
@Service
public class PatternStopServiceImpl implements PatternStopService {

    private final RoutePatternRepository routePatternRepository;
    private final PatternStopRepository patternStopRepository;
    private final StopRepository stopRepository;

    private final PatternStopMapper patternStopMapper;

    private final TripRepository tripRepository;
    private final TripScheduleRepository tripScheduleRepository;

    private final OsrmDistanceService osrmDistanceService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void create(List<CreatePatternStopRequest> requests, Long routePatternId) {
         RoutePattern routePattern=routePatternRepository.findById(routePatternId)
                .orElseThrow(() -> new ResourceNotFoundException("RoutePattern not found with id="+routePatternId));

         List<Coordinate> coordinates =new ArrayList<>();

         requests.forEach(request->{
        Stop stop=stopRepository.findById(request.stopId())
                .orElseThrow(() -> new ResourceNotFoundException("Stop not found with id="+request.stopId()));
        coordinates.add(new Coordinate(stop.getLongitude(),stop.getLatitude()));

        PatternStop patternStop=patternStopMapper.toEntity(request);
        patternStop.setRoutePattern(routePattern);
        patternStop.setStop(stop);
        patternStopRepository.save(patternStop);
         });

         //fetching the coordinates in sequence for distance calculation
         List<PatternStopProjection> patternStops=patternStopRepository.getPatternStopCoordinatesByRoutePatternId(routePatternId);

         //calculating and setting the total distance
        routePattern.setTotalDistanceMeters(osrmDistanceService.calculateRoadDistanceMeters(patternStops));

        RouteGeometryDto geometryDto=osrmDistanceService.generateRouteGeometry(coordinates);
        RouteGeometry routeGeometry = new RouteGeometry();

        routeGeometry.setCoordinates(
                objectMapper.writeValueAsString(geometryDto.coordinates())
        );
        routePattern.setRouteGeometry(routeGeometry);
    }

    @Override
    public PatternStopResponse getById(Long id) {

        return patternStopMapper.toResponse(patternStopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PatternStop not found with id="+id)));
    }

    @Override
    public List<PatternStopResponse> getAllByRoutePatternId(Long routePatternId) {

        List<PatternStop> patternStops=patternStopRepository.findByRoutePatternIdOrderBySequenceAsc(routePatternId);
        return patternStops.stream().map(patternStopMapper::toResponse).toList();
    }


    @Override
    public void delete(Long id) {
        PatternStop patternStop=patternStopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PatternStop not found with id="+id));
        patternStopRepository.delete(patternStop);
    }

    @Override
    @Transactional
    public List<PatternStopResponse> replaceAll(
            Long routePatternId,
            List<CreatePatternStopRequest> requests) {
        Specification<Trip> tripSpecification = Specification.allOf();

        tripSpecification = tripSpecification.and(
                TripSpecification.hasRoutePatternId(routePatternId)
        );

        tripSpecification = tripSpecification.and(
                TripSpecification.hasStatus(TripStatus.ACTIVE)
                        .or(TripSpecification.hasStatus(TripStatus.SCHEDULED))
        );


        Specification<TripSchedule> tripScheduleSpecification =
                Specification.allOf();

        tripScheduleSpecification = tripScheduleSpecification.and(
                TripScheduleSpecification.hasRoutePatternId(routePatternId)
        );



        if (tripRepository.exists(tripSpecification)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A route pattern can't be modified as it is used by active or scheduled trips"
            );
        }

        if (tripScheduleRepository.exists(tripScheduleSpecification)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A route pattern can't be modified as it is used by active trip schedules"
            );
        }
        if (requests == null || requests.size() < 2) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A pattern must contain at least two stops"
            );
        }

        // 1. Verify that the route pattern exists.
        RoutePattern routePattern = routePatternRepository.findById(routePatternId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "RoutePattern not found with id=" + routePatternId
                ));

        Set<Integer> sequences = getSequences(requests);

        // Require contiguous sequences: 1, 2, 3, ... N.
        for (int sequence = 1; sequence <= requests.size(); sequence++) {
            if (!sequences.contains(sequence)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Sequence numbers must start at 1 and be contiguous"
                );
            }
        }

        // 3. Resolve and validate all stops before deleting existing records.
        Map<Long, Stop> stopsById = new HashMap<>();

        for (CreatePatternStopRequest request : requests) {

            Stop stop = stopRepository.findById(request.stopId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Stop not found with id=" + request.stopId()
                    ));

            // Ensure every stop belongs to the pattern's transport system.
            Long patternSystemId = routePattern.getRoute()
                    .getTransportSystem().getId();

            Long stopSystemId = stop.getTransportSystem().getId();

            if (!Objects.equals(patternSystemId, stopSystemId)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Stop does not belong to the pattern's transport system: stopId="
                                + request.stopId()
                );
            }

            stopsById.put(stop.getId(), stop);
        }

        // 4. Delete the existing ordered stop records.
        List<PatternStop> existingStops =
                patternStopRepository
                        .findByRoutePatternIdOrderBySequenceAsc(routePatternId);

        if (!existingStops.isEmpty()) {
            patternStopRepository.deleteAll(existingStops);
            patternStopRepository.flush();
        }

        //Updating the RouteGeometry
        List<Coordinate> coordinates=new ArrayList<>();

        // 5. Build the replacement records in sequence order.
        List<PatternStop> replacements = requests.stream()
                .sorted((a, b) -> Integer.compare(
                        a.sequence(), b.sequence()
                ))
                .map(request -> {
                    PatternStop patternStop =
                            patternStopMapper.toEntity(request);

                    Stop currentStop=stopsById.get(request.stopId());

                    patternStop.setRoutePattern(routePattern);
                    patternStop.setStop(currentStop);
                    patternStop.setSequence(request.sequence());

                    //adding coordinates for updating the Route Geometry
                    coordinates.add(new Coordinate(currentStop.getLongitude(), currentStop.getLatitude()));

                    return patternStop;
                })
                .toList();

        // 6. Save and flush the complete replacement list.
        patternStopRepository.saveAll(replacements);
        patternStopRepository.flush();

        //Updating the total distance

        //fetching the coordinates in sequence for distance calculation
        List<PatternStopProjection> patternStops=patternStopRepository.getPatternStopCoordinatesByRoutePatternId(routePatternId);
        //calculating and saving the total distance in routePattern
        routePattern.setTotalDistanceMeters(osrmDistanceService.calculateRoadDistanceMeters(patternStops));

        //Storing the route geometry
        RouteGeometryDto geometryDto=osrmDistanceService.generateRouteGeometry(coordinates);
        RouteGeometry routeGeometry = new RouteGeometry();

        routeGeometry.setCoordinates(
                objectMapper.writeValueAsString(geometryDto.coordinates())
        );
        routePattern.setRouteGeometry(routeGeometry);



        // 7. Return the saved stops in sequence order.
        return patternStopRepository
                .findByRoutePatternIdOrderBySequenceAsc(routePatternId)
                .stream()
                .map(patternStopMapper::toResponse)
                .toList();
    }

    private static @NonNull Set<Integer> getSequences(List<CreatePatternStopRequest> requests) {
        Set<Long> stopIds = new HashSet<>();
        Set<Integer> sequences = new HashSet<>();

        // 2. Validate stop IDs and sequence numbers before modifying data.
        for (CreatePatternStopRequest request : requests) {

            if (request == null || request.stopId() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Every pattern stop must have a stop ID"
                );
            }

            if (request.sequence() == null || request.sequence() < 1) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Sequence must be greater than 0"
                );
            }

            if (!stopIds.add(request.stopId())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "A stop cannot be added twice: stopId=" + request.stopId()
                );
            }

            if (!sequences.add(request.sequence())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Duplicate sequence number: " + request.sequence()
                );
            }
        }
        return sequences;
    }
}
