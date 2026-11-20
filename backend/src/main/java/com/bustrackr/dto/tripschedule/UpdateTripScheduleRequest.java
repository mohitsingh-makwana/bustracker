package com.bustrackr.dto.tripschedule;

import com.bustrackr.enums.TripScheduleStatus;

import java.time.LocalTime;

public record UpdateTripScheduleRequest(

        LocalTime scheduledStartTime,

        LocalTime scheduledEndTime,

        Long busId,

        Long driverId,

        TripScheduleStatus scheduleStatus

) {
}