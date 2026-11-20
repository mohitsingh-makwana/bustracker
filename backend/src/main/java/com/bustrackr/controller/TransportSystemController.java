package com.bustrackr.controller;

import com.bustrackr.dto.auth.LoginResponse;
import com.bustrackr.dto.transportmember.MembershipCheckResponse;
import com.bustrackr.dto.transportmember.TransportMemberResponse;
import com.bustrackr.dto.transportsystem.CreateTransportSystemRequest;
import com.bustrackr.dto.transportsystem.TransportSystemResponse;
import com.bustrackr.dto.transportsystem.UpdateTransportSystemRequest;
import com.bustrackr.projection.RouteCountResponse;
import com.bustrackr.projection.ActiveTripsCountResponse;
import com.bustrackr.service.TransportSystemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/transport-systems")
@RequiredArgsConstructor
@EnableMethodSecurity
public class TransportSystemController {

    private final TransportSystemService transportSystemService;

    @PostMapping
    public ResponseEntity<TransportSystemResponse> create(
            @Valid @RequestBody CreateTransportSystemRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transportSystemService.create(request));
    }

    @GetMapping("/public/{id}")
    public ResponseEntity<TransportSystemResponse> getPublicTransportById(
            @PathVariable Long id) {

        return ResponseEntity.ok(transportSystemService.getPublicTransportById(id));
    }

    @GetMapping
    public ResponseEntity<TransportSystemResponse> getPrivateTransportById() {

        return ResponseEntity.ok(transportSystemService.getPrivateTransportById());
    }

    @GetMapping("/public")
    public ResponseEntity<Page<TransportSystemResponse>> getAllPublicTransport(@RequestParam(defaultValue = "0") int page,
                                                                               @RequestParam(defaultValue = "10") int size,
                                                                               @RequestParam(required = false) String name,
                                                                               @RequestParam(required = false) String city) {

        return ResponseEntity.ok(transportSystemService.getAllPublicTransport(page,size,name,city));
    }

    @GetMapping("/route-count")
    public ResponseEntity<List<RouteCountResponse>> getRouteCount() {

        return ResponseEntity.ok(transportSystemService.getRouteCount());
    }

    @GetMapping("/active-trip-count")
    public ResponseEntity<List<ActiveTripsCountResponse>> getActiveTripCount() {

        return ResponseEntity.ok(transportSystemService.getActiveTrips());
    }

    @GetMapping("/my")
    public ResponseEntity<Page<TransportSystemResponse>> getTransportSystemsByUserId(Pageable pageable) {

        return ResponseEntity.ok(transportSystemService.getTransportSystemsByUserId(pageable));
    }






    @PostMapping("/{transportSystemId}/access")
    public ResponseEntity<LoginResponse> access(@PathVariable Long transportSystemId){
        LoginResponse response=transportSystemService.checkAccess(transportSystemId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{transportSystemId}/membership-check")
    public ResponseEntity<MembershipCheckResponse> checkMembership(
            @PathVariable Long transportSystemId) {

        return ResponseEntity.ok(
                transportSystemService.checkMembership(transportSystemId)
        );
    }

    @PostMapping("/{transportSystemId}/membership-request")
    public ResponseEntity<TransportMemberResponse> requestMembership(
            @PathVariable Long transportSystemId) {

        return ResponseEntity.ok(
                transportSystemService.requestMembership(transportSystemId)
        );
    }



    @PatchMapping("/{id}")
    public ResponseEntity<TransportSystemResponse> update(
            @PathVariable Long id,
            @RequestBody UpdateTransportSystemRequest request) {

        return ResponseEntity.ok(
                transportSystemService.update(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        transportSystemService.delete(id);
        return ResponseEntity.noContent().build();
    }

}