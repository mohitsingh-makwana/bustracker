package com.bustrackr.service.impl;

import com.bustrackr.dto.location.*;

import com.bustrackr.dto.routepattern.Coordinate;
import com.bustrackr.dto.routepattern.RouteGeometryDto;
import com.bustrackr.dto.routepattern.RouteStopCoordinate;
import com.bustrackr.dto.trips.TripRouteMetadata;
import com.bustrackr.entity.PatternStop;
import com.bustrackr.entity.Stop;
import com.bustrackr.enums.TripStatus;
import com.bustrackr.exception.NoLiveLocationFoundException;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.repository.PatternStopRepository;
import com.bustrackr.repository.TripRepository;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.DistanceService;
import com.bustrackr.service.LiveLocationService;
import com.bustrackr.service.OsrmDistanceService;
import com.bustrackr.service.TripRouteMetadataService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.core.JacksonException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class LiveLocationServiceImpl implements LiveLocationService {

    private final String KEY_PREFIX="bustrackr:trip:";
    private final Duration LOCATION_TTL=Duration.ofHours(24);
    private final Duration LOCATION_STALE_AFTER=Duration.ofSeconds(30);
    private static final ZoneId GPS_TIME_ZONE =
            ZoneId.of("Asia/Kolkata");

    private final StringRedisTemplate redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    private final ObjectMapper objectMapper;
    private final DefaultRedisScript<Long> updateLiveLocationScript;

    private final PatternStopRepository patternStopRepository;

    private final DistanceService distanceService;
    private final TripRepository tripRepository;

    private final Set<Long> previouslyActive = ConcurrentHashMap.newKeySet();


    private final TripRouteMetadataService tripRouteMetadataService;


    @Override
    public Optional<LiveLocationResponse> getLatestLocation(Long tripId) {

        LiveLocationResponse location = findLatestLocation(tripId)
                .orElseThrow(() -> new NoLiveLocationFoundException(
                        "No live location available for trip id=" + tripId
                ));

        Instant now = Instant.now();

        PatternStop nextPatternStop = patternStopRepository.findById(location.nextPatternStopId())
                .orElseThrow(() -> new ResourceNotFoundException("Pattern stop not found with id="+location.nextPatternStopId()));
        Stop nextStop=nextPatternStop.getStop();


            boolean stale = location.updatedAt() == null
                    || Duration.between(location.updatedAt(), now)
                    .compareTo(LOCATION_STALE_AFTER) > 0;

        Double currentSpeedKmh = location.speedMetersPerSecond() == null
                ? null
                : location.speedMetersPerSecond() * 3.6;


        LiveLocationResponse response = new LiveLocationResponse(
                    location.tripId(),
                    location.latitude(),
                    location.longitude(),
                    location.accuracy(),
                    location.speedMetersPerSecond(),
                    currentSpeedKmh,
                    location.capturedAt(),
                    location.updatedAt(),
                    stale,

                    nextPatternStop.getId(),
                    nextStop.getId(),
                    nextPatternStop.getSequence(),
                    nextStop.getName(),

                    location.nextStopDistanceMeters(),
                    location.remainingDistanceMeters(),
                    location.totalRouteDistanceMeters(),
                    location.routeGeometry()
            );
            return Optional.of(response);
    }


    @Override
    public LiveLocationResponse updateLatestLocation(
            CreateLocationHistoryRequest request,
            Long tripId,
            CalculatedLocation calculatedLocation) {

        log.info("Updating the live location from  updateLatestLocation in redis ");
        Instant now = Instant.now();

        if (request.recordedAt() == null) {
            throw new IllegalArgumentException(
                    "GPS recordedAt timestamp is required"
            );
        }


        Instant capturedAt = request.recordedAt()
                .atZone(GPS_TIME_ZONE)
                .toInstant();

        String locationKey = getKey(tripId);
        String timestampKey = getTimestampKey(tripId);

        String storedTimestamp = redisTemplate.opsForValue()
                .get(timestampKey);

        boolean locationExists = Boolean.TRUE.equals(
                redisTemplate.hasKey(locationKey)
        );

        boolean timestampExists = storedTimestamp != null;

// Neither key exists: this may be the first location.
        if(!locationExists && !timestampExists) {
            // Continue with normal processing.
        }

// One key exists without the other: preserve the existing error behavior.
        else if (locationExists != timestampExists) {
            throw new IllegalStateException(
                    "Inconsistent Redis keys for trip " + tripId
            );
        }

// Both keys exist: check whether this update is already outdated.
        else {
            long existingTimestamp;

            try {
                existingTimestamp = Long.parseLong(storedTimestamp);
            } catch (NumberFormatException ex) {
                throw new IllegalStateException(
                        "Invalid Redis timestamp for trip " + tripId,
                        ex
                );
            }

            if (capturedAt.toEpochMilli() <= existingTimestamp) {
                return getLatestLocation(tripId)
                        .orElseThrow(() -> new IllegalStateException(
                                "Location was rejected, but no cached location "
                                        + "exists for trip " + tripId
                        ));
            }
        }

        log.info("finding the metadata");
        TripRouteMetadata metadata =
                tripRouteMetadataService.getMetadata(tripId)
                        .orElseThrow(() -> new IllegalStateException(
                                "Route metadata not found for trip " + tripId
                        ));
        log.info("Metadata found = {}",metadata);


        PatternStop nextPatternStop=patternStopRepository.findById(request.nextPatternStopId())
                .orElseThrow(() -> new ResourceNotFoundException("Pattern stop not found with id="+request.nextPatternStopId()));
        Stop nextStop=nextPatternStop.getStop();


        double nextStopDistanceMeters = distanceService.nextStopDistanceMeters(
                request.latitude(),
                request.longitude(),
                nextStop.getLatitude(),
                nextStop.getLongitude()
        );


        double remainingDistanceMeters = distanceService.remainingDistanceMeters(
                request.latitude(),
                request.longitude(),
                metadata.destinationLatitude(),
                metadata.destinationLongitude()
        );




        //if current location is in the radius of 75m
        if(nextStopDistanceMeters<=75){
            Optional<PatternStop> isNextPatternStopOptional=patternStopRepository.getByRoutePatternIdAndSequence(metadata.routePatternId(),nextPatternStop.getSequence()+1);
                if(isNextPatternStopOptional.isPresent()) {
                    nextPatternStop = isNextPatternStopOptional.get();
                    nextStop = nextPatternStop.getStop();

                    // Recalculate distance for the newly selected next stop
                    nextStopDistanceMeters = distanceService.nextStopDistanceMeters(
                            request.latitude(),
                            request.longitude(),
                            nextStop.getLatitude(),
                            nextStop.getLongitude()
                    );
                }
                //else keep the current as next because it is last
        }
        //else keep the current next as next

        Integer nextPatternStopSequence=nextPatternStop.getSequence();


        List<RouteStopCoordinate> remainingStops =
                metadata.routeStops().stream()
                        .filter(stop ->
                                stop.sequence() >= nextPatternStopSequence
                        )
                        .toList();

        List<Coordinate> coordinates=new ArrayList<>();
        coordinates.add(
                new Coordinate(request.longitude(), request.latitude())
        );

        coordinates.addAll(
                remainingStops.stream()
                        .map(stop -> new Coordinate(stop.longitude(), stop.latitude()))
                        .toList()
        );

        RouteGeometryDto geometryDto=distanceService.getRouteGeometry(coordinates);

        double previousTotal = metadata.totalDistanceTravelled() != null
                ? metadata.totalDistanceTravelled() : 0.0;

        Double delta = calculatedLocation.distanceMeters();
        double totalDistanceTravelledSoFar =
                (delta != null && delta > 0) ? previousTotal + delta : previousTotal;

        //updating Trip Metadata(distance traveled, last Coordinates)
        tripRouteMetadataService.createMetadata(
                tripId,
                new TripRouteMetadata(
                        metadata.routePatternId(),
                        metadata.destinationPatternStopId(),
                        metadata.destinationLatitude(),
                        metadata.destinationLongitude(),
                        metadata.totalRouteDistanceMeters(),
                        metadata.routeStops(),
                        totalDistanceTravelledSoFar
                )
        );


        log.info("distances calculated rmD={} and nsD={} and total distance travelled so far={}",remainingDistanceMeters,nextStopDistanceMeters,totalDistanceTravelledSoFar);


        Double speedMetersPerSecond = request.speed() != null
                ? request.speed()
                : calculatedLocation.speedMetersPerSecond();

        Double currentSpeedKmh = speedMetersPerSecond == null
                ? null
                : speedMetersPerSecond * 3.6;

        LiveLocationResponse location = new LiveLocationResponse(
                tripId,
                request.latitude(),
                request.longitude(),
                request.accuracyMeters(),
                speedMetersPerSecond,
                currentSpeedKmh,
                capturedAt,
                now,
                false,

                nextPatternStop.getId(),
                nextStop.getId(),
                nextPatternStop.getSequence(),
                nextStop.getName(),

                nextStopDistanceMeters,
                remainingDistanceMeters,
                metadata.totalRouteDistanceMeters(),
                geometryDto

        );

        try {

            String json = objectMapper.writeValueAsString(location);
            log.info("Updating the latest location in redis");

            Long result = redisTemplate.execute(
                    updateLiveLocationScript,
                    java.util.List.of(
                            getKey(tripId),
                            getTimestampKey(tripId)
                    ),
                    String.valueOf(capturedAt.toEpochMilli()),
                    json,
                    String.valueOf(LOCATION_TTL.toSeconds())
            );


            if (result == null) {
                log.info("Redis result not found ={}",result);
                throw new IllegalStateException(
                        "Redis returned no result for trip " + tripId
                );
            }
            return switch (result.intValue()) {

                // Redis accepted and stored the latest location
               case 1 -> {
                    // Publish full live details for this individual trip
                    messagingTemplate.convertAndSend(
                            "/topic/trips/" + tripId + "/location",
                            location
                    );

                    yield location;
                }

                // Redis rejected an outdated GPS update
                case 0 -> getLatestLocation(tripId)
                        .orElseThrow(() -> new IllegalStateException(
                                "Location was rejected, but no cached location "
                                        + "exists for trip " + tripId
                        ));

                case -1 -> throw new IllegalStateException(
                        "Existing Redis location has no timestamp metadata "
                                + "for trip " + tripId
                );

                case -2 -> throw new IllegalStateException(
                        "Redis rejected invalid timestamp or TTL metadata "
                                + "for trip " + tripId
                );

                default -> throw new IllegalStateException(
                        "Unexpected Redis script result: " + result
                );
            };

        } catch (JacksonException ex) {
            log.error("Data not added in redis and exception occurred ",ex);
            throw new IllegalStateException(
                    "Failed to serialize live location for trip " + tripId,
                    ex
            );
        }
    }
    @Override
    public List<LiveBusLocationDto> getLiveBusLocations(
            List<Long> tripIds
    ) {

        return tripIds.stream()
                .map(this::findLatestLocation)
                .flatMap(Optional::stream)
                .map(location -> new LiveBusLocationDto(
                        location.tripId(),
                        location.latitude(),
                        location.longitude()
                ))
                .toList();
    }

    @Override
    public void delegateTripStatus(TripStatusEvent event) {
        messagingTemplate.convertAndSend(
                "/topic/trips/" + event.tripId() + "/status",
                event);
    }

    @Scheduled(fixedDelay = 3000)
    public void broadcastLiveBuses() {

        try {

            //Set is used inorder to protection from duplication
            // previously and current used for sending the live buses of every system at regular interval
            Set<Long> current = new HashSet<>(tripRepository.findTransportSystemIdsWithActiveTrips(TripStatus.ACTIVE));

            Set<Long> toBroadcast = new HashSet<>(current);
            toBroadcast.addAll(previouslyActive);

            for (Long systemId : toBroadcast) {
                List<Long> tripIds = tripRepository
                        .getIdByTransportSystemIdAndStatus(systemId, TripStatus.ACTIVE);
                List<LiveBusLocationDto> buses = this.getLiveBusLocations(tripIds);
                messagingTemplate.convertAndSend(
                        "/topic/transport-systems/" + systemId + "/live-buses", buses != null? buses : List.of());
                previouslyActive.clear();
                previouslyActive.addAll(current);

            }
        } catch (Exception e) {
            log.error("Live bus broadcast failed", e);   // never let one failure kill the schedule
        }
    }




    public Optional<LiveLocationResponse> findLatestLocation(Long tripId) {

             String json = redisTemplate.opsForValue().get(getKey(tripId));

        if (json == null) {
            log.info("No data in redis for tripId={}",tripId);
            return Optional.empty();
        }
        try {
            LiveLocationResponse location =
                    objectMapper.readValue(json, LiveLocationResponse.class);

            return Optional.of(location);

        } catch (JacksonException ex) {
            log.error("Exception occurred ",ex);
            throw new IllegalStateException(
                    "Failed to deserialize live location for trip " + tripId,
                    ex
            );

        }
    }


    private String getTimestampKey(Long tripId) {
        return KEY_PREFIX + "{" + tripId + "}:timestamp";
    }

    @Override
    public void deleteLatestLocation(Long tripId) {
        redisTemplate.delete(
                java.util.List.of(
                        getKey(tripId),
                        getTimestampKey(tripId)
                )
        );
    }
    private String getKey(Long tripId) {
        return KEY_PREFIX + "{" + tripId + "}:location";
    }
}
