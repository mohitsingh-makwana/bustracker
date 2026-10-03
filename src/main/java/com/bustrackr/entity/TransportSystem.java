package com.bustrackr.entity;

import com.bustrackr.enums.AccessType;
import com.bustrackr.enums.TransportSystemStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "transport_systems",
        indexes = {
                @Index(name = "idx_transport_city", columnList = "city"),
                @Index(name = "idx_transport_access_type", columnList = "access_type")
        }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TransportSystem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false, unique = true,length = 30)
    String transportCode;

    @Column(nullable = false, length = 150)
    String name;

    @Column(length = 500)
    String description;

    @Enumerated(EnumType.STRING)
    @Column( nullable = false,name = "access_type", length = 20)
    AccessType accessType;

    @Column(nullable = false, length = 100)
    String city;

    @Column(length = 100)
    String area;

    Double latitude;

    Double longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    TransportSystemStatus status;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    LocalDateTime updatedAt;
}