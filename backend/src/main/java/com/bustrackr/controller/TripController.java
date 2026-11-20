package com.bustrackr.controller;

import com.bustrackr.dto.location.LiveBusLocationDto;
import com.bustrackr.dto.location.LiveLocationResponse;
import com.bustrackr.dto.location.LocationHistoryResponse;
import com.bustrackr.dto.location.UpdateLocationRequest;
import com.bustrackr.dto.patternstop.PatternStopResponse;
import com.bustrackr.dto.route.RouteResponse;
import com.bustrackr.dto.trips.*;
import com.bustrackr.service.TripService;
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

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/trips")
@Validated
public class TripController {

private final TripService tripService;

    @PostMapping()
    public ResponseEntity<TripFullDetailsResponse> create(
            @Valid @RequestBody CreateTripRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(tripService.create(request));
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        tripService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{tripId}")
    public ResponseEntity<TripFullDetailsResponse> getPrivateTrip(@PathVariable Long tripId){
        return ResponseEntity.ok(tripService.getPrivateTrip(tripId));
    }

    @GetMapping("/public/{tripId}/")
    public ResponseEntity<TripFullDetailsResponse> getPublicTrip(@RequestHeader("X-Transport-System") Long transportSystemId,
                                                      @PathVariable Long tripId){
        return ResponseEntity.ok(tripService.getPublicTrip(transportSystemId,tripId));
    }

    @GetMapping("/transport-system")
    public ResponseEntity<Page<TripFullDetailsResponse>> getPrivateTransportSystemTrips(@ModelAttribute TripFilter filter,
                                                                                        @RequestParam(defaultValue = "0") int page,
                                                                                        @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(tripService.getPrivateTransportSystemTrips(filter,page,size));
    }

    @GetMapping("/transport-system/public")
    public ResponseEntity<Page<TripFullDetailsResponse>> getPublicTransportSystemTrips(@RequestHeader("X-Transport-System")Long transportSystemId,
                                                                                       @RequestParam(defaultValue = "0") int page,
                                                                                       @RequestParam(defaultValue = "10") int size,
                                                                                       @ModelAttribute TripFilter filter) {
        return ResponseEntity.ok(tripService.getPublicTransportSystemTrips(transportSystemId,filter,page,size));
    }


   @GetMapping("/my/current")
    public ResponseEntity<TripFullDetailsResponse> getMyCurrentTrip() {
        return ResponseEntity.ok(tripService.getMyCurrentTrip());
    }

    @GetMapping("/my/single-upcoming")
    public ResponseEntity<Page<TripFullDetailsResponse>> getMyUpcomingTrips(Pageable pageable) {
        return ResponseEntity.ok(tripService.getMyUpcomingTrips(pageable));
    }

    @GetMapping("/my/history")
    public ResponseEntity<Page<TripFullDetailsResponse>> getMyTripHistory(Pageable pageable) {
        return ResponseEntity.ok(tripService.getMyTripHistory(pageable));
    }

    @PostMapping("/my/{id}/start")
    public ResponseEntity<TripFullDetailsResponse> start(@NotNull @PathVariable Long id) {

        return ResponseEntity.ok(tripService.start(id));
    }

    @PatchMapping("/my/{id}/complete")
    public ResponseEntity<TripResponse> markTripComplete(@NotNull @PathVariable Long id){
        return ResponseEntity.ok(tripService.markTripComplete(id));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<TripResponse> cancelScheduledTrip(@NotNull @PathVariable Long id){
        return ResponseEntity.ok(tripService.cancelScheduledTrip(id));
    }

    @PatchMapping("/{id}/terminate")
    public ResponseEntity<TripResponse> terminateActiveTrip(@NotNull @PathVariable Long id){
        return ResponseEntity.ok(tripService.terminateActiveTrip(id));
    }

    @GetMapping("/{id}/stops")
    public ResponseEntity<List<PatternStopResponse>> getPrivateStops(@PathVariable Long id) {
        return ResponseEntity.ok(tripService.getPrivateStops(id));
    }
    @GetMapping("/{id}/stops/public")
    public ResponseEntity<List<PatternStopResponse>> getPublicStops(@RequestHeader("X-Transport-System")Long transportSystemId,
                                                                    @PathVariable Long id) {
        return ResponseEntity.ok(tripService.getPublicStops(id,transportSystemId));
    }
    @GetMapping("/{id}/{currentStop}/next-stop")
    public ResponseEntity<PatternStopResponse> getNextPrivateStop(@PathVariable Long id,
                                                    @PathVariable Long currentStop) {
        Long sequence=currentStop+1;
        return ResponseEntity.ok(tripService.getNextPrivateStop(id,sequence));
    }

    @GetMapping("/{id}/{currentStop}/next-stop/public")
    public ResponseEntity<PatternStopResponse> getNextPublicStop(@RequestHeader("X-Transport-System")Long transportSystemId,
                                                                 @PathVariable Long id,
                                                                  @PathVariable Long currentStop) {
        Long sequence=currentStop+1;
        return ResponseEntity.ok(tripService.getNextPublicStop(id,sequence,transportSystemId));
    }

    @PostMapping("/{tripId}/locations")
    public ResponseEntity<LocationHistoryResponse> updateLatestLocation(@Valid @RequestBody UpdateLocationRequest request,
                                                       @PathVariable Long tripId) {
        return ResponseEntity.ok(tripService.updateLocation(request,tripId));
    }

    @GetMapping("{tripId}/live-location/public")
    public ResponseEntity<LiveLocationResponse> get(@RequestHeader("X-Transport-System")Long transportSystemId,
                                                    @PathVariable Long tripId) {
        return tripService.getPublicLiveLocation(transportSystemId,tripId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{tripId}/live-location")
    public ResponseEntity<LiveLocationResponse> get(@PathVariable Long tripId) {

        return tripService.getPrivateLiveLocation(tripId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/admin/filter-options")
    public ResponseEntity<AdminTripFilterOptions> getAdminFilterOptions(){
        return  ResponseEntity.ok(tripService.getAdminFilterOptions());
    }
    @GetMapping("/passenger/filter-options/public")
    public ResponseEntity<PassengerTripFilterOptions> getPublicPassengerFilterOptions(@NotNull(message = "Transport System id is required") @RequestHeader("X-Transport-System") Long transportSystemId){
        return ResponseEntity.ok(tripService.getPublicPassengerFilterOptions(transportSystemId));
    }
    @GetMapping("/passenger/filter-options")
    public ResponseEntity<PassengerTripFilterOptions> getPrivatePassengerFilterOptions(){
    return ResponseEntity.ok(tripService.getPrivatePassengerFilterOptions());
    }
    @GetMapping("/transport-system/live-buses")
    public ResponseEntity<List<LiveBusLocationDto>> getLiveBuses(){
        return ResponseEntity.ok(tripService.getLiveBusesCoordinates());
    }





}
