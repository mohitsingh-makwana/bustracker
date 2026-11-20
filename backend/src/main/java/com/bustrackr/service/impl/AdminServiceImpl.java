package com.bustrackr.service.impl;

import com.bustrackr.dto.admin.AdminDashboardSummaryResponse;
import com.bustrackr.dto.driver.DriverResponse;
import com.bustrackr.enums.BusStatus;
import com.bustrackr.enums.DriverStatus;
import com.bustrackr.enums.TransportMemberRole;
import com.bustrackr.enums.TransportMemberStatus;
import com.bustrackr.projection.BusStatusCountResponse;
import com.bustrackr.projection.TripStatusCountResponse;
import com.bustrackr.repository.*;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final BusRepository busRepository;
    private final DriverRepository driverRepository;
    private final TripRepository tripRepository;
    private final TripScheduleRepository tripScheduleRepository;
    private final TransportMemberRepository transportMemberRepository;
    private final SecurityService securityService;


    @Override
    public AdminDashboardSummaryResponse getDashboardSummary() {
       List< BusStatusCountResponse> busStatusCountList=busRepository.getCountByTransportSystemIdAndStatus(securityService.getCurrentTransportSystemId());
       AtomicLong liveBuses= new AtomicLong(0L);
       AtomicLong availableBuses= new AtomicLong(0L);

       busStatusCountList.forEach(busStatusCount->{
           if(BusStatus.IN_USE.name().equals(busStatusCount.status().name())) {
               liveBuses.set(busStatusCount.count());
           } else if (BusStatus.AVAILABLE.name().equals(busStatusCount.status().name())) {
               availableBuses.set(busStatusCount.count());
           }
       });

        Map<String,Long> tripsToday=new ConcurrentHashMap<>(6);

       Long pendingRequests=transportMemberRepository.getCountByTransportSystemIdAndStatus(securityService.getCurrentTransportSystemId(), TransportMemberStatus.PENDING);
       List<Long> memberIds=transportMemberRepository.getIdByTransportSystemIdAndRoleAndActive(securityService.getCurrentTransportSystemId(), TransportMemberRole.ROLE_DRIVER,true);
       Long availableDrivers=driverRepository.getCountByTransportSystemIdAndStatus(memberIds, DriverStatus.AVAILABLE);



        LocalDateTime startTime=LocalDate.now().atStartOfDay();
        LocalDateTime endTime=LocalDate.now().atTime(LocalTime.MAX);

       List<TripStatusCountResponse> tripCounts=tripRepository.findTripCountByTransportSystemIdAndStatusAndToday(securityService.getCurrentTransportSystemId(),startTime,endTime);

        tripCounts.forEach(tripCount ->
                tripsToday.put(
                        tripCount.status().name(),
                        tripCount.count()
                )
        );

        DayOfWeek today = LocalDate.now().getDayOfWeek();

        Long scheduledTripCount =
                tripScheduleRepository.getCountByTransportSystemId(
                        securityService.getCurrentTransportSystemId(), today
                );

        tripsToday.merge("SCHEDULED", scheduledTripCount, Long::sum);

        Long totalTrips = tripsToday.values()
                .stream()
                .reduce(0L, Long::sum);

        tripsToday.put("TOTAL", totalTrips);


        return AdminDashboardSummaryResponse.builder()
                .tripsToday(tripsToday)
                .liveBuses(liveBuses.get())
                .availableBuses(availableBuses.get())
                .availableDrivers(availableDrivers)
                .pendingRequests(pendingRequests)
                .build();
    }
}
