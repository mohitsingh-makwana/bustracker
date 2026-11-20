package com.bustrackr.mapper;

import com.bustrackr.dto.trips.CreateTripRequest;
import com.bustrackr.dto.trips.TripFullDetailsResponse;
import com.bustrackr.dto.trips.TripResponse;
import com.bustrackr.entity.RoutePattern;
import com.bustrackr.entity.Trip;
import com.bustrackr.enums.TripType;
import org.springframework.stereotype.Component;

@Component
public class TripMapper {

    public Trip toEntity(CreateTripRequest request){
        return Trip.builder()
                .scheduledStartTime(request.scheduledStartTime())
                .scheduledEndTime(request.scheduledEndTime())
                .build();
    }

    public TripResponse toResponse(Trip trip){
        RoutePattern routePattern=trip.getRoutePattern();
        return TripResponse.builder()
                .id(trip.getId())
                .scheduledStartTime(trip.getScheduledStartTime())
                .scheduledEndTime(trip.getScheduledEndTime())
                .actualStartTime(trip.getActualStartTime())
                .actualEndTime(trip.getActualEndTime())
                .startLatitude(trip.getStartLatitude())
                .startLongitude(trip.getStartLongitude())
                .endLatitude(trip.getEndLatitude())
                .endLongitude(trip.getEndLongitude())
                .distanceKm(trip.getDistanceKm())
                .status(trip.getStatus())
                .tripType(TripType.SINGLE)
                .routePatternName(routePattern.getName())
                .routePatternCode(routePattern.getCode())
                .busNumber(trip.getBus().getBusNumber())
                .driverName(trip.getDriver().getName())
                .originStopName(routePattern.getOrigin().getName())
                .destinationStopName(routePattern.getDestination().getName())
                .build();
    }

    public TripFullDetailsResponse toFullDetailsResponse(Trip trip){
        RoutePattern routePattern=trip.getRoutePattern();

        return TripFullDetailsResponse.builder()
                .tripId(trip.getId())
                .tripType(TripType.SINGLE)
                .routePatternName(routePattern.getName())
                .routePatternCode(routePattern.getCode())
                .routeGeometry(routePattern.getRouteGeometry())
                .routeName(routePattern.getRoute().getName())
                .busNumber(trip.getBus().getBusNumber())
                .driverName(trip.getDriver().getName())
                .originStopName(routePattern.getOrigin().getName())
                .destinationStopName(routePattern.getDestination().getName())
                .scheduledTripStartTime(trip.getScheduledStartTime())
                .scheduledTripEndTime(trip.getScheduledEndTime())
                .status(trip.getStatus())
                .build();
    }
}
