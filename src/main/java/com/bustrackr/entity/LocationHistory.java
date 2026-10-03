package com.bustrackr.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "location_history", indexes = @Index(name = "idx_location_trip_time", columnList = "trip_id, recorded_at"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LocationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    Trip trip;

    @Column(nullable = false, precision = 10, scale = 7)
    BigDecimal latitude;

    @Column(nullable = false, precision = 10, scale = 7)
    BigDecimal longitude;

    @Column(precision = 6, scale = 2)
    BigDecimal speed;

    @Column
    BigDecimal accuracyMeters;

    @Column(name = "recorded_at", nullable = false)
    LocalDateTime recordedAt;
}