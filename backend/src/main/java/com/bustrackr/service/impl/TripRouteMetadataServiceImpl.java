package com.bustrackr.service.impl;

import com.bustrackr.dto.routepattern.RouteStopCoordinate;
import com.bustrackr.dto.trips.TripRouteMetadata;
import com.bustrackr.service.TripRouteMetadataService;


import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.HashMap;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TripRouteMetadataServiceImpl
        implements TripRouteMetadataService {

    private static final String KEY_PREFIX = "bustrackr:trip:";

    private static final Duration METADATA_TTL =
            Duration.ofHours(24);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void createMetadata(
            Long tripId,
            TripRouteMetadata metadata) {

        String key = getMetadataKey(tripId);

        Map<String, String> fields = new HashMap<>();

        fields.put(
                "routePatternId",
                String.valueOf(metadata.routePatternId())
        );

        fields.put(
                "destinationPatternStopId",
                String.valueOf(metadata.destinationPatternStopId())
        );

        fields.put(
                "destinationLatitude",
                String.valueOf(metadata.destinationLatitude())
        );

        fields.put(
                "destinationLongitude",
                String.valueOf(metadata.destinationLongitude())
        );

        fields.put(
                "totalRouteDistanceMeters",
                String.valueOf(metadata.totalRouteDistanceMeters())
        );

        fields.put(
                "routeStops",
                writeRouteStops(metadata.routeStops())
        );

        fields.put(
                "totalDistanceTravelled",
                String.valueOf(metadata.totalDistanceTravelled())
        );



        redisTemplate.opsForHash().putAll(key, fields);

        redisTemplate.expire(key, METADATA_TTL);
    }

    @Override
    public Optional<TripRouteMetadata> getMetadata(Long tripId) {

        String key = getMetadataKey(tripId);

        Map<Object, Object> fields =
                redisTemplate.opsForHash().entries(key);

        if (fields.isEmpty()) {
            return Optional.empty();
        }

        return Optional.of(
                new TripRouteMetadata(
                        getLong(fields, "routePatternId"),
                        getLong(fields, "destinationPatternStopId"),
                        getDouble(fields, "destinationLatitude"),
                        getDouble(fields, "destinationLongitude"),
                        getDouble(fields,"totalRouteDistanceMeters"),
                        getRouteStops(fields),
                        getDouble(fields,"totalDistanceTravelled")
                )
        );
    }

    @Override
    public void deleteMetadata(Long tripId) {

        redisTemplate.delete(getMetadataKey(tripId));
    }

    private String getMetadataKey(Long tripId) {

        return KEY_PREFIX + "{" + tripId + "}:metadata";
    }


    private String writeRouteStops(List<RouteStopCoordinate> routeStops) {
        try {
            return objectMapper.writeValueAsString(routeStops);
        } catch (JacksonException e) {
            throw new IllegalStateException(
                    "Failed to serialize route stops",
                    e
            );
        }
    }

    private List<RouteStopCoordinate> getRouteStops(
            Map<Object, Object> fields
    ) {
        Object value = fields.get("routeStops");

        if (value == null) {
            throw new IllegalStateException(
                    "Missing Redis metadata field: routeStops"
            );
        }

        try {
            return objectMapper.readValue(
                    value.toString(),
                    new TypeReference<List<RouteStopCoordinate>>() {}
            );
        } catch (JacksonException e) {
            throw new IllegalStateException(
                    "Failed to deserialize route stops",
                    e
            );
        }
    }

    private Long getLong(
            Map<Object, Object> fields,
            String field) {

        Object value = fields.get(field);

        if (value == null) {
            throw new IllegalStateException(
                    "Missing Redis metadata field: " + field
            );
        }

        return Long.valueOf(value.toString());
    }

    private Double getDouble(Map<Object, Object> fields, String field) {
        Object value = fields.get(field);

        if (value == null) {
            throw new IllegalStateException("Missing Redis metadata field: " + field);
        }

        try {
            double parsed = Double.parseDouble(value.toString().trim());
            if (Double.isNaN(parsed) || Double.isInfinite(parsed)) {
                throw new IllegalStateException("Non-finite value for field: " + field);
            }
            return parsed;
        } catch (NumberFormatException e) {
            throw new IllegalStateException(
                    "Invalid numeric value for field '" + field + "': " + value, e);
        }
    }
}