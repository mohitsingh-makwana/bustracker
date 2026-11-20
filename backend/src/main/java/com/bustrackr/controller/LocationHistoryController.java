package com.bustrackr.controller;

import com.bustrackr.dto.location.CreateLocationHistoryRequest;
import com.bustrackr.dto.location.LocationHistoryResponse;
import com.bustrackr.service.LocationHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/location-history")
@RequiredArgsConstructor
public class LocationHistoryController {

    private final LocationHistoryService locationHistoryService;

    @PostMapping
    public ResponseEntity<LocationHistoryResponse> create(
            @Valid @RequestBody CreateLocationHistoryRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(locationHistoryService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LocationHistoryResponse> getById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                locationHistoryService.getById(id)
        );
    }

    @GetMapping
    public ResponseEntity<Page<LocationHistoryResponse>> getAll(@RequestParam(defaultValue = "0")int page,
                                                                  @RequestParam(defaultValue = "10")int size) {

        return ResponseEntity.ok(
                locationHistoryService.getAll(page,size)
        );
    }

    @GetMapping("/trip/{tripId}")
    public ResponseEntity<Page<LocationHistoryResponse>> getByTrip(Pageable pageable,
            @PathVariable Long tripId) {

        return ResponseEntity.ok(
                locationHistoryService.getByTripId(tripId,pageable)
        );
    }
}