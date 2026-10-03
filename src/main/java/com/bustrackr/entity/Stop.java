package com.bustrackr.entity;

import com.bustrackr.enums.StopStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "stops", uniqueConstraints = @UniqueConstraint(name = "uk_stop_transport_code", columnNames = {"transport_system_id", "stop_code"}))
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Stop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transport_system_id", nullable = false)
    TransportSystem transportSystem;

    @Column(name = "stop_code", nullable = false, length = 30)
    String stopCode;

    @Column(nullable = false, length = 150)
    String name;

    @Column(length = 300)
    String address;

    @Column(nullable = false)
    Double latitude;

    @Column(nullable = false)
    Double longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    StopStatus status;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    LocalDateTime updatedAt;
}