package com.bustrackr.mapper;

import com.bustrackr.dto.trips.TripFullDetailsResponse;
import com.bustrackr.dto.tripschedule.CreateTripScheduleRequest;
import com.bustrackr.dto.tripschedule.TripScheduleResponse;
import com.bustrackr.dto.tripschedule.UpdateTripScheduleRequest;
import com.bustrackr.entity.RoutePattern;
import com.bustrackr.entity.TripSchedule;
import com.bustrackr.enums.TripStatus;
import com.bustrackr.enums.TripType;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Component
public class TripScheduleMapper {

    public TripSchedule toEntity(CreateTripScheduleRequest request) {
        return TripSchedule.builder()
                .scheduledStartTime(request.scheduledStartTime())
                .scheduledEndTime(request.scheduledEndTime())
                .operatingDays(request.operatingDays())
                .build();
    }

    public void updateEntity(UpdateTripScheduleRequest request, TripSchedule entity) {

        if (request.scheduledStartTime() != null) {
            entity.setScheduledStartTime(request.scheduledStartTime());
        }

        if (request.scheduledEndTime() != null) {
            entity.setScheduledEndTime(request.scheduledEndTime());
        }
        if (request.scheduleStatus() != null) {
            entity.setScheduleStatus(request.scheduleStatus());
        }

    }

    public TripScheduleResponse toResponse(TripSchedule entity) {

        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("hh:mm a");

        String startTime = entity.getScheduledStartTime().format(formatter);
        String endTime =entity.getScheduledEndTime().format(formatter);

        return new TripScheduleResponse(
                entity.getId(),
                entity.getTransportSystem().getId(),
                entity.getRoutePattern().getId(),
                entity.getBus().getId(),
                entity.getDriver().getId(),
                entity.getScheduleStatus(),
                startTime,
                endTime,
                entity.getOperatingDays(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public TripFullDetailsResponse toFullDetailsResponse(TripSchedule trip){
        RoutePattern routePattern = trip.getRoutePattern();

        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("hh:mm a");

        String startTime =
                trip.getScheduledStartTime().format(formatter);

        String endTime =
                trip.getScheduledEndTime().format(formatter);


        return TripFullDetailsResponse.builder()
                .tripScheduleId(trip.getId())
                .tripType(TripType.REGULAR)
                .routePatternName(routePattern.getName())
                .routePatternCode(routePattern.getCode())
                .routeName(routePattern.getRoute().getName())
                .routeGeometry(routePattern.getRouteGeometry())
                .busNumber(trip.getBus().getBusNumber())
                .driverName(trip.getDriver().getName())
                .originStopName(routePattern.getOrigin().getName())
                .destinationStopName(routePattern.getDestination().getName())
                .scheduledTripScheduleStartTime(startTime)
                .scheduledTripScheduleEndTime(endTime)
                .operatingDays(trip.getOperatingDays())
                .status(TripStatus.SCHEDULED)
                .build();
    }
}