package com.bustrackr.service;

import com.bustrackr.dto.trips.TripFullDetailsResponse;
import com.bustrackr.dto.tripschedule.CreateTripScheduleRequest;
import com.bustrackr.dto.tripschedule.TripScheduleFilter;
import com.bustrackr.dto.tripschedule.TripScheduleResponse;
import com.bustrackr.dto.tripschedule.UpdateTripScheduleRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public interface TripScheduleService {
    TripScheduleResponse create(@Valid CreateTripScheduleRequest request);

    TripScheduleResponse update(Long id, UpdateTripScheduleRequest request);

    void delete(Long id);

    Page<TripFullDetailsResponse> getUpcomingTrips(Pageable pageable);

    TripFullDetailsResponse startTrip(@NotNull Long id);

    TripFullDetailsResponse getPrivateTripSchedule(Long id);

    TripFullDetailsResponse getPublicTripSchedule(Long id, Long transportSystemId);

    Page<TripFullDetailsResponse> getPrivateTrips(TripScheduleFilter filter, Pageable pageable);

    Page<TripFullDetailsResponse> getPublicTrips(Long transportSystemId, TripScheduleFilter filter, Pageable pageable);
}
