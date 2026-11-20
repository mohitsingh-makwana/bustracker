package com.bustrackr.mapper;


import com.bustrackr.dto.passenger.PassengerSearchResponse;
import com.bustrackr.entity.*;
import com.bustrackr.enums.TripStatus;
import com.bustrackr.enums.TripType;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
public class PassengerMapper {

    @Transactional
    public PassengerSearchResponse toResponse(TripSchedule tripSchedule){
        Bus bus=tripSchedule.getBus();
        Driver driver=tripSchedule.getDriver();
        RoutePattern routePattern=tripSchedule.getRoutePattern();
        Route route=routePattern.getRoute();

        return PassengerSearchResponse.builder()
                .driverId(driver.getId())
                .driverName(driver.getName())
                .routePatternId(routePattern.getId())
                .routePatternName(routePattern.getName())
                .busId(bus.getId())
                .busNumber(tripSchedule.getBus().getBusNumber())
                .routeId(route.getId())
                .routeName(route.getName())
                .scheduledStartTime(LocalDate.now().atTime(tripSchedule.getScheduledStartTime()))
                .scheduledEndTime(LocalDate.now().atTime(tripSchedule.getScheduledEndTime()))
                .tripType(TripType.REGULAR)
                .tripScheduleId(tripSchedule.getId())
                .status(TripStatus.SCHEDULED)
                .build();
    }

    @Transactional
    public PassengerSearchResponse toResponse(Trip trip){

        Bus bus=trip.getBus();
        Driver driver=trip.getDriver();
        RoutePattern routePattern=trip.getRoutePattern();
        Route route=routePattern.getRoute();

        return PassengerSearchResponse.builder()
                .driverId(driver.getId())
                .driverName(driver.getName())
                .routePatternId(routePattern.getId())
                .routePatternName(routePattern.getName())
                .busId(bus.getId())
                .busNumber(bus.getBusNumber())
                .routeId(route.getId())
                .routeName(route.getName())
                .scheduledStartTime(trip.getScheduledStartTime())
                .scheduledEndTime(trip.getScheduledEndTime())
                .tripType(trip.getTripType())
                .status(trip.getStatus())
                .tripId(trip.getId())
                .build();

    }
}
