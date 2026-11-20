package com.bustrackr.service;

import com.bustrackr.dto.patternstop.CreatePatternStopRequest;
import com.bustrackr.dto.patternstop.PatternStopResponse;
import com.bustrackr.dto.patternstop.UpdatePatternStopsRequest;
import com.bustrackr.dto.routepattern.RoutePatternInfoResponse;
import com.bustrackr.entity.PatternStop;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface PatternStopService {
    void create(@Valid List<CreatePatternStopRequest> requests, Long routePatternId);

    PatternStopResponse getById(Long id);

    List<PatternStopResponse> getAllByRoutePatternId(Long routePatternId);

    void delete(Long id);

    List<PatternStopResponse> replaceAll(Long routePatternId, @NotNull(message = "Pattern stops are required") @Size(min = 2, message = "A pattern must contain at least two stops") List<@NotNull @Valid CreatePatternStopRequest> createPatternStopRequests);
}
