package com.bustrackr.service;

import com.bustrackr.dto.routepattern.Coordinate;
import com.bustrackr.dto.routepattern.RouteGeometryDto;
import com.bustrackr.projection.PatternStopProjection;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface OsrmDistanceService {

    double calculateRoadDistanceMeters( double fromLatitude,
                                        double fromLongitude,
                                        double toLatitude,
                                        double toLongitude);

    double calculateRoadDistanceMeters(List<PatternStopProjection> patternStops);

    RouteGeometryDto generateRouteGeometry(List<Coordinate> coordinates);

}
