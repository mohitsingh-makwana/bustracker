package com.bustrackr.entity;

import com.bustrackr.enums.TripScheduleStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

@Entity
@Table(name = "trips_schedule")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transport_system_id", nullable = false)
    TransportSystem transportSystem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_pattern_id", nullable = false)
    RoutePattern routePattern;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bus_id", nullable = false)
    Bus bus;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    Driver driver;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "trip_schedule_operating_days",
            joinColumns = @JoinColumn(name = "trip_schedule_id")
    )
    @Column(name = "day")
    @Enumerated(EnumType.STRING)
    Set<DayOfWeek> operatingDays;

    @Column(nullable = false)
    LocalTime scheduledStartTime;

    @Enumerated(EnumType.STRING)
    TripScheduleStatus scheduleStatus;

    @Column(nullable = false)
    LocalTime scheduledEndTime;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    LocalDateTime updatedAt;

    @Version
    private Long version;
}