
package com.bustrackr.controller;

import com.bustrackr.dto.patternstop.PatternStopResponse;
import com.bustrackr.dto.patternstop.UpdatePatternStopsRequest;
import com.bustrackr.service.PatternStopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/pattern-stops")
@RequiredArgsConstructor
public class PatternStopController {

    private final PatternStopService patternStopService;

    @GetMapping("/{id}")
    public ResponseEntity<PatternStopResponse> getById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                patternStopService.getById(id)
        );
    }

    @GetMapping("/by-pattern/{routePatternId}")
    public ResponseEntity<List<PatternStopResponse>> getAllPatternStops(
            @PathVariable Long routePatternId) {

        return ResponseEntity.ok(
                patternStopService.getAllByRoutePatternId(routePatternId)
        );
    }

    @PutMapping("/by-pattern/{routePatternId}")
    public ResponseEntity<List<PatternStopResponse>> replacePatternStops(
            @PathVariable Long routePatternId,
            @Valid @RequestBody UpdatePatternStopsRequest request) {

        return ResponseEntity.ok(
                patternStopService.replaceAll(
                        routePatternId,
                        request.patternStopRequests()
                )
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        patternStopService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
