package com.bustrackr.controller;

import com.bustrackr.dto.route.CreateRouteRequest;
import com.bustrackr.dto.route.RouteResponse;
import com.bustrackr.dto.route.UpdateRouteRequest;
import com.bustrackr.enums.RouteStatus;
import com.bustrackr.service.RouteService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    @PostMapping
    public ResponseEntity<RouteResponse> create(
            @Valid @RequestBody CreateRouteRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(routeService.create(request));
    }

    @GetMapping
    public ResponseEntity<Page<RouteResponse>> getRoutes(@RequestParam(defaultValue = "0")int page,
                                                         @RequestParam(defaultValue = "10")int size
                                                         ) {

        return ResponseEntity.ok(routeService.getPrivateRoutes(page,size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RouteResponse> getRoute(@PathVariable Long id) {

        return ResponseEntity.ok(routeService.getRoute(id));
    }
    @PatchMapping("{id}/status/{status}")
    public ResponseEntity<?> updateRouteStatus(@PathVariable Long id,
                                               @PathVariable RouteStatus status) {

        return ResponseEntity.ok(routeService.setStatus(status,id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<RouteResponse> update(
            @PathVariable Long id,
            @RequestBody UpdateRouteRequest request) {

        return ResponseEntity.ok(
                routeService.update(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        routeService.delete(id);
        return ResponseEntity.noContent().build();
    }



}