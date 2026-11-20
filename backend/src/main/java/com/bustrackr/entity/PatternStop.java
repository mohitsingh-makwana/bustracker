package com.bustrackr.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "pattern_stops", uniqueConstraints = {
        @UniqueConstraint(name = "uk_routpattern_stop", columnNames = {"route_pattern_id", "stop_id"}),
        @UniqueConstraint(name = "uk_routepattern_sequence", columnNames = {"route_pattern_id", "sequence"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)

public class PatternStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_pattern_id", nullable = false)
    RoutePattern routePattern;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stop_id", nullable = false)
    Stop stop;

    @Column(nullable = false)
    Integer sequence;

    @Column(name = "stop_arrival_time", nullable = false)
    LocalTime stopArrivalTime;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    LocalDateTime updatedAt;
}