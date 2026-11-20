package com.bustrackr.controller;

import com.bustrackr.dto.bus.BusFilterRequest;
import com.bustrackr.dto.bus.CreateBusRequest;
import com.bustrackr.dto.bus.UpdateBusRequest;
import com.bustrackr.dto.bus.BusResponse;
import com.bustrackr.service.BusService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/buses")
@RequiredArgsConstructor
public class BusController {

    private final BusService busService;

    @PostMapping
    public ResponseEntity<BusResponse> createBus(
            @Valid @RequestBody CreateBusRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(busService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusResponse> getBusById(
            @PathVariable Long id) {

        return ResponseEntity.ok(busService.getById(id));
    }


    @GetMapping
    public ResponseEntity<Page<BusResponse>> getAllTransportSystemBuses(@ModelAttribute BusFilterRequest request,
                                                                        Pageable pageable) {

        return ResponseEntity.ok(busService.getAllTransportSystemBuses(pageable,request));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<BusResponse> updateBus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBusRequest request) {

        return ResponseEntity.ok(busService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBus(
            @PathVariable Long id) {

        busService.delete(id);
        return ResponseEntity.noContent().build();
    }
}