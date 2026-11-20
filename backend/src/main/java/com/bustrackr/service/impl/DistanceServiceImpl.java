package com.bustrackr.service.impl;

import com.bustrackr.dto.routepattern.Coordinate;
import com.bustrackr.dto.routepattern.RouteGeometryDto;
import com.bustrackr.service.DistanceService;
import com.bustrackr.service.HaversineDistanceService;
import com.bustrackr.service.OsrmDistanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DistanceServiceImpl implements DistanceService {

    private final OsrmDistanceService osrmDistanceService;
    private final HaversineDistanceService haversineDistanceService;

    @Override
    public double nextStopDistanceMeters(double startLatitude, double startLongitude, double endLatitude, double endLongitude) {
        return osrmDistanceService.calculateRoadDistanceMeters(
                startLatitude,
                startLongitude,
                endLatitude,
                endLongitude
        );
    }

    @Override
    public double remainingDistanceMeters(double startLatitude, double startLongitude, double endLatitude, double endLongitude) {
        return  osrmDistanceService.calculateRoadDistanceMeters(
                startLatitude,
                startLongitude,
                endLatitude,
                endLongitude
        );
    }

    @Override
    public double distanceBetweenCoordinates(double startLatitude, double startLongitude, double endLatitude, double endLongitude) {
        return haversineDistanceService.haversineKm(
                startLatitude,
                startLongitude,
                endLatitude,
                endLongitude
        );
    }

    @Override
    public RouteGeometryDto getRouteGeometry(List<Coordinate> coordinates) {
        return osrmDistanceService.generateRouteGeometry(coordinates);
    }



}
