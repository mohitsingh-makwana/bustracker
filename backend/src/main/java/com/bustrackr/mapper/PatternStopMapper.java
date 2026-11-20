package com.bustrackr.mapper;

import com.bustrackr.dto.patternstop.CreatePatternStopRequest;
import com.bustrackr.dto.patternstop.PatternStopResponse;
import com.bustrackr.dto.patternstop.UpdatePatternStopsRequest;
import com.bustrackr.entity.PatternStop;
import com.bustrackr.entity.RoutePattern;
import com.bustrackr.entity.Stop;
import org.springframework.stereotype.Component;

@Component
public class PatternStopMapper {

    public PatternStop toEntity(CreatePatternStopRequest request) {
        return PatternStop.builder()
                .sequence(request.sequence())
                .stopArrivalTime(request.stopArrivalTime())
                .build();
    }



    public PatternStopResponse toResponse(PatternStop entity) {
        Stop stop=entity.getStop();
        RoutePattern routePattern=entity.getRoutePattern();
        return new PatternStopResponse(
                entity.getId(),
                routePattern.getId(),
                routePattern.getCode(),
                stop.getId(),
                stop.getName(),
                entity.getStopArrivalTime(),
                entity.getSequence(),
                stop.getLongitude(),
                stop.getLatitude()
        );
    }
}