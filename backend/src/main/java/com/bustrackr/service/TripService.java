package com.bustrackr.service;

import com.bustrackr.dto.location.LiveBusLocationDto;
import com.bustrackr.dto.location.LiveLocationResponse;
import com.bustrackr.dto.location.LocationHistoryResponse;
import com.bustrackr.dto.location.UpdateLocationRequest;
import com.bustrackr.dto.patternstop.PatternStopResponse;
import com.bustrackr.dto.route.RouteResponse;
import com.bustrackr.dto.trips.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public interface TripService {
    TripFullDetailsResponse getMyCurrentTrip();

    Page<TripFullDetailsResponse> getMyUpcomingTrips(Pageable pageable);

    Page<TripFullDetailsResponse> getMyTripHistory(Pageable pageable);

    TripFullDetailsResponse create(@Valid CreateTripRequest request);


    TripFullDetailsResponse getPrivateTrip(Long id);

    void delete(Long id);

    TripFullDetailsResponse start(Long id);

    TripResponse markTripComplete(@NotNull Long id);

    TripResponse cancelScheduledTrip(@NotNull Long id);

    TripResponse terminateActiveTrip(@NotNull Long id);

    TripFullDetailsResponse getPublicTrip(Long transportSystemId, Long tripId);

    LocationHistoryResponse updateLocation(@Valid UpdateLocationRequest request, Long tripId);
    
    Optional<LiveLocationResponse> getPublicLiveLocation(Long transportSystemId, Long tripId);

    Optional<LiveLocationResponse> getPrivateLiveLocation(Long tripId);

    Page<TripFullDetailsResponse> getPrivateTransportSystemTrips(TripFilter status,int page,int size);

    Page<TripFullDetailsResponse> getPublicTransportSystemTrips(Long transportSystemId, TripFilter filter,int page,int size);

    List<PatternStopResponse> getPrivateStops(Long id);

    List<PatternStopResponse> getPublicStops(Long id,Long transportSystemId);

    PatternStopResponse getNextPrivateStop(Long id, Long sequence);

    PatternStopResponse getNextPublicStop(Long id, Long sequence,Long transportSystemId);

    AdminTripFilterOptions getAdminFilterOptions();

    PassengerTripFilterOptions getPublicPassengerFilterOptions(@NotNull(message = "Transport System id is required") Long transportSystemId);

    PassengerTripFilterOptions getPrivatePassengerFilterOptions();

    List<LiveBusLocationDto> getLiveBusesCoordinates();
}
