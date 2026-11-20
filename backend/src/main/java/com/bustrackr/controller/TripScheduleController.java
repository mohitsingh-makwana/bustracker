package com.bustrackr.controller;

import com.bustrackr.dto.trips.TripFullDetailsResponse;
import com.bustrackr.dto.trips.TripResponse;
import com.bustrackr.dto.tripschedule.CreateTripScheduleRequest;
import com.bustrackr.dto.tripschedule.TripScheduleFilter;
import com.bustrackr.dto.tripschedule.TripScheduleResponse;
import com.bustrackr.dto.tripschedule.UpdateTripScheduleRequest;
import com.bustrackr.entity.TripSchedule;
import com.bustrackr.service.TripScheduleService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/trip-schedules")
@RequiredArgsConstructor
@Validated
public class TripScheduleController {

    private final TripScheduleService tripScheduleService;

    @PostMapping
    public ResponseEntity<TripScheduleResponse> create(
            @Valid @RequestBody CreateTripScheduleRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(tripScheduleService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TripFullDetailsResponse> getPrivateTripSchedule(
            @PathVariable Long id) {

        return ResponseEntity.ok(tripScheduleService.getPrivateTripSchedule(id));
    }

    @GetMapping("/public/{id}")
    public ResponseEntity<TripFullDetailsResponse> getPublicTripSchedule(@RequestHeader("X-Transport-System")Long transportSystemId,
                                                                      @PathVariable Long id) {

        return ResponseEntity.ok(tripScheduleService.getPublicTripSchedule(id,transportSystemId));
    }


    @GetMapping("/transport-system")
    public ResponseEntity<Page<TripFullDetailsResponse>> getPrivateTrips(@ModelAttribute TripScheduleFilter filter,
                                                                         @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(
                tripScheduleService.getPrivateTrips(filter,pageable)
        );
    }

    @GetMapping("/transport-system/public")
    public ResponseEntity<Page<TripFullDetailsResponse>> getPublicTrips(@RequestHeader("X-Transport-System")Long transportSystemId,
                                                                     @ModelAttribute TripScheduleFilter filter,
                                                                     Pageable pageable) {

        return ResponseEntity.ok(
                tripScheduleService.getPublicTrips( transportSystemId,filter,pageable)
        );
    }

    @PatchMapping("/{id}")
    public ResponseEntity<TripScheduleResponse> update(
            @PathVariable Long id,
            @RequestBody UpdateTripScheduleRequest request) {

        return ResponseEntity.ok(
                tripScheduleService.update(id, request)
        );
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TripScheduleResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody UpdateTripScheduleRequest request) {

        return ResponseEntity.ok(
                tripScheduleService.update(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        tripScheduleService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my/regular-upcoming")
    public ResponseEntity<Page<TripFullDetailsResponse>> getUpcomingTrips(Pageable pageable){

        return ResponseEntity.ok(tripScheduleService.getUpcomingTrips(pageable));
    }

    @PostMapping("/my/{id}/start")
    public ResponseEntity<TripFullDetailsResponse> startTrip(@NotNull @PathVariable Long id){
        return ResponseEntity.ok(tripScheduleService.startTrip(id));
    }


}