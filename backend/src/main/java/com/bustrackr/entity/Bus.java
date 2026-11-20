package com.bustrackr.entity;

import com.bustrackr.enums.BusStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "buses", uniqueConstraints = @UniqueConstraint(name = "uk_bus_transport_number", columnNames = {"transport_system_id", "bus_number"}))
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Bus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transport_system_id", nullable = false)
    TransportSystem transportSystem;

    @Column(name = "bus_number", nullable = false, length = 30)
    String busNumber;

    @Column(name = "registration_number", nullable = false, unique = true, length = 30)
    String registrationNumber;

    @Column(length = 100)
    String model;

    @Column(nullable = false)
    Integer capacity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    BusStatus status;

    @Column(name="last_service_date")
    LocalDate lastServiceDate;

    @Column(name="next_service_date")
    LocalDate nextServiceDate;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    LocalDateTime updatedAt;

    @Version
    private Long version;

    Boolean active=true;
}