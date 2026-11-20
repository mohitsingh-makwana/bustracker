package com.bustrackr.controller;

import com.bustrackr.dto.stop.CreateStopRequest;
import com.bustrackr.dto.stop.StopFilter;
import com.bustrackr.dto.stop.StopResponse;
import com.bustrackr.dto.stop.UpdateStopRequest;
import com.bustrackr.service.StopService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/stops")
@RequiredArgsConstructor
public class StopController {

    private final StopService stopService;

    @PostMapping
    public ResponseEntity<StopResponse> create(
            @Valid @RequestBody CreateStopRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(stopService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StopResponse> getById(
            @PathVariable Long id) {

        return ResponseEntity.ok(stopService.getStopsById(id));
    }


    @PatchMapping("/{id}")
    public ResponseEntity<StopResponse> update(
            @PathVariable Long id,
            @RequestBody UpdateStopRequest request) {

        return ResponseEntity.ok(
                stopService.updateStops(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        stopService.deleteStops(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<Page<StopResponse>> getPrivateStops(@RequestParam(defaultValue = "0")int page,
                                                              @RequestParam(defaultValue = "10")int size,
                                                              @ModelAttribute StopFilter filter) {

        return ResponseEntity.ok(stopService.getPrivateStops(page,size,filter));
    }

    @GetMapping("/public")
    public ResponseEntity<Page<StopResponse>> getPublicStops(@NotNull(message = "Transport System id is required") @RequestHeader("X-Transport-System") Long transportSystemId,
                                                             @RequestParam(defaultValue = "0")int page,
                                                             @RequestParam(defaultValue = "10")int size){
        return ResponseEntity.ok(stopService.getPublicStops(page,size,transportSystemId));
    }
}