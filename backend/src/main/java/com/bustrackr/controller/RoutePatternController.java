package com.bustrackr.controller;

import com.bustrackr.dto.routepattern.CreateRoutePatternRequest;
import com.bustrackr.dto.routepattern.RoutePatternFilter;
import com.bustrackr.dto.routepattern.RoutePatternResponse;
import com.bustrackr.dto.routepattern.UpdateRoutePatternRequest;
import com.bustrackr.service.RoutePatternService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/route-patterns")
@RequiredArgsConstructor
public class RoutePatternController {

    private final RoutePatternService routePatternService;

    @PostMapping
    public ResponseEntity<RoutePatternResponse> create(
            @Valid @RequestBody CreateRoutePatternRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(routePatternService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoutePatternResponse> getById(
            @PathVariable Long id) {

        return ResponseEntity.ok(routePatternService.getById(id));
    }

    @GetMapping
    public ResponseEntity<Page<RoutePatternResponse>> getAll(@RequestParam(defaultValue = "0")int page,
                                                             @RequestParam(defaultValue = "10")int size,
                                                             @ModelAttribute RoutePatternFilter filter) {

        return ResponseEntity.ok(routePatternService.getAll(page,size,filter));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<RoutePatternResponse> update(
            @PathVariable Long id,
            @RequestBody UpdateRoutePatternRequest request) {

        return ResponseEntity.ok(
                routePatternService.update(id, request)
        );
    }

    @PutMapping("/{id}/stops")
    public ResponseEntity<RoutePatternResponse> updatePatternStops(
            @PathVariable Long id,
            @RequestBody UpdateRoutePatternRequest request) {

        return ResponseEntity.ok(
                routePatternService.update(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        routePatternService.delete(id);
        return ResponseEntity.noContent().build();
    }
}