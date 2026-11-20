package com.bustrackr.service;

import com.bustrackr.dto.routepattern.Coordinate;
import com.bustrackr.dto.routepattern.RouteGeometryDto;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface DistanceService {


    double nextStopDistanceMeters(
            double startLatitude,
            double startLongitude,
            double endLatitude,
            double endLongitude
    );

    double remainingDistanceMeters(
            double startLatitude,
            double startLongitude,
            double endLatitude,
            double endLongitude
    );

    double distanceBetweenCoordinates(
            double startLatitude,
            double startLongitude,
            double endLatitude,
            double endLongitude
    );

    RouteGeometryDto getRouteGeometry(List<Coordinate> coordinates);

}
