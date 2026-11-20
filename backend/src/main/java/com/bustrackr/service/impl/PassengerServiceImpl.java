package com.bustrackr.service.impl;

import com.bustrackr.dto.passenger.PassengerSearchRequest;
import com.bustrackr.dto.passenger.PassengerSearchResponse;
import com.bustrackr.entity.Trip;
import com.bustrackr.entity.TripSchedule;
import com.bustrackr.enums.TripScheduleStatus;
import com.bustrackr.enums.TripStatus;
import com.bustrackr.mapper.PassengerMapper;
import com.bustrackr.repository.PatternStopRepository;
import com.bustrackr.repository.RoutePatternRepository;
import com.bustrackr.repository.TripRepository;
import com.bustrackr.repository.TripScheduleRepository;
import com.bustrackr.security.CustomUserDetails;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.PassengerService;
import com.bustrackr.specification.TripScheduleSpecification;
import com.bustrackr.specification.TripSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

@RequiredArgsConstructor
@Service
public class PassengerServiceImpl implements PassengerService {

    private final RoutePatternRepository routePatternRepository;
    private final PatternStopRepository patternStopRepository;

    private final TripScheduleRepository tripScheduleRepository;
    private final TripRepository tripRepository;

    private final PassengerMapper passengerMapper;
    private final SecurityService securityService;



    private List<PassengerSearchResponse> search(PassengerSearchRequest passengerSearchRequest,Long transportSystemId) {

        List<TripSchedule> tripSchedules = new ArrayList<>();
        List<Trip> trips = new ArrayList<>();

        //If user applied any filter either by route or by stop
        if(passengerSearchRequest.stopId() !=null || passengerSearchRequest.routeId() != null) {
            Set<Long> routePatternIds = new HashSet<>();

            if (passengerSearchRequest.routeId() != null) {
                Set<Long> routePatternIds1 = routePatternRepository.findIdsByRouteId(passengerSearchRequest.routeId());
                if (!routePatternIds1.isEmpty()) {
                    routePatternIds.addAll(routePatternIds1);
                }
            }
            if (passengerSearchRequest.stopId() != null) {
                Set<Long> routePatternIds2 = patternStopRepository.findDistinctRoutePatternIdsByStopId(passengerSearchRequest.stopId());

                if (!routePatternIds2.isEmpty()) {
                    routePatternIds.addAll(routePatternIds2);
                }
            }

            DayOfWeek currentDay = LocalDate.now().getDayOfWeek();
            Set<TripStatus> statuses = Set.of(TripStatus.ACTIVE, TripStatus.SCHEDULED);


            if (passengerSearchRequest.startTime() != null && passengerSearchRequest.endTime() != null) {

                List<TripSchedule> tripSchedules1 = tripScheduleRepository.findAvailableSchedules(
                        routePatternIds,
                        TripScheduleStatus.ACTIVE,
                        currentDay,
                        passengerSearchRequest.startTime(),
                        passengerSearchRequest.endTime()
                );
                if (!tripSchedules1.isEmpty()) tripSchedules.addAll(tripSchedules1);

                List<Trip> trips1 = tripRepository.findAvailableTrips(
                        routePatternIds,
                        statuses,
                        LocalDate.now().atTime(passengerSearchRequest.startTime()),
                        LocalDate.now().atTime(passengerSearchRequest.endTime())
                );

                if (!trips1.isEmpty()) trips.addAll(trips1);
            } else {
                List<TripSchedule> tripSchedules2 = tripScheduleRepository.findByRoutePatternIdAndStatus(routePatternIds, TripScheduleStatus.ACTIVE, currentDay);
                if (!tripSchedules2.isEmpty()) tripSchedules.addAll(tripSchedules2);

                List<Trip> trips2 = tripRepository.findByRoutePatternsAndStatuses(routePatternIds, statuses);
                if (!trips2.isEmpty()) trips.addAll(trips2);
            }
        }

        //if User has not applied any filter then provide Active and Scheduled the trips of the entire System
        else{
            Specification<TripSchedule> tripScheduleSpecification=Specification.allOf();
            tripScheduleSpecification=tripScheduleSpecification.and(TripScheduleSpecification.hasTransportSystemId(transportSystemId));


            Specification<Trip> tripSpecification=Specification.allOf();
            tripSpecification=tripSpecification.and(TripSpecification.hasTransportSystemId(transportSystemId));
            tripSpecification=tripSpecification.and(TripSpecification.hasStatus(TripStatus.SCHEDULED));
            tripSpecification=tripSpecification.and(TripSpecification.hasStatus(TripStatus.ACTIVE));

            tripSchedules=tripScheduleRepository.findAll(tripScheduleSpecification);
            trips=tripRepository.findAll(tripSpecification);
        }

        List<PassengerSearchResponse> responses=new ArrayList<>(trips.size()+tripSchedules.size());

        tripSchedules.forEach(schedule ->
                responses.add(passengerMapper.toResponse(schedule))
        );

        trips.forEach(trip ->
                responses.add(passengerMapper.toResponse(trip))
        );

        responses.sort(
                Comparator.comparing(PassengerSearchResponse::scheduledStartTime)
        );

        return responses;
    }
    @Override
    @Transactional(readOnly = true)
    public List<PassengerSearchResponse> searchPrivateTrips(PassengerSearchRequest passengerSearchRequest) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();

        return search(passengerSearchRequest,customUserDetails.getTransportSystemId());
    }

        @Override
        @Transactional(readOnly = true)
    public List<PassengerSearchResponse> searchPublicTrips(PassengerSearchRequest request, Long transportSystemId) {
        return search(request,transportSystemId);
    }


}
