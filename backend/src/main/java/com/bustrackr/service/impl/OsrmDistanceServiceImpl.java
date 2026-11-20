package com.bustrackr.service.impl;

import com.bustrackr.dto.routepattern.Coordinate;
import com.bustrackr.dto.routepattern.RouteGeometryDto;
import com.bustrackr.exception.OsrmDistanceException;
import com.bustrackr.projection.PatternStopProjection;
import com.bustrackr.service.OsrmDistanceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class OsrmDistanceServiceImpl implements OsrmDistanceService {

    private final String OSRM_BASE_URL;

    private final RestClient.Builder restClientBuilder;

    public OsrmDistanceServiceImpl(@Value("${osrm.base-url}") String osrmBaseUrl, RestClient.Builder restClientBuilder) {
        OSRM_BASE_URL = osrmBaseUrl;
        this.restClientBuilder = restClientBuilder;
    }

    @Override
    public double calculateRoadDistanceMeters(double fromLatitude, double fromLongitude, double toLatitude, double toLongitude) {
        RestClient restClient = restClientBuilder
                .baseUrl(OSRM_BASE_URL)
                .build();

        String coordinates = fromLongitude + "," + fromLatitude
                + ";" + toLongitude + "," + toLatitude;

        OsrmRouteResponse response;

        try {
            response = restClient.get()
                    .uri("/route/v1/driving/{coordinates}?overview=false",
                            coordinates)
                    .header("Accept-Encoding", "identity")
                    .retrieve()
                    .body(OsrmRouteResponse.class);

        } catch (RestClientException ex) {

            log.error("OSRM Exception =",ex);
            throw new OsrmDistanceException(
                    "Failed to retrieve road distance from OSRM",
                    ex
            );
        }

        if (response == null
                || !"Ok".equals(response.code())
                || response.routes() == null
                || response.routes().isEmpty()) {

            throw new OsrmDistanceException(
                    "OSRM could not find a route between the coordinates"
            );
        }

        return response.routes().getFirst().distance();
    }

    @Override
    public double calculateRoadDistanceMeters(
            List<PatternStopProjection> patternStops) {

        if (patternStops == null || patternStops.size() < 2) {
            throw new IllegalArgumentException(
                    "At least two stops are required to calculate distance");
        }

        String coordinates = patternStops.stream()
                .map(stop -> stop.longitude() + "," + stop.latitude())
                .collect(Collectors.joining(";"));

        RestClient restClient = restClientBuilder
                .baseUrl(OSRM_BASE_URL)
                .build();

        OsrmRouteResponse response;

        try {
            response = restClient.get()
                    .uri("/route/v1/driving/{coordinates}?overview=false",
                            coordinates)
                    .header("Accept-Encoding", "identity")
                    .retrieve()
                    .body(OsrmRouteResponse.class);

        } catch (RestClientException ex) {
            throw new OsrmDistanceException(
                    "Failed to retrieve road distance from OSRM", ex);
        }

        if (response == null
                || !"Ok".equals(response.code())
                || response.routes() == null
                || response.routes().isEmpty()) {

            throw new OsrmDistanceException(
                    "OSRM could not find a route between the stops");
        }

        return response.routes().getFirst().distance();
    }


    @Override
    public RouteGeometryDto generateRouteGeometry(
            List<Coordinate> coordinates
    ) {

        if (coordinates == null || coordinates.size() < 2) {
            throw new IllegalArgumentException(
                    "At least two coordinates are required to generate route geometry"
            );
        }

        String osrmCoordinates = coordinates.stream()
                .map(coordinate ->
                        coordinate.longitude() + "," + coordinate.latitude()
                )
                .collect(Collectors.joining(";"));

        RestClient restClient = restClientBuilder
                .baseUrl(OSRM_BASE_URL)
                .build();

        OsrmRouteResponse response;

        try {
            response = restClient.get()
                    .uri(
                            "/route/v1/driving/{coordinates}?overview=full&geometries=geojson",
                            osrmCoordinates
                    )
                    .header("Accept-Encoding", "identity")
                    .retrieve()
                    .body(OsrmRouteResponse.class);

        } catch (RestClientException ex) {

            log.error("Failed to generate route geometry using OSRM", ex);

            throw new OsrmDistanceException(
                    "Failed to retrieve route geometry from OSRM",
                    ex
            );
        }

        if (response == null
                || !"Ok".equals(response.code())
                || response.routes() == null
                || response.routes().isEmpty()
                || response.routes().getFirst().geometry() == null) {

            throw new OsrmDistanceException(
                    "OSRM could not generate route geometry for the coordinates"
            );
        }

        OsrmGeometry geometry =
                response.routes().getFirst().geometry();

        return new RouteGeometryDto(
                geometry.type(),
                geometry.coordinates()
        );
    }





    private record OsrmGeometry(
            String type,
            List<List<Double>> coordinates
    ) {
    }

    private record OsrmRouteResponse(
            String code,
            List<OsrmRoute> routes
    ) {
    }

    private record OsrmRoute(
            double distance,
            double duration,
            OsrmGeometry geometry
    ) {
    }
}
